#!/usr/bin/env python3
"""
sync.py - 从飞书多维表格同步数据，生成番茄精选网页HTML
用法: python sync.py --data '{"tools":[...]}' --output path/to/index.html
或者: python sync.py --output path/to/index.html (从stdin读取JSON)
"""
import sys, json, argparse

HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>番茄精选网页 · AI工具导航</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--paper:#F7F3ED;--paper-deep:#EDE7DC;--paper-card:#FFFCF7;--ink:#1B365D;--ink-mid:#2D4A7A;--ink-light:#4A6FA5;--accent:#8B4513;--accent-light:#D4A76A;--gray:#7A7267;--gray-light:#B8B0A4;--gray-border:#DDD5C8;--radius:6px;--serif:"Georgia","Noto Serif CJK SC","Source Han Serif SC","SimSun",serif;--sans:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif}
body{font-family:var(--sans);background:var(--paper);color:#2C2416;line-height:1.65}
a{color:inherit;text-decoration:none}
.header{background:var(--ink);position:sticky;top:0;z-index:100}
.header::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent-light),var(--accent))}
.header-inner{max-width:960px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;padding:12px 32px}
.logo{display:flex;align-items:center;gap:10px;color:var(--paper);font-family:var(--serif);font-size:20px;font-weight:600;letter-spacing:.5px}
.logo-icon{width:32px;height:32px;border:1.5px solid var(--accent-light);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px}
.header-right a{color:var(--paper-deep);font-size:13px;transition:color .2s}
.header-right a:hover{color:var(--accent-light)}
.hero{max-width:960px;margin:0 auto;padding:40px 32px 24px}
.hero h1{font-family:var(--serif);font-size:28px;font-weight:400;color:var(--ink);margin-bottom:6px;letter-spacing:1px}
.hero p{color:var(--gray);font-size:14px}
.hero .rule{width:48px;height:1.5px;background:var(--accent);margin:12px 0;display:block}
.hero .count{font-size:12px;color:var(--gray-light);margin-top:4px}
.layout{max-width:960px;margin:0 auto;display:flex;gap:24px;padding:0 32px 64px}
.sidebar{min-width:160px;flex-shrink:0;position:sticky;top:72px;align-self:flex-start}
.sidebar-title{font-family:var(--serif);font-size:11px;color:var(--gray-light);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;padding-left:12px}
.tabs{display:flex;flex-direction:column;gap:1px}
.tab{padding:8px 12px;font-size:13px;cursor:pointer;transition:all .2s;color:var(--gray);border-left:2px solid transparent;border-radius:0 var(--radius) var(--radius) 0}
.tab:hover{color:var(--ink);background:var(--paper-card)}
.tab.active{color:var(--ink);border-left-color:var(--ink);background:var(--paper-card);font-weight:500}
.grid-wrap{flex:1;min-width:0}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
@media(max-width:640px){.grid{grid-template-columns:1fr;gap:12px}.layout{flex-direction:column;gap:12px}.sidebar{position:static;min-width:auto}.tabs{flex-direction:row;flex-wrap:wrap;gap:2px;border-bottom:1px solid var(--gray-border);padding-bottom:8px}.tab{border-left:none;border-bottom:2px solid transparent;border-radius:var(--radius)}.tab.active{border-left-color:transparent;border-bottom-color:var(--ink)}}
.card{background:var(--paper-card);border-radius:var(--radius);padding:20px;border:1px solid var(--gray-border);transition:all .2s ease;cursor:pointer;position:relative}
.card:hover{border-color:var(--ink-light);box-shadow:0 2px 12px rgba(27,54,93,.08)}
.card:hover .card-name{color:var(--accent)}
.card-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}
.card-icon{min-width:36px;height:36px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:600;color:var(--paper);font-family:var(--serif);flex-shrink:0}
.card-name{font-family:var(--serif);font-size:16px;font-weight:600;color:var(--ink);transition:color .2s}
.card-desc{font-size:13px;color:var(--gray);line-height:1.6;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.card-meta{display:flex;gap:6px;flex-wrap:wrap}
.tag{font-size:11px;padding:2px 8px;border-radius:3px}
.tag-cat{background:var(--paper-deep);color:var(--ink-mid)}
.tag-free{background:#E8F0E4;color:#3D6B35}
.tag-freepay{background:#F0EDE4;color:#8B6F3A}
.tag-platform{background:transparent;color:var(--gray-light);border:1px solid var(--gray-border)}
.card-link{position:absolute;inset:0;z-index:1}
.footer{text-align:center;padding:28px 32px;color:var(--gray-light);font-size:12px;border-top:1px solid var(--gray-border);font-family:var(--serif)}
.footer a{color:var(--ink-light)}.footer a:hover{color:var(--ink);text-decoration:underline}
.empty{text-align:center;padding:48px 24px;color:var(--gray-light);font-family:var(--serif)}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.card{animation:fadeIn .3s ease both}
</style>
</head>
<body>
<header class="header"><div class="header-inner"><a href="#" class="logo"><div class="logo-icon">紙</div>番茄精选网页</a><div class="header-right"><a href="https://s0xpyu2kpl6.feishu.cn/base/CjrEbaLloaHuvmsHhJScNB0XnB5" target="_blank">数据源 ↗</a></div></div></header>
<div class="hero"><h1>番茄精选网页</h1><span class="rule"></span><p>收录优质AI工具与产品，持续更新中</p><div class="count"></div></div>
<div class="layout"><div class="sidebar"><div class="sidebar-title">分类</div><div class="tabs" id="tabs"></div></div><div class="grid-wrap"><div class="grid" id="grid"></div></div></div>
<footer class="footer">数据来源：<a href="https://s0xpyu2kpl6.feishu.cn/base/CjrEbaLloaHuvmsHhJScNB0XnB5" target="_blank">飞书多维表格 · 精选网页</a></footer>
<script>
var tools=__TOOLS__;
var catColors=__CAT_COLORS__;
function freeTag(f){if(f==='免费')return '<span class="tag tag-free">免费</span>';if(f==='免费+付费')return '<span class="tag tag-freepay">免费+付费</span>';return ''}
function render(filter){var g=document.getElementById('grid');var list=filter==='all'?tools:tools.filter(function(t){return t.cat===filter});if(!list.length){g.innerHTML='<div class="empty">该分类暂无工具</div>';return}g.innerHTML=list.map(function(t){var c=catColors[t.cat]||'#1B365D';var init=t.name.charAt(0);return '<div class="card"><a class="card-link" href="'+t.link+'" target="_blank" rel="noopener"></a><div class="card-head"><div class="card-icon" style="background:'+c+'">'+init+'</div><div class="card-name">'+t.name+'</div></div><div class="card-desc">'+t.desc+'</div><div class="card-meta"><span class="tag tag-cat">'+t.cat+'</span>'+(t.platform?'<span class="tag tag-platform">'+t.platform+'</span>':'')+freeTag(t.free)+'</div></div>'}).join('')}
var cats=['all'];tools.forEach(function(t){if(cats.indexOf(t.cat)<0)cats.push(t.cat)});
var tabsEl=document.getElementById('tabs');cats.forEach(function(c){var d=document.createElement('div');d.className='tab'+(c==='all'?' active':'');d.dataset.cat=c;d.textContent=c==='all'?'全部':c;d.addEventListener('click',function(){document.querySelectorAll('.tab').forEach(function(t){t.classList.remove('active')});this.classList.add('active');render(this.dataset.cat)});tabsEl.appendChild(d)});
render('all');
document.querySelector('.count').textContent='共 '+tools.length+' 个工具 · 飞书多维表格';
</script>
</body>
</html>'''

# Auto-assign category colors from a palette
COLOR_PALETTE = [
    '#2D4A7A', '#8B6F3A', '#5B3A7A', '#3A6B5B', '#7A3A3A',
    '#1B365D', '#4A6F3A', '#6B3A5B', '#3A5B6F', '#6F5B3A',
]

def build_html(tools_data):
    # Collect unique categories
    cats = []
    for t in tools_data:
        if t['cat'] not in cats:
            cats.append(t['cat'])

    # Assign colors
    cat_colors = {}
    for i, c in enumerate(cats):
        cat_colors[c] = COLOR_PALETTE[i % len(COLOR_PALETTE)]

    html = HTML_TEMPLATE
    html = html.replace('__TOOLS__', json.dumps(tools_data, ensure_ascii=False))
    html = html.replace('__CAT_COLORS__', json.dumps(cat_colors, ensure_ascii=False))
    return html

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', help='JSON string with tools array')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    args = parser.parse_args()

    if args.data:
        tools_data = json.loads(args.data)
    else:
        tools_data = json.load(sys.stdin)

    if isinstance(tools_data, dict):
        tools_data = tools_data.get('tools', [])

    html = build_html(tools_data)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f'Generated {args.output} with {len(tools_data)} tools')

if __name__ == '__main__':
    main()
