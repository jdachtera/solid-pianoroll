#!/usr/bin/env python3
"""Behaviour check for the solid-viewport-migrated piano roll demo (127.0.0.1:3000).

Stage A is behaviour-preserving, so this asserts the piano roll still renders and
that alt+wheel zoom (its ScrollZoomContainer) scales notes on each axis, with no
console errors."""
import sys
from playwright.sync_api import sync_playwright

URL = "http://127.0.0.1:3000/"
errors = []
passed, failed = [], []


def check(name, cond, detail=""):
    (passed if cond else failed).append(name)
    print(f"  {'PASS' if cond else 'FAIL'}  {name}" + (f"  — {detail}" if detail else ""))


with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 800})
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(URL, wait_until="networkidle")
    page.wait_for_timeout(1200)

    n_notes = page.evaluate("() => document.querySelectorAll('[class*=Note_]').length")
    n_white = page.evaluate("() => document.querySelectorAll('[class*=white_]').length")
    n_black = page.evaluate("() => document.querySelectorAll('[class*=black_]').length")
    check("notes render", n_notes > 0, f"{n_notes} notes")
    check("keys render (white + black)", n_white > 0 and n_black > 0, f"{n_white} white, {n_black} black")

    nb = page.evaluate(
        "()=>{const e=document.querySelector('[class*=PianoRollNotes_]');const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}")
    cx, cy = nb["x"] + nb["w"] / 2, nb["y"] + nb["h"] / 2

    # Definitive horizontal-zoom signal: the notes scroll-content width (= zoom *
    # pixelSize). Per-note width is unreliable (culling drops notes out of the DOM).
    content_w = lambda: page.evaluate(
        "()=>{let e=document.querySelector('[class*=PianoRollNotes_]');while(e){const s=getComputedStyle(e);if(s.overflow==='scroll'||s.overflowX==='scroll')return e.firstElementChild.getBoundingClientRect().width;e=e.parentElement;}return -1;}")
    note_h = lambda: page.evaluate(
        "()=>{const n=document.querySelector('[class*=Note_]');return n?n.getBoundingClientRect().height:0;}")

    page.keyboard.down("Alt")
    page.mouse.move(cx, cy)
    # Alt + horizontal wheel (negative deltaX) = time zoom in -> content widens.
    w0 = content_w()
    page.mouse.wheel(-120, 0)
    page.wait_for_timeout(200)
    w1 = content_w()
    check("alt+horizontal wheel zooms time (content widens)", w1 > w0 + 5, f"content {w0:.0f} -> {w1:.0f}")

    # Alt + vertical wheel = pitch zoom in -> notes get taller.
    h0 = note_h()
    page.mouse.wheel(0, -120)
    page.wait_for_timeout(200)
    h1 = note_h()
    page.keyboard.up("Alt")
    check("alt+vertical wheel zooms pitch (note heightens)", h1 > h0 + 0.5, f"note h {h0:.1f} -> {h1:.1f}")

    # Pointer-anchored zoom: the horizontal scroll offset of the notes container.
    scroll_left = lambda: page.evaluate(
        "()=>{let e=document.querySelector('[class*=PianoRollNotes_]');while(e){const s=getComputedStyle(e);if(s.overflow==='scroll'||s.overflowX==='scroll')return e.scrollLeft;e=e.parentElement;}return -1;}")
    # Reset zoom-in state is fine; compare left-edge vs right-edge anchoring on fresh zoom-in.
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(1000)
    nb = page.evaluate("()=>{const e=document.querySelector('[class*=PianoRollNotes_]');const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}")
    left_x, right_x, midy = nb["x"] + 25, nb["x"] + nb["w"] - 25, nb["y"] + nb["h"] / 2

    page.keyboard.down("Alt")
    page.mouse.move(left_x, midy)
    sl_l0 = scroll_left()
    page.mouse.wheel(-160, 0)
    page.wait_for_timeout(200)
    sl_l1 = scroll_left()
    page.mouse.move(right_x, midy)
    sl_r0 = scroll_left()
    page.mouse.wheel(-160, 0)
    page.wait_for_timeout(200)
    sl_r1 = scroll_left()
    page.keyboard.up("Alt")
    check("zoom anchored: left-edge zoom keeps scroll ~put", abs(sl_l1 - sl_l0) < 40, f"scrollLeft {sl_l0:.0f} -> {sl_l1:.0f}")
    check("zoom anchored: right-edge zoom scrolls right", sl_r1 > sl_r0 + 20, f"scrollLeft {sl_r0:.0f} -> {sl_r1:.0f}")

    check("no console/page errors", not errors, f"{errors[:3]}")
    browser.close()

print(f"\n{len(passed)} passed, {len(failed)} failed")
if failed:
    print("FAILED:", ", ".join(failed))
    sys.exit(1)
