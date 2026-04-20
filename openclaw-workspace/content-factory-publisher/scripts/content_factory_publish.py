#!/usr/bin/env python3
"""
内容工厂发布工具

功能：
1. 读取 Obsidian 初稿
2. 转换为微信 HTML
3. 推送到草稿箱
4. 移动到已发布归档
5. 更新内容工厂状态

使用方法：
    python content_factory_publish.py --draft "03-内容工厂/3-初稿打磨区/文章标题.md"
    python content_factory_publish.py --preview "03-内容工厂/3-初稿打磨区/文章标题.md"
"""

import os
import sys
import argparse
import subprocess
import shutil
from datetime import datetime


def read_obsidian_draft(draft_path):
    """从 Obsidian 读取初稿"""
    # Obsidian 仓库路径
    obsidian_base = r"D:\Documents\bgggcontent\赛博番茄内容中心"
    full_path = os.path.join(obsidian_base, draft_path)

    if not os.path.exists(full_path):
        print(f"❌ 错误: 初稿文件不存在: {full_path}", file=sys.stderr)
        return None

    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()

        print(f"✅ 已读取初稿: {draft_path}")
        print(f"📏 字数: 约 {len(content)} 字符")

        return full_path, content
    except Exception as e:
        print(f"❌ 读取初稿失败: {str(e)}", file=sys.stderr)
        return None


def convert_to_wechat_html(input_file, output_file):
    """转换为微信 HTML"""
    script_path = os.path.join(os.path.dirname(__file__), 'markdown_to_wechat_v2.py')

    try:
        result = subprocess.run(
            [sys.executable, script_path, '--input', input_file, '--output', output_file],
            capture_output=True,
            text=True,
            timeout=30
        )

        if not os.path.exists(output_file):
            print(f"❌ 转换失败: 输出文件未生成", file=sys.stderr)
            return False

        file_size = os.path.getsize(output_file)
        print(f"✅ HTML 已生成: {output_file}")
        print(f"📏 文件大小: {file_size / 1024:.1f}KB")

        return True
    except Exception as e:
        print(f"❌ 转换失败: {str(e)}", file=sys.stderr)
        return False


def preview_html(html_file):
    """预览 HTML"""
    if sys.platform == 'win32':
        os.startfile(html_file)
    elif sys.platform == 'darwin':
        subprocess.run(['open', html_file])
    else:
        subprocess.run(['xdg-open', html_file])

    print(f"✅ 浏览器已打开预览")


def move_to_archive(draft_path):
    """移动到已发布归档"""
    obsidian_base = r"D:\Documents\bgggcontent\赛博番茄内容中心"

    # 源文件路径
    source_path = os.path.join(obsidian_base, draft_path)

    # 目标路径（已发布归档）
    today = datetime.now().strftime('%Y-%m-%d')
    filename = os.path.basename(draft_path)
    archive_path = os.path.join(obsidian_base, '04-发布归档', '公众号已发布', f'{today}-{filename}')

    try:
        # 创建目标目录
        os.makedirs(os.path.dirname(archive_path), exist_ok=True)

        # 移动文件
        shutil.move(source_path, archive_path)

        print(f"✅ 已归档: {archive_path}")

        return True
    except Exception as e:
        print(f"❌ 归档失败: {str(e)}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="内容工厂发布工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "--preview", "-p",
        help="预览模式（只转换，不推送）"
    )

    parser.add_argument(
        "--draft", "-d",
        help="发布模式（转换 + 推送 + 归档）"
    )

    args = parser.parse_args()

    if not args.preview and not args.draft:
        print("❌ 错误: 必须指定 --preview 或 --draft", file=sys.stderr)
        sys.exit(1)

    # 预览模式
    if args.preview:
        print("🔍 预览模式")
        print()

        # 读取初稿
        result = read_obsidian_draft(args.preview)
        if not result:
            sys.exit(1)

        input_file, content = result

        # 转换为 HTML
        output_file = os.path.join('D:\\OpenClaw\\workspace\\temp', 'content-factory-preview.html')
        if not convert_to_wechat_html(input_file, output_file):
            sys.exit(1)

        # 预览
        preview_html(output_file)

        print()
        print("📝 请确认效果，满意后使用 --draft 参数发布")

        sys.exit(0)

    # 发布模式
    if args.draft:
        print("🚀 发布模式")
        print()

        # 读取初稿
        result = read_obsidian_draft(args.draft)
        if not result:
            sys.exit(1)

        input_file, content = result

        # 转换为 HTML
        output_file = os.path.join('D:\\OpenClaw\\workspace\\temp', 'content-factory-publish.html')
        if not convert_to_wechat_html(input_file, output_file):
            sys.exit(1)

        # 读取 HTML
        with open(output_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # 提取标题（从 Markdown 第一个 # 标题）
        lines = content.split('\n')
        title = "未命名文章"
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                break

        print(f"📋 标题: {title}")
        print()
        print("⚠️ 发布功能暂未实现（需要调用 publish_to_draft.py）")
        print("请手动执行:")
        print(f"  python scripts/publish_to_draft.py --input \"{input_file}\" --title \"{title}\"")

        # 归档（先不执行，等发布成功后再归档）
        # move_to_archive(args.draft)

        sys.exit(0)


if __name__ == "__main__":
    main()
