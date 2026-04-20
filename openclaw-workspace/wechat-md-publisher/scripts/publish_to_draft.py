#!/usr/bin/env python3
"""
微信公众号草稿发布工具

功能：
1. 读取 Markdown 文件
2. 转换为微信 HTML（调用 markdown_to_wechat_v2.py）
3. 推送到草稿箱（支持固定封面和自定义封面）

使用方法：
    python publish_to_draft.py --input article.md --title "文章标题" --author "作者" --digest "摘要"
    python publish_to_draft.py --input article.md --title "文章标题" --thumb-media-id "封面ID"
"""

import os
import sys
import argparse
import json
import urllib.request
import urllib.parse
import urllib.error


def get_access_token(app_id, app_secret):
    """获取微信 access_token"""
    url = f"https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid={app_id}&secret={app_secret}"

    try:
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'access_token' in data:
                return data['access_token']
            else:
                print(f"❌ 获取 access_token 失败: {data}", file=sys.stderr)
                return None
    except Exception as e:
        print(f"❌ 网络请求失败: {str(e)}", file=sys.stderr)
        return None


def upload_thumb_media(access_token, image_path):
    """上传封面图片到微信"""
    url = f"https://api.weixin.qq.com/cgi-bin/material/add_material?access_token={access_token}&type=image"

    try:
        with open(image_path, 'rb') as f:
            image_data = f.read()

        boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
        headers = {
            'Content-Type': f'multipart/form-data; boundary={boundary}'
        }

        body = f'--{boundary}\r\n'.encode('utf-8')
        body += f'Content-Disposition: form-data; name="media"; filename="{os.path.basename(image_path)}"\r\n'.encode('utf-8')
        body += f'Content-Type: image/jpeg\r\n\r\n'.encode('utf-8')
        body += image_data
        body += f'\r\n--{boundary}--\r\n'.encode('utf-8')

        req = urllib.request.Request(url, data=body, headers=headers, method='POST')
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if 'media_id' in data:
                return data['media_id']
            else:
                print(f"❌ 上传封面失败: {data}", file=sys.stderr)
                return None
    except Exception as e:
        print(f"❌ 上传封面失败: {str(e)}", file=sys.stderr)
        return None


def create_draft(access_token, title, content, thumb_media_id, author='', digest=''):
    """创建草稿"""
    url = f"https://api.weixin.qq.com/cgi-bin/draft/add?access_token={access_token}"

    articles = [{
        "title": title,
        "author": author,
        "digest": digest,
        "content": content,
        "thumb_media_id": thumb_media_id,
        "need_open_comment": 0,
        "only_fans_can_comment": 0
    }]

    data = {
        "articles": articles
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'),
                                      headers={'Content-Type': 'application/json'},
                                      method='POST')
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data.get('errcode', 0) == 0:
                return data.get('media_id')
            else:
                print(f"❌ 创建草稿失败: {data}", file=sys.stderr)
                return None
    except Exception as e:
        print(f"❌ 创建草稿失败: {str(e)}", file=sys.stderr)
        return None


def convert_markdown_to_html(input_file, output_file):
    """调用 markdown_to_wechat_v2.py 转换"""
    import subprocess

    script_path = os.path.join(os.path.dirname(__file__), 'markdown_to_wechat_v2.py')

    try:
        env = {**os.environ, 'PYTHONIOENCODING': 'utf-8'}
        result = subprocess.run(
            [sys.executable, script_path, '--input', input_file, '--output', output_file],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=30,
            env=env
        )

        if result.returncode != 0:
            print(f"❌ 转换失败: {result.stderr}", file=sys.stderr)
            return False

        return True
    except Exception as e:
        print(f"❌ 转换失败: {str(e)}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="微信公众号草稿发布工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入 Markdown 文件路径"
    )

    parser.add_argument(
        "--title", "-t",
        required=True,
        help="文章标题"
    )

    parser.add_argument(
        "--author", "-a",
        default="",
        help="作者名（可选）"
    )

    parser.add_argument(
        "--digest", "-d",
        default="",
        help="文章摘要（可选）"
    )

    parser.add_argument(
        "--thumb-media-id",
        default="",
        help="封面图片的 media_id（可选，不传则使用测试封面）"
    )

    parser.add_argument(
        "--app-id",
        default=os.environ.get('WECHAT_APP_ID', ''),
        help="微信公众号 AppID（可选，从环境变量读取）"
    )

    parser.add_argument(
        "--app-secret",
        default=os.environ.get('WECHAT_APP_SECRET', ''),
        help="微信公众号 AppSecret（可选，从环境变量读取）"
    )

    args = parser.parse_args()

    # 检查环境变量
    if not args.app_id or not args.app_secret:
        print("❌ 错误: 未设置 WECHAT_APP_ID 或 WECHAT_APP_SECRET", file=sys.stderr)
        print("请先设置环境变量:", file=sys.stderr)
        print("$env:WECHAT_APP_ID='your_app_id'", file=sys.stderr)
        print("$env:WECHAT_APP_SECRET='your_app_secret'", file=sys.stderr)
        sys.exit(1)

    # 检查输入文件
    if not os.path.exists(args.input):
        print(f"❌ 错误: 文件不存在: {args.input}", file=sys.stderr)
        sys.exit(1)

    # 转换 Markdown
    print("✅ 正在转换 Markdown...")
    output_file = args.input.replace('.md', '.html')

    if not convert_markdown_to_html(args.input, output_file):
        sys.exit(1)

    # 读取 HTML 内容
    with open(output_file, 'r', encoding='utf-8') as f:
        html_content = f.read()

    # 获取 access_token
    print("✅ 正在获取 access_token...")
    access_token = get_access_token(args.app_id, args.app_secret)
    if not access_token:
        sys.exit(1)

    # 使用测试封面（如果未提供）
    thumb_media_id = args.thumb_media_id
    if not thumb_media_id:
        thumb_media_id = "YOUR_THUMB_MEDIA_ID"
        print("✓ 使用测试封面")

    # 创建草稿
    print("✅ 正在创建草稿...")
    media_id = create_draft(access_token, args.title, html_content, thumb_media_id, args.author, args.digest)

    if media_id:
        print(f"✅ 草稿创建成功！")
        print(f"📝 草稿ID: {media_id}")
        print(f"📋 标题: {args.title}")
        if args.author:
            print(f"👤 作者: {args.author}")
        if thumb_media_id == "YOUR_THUMB_MEDIA_ID":
            print("🎨 封面: 测试封面")
        else:
            print("🎨 封面: 自定义封面")
        print(f"📊 字数: 约 {len(html_content)} 字符")

        # 输出 JSON 格式（方便其他脚本调用）
        result = {
            "status": "success",
            "errcode": 0,
            "errmsg": "ok",
            "media_id": media_id,
            "title": args.title,
            "author": args.author,
            "digest": args.digest,
            "thumb_media_id": thumb_media_id
        }
        print("\n" + json.dumps(result, ensure_ascii=False))

        sys.exit(0)
    else:
        print("❌ 草稿创建失败", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
