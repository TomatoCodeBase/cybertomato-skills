#!/usr/bin/env python3
"""
阿里云百炼图片生成工具
使用通义万相模型生成高质量AI图片
"""

import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime

# API 配置（需要替换为你的API Key）
API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
TASK_URL = "https://dashscope.aliyuncs.com/api/v1/tasks/"
MODEL = "wanx-v1"  # 通义万相模型

# 从环境变量获取API Key
API_KEY = os.environ.get("ALIYUN_API_KEY", "")

def generate_image(prompt, api_key=None, size="1024*1024", n=1, style="<auto>", save_path=None):
    """
    生成图片（异步调用）

    Args:
        prompt: 图片描述
        api_key: API密钥（可选，优先使用参数）
        size: 图片尺寸 (512*512 / 1024*1024)
        n: 生成数量 (1-4)
        style: 风格 (<auto> / <3d cartoon> / <anime> 等)
        save_path: 保存路径（可选）

    Returns:
        dict: 包含图片URL和元数据
    """
    # 使用传入的api_key或环境变量
    key = api_key or API_KEY
    if not key:
        return {
            "success": False,
            "error": "未提供API Key。请使用 --api-key 参数或设置 ALIYUN_API_KEY 环境变量"
        }

    payload = {
        "model": MODEL,
        "input": {
            "prompt": prompt
        },
        "parameters": {
            "size": size,
            "n": n,
            "style": style
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {key}",
        "X-DashScope-Async": "enable"  # 启用异步调用
    }

    try:
        # 第一步：提交任务
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))

        # 获取task_id
        if 'output' not in result or 'task_id' not in result['output']:
            return {
                "success": False,
                "error": "Failed to submit task",
                "response": result
            }

        task_id = result['output']['task_id']
        print(f"[INFO] 任务已提交，task_id: {task_id}")

        # 第二步：轮询任务状态
        max_retries = 60  # 最多等待60次（每次2秒，共120秒）
        for i in range(max_retries):
            time.sleep(2)  # 等待2秒

            task_req = urllib.request.Request(
                f"{TASK_URL}{task_id}",
                headers={"Authorization": f"Bearer {key}"},
                method='GET'
            )

            with urllib.request.urlopen(task_req, timeout=10) as task_response:
                task_result = json.loads(task_response.read().decode('utf-8'))

            status = task_result.get('output', {}).get('task_status', '')

            if status == 'SUCCEEDED':
                # 任务成功，获取图片URL
                if 'results' in task_result['output']:
                    urls = [item['url'] for item in task_result['output']['results']]

                    output = {
                        "success": True,
                        "urls": urls,
                        "prompt": prompt,
                        "size": size,
                        "n": n,
                        "style": style,
                        "task_id": task_id,
                        "timestamp": datetime.now().isoformat()
                    }

                    # 如果指定了保存路径，下载图片
                    if save_path and urls:
                        for i, url in enumerate(urls):
                            if n > 1:
                                path = save_path.replace('.', f'_{i+1}.')
                            else:
                                path = save_path
                            download_image(url, path)
                        output["saved_to"] = save_path

                    return output
                else:
                    return {
                        "success": False,
                        "error": "No image URLs in task result",
                        "response": task_result
                    }

            elif status == 'FAILED':
                return {
                    "success": False,
                    "error": "Task failed",
                    "response": task_result
                }

            elif status in ['PENDING', 'RUNNING']:
                print(f"[INFO] 等待中... ({i+1}/{max_retries}) - {status}")
                continue

            else:
                print(f"[WARN] 未知状态: {status}")

        return {
            "success": False,
            "error": f"Timeout after {max_retries * 2} seconds"
        }

    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return {
            "success": False,
            "error": f"HTTP {e.code}: {error_body}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

def download_image(url, save_path):
    """下载图片到本地"""
    try:
        urllib.request.urlretrieve(url, save_path)
        print(f"[OK] 图片已保存: {save_path}")
    except Exception as e:
        print(f"[ERROR] 下载失败: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="阿里云百炼AI图片生成工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基础用法
  python aliyun-gen.py "一只可爱的猫咪在花园里" --api-key YOUR_KEY

  # 指定尺寸
  python aliyun-gen.py "星空下的城市" --size 512*512 --api-key YOUR_KEY

  # 生成多张
  python aliyun-gen.py "山水画" --n 4 --api-key YOUR_KEY

  # 指定风格
  python aliyun-gen.py "科技感封面" --style "<anime>" --api-key YOUR_KEY

  # 保存到文件
  python aliyun-gen.py "日落海滩" --save image.png --api-key YOUR_KEY

  # 使用环境变量
  export ALIYUN_API_KEY="YOUR_KEY"
  python aliyun-gen.py "描述"

风格选项:
  <auto>         - 自动（默认）
  <3d cartoon>   - 3D卡通
  <anime>        - 动漫
  <oil painting> - 油画
  <watercolor>   - 水彩
  <sketch>       - 素描
  <pixel art>    - 像素艺术
        """
    )

    parser.add_argument("prompt", help="图片描述")
    parser.add_argument("--api-key", metavar="KEY", help="API密钥")
    parser.add_argument("--size", choices=["512*512", "1024*1024"], default="1024*1024", help="图片尺寸")
    parser.add_argument("--n", type=int, choices=range(1, 5), default=1, help="生成数量 (1-4)")
    parser.add_argument("--style", default="<auto>", help="图片风格")
    parser.add_argument("--save", metavar="PATH", help="保存图片到指定路径")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")

    args = parser.parse_args()

    # 生成图片
    result = generate_image(
        prompt=args.prompt,
        api_key=args.api_key,
        size=args.size,
        n=args.n,
        style=args.style,
        save_path=args.save
    )

    # 输出结果
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result["success"]:
            print(f"[OK] 生成成功!")
            print(f"尺寸: {result['size']}")
            print(f"风格: {result['style']}")
            print(f"数量: {result['n']}")
            print(f"\n图片URL:")
            for i, url in enumerate(result['urls'], 1):
                print(f"  {i}. {url}")
            if "saved_to" in result:
                print(f"\n已保存: {result['saved_to']}")
            print(f"\n时间: {result['timestamp']}")
            print(f"[WARN] URL有效期: 24小时")
        else:
            print(f"[ERROR] 生成失败: {result['error']}")
            if "response" in result:
                print(f"\n原始响应:\n{json.dumps(result['response'], ensure_ascii=False, indent=2)}")
            sys.exit(1)

if __name__ == "__main__":
    main()
