import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, SkipForward, Sparkles } from 'lucide-react';
import { MiniGameId } from '../../types/game';
import { useGameState } from '../../context/GameContext';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';

interface MiniGameDemoOverlayProps {
  miniGameId: MiniGameId | string;
  onFinish: () => void;
}

interface DemoSpec {
  titleEn: string;
  titleAr: string;
  goalEn: string;
  goalAr: string;
  keyControlsEn: string;
  keyControlsAr: string;
  accentHex: string;
  visualKind:
    | 'food'
    | 'balance'
    | 'medical'
    | 'launch'
    | 'zerog'
    | 'meal'
    | 'neows'
    | 'pipes'
    | 'ared'
    | 'storm'
    | 'crater'
    | 'com'
    | 'reentry'
    | 'splash';
}

const DEMO_SPECS: Record<string, DemoSpec> = {
  l1_food_prep: {
    titleEn: 'How to Pack Zero-Crumb Space Food',
    titleAr: 'كيف تجهّز طعام الفضاء بدون فتات',
    goalEn: 'Drag or tap crumb-free space items into your tray to protect cabin HEPA filters & gain +Thruster Boost.',
    goalAr: 'اسحب أو اضغط الأطعمة الآمنة بدون فتات لصينيتك لحماية فلاتر الهواء وكسب دفع إضافي.',
    keyControlsEn: 'Drag or Tap Items → Confirm Tray',
    keyControlsAr: 'اسحب أو اضغط ← اعتمد الصينية',
    accentHex: '#38bdf8',
    visualKind: 'food'
  },
  l1_equipment_prep: {
    titleEn: 'How to Balance Launch Loadout (≤ 18 kg)',
    titleAr: 'كيف توازن حمولة الإطلاق (≤ 18 كجم)',
    goalEn: 'Toggle survival essentials & balance the 18 kg beam limit without overweight alarms.',
    goalAr: 'فعّل المعدات الأساسية ووازن ذراع الحمولة ضمن حد 18 كجم دون تجاوز الوزن.',
    keyControlsEn: 'Snap Suit Parts → Balance ≤ 18 kg Beam',
    keyControlsAr: 'ركّب المعدات ← وازن الحمولة ≤ 18 كجم',
    accentHex: '#a78bfa',
    visualKind: 'balance'
  },
  l1_medical_check: {
    titleEn: 'Pre-Launch Hydration & Sleep Calibration',
    titleAr: 'معايرة الترطيب والساعة البيولوجية قبل الإطلاق',
    goalEn: 'Hold the hydration valve for 1.5s to fill electrolytes, then align crew circadian sleep (10 PM → 6 AM).',
    goalAr: 'اضغط مطوّلاً على صمام الترطيب 1.5 ثانية واضبط جدول النوم (10 م ← 6 ص).',
    keyControlsEn: 'Hold Hydration Valve → Align 8h Sleep',
    keyControlsAr: 'اضغط الصمام مطوّلاً ← اضبط 8 ساعات نوم',
    accentHex: '#34d399',
    visualKind: 'medical'
  },
  l1_mission_launch: {
    titleEn: 'Artemis LOX / LH2 Propellant Valve Prep',
    titleAr: 'موازنة صمامات الوقود LOX / LH2 لصاروخ أرتميس',
    goalEn: 'Match Oxygen & Hydrogen valves inside the green ignition band before triggering T-3..2..1 liftoff!',
    goalAr: 'طابق صمامَي الأكسجين والهيدروجين داخل النطاق الأخضر قبل إطلاق العد التنازلي!',
    keyControlsEn: 'Balance Both Sliders → Launch Sequence',
    keyControlsAr: 'وازن الصمامين ← ابدأ الإطلاق',
    accentHex: '#fbbf24',
    visualKind: 'launch'
  },
  l2_zerog_movement: {
    titleEn: 'Zero-G Salvage & Handrail Docking',
    titleAr: 'الحركة بانعدام الجاذبية والتقاط الأدوات',
    goalEn: 'Push gently off bulkheads in 0.0G, collect floating tools, and tap the handrail brake before docking.',
    goalAr: 'ادفع بلطف في انعدام الجاذبية والتقط الأدوات الطافية ثم استخدم مكابح المقبض.',
    keyControlsEn: 'Impulse Push → Catch 3 Gear → Handrail Brake',
    keyControlsAr: 'دفع ← التقط 3 أدوات ← كبح بالمقبض',
    accentHex: '#60a5fa',
    visualKind: 'zerog'
  },
  l2_balanced_meal: {
    titleEn: 'ISS High-Protein Orbit Tray & Hydration',
    titleAr: 'صينية البروتين وفيتامين د + تحدي الترطيب المداري',
    goalEn: 'Build a Vitamin-D & protein orbit menu, then tap the live Hydration Meter inside the cyan target zone.',
    goalAr: 'شكّل وجبة غنية بالبروتين وفيتامين د، ثم اضغط مؤشر الترطيب في المنطقة الزرقاء.',
    keyControlsEn: 'Balance Nutrients → Live Hydration Meter',
    keyControlsAr: 'وازن العناصر ← اضغط مقياس الترطيب',
    accentHex: '#22d3ee',
    visualKind: 'meal'
  },
  l2_systems_neows: {
    titleEn: 'NASA NeoWs Debris Trajectory Intercept',
    titleAr: 'تفادي حطام الكويكب 2010 PK عبر رادار ناسا',
    goalEn: 'Steer left/right in real time to dodge approaching NeoWs debris. Trigger L1 Fuel Boosts for speedburst!',
    goalAr: 'تحرك يميناً ويساراً لتفادي الحطام القادم واستخدم دفعات الوقود الإضافية من المستوى الأول.',
    keyControlsEn: 'Steer Left/Right + Use L1 Thruster Boosts',
    keyControlsAr: 'حرّك يميناً ويساراً + استخدم الدفع النفاث',
    accentHex: '#f59e0b',
    visualKind: 'neows'
  },
  l3_water_recycling: {
    titleEn: 'ECLSS Pipe Solver & Hydroponic Lettuce Loop',
    titleAr: 'توصيل أنابيب تدوير المياه (98%) والزراعة المائية',
    goalEn: 'Rotate pipes until wastewater flows continuously from Inlet to Tank (98% recovery), then nurture lunar crops.',
    goalAr: 'دوّر الأنابيب لتوصيل المسار حتى استرجاع 98% من المياه ثم ركّب حوض الخس القمري.',
    keyControlsEn: 'Rotate 3x3 Conduits → Hydroponic Nutrient Feed',
    keyControlsAr: 'دوّر الشبكة 3×3 ← غذّ النباتات المائية',
    accentHex: '#38bdf8',
    visualKind: 'pipes'
  },
  l3_resistance_training: {
    titleEn: 'ARED Bone-Load Timing & EVA Tool Rack',
    titleAr: 'تدريب المقاومة ARED وتجهيز حقيبة أدوات القمر',
    goalEn: 'Hit the moving indicator inside the green sweet spot for bone protection, then pack all 4 crater tools manually.',
    goalAr: 'اضغط عندما يعبر المؤشر النطاق الأخضر لتوليد الطاقة، ثم ركّب أدوات الحفرة الأربع يدوياً.',
    keyControlsEn: 'Tap Sweet Spot Reps → Pack 4 Geological Tools',
    keyControlsAr: 'اضغط النطاق الأخضر ← اجمع الأدوات الـ 4',
    accentHex: '#34d399',
    visualKind: 'ared'
  },
  l3_solar_storm: {
    titleEn: '10s NASA DONKI CME Solar Storm Defense',
    titleAr: 'الدفاع ضد موجة الإشعاع الشمسي DONKI (10 ثوانٍ)',
    goalEn: 'Seal the blast door and shift power sliders between Storm Shielding & Hydroponics as CME waves hit.',
    goalAr: 'أغلق البوابة المدرعة ووازن توزيع الطاقة بين الدرع والزراعة مع وصول موجات الشمس.',
    keyControlsEn: 'Seal Blast Door + Balance 3 Power Sliders',
    keyControlsAr: 'أغلق البوابة + وازن أشرطة الطاقة',
    accentHex: '#fb923c',
    visualKind: 'storm'
  },
  l3_lunar_samples: {
    titleEn: '0.16G Shackleton Crater Excavation & Return Auth',
    titleAr: 'استخراج عينات القمر في 0.16G واعتماد العودة للأرض',
    goalEn: 'Use matched geological tools inside 0.16G lunar gravity while watching Suit O2, then sign Earth Return Auth.',
    goalAr: 'استخدم الأداة المناسبة لكل عينة قمرية مع مراقبة الأكسجين ثم اعتمد تصريح العودة.',
    keyControlsEn: 'Select Tool & Dig Craters → Authorize Return',
    keyControlsAr: 'اختر الأداة واحفر ← اعتمد تصريح العودة',
    accentHex: '#facc15',
    visualKind: 'crater'
  },
  l4_departure_prep: {
    titleEn: 'Orion Payload Mass Balance & Circuit Diagnostic',
    titleAr: 'اتزان كتلة العينات في أوريون وتشخيص الأعطال',
    goalEn: 'Distribute lunar samples across Left/Right bays (≤ 15 kg variance, ≤ 100 kg total), then flip the offline circuit breaker.',
    goalAr: 'وزّع الصخور القمرية بين الجناحين (فرق ≤ 15 كجم) ثم أصلح قاطع الدائرة الكهربائية.',
    keyControlsEn: 'Assign Left/Right Bays → Flip Fault Breaker',
    keyControlsAr: 'وازن الجناحين ← أصلح قاطع الدائرة',
    accentHex: '#818cf8',
    visualKind: 'com'
  },
  l4_earth_reentry: {
    titleEn: '1.3s DSN Light-Time Ping & ±18° Plasma Corridor',
    titleAr: 'إشارة الشبكة الفضائية 1.3ث وممر الدرع الحراري ±18°',
    goalEn: 'Await the true 1.3s lunar radio ping, then keep Orion pitched inside the ±18° fiery atmosphere corridor.',
    goalAr: 'انتظر زمن الإشارة الفعلي 1.3 ثانية، ثم وجّه أوريون داخل ممر الحرارة الآمن ±18 درجة.',
    keyControlsEn: 'Receive 1.3s DSN Signal → Hold Pitch Inside ±18°',
    keyControlsAr: 'استقبل إشارة 1.3ث ← ثبّت زاوية ±18°',
    accentHex: '#f97316',
    visualKind: 'reentry'
  },
  l4_safe_landing: {
    titleEn: '9,600m Chute Deployment & Pacific Splashdown',
    titleAr: 'فتح المظلات على 9,600م والهبوط السليم بالمحيط',
    goalEn: 'Watch altitude fall from 9,600m → deploy Drogue Chutes (≤ 7,800m) → deploy Main Tri-Chutes (≤ 3,600m)!',
    goalAr: 'راقب الارتفاع 9,600م ← افتح مظلات التوازن (≤ 7,800م) ← ثم المظلات الرئيسية الثلاث (≤ 3,600م)!',
    keyControlsEn: 'Drogues (≤ 7,800m) → Main Chutes (≤ 3,600m)',
    keyControlsAr: 'التوازن (≤ 7,800م) ← المظلات الرئيسية (≤ 3,600م)',
    accentHex: '#2dd4bf',
    visualKind: 'splash'
  }
};

