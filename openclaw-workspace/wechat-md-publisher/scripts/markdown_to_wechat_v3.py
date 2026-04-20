#!/usr/bin/env python3
"""
Markdown 转微信公众号 HTML 转换器（微信兼容版 v3 - 修复Unicode编码问题）
"""

import os
import sys
import argparse
import re


def markdown_to_html_wechat(markdown_text):
    """
    将 Markdown 转换为微信兼容的 HTML
    """
    html_lines = []
    in_list = False
    in_ordered_list = False
    list_counter = 0
    in_blockquote = False
    in_code_block = False
    code_block_lines = []
    
    lines = markdown_text.split('\n')
    i = 0
    
    while i < len(lines):
        line = lines[i]
        
        # 代码块
        if line.strip().startswith('```'):
            if not in_code_block:
                in_code_block = True
                code_block_lines = []
            else:
                in_code_block = False
                code_content = '\n'.join(code_block_lines)
                # 代码块：使用 section 包裹，用 <br /> 换行，用 &nbsp; 保持缩进
                code_html = format_code_block(code_content)
                html_lines.append(code_html)
                code_block_lines = []
            i += 1
            continue
        
        if in_code_block:
            code_block_lines.append(line)
            i += 1
            continue
        
        # 标题处理
        if line.startswith('# '):
            title = line[2:].strip()
            html_lines.append(f'<h2 style="font-size: 22px; border-bottom: 2px solid #3498db; padding: 16px 0 8px 0; color: #2c3e50; margin: 24px 0 16px 0;">{title}</h2>')
        elif line.startswith('## '):
            title = line[3:].strip()
            html_lines.append(f'<h3 style="font-size: 18px; border-left: 4px solid #3498db; padding: 12px 0 8px 16px; color: #2c3e50; margin: 20px 0 12px 0;">{title}</h3>')
        elif line.startswith('### '):
            title = line[4:].strip()
            html_lines.append(f'<h4 style="font-size: 16px; color: #2c3e50; margin: 16px 0 8px 0;">{title}</h4>')
        # 引用块
        elif line.startswith('> '):
            quote_content = line[2:].strip()
            if not in_blockquote:
                in_blockquote = True
                html_lines.append(f'<blockquote style="background-color: #f8f9fa; border-left: 4px solid #3498db; padding: 16px; margin: 16px 0;">{quote_content}')
            else:
                html_lines.append(f'{quote_content}')
        elif in_blockquote and line.strip() == '':
            in_blockquote = False
            html_lines.append('</blockquote>')
        elif in_blockquote:
            html_lines.append(line.strip())
        # 无序列表
        elif line.startswith('- ') or line.startswith('* '):
            list_item = line[2:].strip()
            if not in_list:
                in_list = True
                html_lines.append('<ul style="padding-left: 24px; color: #3498db;">')
            html_lines.append(f'<li style="margin: 8px 0;">{list_item}</li>')
        # 有序列表
        elif re.match(r'^\d+\. ', line):
            list_item = re.sub(r'^\d+\. ', '', line).strip()
            if not in_ordered_list:
                in_ordered_list = True
                list_counter = 1
                html_lines.append('<ol style="padding-left: 32px; color: #3498db;">')
            html_lines.append(f'<li style="margin: 8px 0;">{list_item}</li>')
        # 空行
        elif line.strip() == '':
            if in_list:
                in_list = False
                html_lines.append('</ul>')
            if in_ordered_list:
                in_ordered_list = False
                html_lines.append('</ol>')
            if in_blockquote:
                html_lines.append('</blockquote>')
                in_blockquote = False
            html_lines.append('<br />')
        # 普通段落
        else:
            if in_list:
                in_list = False
                html_lines.append('</ul>')
            if in_ordered_list:
                in_ordered_list = False
                html_lines.append('</ol>')
            if in_blockquote:
                in_blockquote = False
                html_lines.append('</blockquote>')
            # 处理加粗和斜体，但保留双引号
            content = line
            content = re.sub(r'\*\*(.*?)\*\*', r'<strong style="color: #e74c3c; font-weight: bold;">\1</strong>', content)
            content = re.sub(r'\*(.*?)\*', r'<em style="font-style: italic; color: #7f8c8d;">\1</em>', content)
            # 确保中文不被Unicode编码
            html_lines.append(f'<p style="font-size: 16px; line-height: 1.6; margin: 16px 0; color: #2c3e50;">{content}</p>')
        
        i += 1
    
    # 处理未闭合的列表
    if in_list:
        html_lines.append('</ul>')
    if in_ordered_list:
        html_lines.append('</ol>')
    if in_blockquote:
        html_lines.append('</blockquote>')
    
    return '\n'.join(html_lines)


def format_code_block(code_content):
    """
    格式化代码块，确保中文不被Unicode编码
    """
    lines = code_content.split('\n')
    formatted_lines = []
    
    for line in lines:
        # 保留原始缩进，用 &nbsp; 替换空格
        indent = ''
        content = line
        leading_spaces = len(line) - len(line.lstrip())
        if leading_spaces > 0:
            indent = '&nbsp;' * leading_spaces
            content = line.lstrip()
        
        # 用 <br /> 替换换行符
        if content:
            formatted_lines.append(f'{indent}{content}<br />')
        else:
            formatted_lines.append('<br />')
    
    code_html = f'''<section style="
  background-color: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  margin: 16px 0;
  border: 1px solid #e1e4e8;
  font-family: Consolas, Monaco, monospace;
  font-size: 14px;
  color: #24292e;
  line-height: 1.6;
">
{''.join(formatted_lines)}
</section>'''
    
    return code_html


def main():
    parser = argparse.ArgumentParser(description='Markdown 转微信公众号 HTML')
    parser.add_argument(
        "--input", "-i",
        required=True,
        help="输入 Markdown 文件路径"
    )
    parser.add_argument(
        "--output", "-o",
        required=True,
        help="输出 HTML 文件路径"
    )
    args = parser.parse_args()
    
    try:
        # 读取 Markdown 文件
        with open(args.input, 'r', encoding='utf-8') as f:
            markdown_text = f.read()
        
        # 转换为 HTML
        html_content = markdown_to_html_wechat(markdown_text)
        
        # 包装在最外层 section 中（只嵌套1层）
        final_html = f'<section style="padding: 20px; max-width: 100%; box-sizing: border-box;">\n{html_content}\n</section>'
        
        # 确保写入时使用UTF-8且不编码中文
        with open(args.output, 'w', encoding='utf-8', errors='strict') as f:
            f.write(final_html)
        
        print("✅ 转换成功！")
        print(f"   输入: {args.input}")
        print(f"   输出: {args.output}")
        print("   样式: 微信兼容版 v3")
        print("   修复: 代码块换行、缩进、双引号、中文编码")

    except Exception as e:
        print(f"❌ 转换失败: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()