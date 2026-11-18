import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4191;
const CDP_PORT = 9241;
const ARTIFACT_DIR = 'C:\\Users\\ACER\\.gemini\\antigravity\\brain\\a359c7a6-4d60-4643-9e78-c4834f781ff4';
const USER_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'astronutri-full-audit-'));

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
    await wait(250);
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

    const waitForSelector = async (sel, timeoutMs = 15000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < timeoutMs) {
        const ok = await evalExpr(`Boolean(document.querySelector(${JSON.stringify(sel)}))`);
        if (ok) return true;
        await wait(200);
      }
      throw new Error(`Timeout waiting for selector: ${sel}`);
    };

    const saveShot = async (filename) => {
      await wait(350);
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

    const telemetryReport = {
      scenes: [],
      stations: [],
      screenshots: []
    };

    await client.call('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    await client.call('Page.navigate', { url: `http://127.0.0.1:${PREVIEW_PORT}/` });
    await waitForSelector('[data-testid="start-adventure-btn"]');
    await wait(700);
    await evalExpr(`document.querySelector('[data-testid="start-adventure-btn"]').click()`);

    await waitForSelector('[data-testid="world-navigator-3d"]');
    await waitForSelector('[data-testid="mission-inventory-bar"]');
    await wait(1900); // wait for massive_space_island_world.glb + astronaut_hero.glb

    const worldStats = await evalExpr(`(() => {
      const mount = document.querySelector('[data-testid="three-canvas-mount"]');
      return {
        scene: 'WorldNavigator3D (Overworld)',
        drawCalls: Number(mount?.dataset?.drawCalls || 0),
        glbs: mount?.dataset?.glbLoaded || '',
        scrollOverflow: document.documentElement.scrollHeight > window.innerHeight
      };
    })()`);
    console.log('[AUDIT OVERWORLD]', JSON.stringify(worldStats));
    if (
      worldStats.drawCalls === 0 ||
      worldStats.drawCalls >= 55 ||
      !worldStats.glbs.includes('massive_space_island_world.glb') ||
      worldStats.scrollOverflow
    ) {
      throw new Error(`Overworld telemetry failed: ${JSON.stringify(worldStats)}`);
    }
    telemetryReport.scenes.push(worldStats);
    await assertNoArabicInEn('Overworld');
    await saveShot('audit_01_overworld_desktop.png');
    telemetryReport.screenshots.push('audit_01_overworld_desktop.png');

    // Unlock all 4 levels / 14 stations cleanly via Jury Demo Mode button in Settings
    await evalExpr(`document.querySelector('[data-testid="hud-settings-btn"]').click()`);
    await waitForSelector('[data-testid="unlock-all-demo-btn"]');
    await evalExpr(`document.querySelector('[data-testid="unlock-all-demo-btn"]').click()`);
    await waitForSelector('[data-testid="demo-unlocked-badge"]');
    await evalExpr(`document.querySelector('[data-testid="settings-save-close-btn"]').click()`);
    await wait(400);

    const LEVEL_STATIONS = [
      {
        levelId: 1,
        hubTestId: 'spatial-room-map-3d-l1',
        hubGlb: 'sector1_earth_colony.glb',
        hubShot: 'audit_02_sector1_earth_3d.png',
        stations: [
          { order: 1, shot: 'audit_04_l1_food_hepa.png', demoShot: 'audit_03_l1_demo_canvas.png' },
          { order: 2, shot: 'audit_05_l1_equip_beam.png' },
          { order: 3, shot: 'audit_06_l1_medical_check.png' },
          { order: 4, shot: 'audit_07_l1_launch_gantry.png' }
        ]
      },
      {
        levelId: 2,
        hubTestId: 'spatial-room-map-3d-l2',
        hubGlb: 'sector2_iss_atrium.glb',
        hubShot: 'audit_08_sector2_iss_3d.png',
        stations: [
          { order: 1, shot: 'audit_09_l2_zerog_corridor.png' },
          { order: 2, shot: 'audit_10_l2_meal_hydration.png' },
          { order: 3, shot: 'audit_11_l2_neows_radar.png' }
        ]
      },
      {
        levelId: 3,
        hubTestId: 'spatial-room-map-3d-l3',
        hubGlb: 'sector3_lunar_biodome.glb',
        hubShot: 'audit_12_sector3_moon_3d.png',
        stations: [
          { order: 1, shot: 'audit_13_l3_water_pipes.png' },
          { order: 2, shot: 'audit_14_l3_ared_tools.png' },
          { order: 3, shot: 'audit_15_l3_storm_shield.png' },
          { order: 4, shot: 'audit_16_l3_crater_lidar.png' }
        ]
      },
      {
        levelId: 4,
        hubTestId: 'spatial-room-map-3d-l4',
        hubGlb: 'sector4_orion_recovery.glb',
        hubShot: 'audit_17_sector4_orion_3d.png',
        stations: [
          { order: 1, shot: 'audit_18_l4_com_breaker.png' },
          { order: 2, shot: 'audit_19_l4_reentry_plasma.png' },
          { order: 3, shot: 'audit_20_l4_splashdown_chutes.png' }
        ]
      }
    ];

    for (const lv of LEVEL_STATIONS) {
      // Open Space Nodes drawer from World Map -> Enter Node N
      await waitForSelector('[data-testid="world-navigator-3d"]');
      await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
      await waitForSelector('[data-testid="toggle-levels-drawer-btn"]');
      await evalExpr(`document.querySelector('[data-testid="toggle-levels-drawer-btn"]').click()`);
      await waitForSelector('#campaign-levels-grid');
      await wait(200);
      await evalExpr(`(() => {
        const btns = Array.from(document.querySelectorAll('#campaign-levels-grid button'));
        const enter = btns.find(b => b.textContent?.includes('Enter Node ${lv.levelId}'));
        if (!enter) throw new Error('Missing Enter Node ${lv.levelId}');
        enter.click();
      })()`);

      await waitForSelector(`[data-testid="${lv.hubTestId}"]`);
      await wait(1800);
      await evalExpr(`document.querySelector('[data-testid="dismiss-story-banner-btn"]')?.click()`);
      await wait(300);

      const hubStats = await evalExpr(`(() => {
        const mount = document.querySelector('[data-testid="three-canvas-mount"]');
        return {
          scene: 'Sector ${lv.levelId} Hub',
          drawCalls: Number(mount?.dataset?.drawCalls || 0),
          glbs: mount?.dataset?.glbLoaded || '',
          scrollOverflow: document.documentElement.scrollHeight > window.innerHeight
        };
      })()`);
      console.log(`[AUDIT SECTOR ${lv.levelId}]`, JSON.stringify(hubStats));
      if (
        hubStats.drawCalls === 0 ||
        hubStats.drawCalls >= 55 ||
        !hubStats.glbs.includes(lv.hubGlb) ||
        hubStats.scrollOverflow
      ) {
        throw new Error(`Sector ${lv.levelId} telemetry failed: ${JSON.stringify(hubStats)}`);
      }
      telemetryReport.scenes.push(hubStats);
      await assertNoArabicInEn(`Sector ${lv.levelId}`);
      await saveShot(lv.hubShot);
      telemetryReport.screenshots.push(lv.hubShot);

      // Visit every single station in this level
      for (const st of lv.stations) {
        await evalExpr(`document.querySelector('[data-testid="mobile-menu-toggle"]').click()`);
        await waitForSelector('[data-testid="toggle-rooms-drawer-btn"]');
        await evalExpr(`document.querySelector('[data-testid="toggle-rooms-drawer-btn"]').click()`);
        await wait(250);
        await evalExpr(`(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const match = btns.find(b => b.textContent?.trim().startsWith('${st.order}. '));
          if (!match) throw new Error('Missing Station button ${st.order} in Level ${lv.levelId}');
          match.click();
        })()`);

        await waitForSelector('[data-testid="robo-briefing-card"]');
        await wait(250);
        await evalExpr(`document.querySelector('[data-testid="briefing-start-btn"]').click()`);
        await waitForSelector('[data-testid="minigame-demo-overlay"]');
        await waitForSelector('[data-testid="demo-physics-canvas"]');

        if (st.demoShot) {
          await wait(700);
          await saveShot(st.demoShot);
          telemetryReport.screenshots.push(st.demoShot);
        }

        await evalExpr(`document.querySelector('[data-testid="demo-skip-btn"]').click()`);
        await waitForSelector('[data-testid="minigame-back-btn"]');
        await wait(650);
        await assertNoArabicInEn(`Level ${lv.levelId} Station ${st.order}`);
        await saveShot(st.shot);
        telemetryReport.screenshots.push(st.shot);
        telemetryReport.stations.push(`L${lv.levelId}-S${st.order}: ${st.shot}`);

        await evalExpr(`document.querySelector('[data-testid="minigame-back-btn"]').click()`);
        await waitForSelector(`[data-testid="${lv.hubTestId}"]`);
        await evalExpr(`document.querySelector('[data-testid="dismiss-story-banner-btn"]')?.click()`);
        await wait(250);
      }

      // Return cleanly to Overworld Map before next Sector
      await evalExpr(`document.querySelector('[data-testid="hud-back-world-btn"]').click()`);
    }

    // Check console errors & HTTP 404/500 failures across all transitions
    const failedResponses = client.events
      .filter((e) => e.method === 'Network.responseReceived' && e.params?.response?.status >= 400)
      .map((e) => ({ url: e.params.response.url, status: e.params.response.status }));
    const consoleErrors = client.events
      .filter(
        (e) =>
          (e.method === 'Runtime.exceptionThrown' ||
            (e.method === 'Runtime.consoleAPICalled' && e.params?.type === 'error')) &&
          !JSON.stringify(e).includes('favicon')
      );

    console.log('[AUDIT NETWORK >= 400]', JSON.stringify(failedResponses));
    console.log('[AUDIT CONSOLE ERRORS]', consoleErrors.length);
    console.log('[AUDIT REPORT SUMMARY]', JSON.stringify(telemetryReport, null, 2));

    if (failedResponses.length > 0 || consoleErrors.length > 0) {
      throw new Error(
        `Runtime errors detected! HTTP: ${JSON.stringify(failedResponses)} Console: ${JSON.stringify(consoleErrors)}`
      );
    }

    if (telemetryReport.screenshots.length < 18) {
      throw new Error(`Expected >= 18 screenshots, captured ${telemetryReport.screenshots.length}`);
    }

    console.log(`ALL ${telemetryReport.screenshots.length} FULL VISUAL AUDIT SCREENSHOTS VERIFIED CLEANLY!`);
  } finally {
    try {
      if (client) client.close();
    } catch {
      // ignore
    }
    try {
      if (chrome) chrome.kill();
    } catch {
      // ignore
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
  console.error('FULL VISUAL AUDIT FAILED:', err);
  process.exit(1);
});
