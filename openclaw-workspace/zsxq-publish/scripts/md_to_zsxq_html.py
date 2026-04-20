"""Markdown → 知识星球兼容 HTML 转换器"""
import re, json, sys

def md_to_zsxq_html(md_text):
    """将 Markdown 转为知识星球兼容的 HTML"""
    lines = md_text.split('\n')
    html_parts = []
    in_blockquote = False

    for line in lines:
        stripped = line.strip()

        if not stripped:
            if in_blockquote:
                html_parts.append('</blockquote>')
                in_blockquote = False
            continue

        # 引用块
        if stripped.startswith('> '):
            if not in_blockquote:
                html_parts.append('<blockquote style="color:#666;border-left:3px solid #ddd;padding-left:10px;margin:8px 0">')
                in_blockquote = True
            content = stripped[2:]
            content = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', content)
            content = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', content)
            html_parts.append(f'<p>{content}</p>')
            continue
        elif in_blockquote:
            html_parts.append('</blockquote>')
            in_blockquote = False

        # 标题
        if stripped.startswith('## '):
            html_parts.append(f'<h2>{stripped[3:]}</h2>')
            continue
        if stripped.startswith('### '):
            html_parts.append(f'<h3>{stripped[4:]}</h3>')
            continue

        # 分隔线
        if stripped == '---':
            html_parts.append('<hr>')
            continue

        # 内联格式
        converted = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', stripped)
        converted = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', converted)

        # 列表项
        if stripped.startswith('- '):
            html_parts.append(f'<p>- {converted[2:]}</p>')
        else:
            html_parts.append(f'<p>{converted}</p>')

    if in_blockquote:
        html_parts.append('</blockquote>')

    return '\n'.join(html_parts)


def generate_inject_js(html_content):
    """生成 CDP 注入用的 JS 代码"""
    chunks = [html_content[i:i+8000] for i in range(0, len(html_content), 8000)]
    js_lines = ['var html = "";']
    for chunk in chunks:
        js_lines.append(f'html += {json.dumps(chunk)};')
    js_lines.append('''
var editorEl = document.querySelector('.ProseMirror');
if (!editorEl) throw new Error('No ProseMirror editor found');
editorEl.innerHTML = html;
editorEl.dispatchEvent(new Event('input', { bubbles: true }));
'Content injected: ' + html.length + ' bytes';
''')
    return '(function(){ try { ' + '\n'.join(js_lines) + ' } catch(e) { return "Error: " + e.message; } })()'


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python md_to_zsxq_html.py <input.md> [--js]")
        sys.exit(1)

    with open(sys.argv[1], encoding='utf-8') as f:
        md = f.read()

    html = md_to_zsxq_html(md)

    if '--js' in sys.argv:
        js = generate_inject_js(html)
        out_file = sys.argv[1].replace('.md', '_inject.js')
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(js)
        print(f"JS written to {out_file} ({len(js)} bytes)")
    else:
        out_file = sys.argv[1].replace('.md', '.html')
        with open(out_file, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f"HTML written to {out_file} ({len(html)} bytes)")
