import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4196;
const CDP_PORT = 9246;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-phase1a-'));

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

    const waitForGlb = async (glbName, timeoutMs = 15000) => {
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

    const readTelemetry = () =>
      evalExpr(`(() => {
        const m = document.querySelector('[data-testid="three-canvas-mount"]');
        return {
          y: Number(m?.dataset?.playerY ?? NaN),
          velY: Number(m?.dataset?.playerVelY ?? NaN),
          speed: Number(m?.dataset?.playerSpeed ?? NaN),
          grounded: m?.dataset?.playerGrounded === 'true',
          yaw: Number(m?.dataset?.cameraYaw ?? NaN)
        };
      })()`);

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

    // ==================== 1) DESKTOP 1366x900: CLOSE CAMERA, SETTINGS SLIDERS & KEYBOARD JUMP-WHILE-MOVING ====================
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
    await waitForGlb('massive_space_island_world.glb');
    await wait(1400);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(300);

    const desktopHud = await evalExpr(`(() => {
      const topHud = document.querySelector('[data-testid="top-hud-bar"]');
      const leftZone = document.querySelector('[data-testid="left-joystick-zone"]');
      const rightZone = document.querySelector('[data-testid="right-camera-look-zone"]');
      const bodyText = document.body.innerText || '';
      return {
        topHudHeight: topHud ? Math.round(topHud.getBoundingClientRect().height) : -1,
        hasLeftZone: Boolean(leftZone),
        hasRightZone: Boolean(rightZone),
        hasLookCameraPill: bodyText.includes('Look Camera') || bodyText.includes('تدوير الكاميرا'),
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth
      };
    })()`);
    console.log('[PHASE1A DESKTOP HUD]', JSON.stringify(desktopHud));
    if (
      desktopHud.topHudHeight <= 0 ||
      desktopHud.topHudHeight > 48 ||
      !desktopHud.hasLeftZone ||
      !desktopHud.hasRightZone ||
      desktopHud.hasLookCameraPill ||
      desktopHud.scrollHeight > 900 ||
      desktopHud.scrollWidth > 1366
    ) {
      throw new Error(`Desktop HUD verification failed: ${JSON.stringify(desktopHud)}`);
    }
    await assertNoArabicInEn('Overworld Desktop');

    // Open Menu -> Settings -> Verify live Camera Sensitivity & Smoothness sliders without reload
    await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
    await waitForSelector('[data-testid="open-settings-btn"]');
    await evalExpr(`document.querySelector('[data-testid="open-settings-btn"]').click()`);
    await waitForSelector('[data-testid="camera-sensitivity-slider"]');

    const sliderText = await evalExpr(`(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      const sens = document.querySelector('[data-testid="camera-sensitivity-slider"]');
      setter.call(sens, '1.6');
      sens.dispatchEvent(new Event('input', { bubbles: true }));
      sens.dispatchEvent(new Event('change', { bubbles: true }));

      const smooth = document.querySelector('[data-testid="camera-smoothness-slider"]');
      setter.call(smooth, '0.55');
      smooth.dispatchEvent(new Event('input', { bubbles: true }));
      smooth.dispatchEvent(new Event('change', { bubbles: true }));

      return document.querySelector('[data-testid="graphics-sensitivity-panel"]')?.innerText || '';
    })()`);
    console.log('[PHASE1A SETTINGS LIVE]', JSON.stringify({ has160: sliderText.includes('1.60x'), has55pct: sliderText.includes('55%') }));
    if (!sliderText.includes('1.60x') || !sliderText.includes('55%')) {
      throw new Error(`Live Settings slider check failed: ${sliderText}`);
    }

    // Restore smooth default before mobile drag test, unlock demo levels, save & close
    await evalExpr(`(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      const sens = document.querySelector('[data-testid="camera-sensitivity-slider"]');
      setter.call(sens, '1.15');
      sens.dispatchEvent(new Event('input', { bubbles: true }));
      const smooth = document.querySelector('[data-testid="camera-smoothness-slider"]');
      setter.call(smooth, '0.78');
      smooth.dispatchEvent(new Event('input', { bubbles: true }));
    })()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(350);
    await saveShot('phase1a_desktop_1366x900.png');

    // Keyboard Jump-While-Moving on L1 Earth Valley (Desktop)
    await enterNode(1);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForGlb('sector1_earth_colony.glb');
    await wait(550);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(200);

    const kbStart = await readTelemetry();
    await client.call('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87
    });
    await wait(260);
    await client.call('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32
    });

    let kbMaxVelY = -999;
    let kbPeakY = kbStart.y;
    let kbMinAirSpeed = 999;
    let kbSawAirborne = false;
    for (let i = 0; i < 20; i++) {
      await wait(42);
      const t = await readTelemetry();
      if (t.velY > kbMaxVelY) kbMaxVelY = t.velY;
      if (t.y > kbPeakY) kbPeakY = t.y;
      if (!t.grounded) {
        kbSawAirborne = true;
        if (t.speed < kbMinAirSpeed) kbMinAirSpeed = t.speed;
      }
    }
    await client.call('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: ' ',
      code: 'Space',
      windowsVirtualKeyCode: 32
    });
    await client.call('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key: 'w',
      code: 'KeyW',
      windowsVirtualKeyCode: 87
    });

    const kbStats = {
      startY: kbStart.y,
      peakY: kbPeakY,
      maxVelY: kbMaxVelY,
      sawAirborne: kbSawAirborne,
      minAirSpeed: kbSawAirborne ? kbMinAirSpeed : 0
    };
    console.log('[PHASE1A DESKTOP KB JUMP+MOVE]', JSON.stringify(kbStats));
    if (!kbSawAirborne || kbMaxVelY <= 3.0 || kbPeakY <= kbStart.y + 0.6 || kbStats.minAirSpeed <= 2.5) {
      throw new Error(`Desktop keyboard jump-while-moving failed: ${JSON.stringify(kbStats)}`);
    }

    // ==================== 2) MOBILE LANDSCAPE 844x390: OVERWORLD, MULTI-TOUCH JUMP-WHILE-MOVING & CAMERA ORBIT ====================
    await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    await waitForSelector('[data-testid="world-navigator-3d"]');

    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true
    });
    await client.call('Emulation.setTouchEmulationEnabled', { enabled: true });
    await wait(700);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(250);

    const mobileOverworldCheck = await evalExpr(`(() => {
      const topHud = document.querySelector('[data-testid="top-hud-bar"]');
      return {
        hudHeight: topHud ? Math.round(topHud.getBoundingClientRect().height) : -1,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidth: document.documentElement.scrollWidth
      };
    })()`);
    console.log('[PHASE1A MOBILE OVERWORLD]', JSON.stringify(mobileOverworldCheck));
    if (
      mobileOverworldCheck.hudHeight <= 0 ||
      mobileOverworldCheck.hudHeight > 42 ||
      mobileOverworldCheck.scrollHeight !== 390 ||
      mobileOverworldCheck.scrollWidth !== 844
    ) {
      throw new Error(`Mobile overworld viewport check failed: ${JSON.stringify(mobileOverworldCheck)}`);
    }
    await assertNoArabicInEn('Overworld Mobile 844x390');
    await saveShot('phase1a_mobile_844x390_overworld.png');

    await enterNode(1);
    await waitForSelector('[data-testid="spatial-room-map-3d-l1"]');
    await waitForGlb('sector1_earth_colony.glb');
    await wait(600);
    await evalExpr(`document.querySelector('[data-testid="robo-guide-dismiss-btn"]')?.click()`);
    await wait(200);

    const jumpBtn = await evalExpr(`(() => {
      const r = document.querySelector('[data-testid="third-person-jump-btn"]').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
    })()`);

    const mobStart = await readTelemetry();
    // Finger 0 drags left joystick up to sprint forward (-Z)
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 140, y: 260, id: 0 }]
    });
    for (let s = 1; s <= 4; s++) {
      await wait(45);
      await client.call('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: 140, y: Math.round(260 - (s / 4) * 85), id: 0 }]
      });
    }
    await wait(80);

    // While Finger 0 STILL holds sprint, Finger 1 taps Jump (A)
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 140, y: 175, id: 0 },
        { x: jumpBtn.x, y: jumpBtn.y, id: 1 }
      ]
    });

    let mobMaxVelY = -999;
    let mobPeakY = mobStart.y;
    let mobMinAirSpeed = 999;
    let mobSawAirborne = false;
    let jumpShotSaved = false;

    for (let i = 0; i < 24; i++) {
      await wait(42);
      if (i === 1) {
        // Release Finger 1 while keeping Finger 0 sprinting on left joystick
        await client.call('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: 140, y: 175, id: 0 }]
        });
      }
      const t = await readTelemetry();
      if (t.velY > mobMaxVelY) mobMaxVelY = t.velY;
      if (t.y > mobPeakY) mobPeakY = t.y;
      if (!t.grounded) {
        mobSawAirborne = true;
        if (t.speed < mobMinAirSpeed) mobMinAirSpeed = t.speed;
      }
      if (!jumpShotSaved && i >= 6 && !t.grounded && t.y > mobStart.y + 0.6) {
        await saveShot('phase1a_mobile_844x390_earth_jump.png');
        jumpShotSaved = true;
      }
    }

    await client.call('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });

    // Wait up to 900ms for smooth landing
    let landedTel = await readTelemetry();
    const landDeadline = Date.now() + 900;
    while (!landedTel.grounded && Date.now() < landDeadline) {
      await wait(50);
      landedTel = await readTelemetry();
    }
    if (!jumpShotSaved) {
      await saveShot('phase1a_mobile_844x390_earth_jump.png');
    }

    const mobJumpStats = {
      startY: mobStart.y,
      peakY: mobPeakY,
      maxVelY: mobMaxVelY,
      sawAirborne: mobSawAirborne,
      minAirSpeed: mobSawAirborne ? mobMinAirSpeed : 0,
      landedGrounded: landedTel.grounded
    };
    console.log('[PHASE1A MOBILE TOUCH JUMP+MOVE]', JSON.stringify(mobJumpStats));
    if (
      !mobSawAirborne ||
      mobMaxVelY <= 3.0 ||
      mobPeakY <= mobStart.y + 0.6 ||
      mobJumpStats.minAirSpeed <= 2.5 ||
      !mobJumpStats.landedGrounded
    ) {
      throw new Error(`Mobile multi-touch jump-while-moving failed: ${JSON.stringify(mobJumpStats)}`);
    }

    // Simultaneous Mobile Multi-Touch: Finger 0 Left Joystick + Finger 1 Right Camera Look Drag
    const beforeLook = await readTelemetry();
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        { x: 140, y: 260, id: 0 },
        { x: 640, y: 210, id: 1 }
      ]
    });
    for (let step = 1; step <= 6; step++) {
      await wait(42);
      await client.call('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: Math.round(140 + (step / 6) * 55), y: Math.round(260 - (step / 6) * 60), id: 0 },
          { x: Math.round(640 - (step / 6) * 200), y: 210, id: 1 }
        ]
      });
    }
    await wait(240);
    await client.call('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await wait(150);

    const afterLook = await readTelemetry();
    const yawDelta = angleDeltaRad(afterLook.yaw, beforeLook.yaw);
    const mobOverflow = await evalExpr(`({
      scrollHeight: document.documentElement.scrollHeight,
      scrollWidth: document.documentElement.scrollWidth
    })`);
    console.log('[PHASE1A MOBILE MULTI-TOUCH ORBIT]', JSON.stringify({ beforeYaw: beforeLook.yaw, afterYaw: afterLook.yaw, yawDelta: Number(yawDelta.toFixed(3)), ...mobOverflow }));
    if (
      !Number.isFinite(beforeLook.yaw) ||
      !Number.isFinite(afterLook.yaw) ||
      yawDelta <= 0.6 ||
      mobOverflow.scrollHeight !== 390 ||
      mobOverflow.scrollWidth !== 844
    ) {
      throw new Error(`Mobile dual-thumb orbit/overflow failed: yawDelta=${yawDelta}, ${JSON.stringify(mobOverflow)}`);
    }
    await assertNoArabicInEn('L1 Mobile 844x390');

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

    console.log('[PHASE1A NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[PHASE1A CONSOLE ERRORS]', consoleErrors.length);

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    console.log('PHASE 1A VERIFICATION PASSED COMPLETELY!');
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
  console.error('PHASE 1A VERIFICATION FAILED:', err);
  process.exit(1);
});
