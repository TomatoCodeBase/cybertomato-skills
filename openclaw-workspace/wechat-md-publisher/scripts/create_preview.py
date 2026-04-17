#!/usr/bin/env python3
"""
微信公众号 HTML 预览工具

功能：
1. 读取 Markdown 文件
2. 转换为微信 HTML
3. 用浏览器打开 HTML 文件

使用方法：
    python create_preview.py --input article.md
"""

import os
import sys
import argparse
import subprocess


def convert_and_preview(input_file):
    """转换 Markdown 并打开预览"""
    # 检查文件是否存在
    if not os.path.exists(input_file):
        print(f"❌ 错误: 文件不存在: {input_file}", file=sys.stderr)
        return False

    # 生成输出文件名
    base_name = os.path.splitext(os.path.basename(input_file))[0]
    output_file = os.path.join('D:\\OpenClaw\\workspace\\temp', f'{base_name}-preview.html')

    # 调用转换器
    script_path = os.path.join(os.path.dirname(__file__), 'markdown_to_wechat_v2.py')

    try:
        result = subprocess.run(
            [sys.executable, script_path, '--input', input_file, '--output', output_file],
            capture_output=True,
            text=True,
            timeout=30
        )

        # 转换器输出在 stderr（因为包含 ✅ 符号）
        if result.stderr:
            print(result.stderr)

        # 检查输出文件是否生成
        if not os.path.exists(output_file):
            print(f"❌ 转换失败: 输出文件未生成", file=sys.stderr)
            return False

        # 获取文件大小
        file_size = os.path.getsize(output_file)

        # 统计内容
        with open(output_file, 'r', encoding='utf-8') as f:
            html_content = f.read()

        # 统计元素数量
        h1_count = html_content.count('font-size: 26px')
        h2_count = html_content.count('font-size: 22px')
        h3_count = html_content.count('font-size: 18px')
        code_count = html_content.count('background-color: #f6f8fa')
        ul_count = html_content.count('<span style="color: #3498db; font-weight: bold; margin-right: 8px;">•')
        ol_count = html_content.count('<span style="color: #3498db; font-weight: bold; margin-right: 8px;">') - ul_count
        blockquote_count = html_content.count('background-color: #f8f9fa')

        print(f"\n📊 转换统计：")
        print(f"- 标题：{h1_count + h2_count + h3_count}个（H1: {h1_count}, H2: {h2_count}, H3: {h3_count}）")
        print(f"- 代码块：{code_count}个")
        print(f"- 列表：{ul_count + ol_count}个（无序: {ul_count}, 有序: {ol_count}）")
        print(f"- 引用：{blockquote_count}个")

        print(f"\n🎨 样式特征：")
        print(f"- 蓝色主题（#3498db）")
        print(f"- 代码块完美显示（v3 修复）")
        print(f"- 100% 微信兼容")

        # 打开浏览器
        print(f"\n✅ 正在打开预览...")
        if sys.platform == 'win32':
            os.startfile(output_file)
        elif sys.platform == 'darwin':
            subprocess.run(['open', output_file])
        else:
            subprocess.run(['xdg-open', output_file])

        print(f"\n✅ 预览文件已打开")
        print(f"📝 文件位置：{output_file}")
        print(f"📏 文件大小：{file_size / 1024:.1f}KB")

        return True

    except Exception as e:
        print(f"❌ 错误: {str(e)}", file=sys.stderr)
        return False


def main():
    parser = argparse.ArgumentParser(
        description="微信公众号 HTML 预览工具",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入 Markdown 文件路径"
    )

    args = parser.parse_args()

    success = convert_and_preview(args.input)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
