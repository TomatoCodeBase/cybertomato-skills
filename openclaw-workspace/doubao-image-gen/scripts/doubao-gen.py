#!/usr/bin/env python3
"""
豆包图片生成工具
使用豆包 Seedream 模型生成高质量AI图片
"""

import argparse
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime

# API 配置
API_URL = "https://ark.cn-beijing.volces.com/api/v3/images/generations"
API_KEY = "22bd3215-baa4-4ab2-872b-a7e2e79d5603"
MODEL = "doubao-seedream-4-5-251128"

def generate_image(prompt, size="2K", watermark=True, save_path=None):
    """
    生成图片

    Args:
        prompt: 图片描述
        size: 图片尺寸 (1K/2K)
        watermark: 是否添加水印
        save_path: 保存路径（可选）

    Returns:
        dict: 包含图片URL和元数据
    """
    payload = {
        "model": MODEL,
        "prompt": prompt,
        "sequential_image_generation": "disabled",
        "response_format": "url",
        "size": size,
        "stream": False,
        "watermark": watermark
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }

    try:
        # 发送请求
        req = urllib.request.Request(
            API_URL,
            data=json.dumps(payload).encode('utf-8'),
            headers=headers,
            method='POST'
        )

        with urllib.request.urlopen(req, timeout=60) as response:
            result = json.loads(response.read().decode('utf-8'))

        # 解析结果
        if 'data' in result and len(result['data']) > 0:
            image_url = result['data'][0]['url']

            output = {
                "success": True,
                "url": image_url,
                "prompt": prompt,
                "size": size,
                "watermark": watermark,
                "timestamp": datetime.now().isoformat()
            }

            # 如果指定了保存路径，下载图片
            if save_path:
                download_image(image_url, save_path)
                output["saved_to"] = save_path

            return output
        else:
            return {
                "success": False,
                "error": "No image URL in response",
                "response": result
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
        print(f"✅ 图片已保存: {save_path}")
    except Exception as e:
        print(f"❌ 下载失败: {e}")

def main():
    parser = argparse.ArgumentParser(
        description="豆包AI图片生成工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 基础用法
  python doubao-gen.py "一只可爱的猫咪在花园里"

  # 指定尺寸
  python doubao-gen.py "星空下的城市" --size 1K

  # 保存到文件
  python doubao-gen.py "山水画" --save image.png

  # 不加水印
  python doubao-gen.py "科技感封面" --no-watermark
        """
    )

    parser.add_argument("prompt", help="图片描述")
    parser.add_argument("--size", choices=["1K", "2K"], default="2K", help="图片尺寸")
    parser.add_argument("--no-watermark", action="store_true", help="不添加水印")
    parser.add_argument("--save", metavar="PATH", help="保存图片到指定路径")
    parser.add_argument("--json", action="store_true", help="输出JSON格式")

    args = parser.parse_args()

    # 生成图片
    result = generate_image(
        prompt=args.prompt,
        size=args.size,
        watermark=not args.no_watermark,
        save_path=args.save
    )

    # 输出结果
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        if result["success"]:
            print(f"✅ 生成成功!")
            print(f"📷 URL: {result['url']}")
            print(f"📐 尺寸: {result['size']}")
            print(f"💧 水印: {'是' if result['watermark'] else '否'}")
            if "saved_to" in result:
                print(f"💾 已保存: {result['saved_to']}")
            print(f"⏰ 时间: {result['timestamp']}")
            print(f"\n⚠️ URL有效期: 24小时")
        else:
            print(f"❌ 生成失败: {result['error']}")
            sys.exit(1)

if __name__ == "__main__":
    main()
