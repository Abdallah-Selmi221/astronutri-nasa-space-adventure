import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4197;
const CDP_PORT = 9247;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-phase1b-'));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      // retry
    }
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function createCdpClient(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let nextId = 1;
    const pending = new Map();
    const events = [];

    ws.addEventListener('open', () => {
      resolve({
        call(method, params = {}) {
          const id = nextId++;
          return new Promise((res, rej) => {
            pending.set(id, { res, rej });
            ws.send(JSON.stringify({ id, method, params }));
          });
        },
        events,
        close() {
          try {
            ws.close();
          } catch {
            // ignore
          }
        }
      });
    });

    ws.addEventListener('message', (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id && pending.has(data.id)) {
        const { res, rej } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) rej(new Error(data.error.message));
        else res(data.result);
      } else if (data.method) {
        events.push(data);
      }
    });

    ws.addEventListener('error', (err) => reject(err));
  });
}

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

async function run() {
  const preview = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
    { cwd: 'e:\\Nasa team', stdio: 'ignore', shell: true }
  );

  let chrome;
  let client;

  try {
    await waitForHttp(`http://127.0.0.1:${PREVIEW_PORT}/`);
    chrome = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${USER_DATA_DIR}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-gpu-sandbox',
        '--enable-webgl',
        '--ignore-gpu-blocklist',
        '--use-gl=angle',
        '--use-angle=swiftshader',
        '--window-size=844,390',
        'about:blank'
      ],
      { stdio: 'ignore' }
    );

    const listRes = await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No Chrome CDP page target found');

    client = await createCdpClient(pageTarget.webSocketDebuggerUrl);
    await client.call('Page.enable');
    await client.call('Runtime.enable');
    await client.call('Log.enable');
    await client.call('Network.enable');

    const evalExpr = async (expr) => {
      const r = await client.call('Runtime.evaluate', {
        expression: expr,
        returnByValue: true,
        awaitPromise: true
      });
      if (r.exceptionDetails) {
        throw new Error(`JS Eval Exception: ${JSON.stringify(r.exceptionDetails)}`);
      }
      return r.result ? r.result.value : undefined;
    };

    const waitForSelector = async (sel, timeoutMs = 20000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const ok = await evalExpr(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
        if (ok) return true;
        await wait(120);
      }
      throw new Error(`Timeout waiting for selector: ${sel}`);
    };

    const saveShot = async (filename) => {
      const shot = await client.call('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      return outPath;
    };

    const assertLanguagePurity = async (label, expectedLang) => {
      const info = await evalExpr(`(() => {
        const text = document.body.innerText || '';
        const arMatches = text.match(/[\\u0600-\\u06FF]+/g) || [];
        return {
          dir: document.querySelector('[data-testid="minigame-workspace"]')?.closest('[dir]')?.getAttribute('dir') || document.documentElement.dir || '',
          arCount: arMatches.length,
          arSample: arMatches.slice(0, 6)
        };
      })()`);
      if (expectedLang === 'en' && info.arCount > 0) {
        throw new Error(`Strict EN leakage on ${label}: ${JSON.stringify(info)}`);
      }
      if (expectedLang === 'ar' && info.arCount === 0) {
        throw new Error(`Expected Arabic script on ${label} but none found: ${JSON.stringify(info)}`);
      }
      return info;
    };

    const checkRoboOverlayGeometry = async (label, vw, vh) => {
      const boxInfo = await evalExpr(`(() => {
        const rectOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height)
          };
        };
        return {
          robo: rectOf('[data-testid="robo-guide-overlay"]'),
          hud: rectOf('[data-testid="top-hud-bar"]'),
          joystick: rectOf('[data-testid="third-person-joystick"]'),
          jump: rectOf('[data-testid="third-person-jump-btn"]'),
          interact: rectOf('[data-testid="third-person-interact-btn"]')
        };
      })()`);

      if (!boxInfo.robo || !boxInfo.hud) {
        throw new Error(`Missing robo overlay or hud on ${label}: ${JSON.stringify(boxInfo)}`);
      }
      const heroZone = {
        left: Math.round(vw * 0.35),
        right: Math.round(vw * 0.65),
        top: Math.round(vh * 0.35),
        bottom: Math.round(vh * 0.85)
      };
      const overlapsHero = rectsOverlap(boxInfo.robo, heroZone);
      const overlapsHud = rectsOverlap(boxInfo.robo, boxInfo.hud);
      const overlapsJoystick = rectsOverlap(boxInfo.robo, boxInfo.joystick);
      const overlapsJump = rectsOverlap(boxInfo.robo, boxInfo.jump);
      const overlapsInteract = rectsOverlap(boxInfo.robo, boxInfo.interact);

      console.log(`[ROBO GUIDE ${label} ${vw}x${vh}]`, JSON.stringify({
        robo: boxInfo.robo,
        heroZone,
        overlapsHero,
        overlapsHud,
        overlapsJoystick,
        overlapsJump,
        overlapsInteract
      }));

      if (boxInfo.robo.height > 74 || overlapsHero || overlapsHud || overlapsJoystick || overlapsJump || overlapsInteract) {
        throw new Error(`RoboGuideOverlay geometry check failed on ${label}: ${JSON.stringify(boxInfo)}`);
      }
      return boxInfo;
    };

    const enterNode = async (levelId) => {
      const onWorld = await evalExpr(`Boolean(document.querySelector('[data-testid="world-navigator-3d"]'))`);
      if (!onWorld) {
        if (await evalExpr(`Boolean(document.querySelector('[data-testid="minigame-back-btn"]'))`)) {
          await evalExpr(`document.querySelector('[data-testid="minigame-back-btn"]').click()`);
          await waitForSelector('[data-testid="hud-back-world-btn"]');
        }
        if (await evalExpr(`Boolean(document.querySelector('[data-testid="hud-back-world-btn"]'))`)) {
          await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
          await waitForSelector('[data-testid="world-navigator-3d"]');
        }
      }
      await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
      await waitForSelector('[data-testid="toggle-levels-drawer-btn"]');
      await evalExpr(`document.querySelector('[data-testid="toggle-levels-drawer-btn"]').click()`);
      await waitForSelector('#campaign-levels-grid');
      await wait(160);
      await evalExpr(`(() => {
        const btns = Array.from(document.querySelectorAll('#campaign-levels-grid button'));
        const enter = btns.find(b => b.textContent?.includes('Enter Node ${levelId}'));
        if (!enter) throw new Error('Missing Enter Node ${levelId}');
        enter.click();
      })()`);
      await waitForSelector(`[data-testid="spatial-room-map-3d-l${levelId}"]`);
      await wait(500);
    };

    const openStationFromHub = async (titleSubstring) => {
      await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
      await waitForSelector('[data-testid="toggle-rooms-drawer-btn"]');
      await evalExpr(`document.querySelector('[data-testid="toggle-rooms-drawer-btn"]').click()`);
      await wait(200);
      await evalExpr(`(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const target = btns.find(b => b.textContent?.includes(${JSON.stringify(titleSubstring)}));
        if (!target) throw new Error('Missing station button: ' + ${JSON.stringify(titleSubstring)});
        target.click();
      })()`);
      await waitForSelector('[data-testid="minigame-workspace"]');
      await wait(450);
    };

    const auditStationLayout = async (stationLabel, vw, vh, expectedLang = 'en', expectCta = true) => {
      const m = await evalExpr(`(() => {
        const rectOf = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            width: Math.round(r.width),
            height: Math.round(r.height)
          };
        };
        const rootDirEl = document.querySelector('[data-testid="minigame-workspace"]')?.closest('[dir]');
        const leafTexts = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while ((node = walker.nextNode())) {
          const el = node;
          if (el.children.length > 0) continue;
          if (el.closest('[data-testid^="pantry-item-"], [data-testid="food-tray-dropzone"] button')) continue;
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) continue;
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
          const txt = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
          if (txt.length >= 36) {
            leafTexts.push(txt);
          }
        }
        const counts = new Map();
        for (const t of leafTexts) counts.set(t, (counts.get(t) || 0) + 1);
        const duplicates = Array.from(counts.entries()).filter(([, c]) => c > 1);

        return {
          dir: rootDirEl?.getAttribute('dir') || 'ltr',
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          topBar: rectOf('[data-testid="minigame-top-bar"]'),
          leftCol: rectOf('[data-station-col="left"]'),
          rightCol: rectOf('[data-station-col="right"]'),
          roboTip: rectOf('[data-testid="robo-tip-strip"]'),
          cta: rectOf('[data-testid="station-primary-cta"]'),
          hasBlockingBriefing: Boolean(document.querySelector('[data-testid="robo-briefing-card"]')),
          hasBlockingDemo: Boolean(document.querySelector('[data-testid="minigame-demo-overlay"]')),
          duplicates
        };
      })()`);

      await assertLanguagePurity(stationLabel, expectedLang);

      const isRtl = m.dir === 'rtl';
      const sideBySideOk = Boolean(
        m.leftCol &&
        m.rightCol &&
        m.leftCol.width > 120 &&
        m.rightCol.width > 160 &&
        Math.abs(m.leftCol.top - m.rightCol.top) <= 6 &&
        (isRtl ? m.rightCol.right <= m.leftCol.left + 4 : m.leftCol.right <= m.rightCol.left + 4)
      );
      const ctaInView = !expectCta || Boolean(m.cta && m.cta.height > 18 && m.cta.top >= (m.topBar?.bottom ?? 36) && m.cta.bottom <= vh + 1);

      console.log(`[PHASE1B STATION ${stationLabel} ${vw}x${vh} ${m.dir}]`, JSON.stringify({
        scrollHeight: m.scrollHeight,
        scrollWidth: m.scrollWidth,
        topBarH: m.topBar?.height,
        leftCol: m.leftCol,
        rightCol: m.rightCol,
        roboTipBottom: m.roboTip?.bottom,
        ctaBottom: m.cta?.bottom,
        sideBySideOk,
        ctaInView,
        duplicates: m.duplicates,
        hasBlockingBriefing: m.hasBlockingBriefing,
        hasBlockingDemo: m.hasBlockingDemo
      }));

      if (
        m.hasBlockingBriefing ||
        m.hasBlockingDemo ||
        !m.topBar ||
        m.topBar.height > 42 ||
        m.scrollHeight > vh ||
        m.scrollWidth > vw ||
        !sideBySideOk ||
        !ctaInView ||
        !m.roboTip ||
        m.roboTip.bottom > vh ||
        m.duplicates.length > 0
      ) {
        throw new Error(`Station ${stationLabel} layout verification failed at ${vw}x${vh}: ${JSON.stringify(m)}`);
      }
    };

    // ==================== 1) MOBILE LANDSCAPE 844x390: WORLD + L1 ROBO GUIDE NON-OVERLAP ====================
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: true });

    await client.call('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/` });
    await wait(450);
    await evalExpr(`document.querySelector('[data-testid="boot-logo-splash"]')?.click()`);
    await waitForSelector('[data-testid="start-adventure-btn"]');
    await evalExpr(`document.querySelector('[data-testid="start-adventure-btn"]').click()`);
    await waitForSelector('[data-testid="world-navigator-3d"]');
    await wait(1200);

    await checkRoboOverlayGeometry('WorldMap-EN', 844, 390);
    await assertLanguagePurity('WorldMap-EN', 'en');

    // Unlock all 4 campaign levels for multi-level station inspection
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
    await waitForSelector('[data-testid="open-settings-btn"]');
    await evalExpr(`document.querySelector('[data-testid="open-settings-btn"]').click()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(300);

    // Enter Level 1 Deck & verify RoboGuideOverlay against center astronaut + controls
    await enterNode(1);
    await waitForSelector('[data-testid="robo-guide-overlay"]');
    await wait(700);
    await checkRoboOverlayGeometry('Level1Deck-EN', 844, 390);
    await saveShot('phase1b_robo_guide_844x390.png');

    // ==================== 2) LEVEL 1: l1_food_prep + Popover + Compact Demo + Arabic RTL ====================
    await openStationFromHub('Space Kitchen: Pack Zero-Crumb Food');
    await auditStationLayout('l1_food_prep', 844, 390, 'en', true);
    await saveShot('phase1b_l1_food_844x390.png');

    // Progressive Disclosure Info Popover check
    await evalExpr(`document.querySelector('[data-testid="minigame-info-btn"]').click()`);
    await waitForSelector('[data-testid="robo-info-popover"]');
    await wait(250);
    const infoCheck = await evalExpr(`(() => {
      const pop = document.querySelector('[data-testid="robo-info-popover"]');
      const r = pop.getBoundingClientRect();
      const popTexts = [];
      const w = document.createTreeWalker(pop, NodeFilter.SHOW_ELEMENT);
      let n;
      while ((n = w.nextNode())) {
        if (n.children.length > 0) continue;
        const txt = (n.innerText || n.textContent || '').trim().replace(/\\s+/g, ' ');
        if (txt.length >= 30) popTexts.push(txt);
      }
      const counts = new Map();
      for (const t of popTexts) counts.set(t, (counts.get(t) || 0) + 1);
      const popDuplicates = Array.from(counts.entries()).filter(([, c]) => c > 1);
      return {
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        hasDataset: Boolean(document.querySelector('[data-testid="open-nasa-drawer-btn"]')),
        hasStory: Boolean(document.querySelector('[data-testid="stage-story-strip"]')),
        popDuplicates
      };
    })()`);
    console.log('[PHASE1B INFO POPOVER]', JSON.stringify(infoCheck));
    if (!infoCheck.hasDataset || !infoCheck.hasStory || infoCheck.bottom > 390 || infoCheck.popDuplicates.length > 0) {
      throw new Error(`Robo info popover failed bounds/duplicate check: ${JSON.stringify(infoCheck)}`);
    }
    await evalExpr(`document.querySelector('[data-testid="robo-info-close-btn"]').click()`);
    await wait(150);

    // On-Demand Compact 5s Demo Overlay check
    await evalExpr(`document.querySelector('[data-testid="replay-demo-btn"]').click()`);
    await waitForSelector('[data-testid="minigame-demo-overlay"]');
    await wait(250);
    const demoCheck = await evalExpr(`(() => {
      const d = document.querySelector('[data-testid="minigame-demo-overlay"]').getBoundingClientRect();
      const s = document.querySelector('[data-testid="demo-skip-btn"]').getBoundingClientRect();
      return {
        demoHeight: Math.round(d.height),
        demoBottom: Math.round(d.bottom),
        skipBottom: Math.round(s.bottom),
        scrollHeight: document.documentElement.scrollHeight
      };
    })()`);
    console.log('[PHASE1B COMPACT DEMO]', JSON.stringify(demoCheck));
    if (demoCheck.scrollHeight > 390 || demoCheck.skipBottom > 390 || demoCheck.demoBottom > 390) {
      throw new Error(`Compact 5s demo failed bounds check: ${JSON.stringify(demoCheck)}`);
    }
    await evalExpr(`document.querySelector('[data-testid="demo-skip-btn"]').click()`);
    await wait(150);

    // Toggle Arabic RTL & verify mirrored 2-column zero-scroll layout
    await evalExpr(`document.querySelector('[data-testid="minigame-lang-toggle"]').click()`);
    await wait(300);
    await auditStationLayout('l1_food_prep-AR', 844, 390, 'ar', true);
    await saveShot('phase1b_l1_food_ar_844x390.png');
    await evalExpr(`document.querySelector('[data-testid="minigame-lang-toggle"]').click()`);
    await wait(200);

    // Station 1.2: l1_equipment_prep
    await evalExpr(`document.querySelector('[data-testid="minigame-back-btn"]').click()`);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await openStationFromHub('Suit Rack: Gear & SPACE-FIT X Check');
    await auditStationLayout('l1_equipment_prep', 844, 390, 'en', true);
    await saveShot('phase1b_l1_equip_844x390.png');

    // ==================== 3) LEVEL 2: l2_balanced_meal (includes inline HydrationGame) ====================
    await enterNode(2);
    await openStationFromHub('Orbital Galley: Zero-G Meal & Hydration');
    await auditStationLayout('l2_balanced_meal', 844, 390, 'en', true);
    await saveShot('phase1b_l2_meal_844x390.png');

    // ==================== 4) LEVEL 3: l3_water_recycling (includes PipePuzzle) ====================
    await enterNode(3);
    await openStationFromHub('Hydroponic & ECLSS Water Lab');
    await auditStationLayout('l3_water_recycling', 844, 390, 'en', true);
    await saveShot('phase1b_l3_water_844x390.png');

    // ==================== 5) LEVEL 4: l4_departure_prep (CoM + Circuit Breaker) ====================
    await enterNode(4);
    await openStationFromHub('Medical & Cargo Bay: Orion Departure Check');
    await auditStationLayout('l4_departure_prep', 844, 390, 'en', true);
    await saveShot('phase1b_l4_departure_844x390.png');

    // ==================== 6) DESKTOP 1366x900 CHECK ====================
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: false });
    await wait(350);
    await auditStationLayout('l4_departure_prep-desktop', 1366, 900, 'en', true);

    await evalExpr(`document.querySelector('[data-testid="minigame-back-btn"]').click()`);
    await waitForSelector('[data-testid="spatial-room-map-3d-l4"]');
    await wait(500);
    await checkRoboOverlayGeometry('Level4Deck-Desktop', 1366, 900);
    await saveShot('phase1b_desktop_1366x900.png');

    // Console & Network Audits
    const failedResponses = client.events
      .filter((e) => e.method === 'Network.responseReceived' && e.params?.response?.status >= 400)
      .map((e) => ({ url: e.params.response.url, status: e.params.response.status }));
    const consoleErrors = client.events.filter(
      (e) =>
        (e.method === 'Runtime.exceptionThrown' ||
          (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error') ||
          (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')) &&
        !JSON.stringify(e).includes('favicon')
    );

    console.log('[PHASE1B NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[PHASE1B CONSOLE ERRORS]', consoleErrors.length);

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    console.log('PHASE 1B VERIFICATION PASSED COMPLETELY!');
  } finally {
    if (client) client.close();
    if (chrome) {
      try {
        chrome.kill();
      } catch {
        // ignore
      }
    }
    try {
      preview.kill();
    } catch {
      // ignore
    }
    try {
      fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

run().catch((err) => {
  console.error('PHASE 1B VERIFICATION FAILED:', err);
  process.exit(1);
});