const DEMO_DURATION_MS = 5000;

type DemoKind = DemoSpec['visualKind'];

function renderDemoCanvasFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  kind: DemoKind,
  accentHex: string,
  language: 'en' | 'ar'
): void {
  const lbl = (en: string, ar: string) => (language === 'ar' ? ar : en);
  // Deep aerospace atmospheric gradient backdrop + blueprint grid
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, '#040a1a');
  bg.addColorStop(0.55, '#0b1736');
  bg.addColorStop(1, '#061024');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= w; gx += 28) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  for (let gy = 0; gy <= h; gy += 28) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // Subtle ambient radial halo matching station accent
  const halo = ctx.createRadialGradient(w * 0.5, h * 0.48, 8, w * 0.5, h * 0.48, w * 0.48);
  halo.addColorStop(0, `${accentHex}29`);
  halo.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  if (kind === 'food' || kind === 'meal') {
    // Rotating HEPA turbine intake + laminar particle ribbon -> sculpted vacuum food tray
    const fanX = 56;
    const fanY = h * 0.5;
    ctx.save();
    ctx.translate(fanX, fanY);
    const fanGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
    fanGlow.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    fanGlow.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = fanGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.stroke();

    ctx.rotate(t * 5.2);
    for (let b = 0; b < 5; b++) {
      ctx.rotate((Math.PI * 2) / 5);
      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(14, -7, 22, 0);
      ctx.quadraticCurveTo(12, 6, 0, 0);
      ctx.fill();
    }
    ctx.restore();

    // HEPA accordion pleats (vertical chevron slats)
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let py = 24; py <= h - 24; py += 12) {
      const xOff = ((py - 24) / 12) % 2 === 0 ? 102 : 114;
      if (py === 24) ctx.moveTo(xOff, py);
      else ctx.lineTo(xOff, py);
    }
    ctx.stroke();

    // Laminar air particle ribbons flowing past tray
    for (let p = 0; p < 16; p++) {
      const progress = ((t * 0.55 + p / 16) % 1 + 1) % 1;
      const px = 92 + progress * (w - 135);
      const py = 26 + ((p * 23) % (h - 52)) + Math.sin(t * 4 + p) * 4;
      ctx.fillStyle = `rgba(52, 211, 153, ${0.35 + (1 - progress) * 0.65})`;
      ctx.beginPath();
      ctx.roundRect(px, py, 14, 2.5, 1.5);
      ctx.fill();
    }

    // Precision Food Tray Dock
    const tx = w - 136;
    const ty = 28;
    const tw = 112;
    const th = h - 56;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(tx, ty, tw, th, 10);
    ctx.fill();
    ctx.stroke();

    // Sliding glowing nutrient ration packet snapping into dock
    const fly = (Math.sin(t * 2.1) + 1) * 0.5;
    const pktX = 140 + fly * (tx - 118);
    const pktY = h * 0.5 - 15 - Math.sin(fly * Math.PI) * 14;
    const pktGrad = ctx.createLinearGradient(pktX, pktY, pktX + 54, pktY + 30);
    pktGrad.addColorStop(0, accentHex);
    pktGrad.addColorStop(1, '#10b981');
    ctx.fillStyle = pktGrad;
    ctx.beginPath();
    ctx.roundRect(pktX, pktY, 54, 30, 7);
    ctx.fill();
    ctx.fillStyle = '#041224';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE', pktX + 27, pktY + 13);
    ctx.fillText('RATION', pktX + 27, pktY + 24);

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(lbl('HEPA LAMINAR OK', 'تطهير HEPA نشط'), tx + tw * 0.5, h - 10);
  } else if (kind === 'balance' || kind === 'com') {
    // Precision Titanium Fulcrum + Machined Mass Beam + Shock Pistons
    const cx = w * 0.5;
    const pivotY = h * 0.66;
    const tilt = Math.sin(t * 2.0) * 0.11 * Math.cos(t * 0.7);

    // Fulcrum base pedestal
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.moveTo(cx, pivotY);
    ctx.lineTo(cx - 22, h - 16);
    ctx.lineTo(cx + 22, h - 16);
    ctx.closePath();
    ctx.fill();

    // Calibrated twin damper cylinders
    [-82, 82].forEach((ox) => {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx + ox, pivotY + 2);
      ctx.lineTo(cx + ox, h - 14);
      ctx.stroke();
    });

    ctx.save();
    ctx.translate(cx, pivotY - 4);
    ctx.rotate(tilt);

    const beamGrad = ctx.createLinearGradient(-120, 0, 120, 0);
    beamGrad.addColorStop(0, '#38bdf8');
    beamGrad.addColorStop(0.5, accentHex);
    beamGrad.addColorStop(1, '#34d399');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.roundRect(-124, -5, 248, 10, 5);
    ctx.fill();

    // Bay cargo crates on left & right wings
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.roundRect(-110, -34, 48, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(62, -34, 48, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(kind === 'com' ? lbl('PORT BAY', 'يسار') : lbl('LOAD A', 'حزمة أ'), -86, -16);
    ctx.fillText(kind === 'com' ? lbl('STBD BAY', 'يمين') : lbl('LOAD B', 'حزمة ب'), 86, -16);
    ctx.restore();

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      kind === 'balance'
        ? lbl('PAYLOAD ≤ 18 kg • CO-CENTERED', 'حمولة ≤ 18 كجم • متوازنة')
        : lbl('ORION MASS Δ ≤ 15 kg', 'فرق كتلة أوريون ≤ 15 كجم'),
      cx,
      24
    );
  } else if (kind === 'medical' || kind === 'ared') {
    // Biometric ECG Waveform + Meniscus / Kinetic Flywheel Canvas
    const midY = h * 0.54;
    if (kind === 'ared') {
      // Twin Tungsten ARED Flywheel + Piston Oscillators
      [-74, 74].forEach((ox, idx) => {
        const fx = w * 0.5 + ox;
        ctx.save();
        ctx.translate(fx, midY);
        ctx.strokeStyle = accentHex;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        ctx.stroke();

        ctx.rotate(t * (idx === 0 ? 3.5 : -3.5));
        for (let s = 0; s < 6; s++) {
          ctx.rotate(Math.PI / 3);
          ctx.strokeStyle = 'rgba(248, 250, 252, 0.45)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(28, 0);
          ctx.stroke();
        }
        ctx.restore();
      });
      const pull = Math.sin(t * 2.8) * 18;
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 88, midY + pull);
      ctx.lineTo(w * 0.5 + 88, midY + pull);
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('0.16G ARED KINETIC FORCE BENCH', 'منصة ARED لمقاومة القمر 0.16G'), w * 0.5, 24);
    } else {
      // Biometric ECG Pulse Trace + Fluid Hydration Cylinder
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 26; x < w - 110; x += 2) {
        const phase = ((x + t * 140) % 64) / 64;
        const spike = phase > 0.4 && phase < 0.48 ? -26 : phase >= 0.48 && phase < 0.55 ? 18 : Math.sin(phase * Math.PI * 2) * 3;
        if (x === 26) ctx.moveTo(x, midY + spike);
        else ctx.lineTo(x, midY + spike);
      }
      ctx.stroke();

      // Meniscus tube
      const cylX = w - 82;
      const fillPct = (Math.sin(t * 2.2) + 1) * 0.35 + 0.25;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(cylX, 24, 42, h - 48);
      const fillH = (h - 52) * fillPct;
      const liq = ctx.createLinearGradient(0, h - 26 - fillH, 0, h - 26);
      liq.addColorStop(0, '#38bdf8');
      liq.addColorStop(1, '#0284c7');
      ctx.fillStyle = liq;
      ctx.fillRect(cylX + 2, h - 26 - fillH, 38, fillH);
      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('1.5s HOLD', '1.5ث ضغط'), cylX + 21, 18);
    }
  } else if (kind === 'launch') {
    // SLS Steel Gantry Truss + Orange Core Stage + Shimmering Mach-Diamond Plume
    const rx = w * 0.48;
    const lift = Math.sin(t * 2.2) > 0.3 ? (Math.sin(t * 2.2) - 0.3) * 18 : 0;
    // Steel umbilical tower cross-braces
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx - 74, 24, 26, h - 42);
    for (let ty = 32; ty < h - 22; ty += 16) {
      ctx.beginPath();
      ctx.moveTo(rx - 74, ty);
      ctx.lineTo(rx - 48, ty + 14);
      ctx.moveTo(rx - 48, ty);
      ctx.lineTo(rx - 74, ty + 14);
      ctx.stroke();
    }

    // SLS Core Stage + Twin SRBs + Mach Exhaust
    const by = h - 30 - lift;
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.roundRect(rx - 12, by - 64, 24, 62, 4);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(rx - 26, by - 54, 10, 50);
    ctx.fillRect(rx + 16, by - 54, 10, 50);
    // Nosecone
    ctx.beginPath();
    ctx.moveTo(rx - 12, by - 64);
    ctx.lineTo(rx, by - 88);
    ctx.lineTo(rx + 12, by - 64);
    ctx.fill();

    // Mach Diamonds Flame Plume
    const flGrad = ctx.createRadialGradient(rx, by + 6, 3, rx, by + 18, 36);
    flGrad.addColorStop(0, '#fef08a');
    flGrad.addColorStop(0.5, '#f97316');
    flGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = flGrad;
    ctx.beginPath();
    ctx.moveTo(rx - 22, by - 2);
    ctx.lineTo(rx, by + 32 + Math.sin(t * 24) * 6);
    ctx.lineTo(rx + 22, by - 2);
    ctx.closePath();
    ctx.fill();

    // LOX/LH2 Telemetry Meter Strip
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.fillRect(w - 118, 36, 94, 54);
    ctx.strokeRect(w - 118, 36, 94, 54);
    ctx.fillStyle = '#34d399';
    ctx.fillRect(w - 92, 54, 42, 10);
    const needleX = w - 112 + ((Math.sin(t * 2.5) + 1) * 0.5) * 80;
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(needleX, 49, 4, 20);
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(lbl('LOX + LH2 SYNC', 'تزامن الوقود'), w - 71, 30);
  } else if (kind === 'zerog' || kind === 'neows') {
    if (kind === 'neows') {
      // Conic Phased Radar Sweep + Rotating Multi-Vertex Asteroid Polygons
      const rx = 86;
      const ry = h * 0.5;
      for (const r of [18, 34, 50]) {
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(t * 2.8);
      const sweep = ctx.createRadialGradient(0, 0, 2, 0, 0, 50);
      sweep.addColorStop(0, 'rgba(52, 211, 153, 0.55)');
      sweep.addColorStop(1, 'rgba(52, 211, 153, 0.02)');
      ctx.fillStyle = sweep;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 50, -0.45, 0.15);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Rotating Faceted Asteroid Polygon traveling along threat lane
      const ax = w - 76 - (((t * 70) % 150));
      const ay = ry + Math.sin(t * 3.1) * 18;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(t * 2.1);
      ctx.fillStyle = '#94a3b8';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const radii = [16, 12, 18, 13, 17, 11, 15];
      radii.forEach((rad, i) => {
        const ang = (i / radii.length) * Math.PI * 2;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('NEOWS DOPPLER SWEEP ACTIVE', 'مسح رادار كويكبات NeoWs'), w * 0.65, h - 14);
    } else {
      // ISS Cylindrical Ribbed Bulkheads + Floating Supply Drift Trail
      for (let i = 0; i < 6; i++) {
        const rx = 56 + i * 52;
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(rx, h * 0.5, 16, 44, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const ax = 68 + ((Math.sin(t * 1.9) + 1) * 0.5) * (w - 140);
      const ay = h * 0.5 + Math.cos(t * 3.2) * 20;
      ctx.strokeStyle = accentHex;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(40, h * 0.5);
      ctx.lineTo(ax, ay);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = accentHex;
      ctx.beginPath();
      ctx.roundRect(ax - 16, ay - 12, 32, 24, 6);
      ctx.fill();
      ctx.fillStyle = '#041224';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EVA', ax, ay + 3);
    }
  } else if (kind === 'pipes' || kind === 'storm' || kind === 'crater') {
    if (kind === 'pipes') {
      // Pressurized Glass Tube Manifolds + Flanged Metallic Couplers + Flowing Bubbles
      const pts: [number, number][] = [
        [44, h * 0.58],
        [130, h * 0.58],
        [130, h * 0.34],
        [240, h * 0.34],
        [240, h * 0.68],
        [w - 44, h * 0.68]
      ];
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 18;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(34, 211, 238, 0.38)';
      ctx.lineWidth = 11;
      ctx.stroke();

      // Metallic flange collars at joints
      ctx.fillStyle = '#94a3b8';
      pts.slice(1, -1).forEach(([x, y]) => {
        ctx.fillRect(x - 10, y - 10, 20, 20);
      });

      // Flowing water bubbles along manifold
      for (let b = 0; b < 7; b++) {
        const prog = ((t * 0.45 + b / 7) % 1 + 1) % 1;
        const bx = 44 + prog * (w - 88);
        const by = prog < 0.25 ? h * 0.58 : prog < 0.62 ? h * 0.34 : h * 0.68;
        ctx.fillStyle = '#a5f3fc';
        ctx.beginPath();
        ctx.arc(bx, by, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('98% ECLSS PRESSURIZED LOOP', 'دورة تنقية المياه المغلقة 98%'), w * 0.5, 22);
    } else if (kind === 'storm') {
      // Translucent Bio-Dome under Magnetic Plasma Shield Deflecting Proton Rays
      const cx = w * 0.5;
      const base = h - 20;
      const domeGrad = ctx.createRadialGradient(cx, base - 24, 6, cx, base - 24, 58);
      domeGrad.addColorStop(0, 'rgba(16, 185, 129, 0.65)');
      domeGrad.addColorStop(1, 'rgba(6, 182, 212, 0.25)');
      ctx.fillStyle = domeGrad;
      ctx.beginPath();
      ctx.arc(cx, base, 52, Math.PI, 0);
      ctx.closePath();
      ctx.fill();

      // Pulsing magnetic deflector arc
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, base, 70 + Math.sin(t * 6) * 2.5, Math.PI * 1.08, -Math.PI * 0.08);
      ctx.stroke();

      // Deflecting solar proton streaks
      for (let s = 0; s < 6; s++) {
        const sx = 34 + ((t * 160 + s * 58) % (w - 68));
        const sy = 20 + ((s * 17) % 36);
        ctx.strokeStyle = s % 2 === 0 ? '#facc15' : '#f87171';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + 18, sy + 12);
        ctx.stroke();
      }
      ctx.fillStyle = '#bae6fd';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('DONKI MAGNETIC SHIELD ACTIVE', 'الدرع المغناطيسي DONKI نشط'), cx, 22);
    } else {
      // 0.16G Lunar Regolith Strata + Cyan Spectral Scanning Beam
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, h);
      ctx.lineTo(0, h * 0.56);
      ctx.quadraticCurveTo(w * 0.5, h * 0.88, w, h * 0.56);
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      const scanX = w * 0.5 + Math.sin(t * 2.2) * 84;
      const beam = ctx.createLinearGradient(w * 0.5, 18, scanX, h * 0.72);
      beam.addColorStop(0, 'rgba(34, 211, 238, 0.55)');
      beam.addColorStop(1, 'rgba(34, 211, 238, 0.05)');
      ctx.fillStyle = beam;
      ctx.beginPath();
      ctx.moveTo(w * 0.5 - 10, 18);
      ctx.lineTo(w * 0.5 + 10, 18);
      ctx.lineTo(scanX + 26, h * 0.76);
      ctx.lineTo(scanX - 26, h * 0.76);
      ctx.closePath();
      ctx.fill();

      // Shimmering Ice/Titanium Core Gems inside crater floor
      [
        [w * 0.34, h * 0.74, '#38bdf8'],
        [w * 0.52, h * 0.79, '#fde047'],
        [w * 0.68, h * 0.72, '#34d399']
      ].forEach(([gx, gy, col]) => {
        ctx.fillStyle = col as string;
        ctx.beginPath();
        ctx.moveTo(gx as number, (gy as number) - 8);
        ctx.lineTo((gx as number) + 7, gy as number);
        ctx.lineTo(gx as number, (gy as number) + 8);
        ctx.lineTo((gx as number) - 7, gy as number);
        ctx.closePath();
        ctx.fill();
      });
    }
  } else {
    // Re-Entry PICA-X Bow Shock OR Orion Tri-Gore Parachutes + Pacific Ocean Foam
    const cx = w * 0.5;
    if (kind === 'reentry') {
      // ±18° Safety Corridor Lines + DSN 1.3s Pulse Wave
      ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(30, h * 0.25);
      ctx.lineTo(w - 30, h * 0.55);
      ctx.moveTo(30, h * 0.55);
      ctx.lineTo(w - 30, h * 0.85);
      ctx.stroke();
      ctx.setLineDash([]);

      // Orion Gumdrop + Fiery PICA-X Bow Shock Arc
      const oy = h * 0.54 + Math.sin(t * 2.5) * 10;
      ctx.strokeStyle = '#fb923c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx + 8, oy, 32, -Math.PI * 0.42, Math.PI * 0.42);
      ctx.stroke();

      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(cx - 18, oy);
      ctx.lineTo(cx + 12, oy - 16);
      ctx.lineTo(cx + 12, oy + 16);
      ctx.closePath();
      ctx.fill();

      // 1.3s DSN Ping Concentric Arcs
      const pingR = ((t * 48) % 64) + 12;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(46, 36, pingR * 0.45, 0, Math.PI * 0.6);
      ctx.stroke();
      ctx.fillStyle = '#fed7aa';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('1.3s DSN PING -> PICA-X ±18°', 'إشارة 1.3ث ← ممر أوريون ±18°'), cx, 22);
    } else {
      // Layered Pacific Ocean + Triple Orange-White Gore Chutes Descending Smoothly
      const waterGrad = ctx.createLinearGradient(0, h - 32, 0, h);
      waterGrad.addColorStop(0, '#0284c7');
      waterGrad.addColorStop(1, '#082f49');
      ctx.fillStyle = waterGrad;
      ctx.fillRect(0, h - 32, w, 32);

      const dropY = 58 + Math.sin(t * 1.8) * 14;
      [-28, 0, 28].forEach((ox, i) => {
        const chx = cx + ox;
        const chy = dropY - 26 - (i === 1 ? 4 : 0);
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(chx - 14, chy + 2);
        ctx.lineTo(cx, dropY + 18);
        ctx.moveTo(chx + 14, chy + 2);
        ctx.lineTo(cx, dropY + 18);
        ctx.stroke();

        ctx.fillStyle = i % 2 === 0 ? '#f97316' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(chx, chy, 15, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
      });
      // Capsule Hull
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(cx - 12, dropY + 24);
      ctx.lineTo(cx + 12, dropY + 24);
      ctx.lineTo(cx + 7, dropY + 14);
      ctx.lineTo(cx - 7, dropY + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#a7f3d0';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(lbl('7,800m DROGUES -> 3,600m MAIN CHUTES', '7,800م توازن ← 3,600م مظلات رئيسية'), cx, h - 10);
    }
  }
}

