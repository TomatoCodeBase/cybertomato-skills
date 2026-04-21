#!/usr/bin/env python3
"""
头条微头条一键发布脚本。
通过 CDP Proxy 完成：创建tab → 写入内容 → 发布 → 验证 → 关闭tab。

用法：
  python toutiao_publish.py "微头条正文内容"

正文支持 \\n 换行。#话题 会自动保留在正文末尾。

前置：CDP Proxy 运行中（localhost:3456），Chrome 已登录 mp.toutiao.com。
"""
import sys, json, time, urllib.request, os, tempfile

PROXY = "http://localhost:3456"

def cdp_get(path):
    resp = urllib.request.urlopen(f"{PROXY}{path}", timeout=10)
    return json.loads(resp.read().decode())

def cdp_post(path, body=""):
    req = urllib.request.Request(f"{PROXY}{path}", data=body.encode(), method="POST")
    resp = urllib.request.urlopen(req, timeout=10)
    return json.loads(resp.read().decode())

def cdp_eval(target_id, js):
    """执行 JS 并返回结果。中文 JS 写临时文件避免 MINGW64 编码损坏。"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
        f.write(js)
        tmp = f.name
    try:
        req = urllib.request.Request(
            f"{PROXY}/eval?target={target_id}",
            data=open(tmp, 'rb').read(),
            method="POST"
        )
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read().decode())
    finally:
        os.unlink(tmp)

def main():
    if len(sys.argv) < 2:
        print("用法: python toutiao_publish.py \"微头条正文\"")
        sys.exit(1)

    content = sys.argv[1]
    # 将 \n 字面量转为真正换行
    content = content.replace("\\n", "\n")

    # 1. 创建新 tab
    print("[1/5] 打开发布页...")
    tab = cdp_get("/new?url=https://mp.toutiao.com/profile_v4/weitoutiao/publish")
    tid = tab["targetId"]

    try:
        # 2. 等待页面加载
        for i in range(10):
            time.sleep(1)
            info = cdp_eval(tid, 'JSON.stringify({hasEditor:!!document.querySelector("[contenteditable=true]"),url:location.href})')
            val = json.loads(info.get("value", "{}"))
            if val.get("hasEditor"):
                break
        else:
            print("ERROR: 发布页加载超时")
            cdp_get(f"/close?target={tid}")
            sys.exit(1)

        # 3. 写入内容（JS 写文件绕过编码问题）
        print("[2/5] 写入内容...")
        paragraphs = "</p><p>".join(content.split("\n"))
        js = """var editor = document.querySelector('[contenteditable=true]');
editor.innerHTML = '<p>__PARAGRAPHS__</p>';
editor.dispatchEvent(new Event('input', {bubbles: true}));
JSON.stringify({ok: true, len: editor.innerText.length});""".replace("__PARAGRAPHS__", paragraphs.replace("'", "\\'"))
        result = cdp_eval(tid, js)
        val = json.loads(result.get("value", "{}"))
        print(f"  写入 {val.get('len', '?')} 字")

        # 4. 点击发布
        print("[3/5] 发布中...")
        cdp_post(f"/click?target={tid}", "button.publish-content")

        # 5. 验证结果
        print("[4/5] 验证...")
        time.sleep(3)
        info = cdp_eval(tid, 'JSON.stringify({url:location.href})')
        val = json.loads(info.get("value", "{}"))
        url = val.get("url", "")

        if "/weitoutiao/publish" not in url:
            print(f"[5/5] OK 发布成功！已跳转到 {url}")
        else:
            err_info = cdp_eval(tid, 'document.querySelector(".byte-message-error")?.innerText || ""')
            err_val = json.loads(err_info.get("value", '""'))
            print(f"[5/5] WARN 可能发布失败。错误: {err_val}")

    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        cdp_get(f"/close?target={tid}")
        print("[结束] 已关闭后台tab")

if __name__ == "__main__":
    main()
