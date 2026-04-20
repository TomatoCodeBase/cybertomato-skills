#!/usr/bin/env python3
r"""
Darwin Skill - Result Card Screenshot Generator

Adapted for Hermes Agent on Windows/Linux/macOS.
Uses Python playwright for high-res rendering.

Usage:
    python scripts/screenshot.py [html_path] [output_path]

Features:
    - 2x deviceScaleFactor for high-res output
    - Clips to .card element only
    - Waits for fonts to load
    - Cross-platform (Windows/Linux/macOS)
"""

import sys
import os
from pathlib import Path

# Resolve skill root directory
SKILL_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_HTML = SKILL_ROOT / "templates" / "result-card.html"
DEFAULT_OUTPUT = SKILL_ROOT / "templates" / "result-card.png"


def take_screenshot(html_path: str, output_path: str):
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("ERROR: playwright not installed. Run: pip install playwright && playwright install chromium")
        sys.exit(1)

    html_path = Path(html_path).resolve()
    output_path = Path(output_path).resolve()

    if not html_path.exists():
        print(f"ERROR: HTML file not found: {html_path}")
        sys.exit(1)

    output_path.parent.mkdir(parents=True, exist_ok=True)

    # Read the hash fragment to determine theme
    # (The HTML uses CSS hash-based themes: #swiss, #terminal, #newspaper)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        try:
            context = browser.new_context(
                viewport={"width": 920, "height": 1600},
                device_scale_factor=2,
            )
            page = context.new_page()
            page.goto(f"file://{html_path}", wait_until="networkidle")

            # Wait for fonts
            page.evaluate("document.fonts.ready")
            page.wait_for_timeout(2000)

            # Screenshot just the .card element
            card = page.locator(".card")
            card.screenshot(path=str(output_path), type="png")

            box = card.bounding_box()
            if box:
                print(f"Screenshot saved: {output_path}")
                print(f"Card size: {int(box['width'])}x{int(box['height'])}px (CSS)")
                print(f"Output size: {int(box['width'] * 2)}x{int(box['height'] * 2)}px (2x retina)")
        finally:
            browser.close()


if __name__ == "__main__":
    html_arg = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_HTML)
    output_arg = sys.argv[2] if len(sys.argv) > 2 else str(DEFAULT_OUTPUT)
    take_screenshot(html_arg, output_arg)