export const MiniGameDemoOverlay: React.FC<MiniGameDemoOverlayProps> = ({
  miniGameId,
  onFinish
}) => {
  const { language } = useGameState();
  const spec = DEMO_SPECS[miniGameId] || DEMO_SPECS.l1_food_prep;
  const [elapsedMs, setElapsedMs] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const start = performance.now();
    const timer = window.setInterval(() => {
      const next = performance.now() - start;
      if (next >= DEMO_DURATION_MS) {
        window.clearInterval(timer);
        setElapsedMs(DEMO_DURATION_MS);
        onFinish();
      } else {
        setElapsedMs(next);
      }
    }, 60);
    return () => window.clearInterval(timer);
  }, [onFinish]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let rafId = 0;
    const t0 = performance.now();

    const drawLoop = () => {
      rafId = window.requestAnimationFrame(drawLoop);
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const targetW = Math.max(240, Math.round(rect.width * dpr));
      const targetH = Math.max(120, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      const t = (performance.now() - t0) / 1000;
      renderDemoCanvasFrame(ctx, rect.width || 360, rect.height || 148, t, spec.visualKind, spec.accentHex, language);
      ctx.restore();
    };

    drawLoop();
    return () => window.cancelAnimationFrame(rafId);
  }, [spec.visualKind, spec.accentHex, language]);

  const pct = Math.min(100, Math.round((elapsedMs / DEMO_DURATION_MS) * 100));
  const remainSec = Math.max(0.1, (DEMO_DURATION_MS - elapsedMs) / 1000).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      data-testid="minigame-demo-overlay"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className="rounded-3xl bg-slate-950/95 border-2 border-cyan-400/75 p-4 sm:p-5 shadow-2xl space-y-4 max-h-[82vh] overflow-y-auto"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-300/60 text-cyan-200 font-hud font-black text-[11px]">
            <Play className="w-3.5 h-3.5 fill-current" />
            {tr(language, 'LIVE VISUAL DEMO • 5s', 'شرح مرئي تفاعلي • 5 ثوانٍ')}
          </span>
          <span className="text-xs font-mono font-bold text-slate-300">{remainSec}s</span>
        </div>

        <button
          type="button"
          data-testid="demo-skip-btn"
          onClick={() => {
            soundManager.playClick();
            onFinish();
          }}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400 hover:brightness-110 active:scale-95 text-slate-950 font-hud font-black text-xs sm:text-sm shadow-lg inline-flex items-center gap-1.5 cursor-pointer"
        >
          <span>{tr(language, 'Skip / Play Now 🚀', 'تخطي / العب الآن 🚀')}</span>
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* High-Craft 60fps HTML5 Physics Simulation Canvas */}
      <div className="relative rounded-2xl bg-slate-950 border border-cyan-400/30 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          data-testid="demo-physics-canvas"
          className="w-full h-36 sm:h-44 block"
        />
      </div>

      {/* Clear 1-line Objective + Control Strip */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-cyan-200 font-hud font-black text-sm sm:text-base">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>{tr(language, spec.titleEn, spec.titleAr)}</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
          {tr(language, spec.goalEn, spec.goalAr)}
        </p>
        <div className="inline-block px-3 py-1 rounded-xl bg-white/10 border border-white/15 text-[11px] font-hud font-bold text-amber-200">
          {tr(language, spec.keyControlsEn, spec.keyControlsAr)}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400 transition-all duration-75"
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.div>
  );
};
