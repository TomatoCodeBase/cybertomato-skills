"""Build JS injection scripts for ZSXQ Quill editor publishing"""
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

# Read source
with open(r'D:\cybertomato\03-内容工厂\AI热点日报\2026-04-16-番茄AI热点日报.md', encoding='utf-8') as f:
    md = f.read()

# Extract title (first line without #)
title_line = md.split('\n')[0].lstrip('#').strip()

# Convert body (skip title and date line, start from ## sections)
body_md = '\n'.join(md.split('\n')[4:])  # skip title, blank, date, blank
html = md_to_html(body_md)

# Generate title injection JS
title_js = f"""(function(){{
  try {{
    var inputs = document.querySelectorAll('input[type=text]');
    for(var i=0; i<inputs.length; i++){{
      if(inputs[i].placeholder && inputs[i].placeholder.indexOf('标题') !== -1){{
        var nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(inputs[i], {json.dumps(title_line)});
        inputs[i].dispatchEvent(new Event('input', {{ bubbles: true }}));
        inputs[i].dispatchEvent(new Event('change', {{ bubbles: true }}));
        return 'Title set: ' + inputs[i].value;
      }}
    }}
    return 'Title input not found';
  }} catch(e) {{ return 'Error: ' + e.message; }}
}})()"""

# Generate body injection JS - split into chunks for large content
chunks = [html[i:i+6000] for i in range(0, len(html), 6000)]
js_lines = ['(function(){ try { var html = "";']
for chunk in chunks:
    js_lines.append(f'html += {json.dumps(chunk)};')
js_lines.append("""
var el = document.querySelector('.ql-editor');
if (!el) throw new Error('No ql-editor found');
el.innerHTML = html;
el.dispatchEvent(new Event('input', { bubbles: true }));
return 'Content injected: ' + html.length + ' bytes';
} catch(e) { return 'Error: ' + e.message; }
})()""")

body_js = '\n'.join(js_lines)

# Publish button click JS
publish_js = """(function(){
  try {
    var allDivs = document.querySelectorAll('div');
    for(var i=0; i<allDivs.length; i++){
      var d = allDivs[i];
      if(d.innerText.trim() === '发布' && d.className.indexOf('btn') !== -1){
        d.click();
        return 'Clicked publish';
      }
    }
    return 'Publish button not found';
  } catch(e) { return 'Error: ' + e.message; }
})()"""

# Write JS files
with open(r'D:\cybertomato\03-内容工厂\AI热点日报\inject_title.js', 'w', encoding='utf-8') as f:
    f.write(title_js)
    
with open(r'D:\cybertomato\03-内容工厂\AI热点日报\inject_body.js', 'w', encoding='utf-8') as f:
    f.write(body_js)
    
with open(r'D:\cybertomato\03-内容工厂\AI热点日报\inject_publish.js', 'w', encoding='utf-8') as f:
    f.write(publish_js)

print(f"Title: {title_line}")
print(f"HTML body: {len(html)} bytes in {len(chunks)} chunks")
print("JS files written to D:\\cybertomato\\03-内容工厂\\AI热点日报\\")
