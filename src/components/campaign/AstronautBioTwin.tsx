import React, { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import { AppLanguage } from '../../types/game';
import { tr } from '../../utils/i18n';
import { soundManager } from '../../utils/sound';

export interface AstronautBioTwinProps {
  rationsCount: number;
  hydrationPct: number;
  boneMusclePct: number;
  suitCalibrated: boolean;
  radiationShielded?: boolean;
  language: AppLanguage;
  compact?: boolean;
  onInteractClick?: () => void;
}

type BioFocusZone = 'all' | 'core' | 'bone' | 'hydration' | 'shield';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function project3D(
  p: Vec3,
  yaw: number,
  pitch: number,
  cx: number,
  cy: number,
  scale: number
): { x: number; y: number; z: number } {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const x1 = p.x * cosY + p.z * sinY;
  const z1 = -p.x * sinY + p.z * cosY;

  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const y2 = p.y * cosP - z1 * sinP;
  const z2 = p.y * sinP + z1 * cosP;

  const persp = 4.6 / Math.max(1.8, 4.6 - z2);
  return {
    x: cx + x1 * scale * persp,
    y: cy - y2 * scale * persp,
    z: z2
  };
}

export const AstronautBioTwin: React.FC<AstronautBioTwinProps> = ({
  rationsCount,
  hydrationPct,
  boneMusclePct,
  suitCalibrated,
  radiationShielded = false,
  language,
  compact = false,
  onInteractClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [focusZone, setFocusZone] = useState<BioFocusZone>('all');

  // GSAP-animated smooth proxy so sudden ration/hydration changes animate cleanly
  const animStateRef = useRef({
    rationsGlow: rationsCount > 0 ? Math.min(1, rationsCount / 4) : 0.15,
    hydrationNorm: Math.max(0, Math.min(1, hydrationPct / 100)),
    boneNorm: Math.max(0, Math.min(1, boneMusclePct / 100)),
    shieldMix: radiationShielded ? 1 : 0,
    pulseBurst: 0
  });

  const prevTriggerRef = useRef(`${rationsCount}:${hydrationPct}:${boneMusclePct}:${suitCalibrated}:${radiationShielded}`);

  useEffect(() => {
    const nextTrigger = `${rationsCount}:${hydrationPct}:${boneMusclePct}:${suitCalibrated}:${radiationShielded}`;
    const targetRations = rationsCount > 0 ? Math.min(1, 0.45 + rationsCount * 0.14) : 0.15;
    const tween = gsap.to(animStateRef.current, {
      rationsGlow: targetRations,
      hydrationNorm: Math.max(0, Math.min(1, hydrationPct / 100)),
      boneNorm: Math.max(0, Math.min(1, boneMusclePct / 100)),
      shieldMix: radiationShielded ? 1 : 0,
      duration: 0.75,
      ease: 'power2.out'
    });

    if (prevTriggerRef.current !== nextTrigger) {
      prevTriggerRef.current = nextTrigger;
      gsap.fromTo(
        animStateRef.current,
        { pulseBurst: 1 },
        { pulseBurst: 0, duration: 0.9, ease: 'power3.out' }
      );
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { boxShadow: '0 0 26px rgba(34,211,238,0.65)' },
          { boxShadow: '0 0 12px rgba(34,211,238,0.2)', duration: 0.85, ease: 'power2.out' }
        );
      }
    }

    return () => {
      tween.kill();
    };
  }, [rationsCount, hydrationPct, boneMusclePct, suitCalibrated, radiationShielded]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = compact ? 156 : 210;
    const h = compact ? 176 : 230;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let rafId = 0;
    let yaw = 0.35;
    let lastTime = performance.now();

    const skeletonSegments: [Vec3, Vec3][] = [
      // Spine & Clavicle
      [{ x: 0, y: 0.52, z: 0 }, { x: 0, y: -0.18, z: 0 }],
      [{ x: -0.34, y: 0.42, z: 0 }, { x: 0.34, y: 0.42, z: 0 }],
      [{ x: -0.22, y: -0.18, z: 0 }, { x: 0.22, y: -0.18, z: 0 }],
      // Ribs (3 glowing thoracic hoops)
      [{ x: -0.25, y: 0.30, z: 0.12 }, { x: 0.25, y: 0.30, z: 0.12 }],
      [{ x: -0.24, y: 0.18, z: 0.14 }, { x: 0.24, y: 0.18, z: 0.14 }],
      [{ x: -0.20, y: 0.06, z: 0.12 }, { x: 0.20, y: 0.06, z: 0.12 }],
      [{ x: -0.25, y: 0.30, z: -0.12 }, { x: 0.25, y: 0.30, z: -0.12 }],
      [{ x: -0.24, y: 0.18, z: -0.14 }, { x: 0.24, y: 0.18, z: -0.14 }],
      // Arms (Humerus + Radius)
      [{ x: -0.34, y: 0.42, z: 0 }, { x: -0.46, y: 0.14, z: 0.05 }],
      [{ x: -0.46, y: 0.14, z: 0.05 }, { x: -0.50, y: -0.16, z: 0.14 }],
      [{ x: 0.34, y: 0.42, z: 0 }, { x: 0.46, y: 0.14, z: 0.05 }],
      [{ x: 0.46, y: 0.14, z: 0.05 }, { x: 0.50, y: -0.16, z: 0.14 }],
      // Legs (Femur + Tibia)
      [{ x: -0.20, y: -0.18, z: 0 }, { x: -0.22, y: -0.56, z: 0.04 }],
      [{ x: -0.22, y: -0.56, z: 0.04 }, { x: -0.23, y: -0.94, z: 0.02 }],
      [{ x: 0.20, y: -0.18, z: 0 }, { x: 0.22, y: -0.56, z: 0.04 }],
      [{ x: 0.22, y: -0.56, z: 0.04 }, { x: 0.23, y: -0.94, z: 0.02 }]
    ];

    const renderFrame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      yaw += dt * 0.65;
      const t = now * 0.001;
      const s = animStateRef.current;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.49 + Math.sin(t * 2.1) * 2.5;
      const scale = compact ? 54 : 74;

      // Hologram base scan grid & emitter beam
      const baseGlow = ctx.createRadialGradient(cx, h * 0.90, 4, cx, h * 0.90, w * 0.40);
      baseGlow.addColorStop(0, 'rgba(34, 211, 238, 0.52)');
      baseGlow.addColorStop(1, 'rgba(34, 211, 238, 0)');
      ctx.fillStyle = baseGlow;
      ctx.beginPath();
      ctx.ellipse(cx, h * 0.90, w * 0.36, compact ? 10 : 13, 0, 0, Math.PI * 2);
      ctx.fill();

      // Draw volumetric scanline cone
      const beamGrad = ctx.createLinearGradient(cx, h * 0.90, cx, h * 0.14);
      beamGrad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
      beamGrad.addColorStop(1, 'rgba(34, 211, 238, 0.01)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.24, h * 0.90);
      ctx.lineTo(cx + w * 0.24, h * 0.90);
      ctx.lineTo(cx + w * 0.38, h * 0.14);
      ctx.lineTo(cx - w * 0.38, h * 0.14);
      ctx.closePath();
      ctx.fill();

      const pitch = 0.22;
      const boneColor =
        s.boneNorm >= 0.85
          ? 'rgba(52, 211, 153, 0.95)'
          : s.boneNorm >= 0.72
          ? 'rgba(250, 204, 21, 0.95)'
          : 'rgba(251, 113, 133, 0.95)';
      const hydrColor =
        s.hydrationNorm >= 0.85
          ? 'rgba(56, 189, 248, 0.95)'
          : 'rgba(251, 146, 60, 0.95)';
      const stomachColor =
        rationsCount > 0 ? 'rgba(52, 211, 153, 0.95)' : 'rgba(251, 191, 36, 0.85)';

      // Outer suit silhouette shell (highlighted when suitCalibrated)
      ctx.strokeStyle = suitCalibrated
        ? `rgba(34, 211, 238, ${0.42 + s.pulseBurst * 0.35})`
        : 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = suitCalibrated ? 2.1 : 1.2;
      const hullRings = [0.46, 0.24, -0.04, -0.22];
      hullRings.forEach((ry) => {
        const pCenter = project3D({ x: 0, y: ry, z: 0 }, yaw, pitch, cx, cy, scale);
        const rx = (ry === 0.46 ? 0.30 : ry === -0.22 ? 0.22 : 0.28) * scale;
        ctx.beginPath();
        ctx.ellipse(pCenter.x, pCenter.y, rx, rx * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Skeletal & muscle lattice
      ctx.lineCap = 'round';
      skeletonSegments.forEach(([a, b], idx) => {
        const pa = project3D(a, yaw, pitch, cx, cy, scale);
        const pb = project3D(b, yaw, pitch, cx, cy, scale);
        const isFocusBone = focusZone === 'all' || focusZone === 'bone';
        ctx.strokeStyle = boneColor;
        ctx.lineWidth = isFocusBone ? (idx >= 8 ? 3.2 : 2.3) : 1.5;
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
        ctx.stroke();

        // Muscle fiber outer halo along limbs
        if (idx >= 8) {
          ctx.strokeStyle = `rgba(34, 211, 238, ${0.28 + s.boneNorm * 0.35})`;
          ctx.lineWidth = 6.2 * s.boneNorm;
          ctx.beginPath();
          ctx.moveTo(pa.x, pa.y);
          ctx.lineTo(pb.x, pb.y);
          ctx.stroke();
        }
      });

      // Stomach / Metabolic Energy Reactor Core
      const coreP = project3D({ x: 0, y: 0.08, z: 0.05 }, yaw, pitch, cx, cy, scale);
      const coreRadius = (compact ? 11 : 15) * (0.78 + s.rationsGlow * 0.45 + Math.sin(t * 4.5) * 0.08);
      const coreGrad = ctx.createRadialGradient(coreP.x, coreP.y, 1, coreP.x, coreP.y, coreRadius * 1.45);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.45, stomachColor);
      coreGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(coreP.x, coreP.y, coreRadius * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Helmet + Cranial Hydration Halo
      const headP = project3D({ x: 0, y: 0.74, z: 0 }, yaw, pitch, cx, cy, scale);
      const headR = compact ? 13 : 17;
      ctx.strokeStyle = hydrColor;
      ctx.lineWidth = focusZone === 'hydration' ? 3 : 2;
      ctx.beginPath();
      ctx.arc(headP.x, headP.y, headR, 0, Math.PI * 2);
      ctx.stroke();

      // Orbiting hydration droplets
      const dropCount = 3;
      for (let i = 0; i < dropCount; i += 1) {
        const ang = t * 2.2 + (i * Math.PI * 2) / dropCount;
        const hp = project3D(
          { x: Math.cos(ang) * 0.42, y: 0.72 + Math.sin(t * 3 + i) * 0.05, z: Math.sin(ang) * 0.42 },
          yaw,
          pitch,
          cx,
          cy,
          scale
        );
        ctx.fillStyle = hydrColor;
        ctx.beginPath();
        ctx.arc(hp.x, hp.y, compact ? 2.4 : 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Protective Solar Radiation Hex Shield Bubble
      if (s.shieldMix > 0.05 || focusZone === 'shield') {
        const alpha = Math.max(s.shieldMix * 0.65, focusZone === 'shield' ? 0.55 : 0);
        ctx.strokeStyle = `rgba(167, 139, 250, ${alpha})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.ellipse(cx, cy - scale * 0.1, scale * 0.78, scale * 1.02, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Pulse Burst Ring (fires on food/water/suit interaction!)
      if (s.pulseBurst > 0.02) {
        ctx.strokeStyle = `rgba(52, 211, 153, ${s.pulseBurst})`;
        ctx.lineWidth = 2.4;
        const burstR = (1 - s.pulseBurst) * scale * 1.1 + 12;
        ctx.beginPath();
        ctx.arc(coreP.x, coreP.y, burstR, 0, Math.PI * 2);
        ctx.stroke();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafId);
  }, [compact, focusZone, rationsCount, suitCalibrated]);

  const statusText = useMemo(() => {
    if (focusZone === 'core') {
      return rationsCount > 0
        ? tr(language, `Space Snacks: ${rationsCount} packed! 🍎`, `وجبات الفضاء: ${rationsCount} جاهزة! 🍎`)
        : tr(language, 'Space Tummy: Needs yummy space snacks!', 'طاقة البطل: يحتاج وجبات فضاء لذيذة!');
    }
    if (focusZone === 'bone') {
      return tr(
        language,
        boneMusclePct >= 75 ? 'Super Strength: MAX POWER! 💪' : 'Super Strength: Ready to exercise! 💪',
        boneMusclePct >= 75 ? 'قوة خارقة: طاقة قصوى! 💪' : 'قوة خارقة: جاهز للتمرين! 💪'
      );
    }
    if (focusZone === 'hydration') {
      return tr(
        language,
        hydrationPct >= 75 ? 'Water Shield: FULL & FRESH! 💧' : 'Water Shield: Time for a sip! 💧',
        hydrationPct >= 75 ? 'درع الماء: ممتلئ ومنتعش! 💧' : 'درع الماء: حان وقت رشفة ماء! 💧'
      );
    }
    if (focusZone === 'shield') {
      return radiationShielded
        ? tr(language, 'Sun Shield: PROTECTING! 🛡️', 'درع الشمس: يحميك الآن! 🛡️')
        : tr(language, 'Sun Shield: Tap Moon Lab to build! 🛡️', 'درع الشمس: جهّزه في معمل القمر! 🛡️');
    }
    return suitCalibrated
      ? tr(language, 'Space Suit Ready! ✨', 'بدلة الفضاء جاهزة! ✨')
      : tr(language, 'Space Buddy Status', 'حالة صديق الفضاء');
  }, [boneMusclePct, focusZone, hydrationPct, language, radiationShielded, rationsCount, suitCalibrated]);

  return (
    <div
      ref={cardRef}
      data-testid="astronaut-bio-twin"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`rounded-2xl bg-slate-950/92 border-2 border-cyan-400/55 ${
        compact ? 'p-2.5 flex items-center gap-2.5' : 'p-3.5 space-y-2.5'
      } shadow-xl backdrop-blur-md`}
    >
      <button
        type="button"
        onClick={() => {
          soundManager.playClick();
          gsap.fromTo(
            animStateRef.current,
            { pulseBurst: 1 },
            { pulseBurst: 0, duration: 0.8, ease: 'power3.out' }
          );
          setFocusZone((prev) =>
            prev === 'all'
              ? 'core'
              : prev === 'core'
              ? 'bone'
              : prev === 'bone'
              ? 'hydration'
              : prev === 'hydration'
              ? 'shield'
              : 'all'
          );
          onInteractClick?.();
        }}
        className="relative shrink-0 rounded-xl bg-slate-900/90 border border-cyan-400/35 hover:border-cyan-300 transition-colors cursor-pointer overflow-hidden"
        title={tr(language, 'Tap Bio-Twin to scan organs', 'اضغط لفحص أنظمة الجسم')}
      >
        <canvas
          ref={canvasRef}
          data-testid="bio-twin-canvas"
          style={{ width: compact ? 156 : 210, height: compact ? 176 : 230 }}
          className="block"
        />
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-300/50 text-[9px] font-hud font-black text-cyan-100">
          {tr(language, 'SPACE BUDDY', 'بطل الفضاء')}
        </span>
      </button>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-[11px] font-hud font-black text-cyan-200 leading-snug">
          {statusText}
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFocusZone('core');
            }}
            className={`px-2 py-1 rounded-lg border text-start cursor-pointer transition-colors ${
              focusZone === 'core'
                ? 'bg-emerald-500/25 border-emerald-300 text-emerald-100'
                : 'bg-slate-900/80 border-slate-700 text-slate-200'
            }`}
          >
            🍎 {tr(language, `Snacks: ${rationsCount}`, `الوجبات: ${rationsCount}`)}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFocusZone('bone');
            }}
            className={`px-2 py-1 rounded-lg border text-start cursor-pointer transition-colors ${
              focusZone === 'bone'
                ? 'bg-amber-500/25 border-amber-300 text-amber-100'
                : 'bg-slate-900/80 border-slate-700 text-slate-200'
            }`}
          >
            💪 {tr(language, `Strong: ${boneMusclePct}%`, `القوة: ${boneMusclePct}%`)}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFocusZone('hydration');
            }}
            className={`px-2 py-1 rounded-lg border text-start cursor-pointer transition-colors ${
              focusZone === 'hydration'
                ? 'bg-sky-500/25 border-sky-300 text-sky-100'
                : 'bg-slate-900/80 border-slate-700 text-slate-200'
            }`}
          >
            💧 {tr(language, `Water: ${hydrationPct}%`, `الماء: ${hydrationPct}%`)}
          </button>

          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              setFocusZone('shield');
            }}
            className={`px-2 py-1 rounded-lg border text-start cursor-pointer transition-colors ${
              focusZone === 'shield'
                ? 'bg-violet-500/25 border-violet-300 text-violet-100'
                : 'bg-slate-900/80 border-slate-700 text-slate-200'
            }`}
          >
            🛡️ {radiationShielded ? tr(language, 'Shield ON', 'الدرع مفعل') : suitCalibrated ? tr(language, 'Suit OK', 'البدلة جاهزة') : tr(language, 'Ready', 'جاهز')}
          </button>
        </div>
      </div>
    </div>
  );
};
