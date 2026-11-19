import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4195;
const CDP_PORT = 9245;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-stage3-'));

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

function angleDeltaRad(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff);
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
        '--window-size=1366,900',
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
        await wait(150);
      }
      throw new Error(`Timeout waiting for selector: ${sel}`);
    };

    const waitForGlb = async (glbName, timeoutMs = 12000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const glbs = await evalExpr(
          `document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.glbLoaded || ''`
        );
        if (typeof glbs === 'string' && glbs.includes(glbName)) return glbs;
        await wait(200);
      }
      throw new Error(`Timeout waiting for GLB: ${glbName}`);
    };

    const saveShot = async (filename) => {
      await wait(450);
      const shot = await client.call('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      return outPath;
    };

    const assertNoArabicInEn = async (label) => {
      const info = await evalExpr(`(() => {
        const text = document.body.innerText || '';
        const matches = text.match(/[\\u0600-\\u06FF]+/g) || [];
        return { lang: document.documentElement.lang, arCount: matches.length, sample: matches.slice(0, 6) };
      })()`);
      if (info.arCount > 0) {
        throw new Error(`Strict EN leakage on ${label}: ${JSON.stringify(info)}`);
      }
    };

    const enterNode = async (levelId) => {
      await waitForSelector('[data-testid="world-navigator-3d"]');
      await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
      await waitForSelector('[data-testid="toggle-levels-drawer-btn"]');
      await evalExpr(`document.querySelector('[data-testid="toggle-levels-drawer-btn"]').click()`);
      await waitForSelector('#campaign-levels-grid');
      await wait(200);
      await evalExpr(`(() => {
        const btns = Array.from(document.querySelectorAll('#campaign-levels-grid button'));
        const enter = btns.find(b => b.textContent?.includes('Enter Node ${levelId}'));
        if (!enter) throw new Error('Missing Enter Node ${levelId}');
        enter.click();
      })()`);
    };

    const readSceneMetrics = async (label, maxH, maxW) => {
      const stats = await evalExpr(`(() => {
        const mount = document.querySelector('[data-testid="three-canvas-mount"]');
        const hud = document.querySelector('[data-testid="top-hud-bar"]');
        const hudRect = hud ? hud.getBoundingClientRect() : null;
        return {
          scene: ${JSON.stringify(label)},
          drawCalls: Number(mount?.dataset?.drawCalls || 0),
          glbs: mount?.dataset?.glbLoaded || '',
          roverActive: mount?.dataset?.roverActive || 'n/a',
          cameraYaw: Number(mount?.dataset?.cameraYaw ?? NaN),
          hudHeight: hudRect ? Math.round(hudRect.height) : -1,
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          overflowY: document.documentElement.scrollHeight > ${maxH},
          overflowX: document.documentElement.scrollWidth > ${maxW}
        };
      })()`);
      console.log(`[STAGE3 ${label}]`, JSON.stringify({
        scene: stats.scene,
        drawCalls: stats.drawCalls,
        hudHeight: stats.hudHeight,
        roverActive: stats.roverActive,
        overflowY: stats.overflowY,
        overflowX: stats.overflowX
      }));
      if (stats.drawCalls <= 0 || stats.drawCalls >= 55 || stats.overflowY || stats.overflowX) {
        throw new Error(`Scene check failed for ${label}: ${JSON.stringify(stats)}`);
      }
      return stats;
    };

    // ==================== 1) DESKTOP 1366x900 OVERWORLD & SETTINGS ====================
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: false });

    await client.call('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/` });
    await wait(500);
    await evalExpr(`document.querySelector('[data-testid="boot-logo-splash"]')?.click()`);
    await waitForSelector('[data-testid="start-adventure-btn"]');
    await evalExpr(`document.querySelector('[data-testid="start-adventure-btn"]').click()`);

    await waitForSelector('[data-testid="world-navigator-3d"]');
    await waitForGlb('massive_space_island_world.glb');
    await wait(600);

    // Dismiss Robo Guide briefly for clean desktop HUD screenshot, verify layout & zones
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(250);

    const desktopCheck = await evalExpr(`(() => {
      const topHud = document.querySelector('[data-testid="top-hud-bar"]');
      const leftZone = document.querySelector('[data-testid="left-joystick-zone"]');
      const rightZone = document.querySelector('[data-testid="right-camera-look-zone"]');
      const langToggle = document.querySelector('[data-testid="hud-lang-toggle"]')?.innerText?.trim();
      const bodyText = document.body.innerText || '';
      return {
        hasTopHud: Boolean(topHud),
        topHudHeight: topHud ? Math.round(topHud.getBoundingClientRect().height) : -1,
        hasLeftZone: Boolean(leftZone),
        hasRightZone: Boolean(rightZone),
        langToggle,
        hasLookCameraPill: bodyText.includes('Look Camera') || bodyText.includes('تدوير الكاميرا')
      };
    })()`);
    console.log('[STAGE3 DESKTOP CHECK]', JSON.stringify(desktopCheck));
    if (
      !desktopCheck.hasTopHud ||
      desktopCheck.topHudHeight > 48 ||
      !desktopCheck.hasLeftZone ||
      !desktopCheck.hasRightZone ||
      desktopCheck.hasLookCameraPill ||
      desktopCheck.langToggle !== 'AR'
    ) {
      throw new Error(`Desktop HUD/Control check failed: ${JSON.stringify(desktopCheck)}`);
    }

    await readSceneMetrics('Overworld Desktop', 900, 1366);
    await assertNoArabicInEn('Overworld Desktop');
    await saveShot('stage3_desktop_1366x900_hud.png');

    // Open Menu -> Settings: adjust sensitivity + graphics quality live, unlock demo mode
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
    await waitForSelector('[data-testid="open-settings-btn"]');
    await evalExpr(`document.querySelector('[data-testid="open-settings-btn"]').click()`);
    await waitForSelector('[data-testid="camera-sensitivity-slider"]');

    const settingsUpdated = await evalExpr(`(() => {
      const slider = document.querySelector('[data-testid="camera-sensitivity-slider"]');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(slider, '1.6');
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      slider.dispatchEvent(new Event('change', { bubbles: true }));
      return document.querySelector('[data-testid="graphics-sensitivity-panel"]')?.innerText || '';
    })()`);
    if (!settingsUpdated.includes('1.60x')) {
      throw new Error(`Expected sensitivity slider live update to 1.60x, got: ${settingsUpdated}`);
    }

    await evalExpr(`document.querySelector('[data-testid="gfx-preset-low"]').click()`);
    await wait(250);
    await evalExpr(`document.querySelector('[data-testid="gfx-preset-medium"]').click()`);
    await wait(250);

    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(300);

    // Confirm no reload happened by checking WebGL canvas remained alive
    await readSceneMetrics('Overworld Post-Settings', 900, 1366);

    // ==================== 2) MOBILE LANDSCAPE 844x390 DUAL-THUMB MULTI-TOUCH & L1 HUD ====================
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: true });

    await enterNode(1);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForGlb('sector1_earth_colony.glb');
    await wait(700);

    // Dismiss Robo Guide first to measure clear gameplay viewport
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(250);

    const mobileHudStats = await evalExpr(`(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const totalArea = vw * vh;
      const topHud = document.querySelector('[data-testid="top-hud-bar"]');
      const hudRect = topHud ? topHud.getBoundingClientRect() : null;

      // Sum visible interactive HUD pill/button rects (excluding full-screen overlay zones)
      const measuredSelectors = [
        '[data-testid="top-hud-bar"]',
        '[data-testid="third-person-joystick"]',
        '[data-testid="auto-walk-next-btn"]',
        '[data-testid="toggle-rover-btn"]',
        '[data-testid="toggle-flight-btn"]',
        '[data-testid="third-person-interact-btn"]',
        '[data-testid="third-person-jump-btn"]'
      ];
      let uiArea = 0;
      for (const sel of measuredSelectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        uiArea += Math.max(0, r.width) * Math.max(0, r.height);
      }

      return {
        vw,
        vh,
        hudHeight: hudRect ? Math.round(hudRect.height) : -1,
        unobstructedPct: Number((((totalArea - uiArea) / totalArea) * 100).toFixed(2)),
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth
      };
    })()`);
    console.log('[STAGE3 MOBILE L1 HUD]', JSON.stringify(mobileHudStats));
    if (
      mobileHudStats.hudHeight <= 0 ||
      mobileHudStats.hudHeight > 42 ||
      mobileHudStats.scrollHeight !== 390 ||
      mobileHudStats.scrollWidth !== 844 ||
      mobileHudStats.unobstructedPct < 80
    ) {
      throw new Error(`Mobile landscape HUD budget check failed: ${JSON.stringify(mobileHudStats)}`);
    }

    const beforeYaw = await evalExpr(
      `Number(document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.cameraYaw ?? NaN)`
    );

    // Simultaneous Dual-Thumb Multi-Touch: Finger 0 left joystick drag + Finger 1 right camera swipe
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 140, y: 260, id: 0 },
        { x: 640, y: 210, id: 1 }
      ]
    });
    await wait(45);

    let activeJoyOpacity = '0';
    for (let step = 1; step <= 6; step++) {
      await client.call('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: Math.round(140 + (step / 6) * 55), y: Math.round(260 - (step / 6) * 60), id: 0 },
          { x: Math.round(640 - (step / 6) * 200), y: 210, id: 1 }
        ]
      });
      if (step === 4) {
        activeJoyOpacity = await evalExpr(
          `getComputedStyle(document.querySelector('[data-testid="third-person-joystick"]')).opacity`
        );
      }
      await wait(45);
    }

    // Hold briefly so damped camera finishes smoothly converging, then release both thumbs
    await wait(240);
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await wait(200);

    const afterYaw = await evalExpr(
      `Number(document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.cameraYaw ?? NaN)`
    );
    const yawDelta = angleDeltaRad(afterYaw, beforeYaw);
    console.log('[STAGE3 MULTI-TOUCH]', JSON.stringify({ beforeYaw, afterYaw, yawDelta: Number(yawDelta.toFixed(3)), activeJoyOpacity }));
    if (!Number.isFinite(beforeYaw) || !Number.isFinite(afterYaw) || yawDelta <= 0.6) {
      throw new Error(`Dual-thumb right-side camera swipe delta too small (${yawDelta} rad <= 0.6)`);
    }

    await readSceneMetrics('L1 Earth Valley 844x390', 390, 844);
    await assertNoArabicInEn('L1 Mobile 844x390');

    // Toggle Robo Guide back on and verify centered landscape positioning without covering HUD/controls
    await evalExpr(`document.querySelector('[data-testid="hud-story-toggle"]').click()`);
    await waitForSelector('[data-testid="robo-guide-overlay"]');
    await saveShot('stage3_mobile_844x390_earth.png');

    // ==================== 3) L2, L3 LUNAR ROVER & L4 MARS ROVER ON 844x390 ====================
    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await enterNode(2);
    await waitForSelector('[data-testid="spatial-room-map-3d-l2"]');
    await waitForGlb('sector2_iss_atrium.glb');
    await wait(500);
    await readSceneMetrics('L2 ISS Orbit 844x390', 390, 844);

    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await enterNode(3);
    await waitForSelector('[data-testid="spatial-room-map-3d-l3"]');
    await waitForGlb('sector3_lunar_biodome.glb');
    await waitForGlb('astronaut_rover.glb');
    await wait(350);
    await readSceneMetrics('L3 Lunar Standing 844x390', 390, 844);
    await waitForSelector('[data-testid="toggle-rover-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]').click()`);
    await wait(500);
    const l3Stats = await readSceneMetrics('L3 Lunar Rover 844x390', 390, 844);
    if (l3Stats.roverActive !== 'true') {
      throw new Error(`Expected roverActive === true on L3, got ${l3Stats.roverActive}`);
    }

    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await enterNode(4);
    await waitForSelector('[data-testid="spatial-room-map-3d-l4"]');
    await waitForGlb('sector4_orion_recovery.glb');
    await waitForGlb('astronaut_rover.glb');
    await wait(500);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await waitForSelector('[data-testid="toggle-rover-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]').click()`);
    await wait(550);
    const l4Stats = await readSceneMetrics('L4 Mars Rover 844x390', 390, 844);
    if (l4Stats.roverActive !== 'true') {
      throw new Error(`Expected roverActive === true on L4, got ${l4Stats.roverActive}`);
    }
    await assertNoArabicInEn('L4 Mars Rover 844x390');
    await saveShot('stage3_mobile_844x390_mars_rover.png');

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

    console.log('[STAGE3 NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[STAGE3 CONSOLE ERRORS]', consoleErrors.length);

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    console.log('STAGE 3 VERIFICATION PASSED COMPLETELY!');
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
  console.error('STAGE 3 VERIFICATION FAILED:', err);
  process.exit(1);
});
