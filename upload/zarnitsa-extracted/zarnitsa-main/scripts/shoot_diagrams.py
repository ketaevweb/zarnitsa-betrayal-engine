#!/usr/bin/env python3
"""Screenshot diagram HTML files to PNG at 2x device scale (300dpi print quality)."""
import sys
from playwright.sync_api import sync_playwright

JOBS = [
    ("diagram_loop.html", "loop.png", 1060, 580),
    ("diagram_betrayal.html", "betrayal.png", 1040, 710),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for html_name, png_name, w, h in JOBS:
            page = browser.new_page(viewport={"width": w, "height": h}, device_scale_factor=2)
            page.goto(f"file:///home/z/my-project/scripts/{html_name}")
            page.wait_for_timeout(400)
            canvas = page.locator(".canvas")
            canvas.screenshot(path=f"/home/z/my-project/download/gdd_assets/{png_name}")
            print(f"OK {png_name}")
            page.close()
        browser.close()

if __name__ == "__main__":
    main()
