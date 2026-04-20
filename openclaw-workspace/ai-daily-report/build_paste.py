"""Build JS that uses clipboard paste approach for Quill editor"""
import re, json

def md_to_html(md_text):
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

        if stripped.startswith('## '):
            html_parts.append(f'<h2>{stripped[3:]}</h2>')
            continue
        if stripped.startswith('### '):
            html_parts.append(f'<h3>{stripped[4:]}</h3>')
            continue

        if stripped == '---':
            html_parts.append('<hr>')
            continue

        converted = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', stripped)
        converted = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', converted)

        if stripped.startswith('- '):
            html_parts.append(f'<p>• {converted[2:]}</p>')
        elif re.match(r'^\d+\.\s', stripped):
            m = re.match(r'^(\d+\.)\s(.+)', stripped)
            html_parts.append(f'<p>{m.group(1)} {m.group(2)}</p>')
        else:
            html_parts.append(f'<p>{converted}</p>')

    if in_blockquote:
        html_parts.append('</blockquote>')
    return '\n'.join(html_parts)

with open(r'D:\cybertomato\03-内容工厂\AI热点日报\2026-04-16-番茄AI热点日报.md', encoding='utf-8') as f:
    md = f.read()

title_line = md.split('\n')[0].lstrip('#').strip()
body_md = '\n'.join(md.split('\n')[4:])
html = md_to_html(body_md)

# Build paste injection JS - simulates a paste event with HTML data
# This approach uses execCommand or clipboard DataTransfer to insert content
# that Quill's paste handler will process
chunks = [html[i:i+6000] for i in range(0, len(html), 6000)]
js_lines = ['(function(){ try {']
js_lines.append('var html = "";')
for chunk in chunks:
    js_lines.append(f'html += {json.dumps(chunk)};')

js_lines.append("""
// Focus editor first
var el = document.querySelector('.ql-editor');
if (!el) throw new Error('No ql-editor');
el.focus();

// Clear existing content
el.innerHTML = '';

// Create paste event with HTML
var dt = new DataTransfer();
dt.setData('text/html', html);
dt.setData('text/plain', html);

var pasteEvent = new ClipboardEvent('paste', {
    clipboardData: dt,
    bubbles: true,
    cancelable: true
});

el.dispatchEvent(pasteEvent);
return 'Paste dispatched: ' + html.length + ' bytes, editor text: ' + el.innerText.substring(0, 50);
} catch(e) { return 'Error: ' + e.message; }
})()""")

body_js = '\n'.join(js_lines)

with open(r'D:\cybertomato\03-内容工厂\AI热点日报\inject_body_paste.js', 'w', encoding='utf-8') as f:
    f.write(body_js)

print(f"Paste JS: {len(body_js)} bytes, HTML: {len(html)} bytes")
