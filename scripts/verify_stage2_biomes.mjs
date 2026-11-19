import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4194;
const CDP_PORT = 9244;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-stage2-'));

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

    const waitForGlb = async (glbName, timeoutMs = 10000) => {
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
        return {
          scene: ${JSON.stringify(label)},
          drawCalls: Number(mount?.dataset?.drawCalls || 0),
          glbs: mount?.dataset?.glbLoaded || '',
          roverActive: mount?.dataset?.roverActive || 'n/a',
          scrollHeight: document.documentElement.scrollHeight,
          scrollWidth: document.documentElement.scrollWidth,
          overflowY: document.documentElement.scrollHeight > ${maxH},
          overflowX: document.documentElement.scrollWidth > ${maxW}
        };
      })()`);
      console.log(`[STAGE2 ${label}]`, JSON.stringify({
        scene: stats.scene,
        drawCalls: stats.drawCalls,
        roverActive: stats.roverActive,
        overflowY: stats.overflowY,
        overflowX: stats.overflowX
      }));
      if (stats.drawCalls <= 0 || stats.drawCalls >= 55 || stats.overflowY || stats.overflowX) {
        throw new Error(`Scene check failed for ${label}: ${JSON.stringify(stats)}`);
      }
      return stats;
    };

    // ==================== 1) DESKTOP 1366x900 ====================
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
    await readSceneMetrics('Overworld Desktop', 900, 1366);
    await assertNoArabicInEn('Overworld');

    // Unlock all 4 levels via Demo Mode button
    await evalExpr(`document.querySelector('[data-testid="hud-settings-btn"]').click()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(300);

    // Level 1: Vast Daytime Earth Spaceport Valley
    await enterNode(1);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForGlb('sector1_earth_colony.glb');
    await wait(700);
    await readSceneMetrics('L1 Earth Valley', 900, 1366);
    await assertNoArabicInEn('L1 Earth Valley');
    await saveShot('stage2_l1_earth_valley_desktop.png');

    // Rocket Launch Cutscene (1-tap "Launch to Space" button)
    await waitForSelector('[data-testid="launch-to-space-btn"]');
    await evalExpr(`document.querySelector('[data-testid="launch-to-space-btn"]').click()`);
    await waitForSelector('[data-testid="rocket-launch-cutscene"]');
    await wait(1600);
    await saveShot('stage2_rocket_launch_cutscene.png');
    await evalExpr(`document.querySelector('[data-testid="skip-launch-cutscene-btn"]').click()`);

    // Level 2: ISS Low-Earth Orbit with Curved Blue Marble Earth below
    await waitForSelector('[data-testid="spatial-room-map-3d-l2"]');
    await waitForGlb('sector2_iss_atrium.glb');
    await wait(700);
    await readSceneMetrics('L2 ISS Orbit', 900, 1366);
    await assertNoArabicInEn('L2 ISS Orbit');
    await saveShot('stage2_l2_iss_orbit.png');

    // Return to World Map -> Level 3: Lunar Shackleton Crater + Drivable Space Rover
    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await enterNode(3);
    await waitForSelector('[data-testid="spatial-room-map-3d-l3"]');
    await waitForGlb('sector3_lunar_biodome.glb');
    await waitForGlb('astronaut_rover.glb');
    await waitForSelector('[data-testid="toggle-rover-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]').click()`);
    await wait(550);
    const l3Stats = await readSceneMetrics('L3 Lunar Rover', 900, 1366);
    if (l3Stats.roverActive !== 'true') {
      throw new Error(`Expected roverActive === true on L3, got ${l3Stats.roverActive}`);
    }
    await assertNoArabicInEn('L3 Lunar Rover');
    await saveShot('stage2_l3_lunar_rover_desktop.png');

    // ==================== 2) MOBILE LANDSCAPE 844x390 (LEVEL 4 MARS CANYON + ROVER) ====================
    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await enterNode(4);
    await waitForSelector('[data-testid="spatial-room-map-3d-l4"]');
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: true });

    await waitForGlb('sector4_orion_recovery.glb');
    await wait(700);
    const guardMobile = await evalExpr(`Boolean(document.querySelector('[data-testid="landscape-orientation-guard"]'))`);
    if (guardMobile) throw new Error('Orientation guard should not appear in 844x390 landscape');

    await waitForSelector('[data-testid="toggle-rover-btn"]');
    await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]').click()`);
    await wait(550);
    const l4Stats = await readSceneMetrics('L4 Mars Canyon Rover 844x390', 390, 844);
    if (l4Stats.roverActive !== 'true') {
      throw new Error(`Expected roverActive === true on L4, got ${l4Stats.roverActive}`);
    }
    await saveShot('stage2_l4_mars_rover_844x390.png');

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

    console.log('[STAGE2 NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[STAGE2 CONSOLE ERRORS]', consoleErrors.length);

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    console.log('STAGE 2 VERIFICATION PASSED COMPLETELY!');
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
  console.error('STAGE 2 VERIFICATION FAILED:', err);
  process.exit(1);
});
