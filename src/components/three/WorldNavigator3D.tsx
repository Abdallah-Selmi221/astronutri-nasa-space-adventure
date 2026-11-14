import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CampaignLevelId, CampaignProgressState } from '../../types/game';
import { CAMPAIGN_LEVELS } from '../../data/campaignLevels';
import { soundManager } from '../../utils/sound';
import { Lock, CheckCircle2, Rocket, Sparkles } from 'lucide-react';

interface WorldNavigator3DProps {
  campaign: CampaignProgressState;
  onSelectLevel: (levelId: CampaignLevelId) => void;
}

interface NodeScreenPos {
  levelId: CampaignLevelId;
  x: number;
  y: number;
  visible: boolean;
}

const NODE_WORLD_POSITIONS: Record<CampaignLevelId, THREE.Vector3> = {
  1: new THREE.Vector3(-8.4, 0.2, 0.8),
  2: new THREE.Vector3(-2.8, 1.1, -0.8),
  3: new THREE.Vector3(2.8, 0.4, 0.7),
  4: new THREE.Vector3(8.4, -0.4, -0.5)
};

function createEarthTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(65, 48, 30, 22, 0.3, 0, Math.PI * 2);
    ctx.ellipse(150, 56, 38, 28, -0.2, 0, Math.PI * 2);
    ctx.ellipse(215, 78, 22, 16, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(0, 0, 256, 12);
    ctx.fillRect(0, 116, 256, 12);
  }
  return new THREE.CanvasTexture(canvas);
}

function createMoonTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, 0, 256, 128);
    const craters = [
      [44, 38, 14],
      [96, 72, 18],
      [152, 42, 12],
      [204, 68, 20],
      [124, 96, 10],
      [62, 92, 9]
    ];
    for (const [cx, cy, r] of craters) {
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

export const WorldNavigator3D: React.FC<WorldNavigator3DProps> = ({
  campaign,
  onSelectLevel
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [projectedNodes, setProjectedNodes] = useState<NodeScreenPos[]>([
    { levelId: 1, x: 18, y: 55, visible: true },
    { levelId: 2, x: 39, y: 45, visible: true },
    { levelId: 3, x: 61, y: 50, visible: true },
    { levelId: 4, x: 82, y: 58, visible: true }
  ]);
  const activeLevelRef = useRef<CampaignLevelId>(campaign.activeLevel);
  activeLevelRef.current = campaign.activeLevel;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let rafId = 0;

    try {
      const width = Math.max(container.clientWidth || 960, 320);
      const height = Math.max(container.clientHeight || 420, 280);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 120);
      camera.position.set(0, 3.8, 17.5);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0xdbeafe, 0.95));
      const sun = new THREE.DirectionalLight(0xfff7ed, 1.8);
      sun.position.set(10, 12, 14);
      scene.add(sun);

      // Starfield
      const starGeo = new THREE.BufferGeometry();
      const starPositions = new Float32Array(450 * 3);
      for (let i = 0; i < 450; i++) {
        starPositions[i * 3] = (Math.random() - 0.5) * 60;
        starPositions[i * 3 + 1] = (Math.random() - 0.5) * 32;
        starPositions[i * 3 + 2] = -4 - Math.random() * 24;
      }
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xe0f2fe, size: 0.16, transparent: true, opacity: 0.85 })
      );
      scene.add(stars);

      // Flight spline trajectory connecting all 4 levels
      const curve = new THREE.CatmullRomCurve3([
        NODE_WORLD_POSITIONS[1],
        NODE_WORLD_POSITIONS[2],
        NODE_WORLD_POSITIONS[3],
        NODE_WORLD_POSITIONS[4]
      ]);
      const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.08, 8, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.65
      });
      scene.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Node 1: Rotating 3D Earth (Launch Prep)
      const earthTex = createEarthTexture();
      const earthGroup = new THREE.Group();
      earthGroup.position.copy(NODE_WORLD_POSITIONS[1]);
      const earthMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.65, 32, 24),
        new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.55, metalness: 0.1 })
      );
      const earthGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.88, 24, 18),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 })
      );
      earthGroup.add(earthMesh, earthGlow);
      scene.add(earthGroup);

      // Node 2: Zero-G Spacecraft Hub + Asteroid 2010 PK
      const transitGroup = new THREE.Group();
      transitGroup.position.copy(NODE_WORLD_POSITIONS[2]);
      const stationRing = new THREE.Mesh(
        new THREE.TorusGeometry(1.25, 0.16, 14, 36),
        new THREE.MeshStandardMaterial({ color: 0x818cf8, metalness: 0.6, roughness: 0.3 })
      );
      stationRing.rotation.x = Math.PI * 0.35;
      const stationHub = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 1.9, 16),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.5, roughness: 0.35 })
      );
      const asteroid = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.48, 0),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.9 })
      );
      asteroid.position.set(1.3, 1.0, -0.5);
      transitGroup.add(stationRing, stationHub, asteroid);
      scene.add(transitGroup);

      // Node 3: Cratered 3D Moon + Golden Artemis Outpost
      const moonTex = createMoonTexture();
      const moonGroup = new THREE.Group();
      moonGroup.position.copy(NODE_WORLD_POSITIONS[3]);
      const moonMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 32, 24),
        new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.85 })
      );
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xd97706, emissiveIntensity: 0.4 })
      );
      dome.position.set(0, 1.44, 0.2);
      moonGroup.add(moonMesh, dome);
      scene.add(moonGroup);

      // Node 4: Earth Splashdown Beacon + Re-entry Ring
      const returnGroup = new THREE.Group();
      returnGroup.position.copy(NODE_WORLD_POSITIONS[4]);
      const returnEarth = new THREE.Mesh(
        new THREE.SphereGeometry(1.45, 28, 22),
        new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.5 })
      );
      const reentryHalo = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.08, 12, 36),
        new THREE.MeshBasicMaterial({ color: 0x34d399 })
      );
      reentryHalo.rotation.x = Math.PI * 0.45;
      returnGroup.add(returnEarth, reentryHalo);
      scene.add(returnGroup);

      // Animated 3D Orion Spacecraft hovering at the active level node
      const shipGroup = new THREE.Group();
      const capsuleBody = new THREE.Mesh(
        new THREE.ConeGeometry(0.55, 1.15, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.4, roughness: 0.3 })
      );
      capsuleBody.rotation.z = -Math.PI / 2;
      const engineGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      engineGlow.position.set(-0.7, 0, 0);
      shipGroup.add(capsuleBody, engineGlow);
      shipGroup.position.copy(NODE_WORLD_POSITIONS[activeLevelRef.current]).add(new THREE.Vector3(0, 2.2, 0));
      scene.add(shipGroup);

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = Math.max(container.clientWidth || 960, 320);
        const h = Math.max(container.clientHeight || 420, 280);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      let frame = 0;
      const clock = new THREE.Clock();
      const targetPos = new THREE.Vector3();
      const tempVec = new THREE.Vector3();

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        earthMesh.rotation.y = t * 0.28;
        transitGroup.rotation.y = t * 0.35;
        asteroid.rotation.x = t * 0.9;
        asteroid.rotation.y = t * 0.7;
        moonMesh.rotation.y = t * 0.16;
        returnEarth.rotation.y = -t * 0.25;
        reentryHalo.rotation.z = t * 0.5;
        stars.rotation.y = t * 0.015;

        const targetNode = NODE_WORLD_POSITIONS[activeLevelRef.current] || NODE_WORLD_POSITIONS[1];
        targetPos.set(targetNode.x, targetNode.y + 2.25 + Math.sin(t * 2.5) * 0.18, targetNode.z);
        shipGroup.position.lerp(targetPos, 0.08);

        // Gentle orbital camera sway
        camera.position.x = Math.sin(t * 0.25) * 0.55;
        camera.lookAt(0, 0.2, 0);

        renderer?.render(scene, camera);

        frame++;
        if (frame % 4 === 0) {
          const nextProj: NodeScreenPos[] = ([1, 2, 3, 4] as CampaignLevelId[]).map((lvl) => {
            tempVec.copy(NODE_WORLD_POSITIONS[lvl]);
            tempVec.y -= 1.95;
            tempVec.project(camera);
            return {
              levelId: lvl,
              x: (tempVec.x * 0.5 + 0.5) * 100,
              y: (-tempVec.y * 0.5 + 0.5) * 100,
              visible: tempVec.z < 1
            };
          });
          setProjectedNodes(nextProj);
        }
      };
      animate();

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        earthTex.dispose();
        moonTex.dispose();
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            mats.forEach((m) => {
              if (!m) return;
              if ('map' in m && m.map && typeof (m.map as THREE.Texture).dispose === 'function') {
                (m.map as THREE.Texture).dispose();
              }
              m.dispose();
            });
          }
        });
        renderer?.dispose();
        if (renderer?.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      };
    } catch {
      setWebglFailed(true);
    }
  }, []);

  const levelIds: CampaignLevelId[] = [1, 2, 3, 4];

  return (
    <div className="relative w-full h-[360px] sm:h-[430px] rounded-[2rem] border-4 border-cyan-400/70 bg-gradient-to-b from-slate-950 via-[#050d26] to-[#0a183d] overflow-hidden shadow-[0_0_50px_rgba(56,189,248,0.28)]">
      {/* Three.js WebGL 3D Canvas */}
      <div
        ref={mountRef}
        data-testid="world-navigator-3d"
        className="absolute inset-0 w-full h-full"
      />

      {/* Fallback SVG path overlay if headless GPU lacks WebGL */}
      {webglFailed && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-4/5 h-1.5 bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 rounded-full opacity-75" />
        </div>
      )}

      {/* 3D-Projected Clickable Linear Progression Nodes (4 Levels) */}
      <div className="absolute inset-0 pointer-events-none">
        {levelIds.map((levelId) => {
          const spec = CAMPAIGN_LEVELS[levelId];
          const isUnlocked = campaign.unlockedLevels.includes(levelId);
          const doneCount = spec.miniGames.filter((id) =>
            campaign.completedMiniGames.includes(id)
          ).length;
          const totalCount = spec.miniGames.length;
          const isCompleted = doneCount >= totalCount && (levelId !== 3 || campaign.l3ReturnAuthorized);
          const isCurrent = campaign.activeLevel === levelId;
          const proj = projectedNodes.find((n) => n.levelId === levelId);
          const leftPct = Math.max(11, Math.min(89, proj?.x ?? levelId * 20));
          const topPct = Math.max(58, Math.min(78, proj?.y ?? 65));

          return (
            <button
              key={levelId}
              type="button"
              data-testid={`level-node-${levelId}`}
              onClick={() => {
                soundManager.playClick();
                onSelectLevel(levelId);
              }}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`pointer-events-auto absolute w-[135px] sm:w-[195px] p-2 sm:p-3 rounded-2xl border-2 transition-all text-right shadow-xl cursor-pointer backdrop-blur-md ${
                !isUnlocked
                  ? 'bg-slate-950/90 border-slate-600/80 text-slate-300 hover:border-amber-400/70'
                  : isCompleted
                  ? 'bg-emerald-950/90 border-emerald-400 text-white hover:scale-105 shadow-[0_0_25px_rgba(16,185,129,0.45)]'
                  : isCurrent
                  ? 'bg-sky-950/95 border-cyan-300 text-white hover:scale-105 shadow-[0_0_28px_rgba(56,189,248,0.65)] ring-2 ring-amber-300/60'
                  : 'bg-slate-900/90 border-cyan-400/70 text-white hover:scale-105'
              }`}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5">
                <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-hud font-black bg-white/10 text-cyan-200">
                  المستوى {levelId}
                </span>
                {!isUnlocked ? (
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                ) : isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Rocket className="w-4 h-4 text-amber-300 animate-pulse" />
                )}
              </div>
              <p className="font-hud font-black text-xs sm:text-sm leading-tight truncate">
                {spec.titleAr.replace(/^المستوى \d+:\s*/, '')}
              </p>
              <p className="font-mono text-[10px] text-cyan-200/80 truncate hidden sm:block">
                {spec.titleEn.replace(/^Level \d+:\s*/, '')}
              </p>
              <div className="mt-1.5 flex items-center justify-between text-[10px] sm:text-[11px] font-hud font-bold">
                <span className={isCompleted ? 'text-emerald-300' : 'text-amber-300'}>
                  {doneCount} / {totalCount} مهام
                </span>
                <span className="text-slate-300">{spec.rooms.length} غرف</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Top 3D Badge */}
      <div className="absolute top-3 right-3 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-950/85 border border-cyan-400/60 text-xs font-hud font-black text-cyan-200 backdrop-blur-md">
        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
        <span>خريطة المهمة الخطية ثلاثية الأبعاد (4 مستويات • 21 تحدياً)</span>
      </div>
    </div>
  );
};
