import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4198;
const CDP_PORT = 9248;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-phase2-'));

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

    const waitForGlb = async (glbName, timeoutMs = 20000) => {
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
      const shot = await client.call('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      return outPath;
    };

    const measurePerf = async (frames = 28) =>
      evalExpr(`(async () => {
        const deltas = [];
        let last = performance.now();
        for (let i = 0; i < ${frames}; i++) {
          await new Promise((r) => requestAnimationFrame(r));
          const now = performance.now();
          deltas.push(now - last);
          last = now;
        }
        const avgFrameMs = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
        const m = document.querySelector('[data-testid="three-canvas-mount"]');
        return {
          avgFrameMs: Number(avgFrameMs.toFixed(1)),
          avgFps: Number((1000 / Math.max(1, avgFrameMs)).toFixed(1)),
          drawCalls: Number(m?.dataset?.drawCalls || 0),
          overflowX: document.documentElement.scrollWidth - window.innerWidth,
          overflowY: document.documentElement.scrollHeight - window.innerHeight
        };
      })()`);

    const KEY_CODES = { KeyW: 87, KeyA: 65, KeyS: 83, KeyD: 68, Space: 32 };
    const holdKey = async (key, code, ms) => {
      const vk = KEY_CODES[code] || 0;
      await client.call('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key,
        code,
        windowsVirtualKeyCode: vk
      });
      await wait(ms);
      await client.call('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key,
        code,
        windowsVirtualKeyCode: vk
      });
    };

    const assertCleanGlobals = async (label) => {
      const text = await evalExpr(`document.body.innerText || ''`);
      if (/[\u0600-\u06FF]+/.test(text)) {
        throw new Error(`Arabic leakage in EN mode at ${label}`);
      }
      const ov = await evalExpr(
        `({ x: document.documentElement.scrollWidth - window.innerWidth, y: document.documentElement.scrollHeight - window.innerHeight })`
      );
      if (ov.x > 2 || ov.y > 2) {
        throw new Error(`Scroll overflow on ${label}: ${JSON.stringify(ov)}`);
      }
    };

    // Navigate on Desktop 1366x900
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: false });
    await client.call('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/` });
    await wait(450);
    await evalExpr(`document.querySelector('[data-testid="boot-logo-splash"]')?.click()`);
    await waitForSelector('[data-testid="start-adventure-btn"]');
    await evalExpr(`document.querySelector('[data-testid="start-adventure-btn"]').click()`);
    await waitForSelector('[data-testid="world-navigator-3d"]');
    await waitForSelector('[data-testid="three-canvas-mount"]');
    await waitForGlb('earth_academy_hq.glb');
    await waitForGlb('earth_tree_round.glb');
    await waitForGlb('astronaut_rover.glb');
    await wait(700);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(250);

    const hubGlbs = await evalExpr(
      `document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.glbLoaded || ''`
    );
    if (hubGlbs.includes('massive_space_island_world.glb')) {
      throw new Error('Legacy massive_space_island_world.glb is still mounted in Hub!');
    }

    await assertCleanGlobals('Hub Desktop 1366x900');
    const hubDesktopPerf = await measurePerf(26);
    const shot1 = await saveShot('phase2_hub_desktop_1366x900.png');
    console.log('[HUB DESKTOP]', JSON.stringify(hubDesktopPerf), shot1);

    // Check Hub Mobile Landscape 844x390
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await wait(550);
    await assertCleanGlobals('Hub Mobile 844x390');
    const hubMobilePerf = await measurePerf(22);
    const shot2 = await saveShot('phase2_hub_mobile_844x390.png');
    console.log('[HUB MOBILE]', JSON.stringify(hubMobilePerf), shot2);

    // Switch back to 1366x900 and enter Earth Level 1
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });
    await wait(350);
    await waitForSelector('[data-testid="level-node-1"]');
    await evalExpr(`document.querySelector('[data-testid="level-node-1"]')?.click()`);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForGlb('earth_kitchen_dome.glb');
    await waitForGlb('earth_suit_hangar.glb');
    await waitForGlb('earth_medical_pavilion.glb');
    await waitForGlb('earth_launch_complex.glb');
    await waitForGlb('earth_discovery_kiosk.glb');
    await wait(750);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(250);

    await assertCleanGlobals('Earth L1 Ground Desktop');
    const l1DesktopPerf = await measurePerf(28);
    const shot3 = await saveShot('phase2_earth_l1_ground_1366x900.png');
    console.log('[EARTH L1 GROUND]', JSON.stringify(l1DesktopPerf), shot3);

    // Verify Phase 1A Jump-While-Moving still works smoothly in spacious Earth L1
    await client.call('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87
    });
    await wait(650);
    let jumpTelem = { y: 0, velY: 0, speed: 0, grounded: 'true' };
    for (let attempt = 0; attempt < 3; attempt++) {
      await client.call('Input.dispatchKeyEvent', {
        type: 'rawKeyDown',
        key: ' ',
        code: 'Space',
        windowsVirtualKeyCode: 32
      });
      for (let t = 0; t < 8; t++) {
        await wait(65);
        jumpTelem = await evalExpr(`(() => {
          const m = document.querySelector('[data-testid="three-canvas-mount"]');
          return { y: Number(m.dataset.playerY), velY: Number(m.dataset.playerVelY), speed: Number(m.dataset.playerSpeed), grounded: m.dataset.playerGrounded };
        })()`);
        if (jumpTelem.velY > 1.0 && jumpTelem.speed > 1.5) break;
      }
      await client.call('Input.dispatchKeyEvent', {
        type: 'keyUp',
        key: ' ',
        code: 'Space',
        windowsVirtualKeyCode: 32
      });
      if (jumpTelem.velY > 1.0 && jumpTelem.speed > 1.5) break;
    }
    await client.call('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87
    });
    if (!(jumpTelem.velY > 1.0 && jumpTelem.speed > 1.5)) {
      throw new Error(`Jump-while-moving failed on L1: ${JSON.stringify(jumpTelem)}`);
    }
    await wait(700);

    // Orbit camera / pan left down boulevard toward Space Nutrition Kitchen Dome & Hangar so buildings + trees are framed cleanly
    await client.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 960, y: 420, button: 'left', clickCount: 1 });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 840, y: 430, button: 'left' });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 840, y: 430, button: 'left', clickCount: 1 });
    await holdKey('a', 'KeyA', 1200);
    await holdKey('w', 'KeyW', 1100);
    await wait(400);
    const shot4 = await saveShot('phase2_earth_l1_buildings_1366x900.png');
    console.log('[EARTH L1 BUILDINGS]', shot4);

    // Switch to Mobile Landscape 844x390 and drive the Earth Space Buggy along the paved Spaceport Road!
    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await wait(450);

    await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]')?.click()`);
    await wait(300);
    const roverActive = await evalExpr(
      `document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.roverActive`
    );
    if (roverActive !== 'true') {
      throw new Error(`Space Buggy failed to engage on Earth L1! roverActive=${roverActive}`);
    }

    await holdKey('w', 'KeyW', 1400);
    await wait(250);
    await assertCleanGlobals('Earth L1 Rover Mobile 844x390');
    const l1MobileRoverPerf = await measurePerf(26);
    const shot5 = await saveShot('phase2_earth_l1_rover_mobile_844x390.png');
    console.log('[EARTH L1 ROVER MOBILE]', JSON.stringify(l1MobileRoverPerf), shot5);

    // Inspect captured events for errors
    const errors = [];
    for (const ev of client.events) {
      if (ev.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(ev.params));
      if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
        errors.push(ev.params.entry.text);
      }
      if (ev.method === 'Network.responseReceived' && ev.params.response.status >= 400) {
        errors.push(`HTTP ${ev.params.response.status}: ${ev.params.response.url}`);
      }
    }
    if (errors.length > 0) {
      throw new Error(`Console/Network errors detected: ${errors.join(' | ')}`);
    }

    console.log('PHASE2_CHROME_VERIFICATION_PASS');
  } finally {
    try {
      client?.close();
    } catch {
      // ignore
    }
    try {
      chrome?.kill();
    } catch {
      // ignore
    }
    try {
      preview?.kill();
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
  console.error('PHASE2_CHROME_VERIFICATION_FAIL:', err);
  process.exit(1);
});
