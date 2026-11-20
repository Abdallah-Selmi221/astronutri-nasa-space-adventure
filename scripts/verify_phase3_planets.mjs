import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4199;
const CDP_PORT = 9249;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-phase3-'));

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

    const measurePerf = async (frames = 26) =>
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

    const enterNodeFromMenu = async (nodeId) => {
      if (await evalExpr(`Boolean(document.querySelector('[data-testid="hud-back-world-btn"]'))`)) {
        await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
        await waitForSelector('[data-testid="world-navigator-3d"]');
        await wait(350);
      }
      await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]')?.click()`);
      await waitForSelector('[data-testid="toggle-levels-drawer-btn"]');
      await evalExpr(`document.querySelector('[data-testid="toggle-levels-drawer-btn"]').click()`);
      await waitForSelector(`[data-testid="drawer-enter-node-${nodeId}"]`);
      await evalExpr(`document.querySelector('[data-testid="drawer-enter-node-${nodeId}"]').click()`);
      await waitForSelector(`[data-testid="spatial-room-map-3d-l${nodeId}"]`);
      await wait(650);
      await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
      await wait(250);
    };

    // 1. Launch on Desktop 1366x900 & Unlock All Demo Levels via Settings
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
    await waitForGlb('earth_academy_hq.glb');
    await waitForGlb('earth_mountains_craggy.glb');
    await wait(550);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(200);

    // Open Menu -> Settings -> Unlock All Demo Levels
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]')?.click()`);
    await waitForSelector('[data-testid="open-settings-btn"]');
    await evalExpr(`document.querySelector('[data-testid="open-settings-btn"]').click()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await wait(250);
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(350);

    // 2. Enter Level 1 Earth Valley -> Engage Space Buggy -> Drive toward Station 1 (Space Kitchen Dome)
    await enterNodeFromMenu(1);
    await waitForGlb('earth_kitchen_dome.glb');
    await waitForGlb('earth_mountains_craggy.glb');
    await waitForGlb('astronaut_hero.glb');
    await waitForGlb('astronaut_rover.glb');

    const engageRover = async (label) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        await evalExpr(`document.querySelector('[data-testid="toggle-rover-btn"]')?.click()`);
        for (let t = 0; t < 8; t++) {
          await wait(120);
          const active = await evalExpr(
            `document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.roverActive`
          );
          if (active === 'true') return true;
        }
        await client.call('Input.dispatchKeyEvent', {
          type: 'rawKeyDown',
          key: 'r',
          code: 'KeyR',
          windowsVirtualKeyCode: 82
        });
        await wait(60);
        await client.call('Input.dispatchKeyEvent', {
          type: 'keyUp',
          key: 'r',
          code: 'KeyR',
          windowsVirtualKeyCode: 82
        });
        for (let t = 0; t < 8; t++) {
          await wait(120);
          const active = await evalExpr(
            `document.querySelector('[data-testid="three-canvas-mount"]')?.dataset?.roverActive`
          );
          if (active === 'true') return true;
        }
      }
      throw new Error(`${label} Rover failed to engage!`);
    };

    await engageRover('Earth L1');

    // Drive along the paved Spaceport Road toward Station 1 (Space Kitchen Dome) & craggy alpine mountains
    await holdKey('a', 'KeyA', 950);
    await holdKey('w', 'KeyW', 1250);
    await wait(350);
    // Slightly orbit camera 26° right so side-3/4 view clearly shows the astronaut seated inside the Buggy cockpit + craggy snow-capped mountains + road!
    await client.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 420, button: 'left', clickCount: 1 });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 615, y: 432, button: 'left' });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 615, y: 432, button: 'left', clickCount: 1 });
    await wait(450);

    await assertCleanGlobals('Earth L1 Seated Buggy + Craggy Mountains Desktop');
    const earthL1Perf = await measurePerf(26);
    const shotEarth = await saveShot('phase3_earth_seated_mountains_1366x900.png');
    console.log('[PHASE 3 EARTH L1]', JSON.stringify(earthL1Perf), shotEarth);

    // 3. Trigger 3D Rocket Launch Cutscene -> Transitions into Level 2 ISS Orbit!
    await evalExpr(`document.querySelector('[data-testid="launch-to-space-btn"]')?.click()`);
    await waitForSelector('[data-testid="skip-launch-cutscene-btn"]');
    await wait(600);
    await evalExpr(`document.querySelector('[data-testid="skip-launch-cutscene-btn"]')?.click()`);
    await waitForSelector('[data-testid="spatial-room-map-3d-l2"]');
    await waitForGlb('iss_orbital_ribs.glb');
    await wait(750);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(300);

    await assertCleanGlobals('Level 2 ISS Sunlit Orbital Atrium Desktop');
    const issL2Perf = await measurePerf(26);
    const shotIss = await saveShot('phase3_l2_iss_orbit_1366x900.png');
    console.log('[PHASE 3 ISS L2]', JSON.stringify(issL2Perf), shotIss);

    // 4. Enter Level 3 Moon Shackleton Modular Outpost -> Engage 6-Wheel Heavy Lunar Rover!
    await enterNodeFromMenu(3);
    await waitForGlb('moon_modular_base.glb');
    await waitForGlb('moon_rover_6x6.glb');
    await waitForGlb('moon_comm_tower.glb');
    await waitForGlb('moon_crater_rocks.glb');
    await wait(500);

    await engageRover('Moon L3 6-Wheel');

    // Drive slightly forward so modular lunar base, ramp, 6-wheel rover with seated astronaut, and Earthrise are framed!
    await holdKey('w', 'KeyW', 500);
    await wait(300);
    await client.call('Input.dispatchMouseEvent', { type: 'mousePressed', x: 700, y: 420, button: 'left', clickCount: 1 });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 676, y: 425, button: 'left' });
    await client.call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 676, y: 425, button: 'left', clickCount: 1 });
    await wait(450);

    await assertCleanGlobals('Level 3 Moon Modular Base + 6-Wheel Rover Desktop');
    const moonL3Perf = await measurePerf(26);
    const shotMoon = await saveShot('phase3_l3_moon_base_rover_1366x900.png');
    console.log('[PHASE 3 MOON L3]', JSON.stringify(moonL3Perf), shotMoon);

    // 5. Enter Level 4 Mars Red Canyon & Orion Return Complex -> Switch to Mobile Landscape 844x390 -> Drive Seated Rover!
    await enterNodeFromMenu(4);
    await waitForGlb('mars_return_base.glb');
    await waitForGlb('mars_canyon_cliffs.glb');
    await waitForGlb('mars_canyon_ring.glb');
    await wait(500);

    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await wait(450);

    await engageRover('Mars L4');

    await holdKey('w', 'KeyW', 750);
    await wait(450);

    await assertCleanGlobals('Level 4 Mars Red Canyon + Seated Rover Mobile 844x390');
    const marsL4Perf = await measurePerf(26);
    const shotMars = await saveShot('phase3_l4_mars_canyon_mobile_844x390.png');
    console.log('[PHASE 3 MARS L4 MOBILE]', JSON.stringify(marsL4Perf), shotMars);

    // Inspect captured events for console / runtime / network errors
    const errors = [];
    for (const ev of client.events) {
      if (ev.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(ev.params));
      if (ev.method === 'Log.entryAdded' && ev.params.entry.level === 'error') {
        const txt = ev.params.entry.text || '';
        if (!txt.includes('favicon')) errors.push(txt);
      }
      if (ev.method === 'Network.responseReceived' && ev.params.response.status >= 400) {
        const url = ev.params.response.url || '';
        if (!url.includes('favicon')) errors.push(`HTTP ${ev.params.response.status}: ${url}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Console/Network Errors detected:\n${errors.join('\n')}`);
    }

    console.log(
      'PHASE3_VERIFICATION_SUMMARY:',
      JSON.stringify(
        {
          earthL1Perf,
          issL2Perf,
          moonL3Perf,
          marsL4Perf,
          consoleErrors: errors.length
        },
        null,
        2
      )
    );
  } finally {
    if (client) client.close();
    if (chrome) {
      try {
        chrome.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
    if (preview) {
      try {
        preview.kill('SIGKILL');
      } catch {
        // ignore
      }
    }
  }
}

run().catch((err) => {
  console.error('[PHASE 3 VERIFY FAILED]', err);
  process.exit(1);
});
