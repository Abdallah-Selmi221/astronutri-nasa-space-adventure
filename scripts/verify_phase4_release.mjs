import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4198;
const CDP_PORT = 9248;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-phase4-'));

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
          ws.close();
        },
      });
    });

    ws.addEventListener('message', (ev) => {
      const data = JSON.parse(ev.data.toString());
      if (data.id && pending.has(data.id)) {
        const { res, rej } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) rej(new Error(data.error.message || JSON.stringify(data.error)));
        else res(data.result);
      } else if (data.method) {
        events.push(data);
      }
    });

    ws.addEventListener('error', (err) => reject(err));
  });
}

async function evalJs(cdp, expression) {
  const res = await cdp.call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.exceptionDetails) {
    throw new Error(`JS Evaluation failed: ${JSON.stringify(res.exceptionDetails)}`);
  }
  return res.result?.value;
}

async function capturePng(cdp, filename) {
  const shot = await cdp.call('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
  return outPath;
}

async function main() {
  console.log('=== PHASE 4 FAST RELEASE VERIFICATION (844x390 MOBILE LANDSCAPE) ===');
  const previewProc = spawn(
    'npx.cmd',
    ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort', '--host', '127.0.0.1'],
    {
      cwd: process.cwd(),
      stdio: 'pipe',
      shell: true,
    }
  );

  let chromeProc = null;
  let cdp = null;

  try {
    const baseUrl = `http://127.0.0.1:${PREVIEW_PORT}`;
    await waitForHttp(baseUrl, 15000);
    console.log(`[1/4] Vite preview ready on ${baseUrl}`);

    chromeProc = spawn(
      CHROME_PATH,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--autoplay-policy=no-user-gesture-required',
        `--user-data-dir=${USER_DATA_DIR}`,
        `--remote-debugging-port=${CDP_PORT}`,
        '--window-size=844,390',
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    await waitForHttp(`http://127.0.0.1:${CDP_PORT}/json/version`, 15000);
    const listRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    cdp = await createCdpClient(pageTarget.webSocketDebuggerUrl);

    await cdp.call('Page.enable');
    await cdp.call('Runtime.enable');
    await cdp.call('Network.enable');
    await cdp.call('Log.enable');

    // Strict Mobile Landscape 844x390
    await cdp.call('Emulation.setDeviceMetricsOverride', {
      width: 844,
      height: 390,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'landscapePrimary', angle: 90 },
    });
    await cdp.call('Emulation.setTouchEmulationEnabled', { enabled: true });

    await cdp.call('Page.navigate', { url: baseUrl });
    await wait(800);

    // Wait for boot splash to transition or tap it
    await evalJs(
      cdp,
      `(() => {
        const splash = document.querySelector('[data-testid="boot-logo-splash"]');
        if (splash) splash.click();
        return Boolean(splash);
      })()`
    );
    await wait(2400);

    // 1. Verify Redesigned Hero Title Screen on 844x390
    const titleState = await evalJs(
      cdp,
      `(() => {
        const screen = document.querySelector('[data-testid="intro-welcome-screen"]');
        const startBtn = document.querySelector('[data-testid="start-adventure-btn"]');
        const nameInput = document.querySelector('[data-testid="onboarding-name-input"]');
        const ageBtn = document.querySelector('[data-testid="age-group-11-14"]');
        const canvas = screen ? screen.querySelector('canvas') : null;
        const startRect = startBtn ? startBtn.getBoundingClientRect() : null;
        const docEl = document.documentElement;
        return {
          hasScreen: Boolean(screen),
          hasCanvas: Boolean(canvas && canvas.width > 0 && canvas.height > 0),
          hasStartBtn: Boolean(startBtn),
          hasNameInput: Boolean(nameInput),
          hasAgeBtn: Boolean(ageBtn),
          startBtnInViewport: Boolean(
            startRect &&
              startRect.top >= 0 &&
              startRect.bottom <= window.innerHeight &&
              startRect.left >= 0 &&
              startRect.right <= window.innerWidth
          ),
          overflowY: docEl.scrollHeight - window.innerHeight,
          overflowX: docEl.scrollWidth - window.innerWidth,
        };
      })()`
    );

    console.log('[2/4] Title Screen State (844x390):', JSON.stringify(titleState));
    if (
      !titleState.hasScreen ||
      !titleState.hasCanvas ||
      !titleState.hasStartBtn ||
      !titleState.startBtnInViewport ||
      titleState.overflowY > 2 ||
      titleState.overflowX > 2
    ) {
      throw new Error(`Title Screen verification failed: ${JSON.stringify(titleState)}`);
    }

    const shot1 = await capturePng(cdp, 'phase4_title_screen_844x390.png');
    console.log(`  -> Saved Title Screen screenshot: ${shot1}`);

    // 2. Click Start Adventure -> Enter Sunlit Space Academy Main Hub
    await evalJs(
      cdp,
      `(() => {
        const btn = document.querySelector('[data-testid="start-adventure-btn"]');
        if (btn) btn.click();
        return Boolean(btn);
      })()`
    );
    await wait(2800);

    const hubState = await evalJs(
      cdp,
      `(() => {
        const worldNav = document.querySelector('[data-testid="world-navigator-3d"]');
        const robo = document.querySelector('[data-testid="robo-guide-overlay"]');
        const roboText = robo ? robo.innerText.trim() : '';
        const docEl = document.documentElement;
        return {
          hasWorldNav: Boolean(worldNav),
          hasRobo: Boolean(robo),
          roboText,
          overflowY: docEl.scrollHeight - window.innerHeight,
          overflowX: docEl.scrollWidth - window.innerWidth,
        };
      })()`
    );

    console.log('[3/4] Main Hub State (844x390):', JSON.stringify(hubState));
    if (!hubState.hasWorldNav || hubState.overflowY > 2 || hubState.overflowX > 2) {
      throw new Error(`Main Hub verification failed: ${JSON.stringify(hubState)}`);
    }

    const shot2 = await capturePng(cdp, 'phase4_hub_guided_844x390.png');
    console.log(`  -> Saved Main Hub screenshot: ${shot2}`);

    // 3. Check console, runtime, and network errors
    const consoleErrors = cdp.events.filter(
      (e) =>
        (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error') ||
        e.method === 'Runtime.exceptionThrown' ||
        (e.method === 'Log.entryAdded' && e.params?.entry?.level === 'error')
    );

    console.log(`[4/4] Console/Runtime Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      throw new Error(`Detected console/runtime errors: ${JSON.stringify(consoleErrors.slice(0, 3))}`);
    }

    console.log('=== PHASE 4 RELEASE CHECK PASSED (0 ERRORS, 0 OVERFLOW, 2 SCREENSHOTS) ===');
  } finally {
    if (cdp) {
      try {
        cdp.close();
      } catch {}
    }
    if (chromeProc) {
      try {
        chromeProc.kill();
      } catch {}
    }
    if (previewProc) {
      try {
        previewProc.kill();
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error('PHASE 4 VERIFICATION FAILED:', err);
  process.exit(1);
});
