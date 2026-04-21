#!/usr/bin/env python3
"""
知乎创作打卡挑战赛一键脚本。
完成互动任务（赞同+评论+关注）+ 创作任务（发想法），验证打卡状态。

用法:
  python zhihu_daka.py                    # 默认执行全部任务
  python zhihu_daka.py --interact-only    # 仅完成互动任务（3/3）
  python zhihu_daka.py --content TEXT     # 自定义想法/回答内容
  python zhihu_daka.py --no-verify        # 跳过最终验证

前置条件:
  - CDP Proxy 运行在 localhost:3456
  - Chrome 已登录知乎
"""

import json
import sys
import time
import urllib.request
import urllib.parse
import argparse

CDP_BASE = "http://localhost:3456"


def cdp_get(path):
    """GET 请求 CDP Proxy"""
    req = urllib.request.Request(f"{CDP_BASE}{path}")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def cdp_post(path, body=""):
    """POST 请求 CDP Proxy（text/plain body）"""
    data = body.encode("utf-8") if isinstance(body, str) else body
    req = urllib.request.Request(
        f"{CDP_BASE}{path}", data=data, method="POST",
        headers={"Content-Type": "text/plain"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())


def cdp_eval(target, js):
    """在目标 tab 执行 JS，返回解析后的 value"""
    result = cdp_post(f"/eval?target={target}", js)
    raw = result.get("value", result.get("output", ""))
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return raw
    return raw


def get_first_tab():
    """获取当前可用的 tab，如果没有则新建一个导航到知乎"""
    targets = cdp_get("/targets")
    tabs = [t for t in targets if t.get("type") == "page" and "zhihu.com" in t.get("url", "")]
    if tabs:
        return tabs[0]["id"]
    # 新建 tab
    result = cdp_get("/new?url=https://www.zhihu.com/creator")
    return result["targetId"]


# ─── 互动任务 ───

def find_ai_question(tid):
    """从热榜找一个 AI/科技相关问题，返回 {url, question_id}"""
    cdp_post(f"/navigate?target={tid}&url=https://www.zhihu.com/hot")
    time.sleep(4)

    result = cdp_eval(tid, """
    var links = [...document.querySelectorAll('a[href]')]
        .filter(a => a.href.includes('/question/'))
        .map(a => ({href: a.href, text: a.innerText.trim().substring(0, 80)}))
        .filter(a => a.text.length > 5);
    JSON.stringify(links.slice(0, 10));
    """)

    if isinstance(result, str):
        links = json.loads(result) if result else []
    elif isinstance(result, list):
        links = result
    else:
        links = []

    if not links:
        print("  WARN: 热榜未找到问题链接，使用默认问题")
        return {"url": "https://www.zhihu.com/hot", "question_id": None}

    # 优先选 AI/科技相关
    ai_keywords = ["AI", "人工智能", "GPT", "Claude", "机器人", "算法", "大模型", "科技"]
    for link in links:
        for kw in ai_keywords:
            if kw.lower() in link.get("text", "").lower():
                qid = link["href"].split("/question/")[1].split("?")[0].split("/")[0]
                return {"url": link["href"], "question_id": qid}

    # 没有匹配的就用第一个
    link = links[0]
    qid = link["href"].split("/question/")[1].split("?")[0].split("/")[0]
    return {"url": link["href"], "question_id": qid}


def do_upvote(tid):
    """赞同回答"""
    result = cdp_eval(tid, """
    var btns = [...document.querySelectorAll('button.VoteButton')];
    if (btns.length > 0) {
        var btn = btns[0];
        var text = btn.innerText.replace(/[\\u200b\\s]/g, '');
        if (text.includes('已赞同')) {
            JSON.stringify({already: true, text: text.substring(0, 20)});
        } else {
            btn.scrollIntoView({block: 'center'});
            btn.click();
            JSON.stringify({done: true, text: text.substring(0, 20)});
        }
    } else {
        JSON.stringify({error: 'no VoteButton found'});
    }
    """)
    return result


def do_comment(tid, comment_text="写得很好，学习了，感谢分享经验！"):
    """API 评论回答"""
    # 获取 answer_id 和作者 url_token
    info = cdp_eval(tid, """
    var item = document.querySelector('.AnswerItem');
    var aid = item ? item.getAttribute('name') : null;
    var authorLink = item ? item.querySelector('.AuthorInfo a[href]') : null;
    var token = authorLink ? (authorLink.href.split('/people/')[1] || '').split('?')[0] : null;
    JSON.stringify({answerId: aid, authorToken: token});
    """)

    if isinstance(info, str):
        info = json.loads(info)

    answer_id = info.get("answerId")
    if not answer_id:
        print("  WARN: 未找到 answerId")
        return None

    # API 评论
    escaped = comment_text.replace("\\", "\\\\").replace('"', '\\"')
    result = cdp_eval(tid, f"""
    fetch("https://www.zhihu.com/api/v4/answers/{answer_id}/comments", {{
        method: "POST",
        credentials: "include",
        headers: {{"Content-Type": "application/json"}},
        body: JSON.stringify({{content: "{escaped}"}})
    }}).then(r => r.json()).then(d => JSON.stringify(d));
    """)

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            pass
    return result


def do_follow(tid):
    """API 关注回答作者"""
    info = cdp_eval(tid, """
    var item = document.querySelector('.AnswerItem');
    var authorLink = item ? item.querySelector('.AuthorInfo a[href]') : null;
    var token = authorLink ? (authorLink.href.split('/people/')[1] || '').split('?')[0] : null;
    JSON.stringify({token: token});
    """)

    if isinstance(info, str):
        info = json.loads(info)

    token = info.get("token")
    if not token:
        print("  WARN: 未找到作者 token")
        return None

    result = cdp_eval(tid, f"""
    fetch("https://www.zhihu.com/api/v4/members/{token}/followers", {{
        method: "POST",
        credentials: "include",
        headers: {{"Content-Type": "application/json"}}
    }}).then(r => r.json()).then(d => JSON.stringify(d));
    """)

    if isinstance(result, str):
        try:
            result = json.loads(result)
        except json.JSONDecodeError:
            pass
    return result


# ─── 创作任务 ───

def do_write_pin(tid, content):
    """发想法（paste 方式 + ?writepin 入口）
    
    ⚠️ 2026-04-21 确认：此函数大概率无法自动发布。
    isTrusted:false ClipboardEvent 导致 Draft.js React state 为空，
    无论 click/clickAt 均不发 API 请求（XHR 拦截器确认）。
    内容会写入 DOM 但不会真正提交。仅互动任务（--interact-only）即可完成打卡。
    如需发想法，建议将内容写入编辑器后让用户手动 Ctrl+V + 点击发布。
    """
    # 导航到 ?writepin
    cdp_eval(tid, 'window.location.href = "https://www.zhihu.com/?writepin"')
    time.sleep(3)

    # 检查编辑器
    editor_info = cdp_eval(tid, """
    var editors = [...document.querySelectorAll('.public-DraftEditor-content')];
    var modal = document.querySelector('.Modal-wrapper .public-DraftEditor-content');
    JSON.stringify({
        count: editors.length,
        hasModal: !!modal,
        modalLen: modal ? modal.innerText.length : -1
    });
    """)

    if isinstance(editor_info, str):
        editor_info = json.loads(editor_info)

    if editor_info.get("count", 0) == 0:
        print("  WARN: 想法编辑器未打开")
        return False

    # 用 paste 方式写入（最可靠）
    escaped = content.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")
    result = cdp_eval(tid, f"""
    var editor = document.querySelector('.Modal-wrapper .public-DraftEditor-content')
              || document.querySelectorAll('.public-DraftEditor-content')[0];
    editor.focus();
    var text = "{escaped}";
    var html = text.split('\\n').map(function(l) {{ return '<p>' + (l || '<br>') + '</p>'; }}).join('');
    var dt = new DataTransfer();
    dt.setData('text/plain', text);
    dt.setData('text/html', html);
    var pe = new ClipboardEvent('paste', {{bubbles: true, cancelable: true, clipboardData: dt}});
    editor.dispatchEvent(pe);
    editor.click();
    editor.focus();
    editor.dispatchEvent(new Event('input', {{bubbles: true}}));
    JSON.stringify({{len: editor.innerText.length, preview: editor.innerText.substring(0, 50)}});
    """)

    if isinstance(result, str):
        result = json.loads(result)

    written_len = result.get("len", 0)
    print(f"  写入 {written_len} 字")

    if written_len < 30:
        print("  WARN: 写入内容不足 30 字，想法可能失败")
        return False

    # 点击发布
    time.sleep(1)
    cdp_eval(tid, """
    var btns = [...document.querySelectorAll('button')];
    var pubBtn = btns.find(b => /发布/.test(b.innerText.replace(/[\\u200b\\s]/g, '')) && !b.disabled);
    if (pubBtn) { pubBtn.click(); 'clicked'; } else { 'no publish btn'; }
    """)

    time.sleep(3)

    # 验证编辑器是否清空
    check = cdp_eval(tid, """
    var editor = document.querySelector('.Modal-wrapper .public-DraftEditor-content')
              || document.querySelectorAll('.public-DraftEditor-content')[0];
    JSON.stringify({len: editor ? editor.innerText.length : -1});
    """)
    if isinstance(check, str):
        check = json.loads(check)

    return check.get("len", 999) <= 1


# ─── 验证 ───

def verify_daka(tid):
    """创作中心验证打卡状态"""
    cdp_post(f"/navigate?target={tid}&url=https://www.zhihu.com/creator")
    time.sleep(5)

    result = cdp_eval(tid, """
    var body = document.body.innerText;
    var daka = String.fromCharCode(25171,21345);
    var idx = body.indexOf(daka);
    var week = body.indexOf(String.fromCharCode(26412,21608));
    var context = '';
    if (idx > -1) context = body.substring(Math.max(0, idx - 20), idx + 300);
    if (week > -1 && context.length < 50) context += ' | ' + body.substring(week, week + 200);
    JSON.stringify({context: context, hasDaka: idx > -1});
    """)

    if isinstance(result, str):
        result = json.loads(result)

    context = result.get("context", "")
    print(f"  打卡状态: {context[:200]}")

    # 解析本周打卡天数
    days_info = cdp_eval(tid, """
    var body = document.body.innerText;
    var match = body.match(/本周打卡天数\\s*(\\d)/);
    JSON.stringify({days: match ? parseInt(match[1]) : -1});
    """)

    if isinstance(days_info, str):
        days_info = json.loads(days_info)

    return days_info.get("days", -1)


# ─── 主流程 ───

def main():
    parser = argparse.ArgumentParser(description="知乎创作打卡一键脚本")
    parser.add_argument("--interact-only", action="store_true", help="仅完成互动任务")
    parser.add_argument("--content", type=str, default="", help="自定义想法内容")
    parser.add_argument("--no-verify", action="store_true", help="跳过最终验证")
    parser.add_argument("--comment", type=str, default="写得很好，学习了，感谢分享经验！",
                        help="评论内容（默认10字+）")
    args = parser.parse_args()

    # 检查 CDP Proxy
    try:
        cdp_get("/targets")
    except Exception as e:
        print(f"ERROR: CDP Proxy 不可用 ({e})")
        print("请先启动: node cdp-proxy.mjs")
        sys.exit(1)

    print("=" * 50)
    print("知乎打卡一键脚本")
    print("=" * 50)

    # 获取 tab
    tid = get_first_tab()
    print(f"[准备] 使用 tab: {tid[:16]}...")

    # ─── Step 1: 热榜找 AI 问题 ───
    print("\n[1/6] 热榜找 AI 问题...")
    q_info = find_ai_question(tid)
    q_url = q_info["url"]
    print(f"  问题: {q_url}")

    # 导航到问题页
    cdp_post(f"/navigate?target={tid}&url={q_url}")
    time.sleep(4)

    # ─── Step 2: 赞同 ───
    print("\n[2/6] 赞同回答...")
    result = do_upvote(tid)
    if isinstance(result, dict):
        if result.get("already"):
            print(f"  已赞同过: {result.get('text', '')}")
        elif result.get("done"):
            print(f"  ✅ 赞同成功: {result.get('text', '')}")
        else:
            print(f"  结果: {result}")
    else:
        print(f"  结果: {result}")

    # ─── Step 3: 评论 ───
    print("\n[3/6] API 评论...")
    result = do_comment(tid, args.comment)
    if isinstance(result, dict):
        cid = result.get("id")
        if cid:
            print(f"  ✅ 评论成功 (id: {cid})")
        else:
            print(f"  结果: {json.dumps(result, ensure_ascii=False)[:200]}")
    else:
        print(f"  结果: {str(result)[:200]}")

    # ─── Step 4: 关注 ───
    print("\n[4/6] API 关注...")
    result = do_follow(tid)
    if isinstance(result, dict):
        fc = result.get("follower_count")
        if fc:
            print(f"  ✅ 关注成功 (follower_count: {fc})")
        else:
            print(f"  结果: {json.dumps(result, ensure_ascii=False)[:200]}")
    else:
        print(f"  结果: {str(result)[:200]}")

    # ─── Step 5: 创作任务 ───
    if not args.interact_only:
        print("\n[5/6] 发想法（创作任务）...")
        default_content = (
            "AI 时代最大的分水岭不是会不会用 AI，而是愿不愿意在 AI 的基础上再往前走一步。"
            "工具只是杠杆，真正决定作品质量的，是使用工具的人有没有用心思考。"
            "把 AI 当拐杖，走不远；把 AI 当放大器，才能放大自己的独特价值。"
        )
        content = args.content or default_content

        success = do_write_pin(tid, content)
        if success:
            print("  ✅ 想法发布成功（编辑器已清空）")
        else:
            print("  ⚠️ 想法发布不确定，将在验证阶段确认")
            print("  💡 仅互动任务（3/3）通常也足以完成打卡")
    else:
        print("\n[5/6] 跳过创作任务（--interact-only）")
        print("  💡 仅互动任务（3/3）通常也足以完成打卡")

    # ─── Step 6: 验证 ───
    if not args.no_verify:
        print("\n[6/6] 创作中心验证打卡状态...")
        days = verify_daka(tid)
        if days >= 0:
            print(f"\n{'=' * 50}")
            print(f"  📊 本周打卡天数: {days} 天")
            print(f"{'=' * 50}")
        else:
            print("  ⚠️ 无法解析打卡天数，请手动检查 https://www.zhihu.com/creator")
    else:
        print("\n[6/6] 跳过验证（--no-verify）")

    print("\n✅ 打卡流程完成！")


if __name__ == "__main__":
    main()
