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
    
    # 1. Capture Global View
    print("Capturing Global view...")
    page.click('[data-realmap-view="global"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_global_view.png")
    
    # 2. Capture Asia View & Beijing NCPA
    print("Capturing Asia view...")
    page.click('[data-realmap-view="asia"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_asia_view.png")
    
    # Zoom to Beijing and click National Centre for the Performing Arts
    print("Clicking Beijing POI...")
    page.evaluate('''() => {
      // Find NCPA POI and select it directly via map/module
      const poi = window.document.querySelector("#realmap-view");
      // Find button in DOM or trigger selectPoi
      const ev = document.querySelectorAll(".realmap-city-marker");
      const bj = Array.from(ev).find(b => b.textContent.includes("北京"));
      if (bj) bj.click();
    }''')
    time.sleep(1.5)
    # Zoom further
    page.evaluate('''() => {
      // Find National Centre for the Performing Arts
      const markers = Array.from(document.querySelectorAll(".realmap-poi-marker"));
      const target = markers.find(m => m.textContent.includes("国家大剧院"));
      if (target) target.click();
    }''')
    time.sleep(1.5)
    page.screenshot(path=f"{artifact_dir}/terra_musica_beijing_ncpa.png")
    
    # 3. Capture Oceania & Sydney Opera House
    print("Capturing Oceania and Sydney Opera House...")
    page.click('[data-realmap-view="oceania"]')
    time.sleep(1.5)
    page.evaluate('''() => {
      const markers = Array.from(document.querySelectorAll(".realmap-city-marker"));
      const syd = markers.find(m => m.textContent.includes("悉尼"));
      if (syd) syd.click();
    }''')
    time.sleep(1.5)
    page.evaluate('''() => {
      const markers = Array.from(document.querySelectorAll(".realmap-poi-marker"));
      const operahouse = markers.find(m => m.textContent.includes("歌剧院"));
      if (operahouse) operahouse.click();
    }''')
    time.sleep(1.5)
    page.screenshot(path=f"{artifact_dir}/terra_musica_sydney_operahouse.png")
    
    # 4. Capture Buenos Aires Teatro Colón
    print("Capturing Buenos Aires Teatro Colón...")
    page.click('[data-realmap-view="americas"]')
    time.sleep(1.5)
    page.evaluate('''() => {
      const markers = Array.from(document.querySelectorAll(".realmap-city-marker"));
      const ba = markers.find(m => m.textContent.includes("布宜诺斯艾利斯"));
      if (ba) ba.click();
    }''')
    time.sleep(1.5)
    page.evaluate('''() => {
      const markers = Array.from(document.querySelectorAll(".realmap-poi-marker"));
      const colon = markers.find(m => m.textContent.includes("哥伦布剧院"));
      if (colon) colon.click();
    }''')
    time.sleep(1.5)
    page.screenshot(path=f"{artifact_dir}/terra_musica_buenosaires_colon.png")

    # 5. Capture Africa & Middle East View
    print("Capturing Africa and Middle East...")
    page.click('[data-realmap-view="africa"]')
    time.sleep(2)
    page.screenshot(path=f"{artifact_dir}/terra_musica_africa_view.png")

    print("Finished all test captures successfully!")
    browser.close()
