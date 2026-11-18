import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4193;
const CDP_PORT = 9243;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-stage1-'));

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

    const saveShot = async (filename) => {
      await wait(300);
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

    // 1) Desktop 1366x900
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
    await waitForSelector('[data-testid="mission-inventory-bar"]');
    await waitForSelector('[data-testid="hud-energy-bar"]');
    await waitForSelector('[data-testid="hud-oxygen-bar"]');
    await waitForSelector('[data-testid="robo-guide-overlay"]');
    await wait(900);

    const desktopCheck = await evalExpr(`(() => ({
      guardPresent: Boolean(document.querySelector('[data-testid="landscape-orientation-guard"]')),
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth,
      innerHeight: window.innerHeight,
      innerWidth: window.innerWidth,
      overflowY: document.documentElement.scrollHeight > 900,
      overflowX: document.documentElement.scrollWidth > 1366
    }))()`);
    console.log('[STAGE1 DESKTOP 1366x900]', JSON.stringify(desktopCheck));
    if (desktopCheck.guardPresent || desktopCheck.overflowY || desktopCheck.overflowX) {
      throw new Error(`Desktop 1366x900 check failed: ${JSON.stringify(desktopCheck)}`);
    }
    await assertNoArabicInEn('Desktop World Map');
    await saveShot('stage1_desktop_1366x900.png');

    // Dismiss Robo Guide cleanly
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]').click()`);
    const tDismiss0 = Date.now();
    let dismissed = false;
    while (Date.now() - tDismiss0 < 1500) {
      dismissed = await evalExpr(`!document.querySelector('[data-testid="robo-guide-overlay"]')`);
      if (dismissed) break;
      await wait(100);
    }
    if (!dismissed) throw new Error('RoboGuideOverlay did not dismiss cleanly');

    // Unlock demo mode via Settings
    await evalExpr(`document.querySelector('[data-testid="hud-settings-btn"]').click()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(300);

    // Enter Sector 1
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
    await waitForSelector('[data-testid="toggle-levels-drawer-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-levels-drawer-btn"]').click()`);
    await waitForSelector('#campaign-levels-grid');
    await wait(200);
    await evalExpr(`(() => {
      const btns = Array.from(document.querySelectorAll('#campaign-levels-grid button'));
      const enter = btns.find(b => b.textContent?.includes('Enter Node 1'));
      if (!enter) throw new Error('Missing Enter Node 1 button');
      enter.click();
    })()`);

    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForSelector('[data-testid="robo-guide-overlay"]');
    await wait(700);

    // Enter Station 2 (l1_equipment_prep) and check Robo Briefing + Kid Suit Power Card
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
    await waitForSelector('[data-testid="toggle-rooms-drawer-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-rooms-drawer-btn"]').click()`);
    await wait(250);
    await evalExpr(`(() => {
      const btns = Array.from(document.querySelectorAll('.fixed.inset-0.z-40 button'));
      const match = btns.find(b => (b.textContent || '').includes('2. '));
      if (!match) throw new Error('Missing Station 2 button in Level 1');
      match.click();
    })()`);

    await waitForSelector('[data-testid="robo-briefing-card"]');
    await waitForSelector('[data-testid="briefing-robo-character"]');
    await evalExpr(`document.querySelector('[data-testid="briefing-start-btn"]').click()`);
    await waitForSelector('[data-testid="minigame-demo-overlay"]');
    await evalExpr(`document.querySelector('[data-testid="demo-skip-btn"]').click()`);
    await waitForSelector('[data-testid="kid-suit-power-card"]');

    const suitCheck = await evalExpr(`(() => ({
      hasKidCard: Boolean(document.querySelector('[data-testid="kid-suit-power-card"]')),
      rangeInputCount: document.querySelectorAll('input[type="range"]').length
    }))()`);
    console.log('[STAGE1 L1_EQUIPMENT_PREP]', JSON.stringify(suitCheck));
    if (!suitCheck.hasKidCard || suitCheck.rangeInputCount > 0) {
      throw new Error(`Kid Suit Power check failed: ${JSON.stringify(suitCheck)}`);
    }

    await evalExpr(`document.querySelector('[data-testid="minigame-back-btn"]').click()`);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForSelector('[data-testid="robo-guide-overlay"]');

    // 2) Mobile Landscape 844x390
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: true });
    await wait(600);

    const landscapeCheck = await evalExpr(`(() => {
      const VW = 844;
      const VH = 390;
      const rectOf = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { sel, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), width: Math.round(r.width), height: Math.round(r.height) };
      };
      const overlaps = (a, b) => a && b && !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
      const inside = (r) => r && r.width > 0 && r.height > 0 && r.left >= -1 && r.top >= -1 && r.right <= VW + 1 && r.bottom <= VH + 1;

      const inv = rectOf('[data-testid="mission-inventory-bar"]');
      const robo = rectOf('[data-testid="robo-guide-overlay"]');
      const targets = [
        rectOf('[data-testid="third-person-joystick"]'),
        rectOf('[data-testid="third-person-jump-btn"]'),
        rectOf('[data-testid="third-person-interact-btn"]'),
        rectOf('[data-testid="auto-walk-next-btn"]'),
        rectOf('[data-testid="right-camera-look-zone"]')
      ].filter(Boolean);

      const collisions = targets.filter((t) => overlaps(robo, t)).map((t) => t.sel);

      return {
        guardPresent: Boolean(document.querySelector('[data-testid="landscape-orientation-guard"]')),
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth,
        invInside: inside(inv),
        roboInside: inside(robo),
        inv,
        robo,
        targets,
        collisions
      };
    })()`);
    console.log('[STAGE1 MOBILE LANDSCAPE 844x390]', JSON.stringify(landscapeCheck));
    await saveShot('stage1_mobile_landscape_844x390.png');

    if (
      landscapeCheck.guardPresent ||
      landscapeCheck.scrollHeight > 390 ||
      landscapeCheck.scrollWidth > 844 ||
      !landscapeCheck.invInside ||
      !landscapeCheck.roboInside ||
      landscapeCheck.collisions.length > 0
    ) {
      throw new Error(`Mobile landscape 844x390 check failed: ${JSON.stringify(landscapeCheck)}`);
    }

    // 3) Mobile Portrait 390x844
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await wait(500);

    const portraitCheck = await evalExpr(`(() => {
      const guard = document.querySelector('[data-testid="landscape-orientation-guard"]');
      const btn = document.querySelector('[data-testid="enter-landscape-fullscreen-btn"]');
      const r = guard ? guard.getBoundingClientRect() : null;
      return {
        guardPresent: Boolean(guard),
        btnPresent: Boolean(btn),
        width: r ? Math.round(r.width) : 0,
        height: r ? Math.round(r.height) : 0,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth
      };
    })()`);
    console.log('[STAGE1 MOBILE PORTRAIT 390x844]', JSON.stringify(portraitCheck));
    await saveShot('stage1_mobile_portrait_guard_390x844.png');

    if (
      !portraitCheck.guardPresent ||
      !portraitCheck.btnPresent ||
      portraitCheck.width < 388 ||
      portraitCheck.height < 840 ||
      portraitCheck.scrollHeight > 844 ||
      portraitCheck.scrollWidth > 390
    ) {
      throw new Error(`Mobile portrait 390x844 guard check failed: ${JSON.stringify(portraitCheck)}`);
    }

    // Runtime & Network Error Checks
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

    console.log('[STAGE1 NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[STAGE1 CONSOLE ERRORS]', consoleErrors.length);

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    console.log('STAGE 1 VERIFICATION PASSED COMPLETELY!');
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
  console.error('STAGE 1 VERIFICATION FAILED:', err);
  process.exit(1);
});
