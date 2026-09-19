import sys
import time
from playwright.sync_api import sync_playwright

if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

artifact_dir = "C:/Users/GusGumee/.gemini/antigravity/brain/c3c3932c-e71d-4b91-b249-8234cdcb9c16"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    
    print("Navigating to http://127.0.0.1:8998/modules/europa/index.html#v=real ...")
    page.goto("http://127.0.0.1:8998/modules/europa/index.html#v=real", wait_until="networkidle")
    page.wait_for_selector("[data-realmap-loading]", state="hidden", timeout=25000)
    time.sleep(2)

    # 1. China View
    print("Capturing China view...")
    page.click('[data-realmap-view="china"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_china_view.png")

    # 2. Lhasa Card
    print("Selecting Norbulingka (Lhasa)...")
    page.evaluate('''() => {
      const p = window.europaRealMapState?.data?.pois?.find(x => x.id === "poi-cn-norbulingka");
      if (p) window.europaRealMapSelectPoi(p, true);
    }''')
    time.sleep(1.8)
    page.screenshot(path=f"{artifact_dir}/card_lhasa_norbulingka.png")

    # 3. Kashgar Card
    print("Selecting Kashgar Old Town...")
    page.evaluate('''() => {
      const p = window.europaRealMapState?.data?.pois?.find(x => x.id === "poi-cn-kashgaroldtown");
      if (p) window.europaRealMapSelectPoi(p, true);
    }''')
    time.sleep(1.8)
    page.screenshot(path=f"{artifact_dir}/card_kashgar_muqam.png")

    # 4. Middle East View
    print("Capturing Middle East view...")
    page.click('[data-realmap-view="middleeast"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_middleeast_view.png")

    # 5. Isfahan Ali Qapu Card
    print("Selecting Isfahan Ali Qapu...")
    page.evaluate('''() => {
      const p = window.europaRealMapState?.data?.pois?.find(x => x.id === "poi-me-aliqapu");
      if (p) window.europaRealMapSelectPoi(p, true);
    }''')
    time.sleep(1.8)
    page.screenshot(path=f"{artifact_dir}/card_isfahan_aliqapu.png")

    # 6. Africa View
    print("Capturing Africa view...")
    page.click('[data-realmap-view="africa"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_africa_surge.png")

    # 7. Lagos New Afrika Shrine Card
    print("Selecting Lagos New Afrika Shrine...")
    page.evaluate('''() => {
      const p = window.europaRealMapState?.data?.pois?.find(x => x.id === "poi-af-newafrikashrine");
      if (p) window.europaRealMapSelectPoi(p, true);
    }''')
    time.sleep(1.8)
    page.screenshot(path=f"{artifact_dir}/card_lagos_afrikashrine.png")

    print("\nConsole errors:", console_errors)
    print("Browser test verification complete!")
    browser.close()
