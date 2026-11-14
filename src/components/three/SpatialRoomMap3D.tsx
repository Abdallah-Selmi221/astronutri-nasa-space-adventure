import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { CAMPAIGN_LEVELS, SpatialRoomNode } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { CheckCircle2, DoorOpen, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

interface SpatialRoomMap3DProps {
  levelId: CampaignLevelId;
  campaign: CampaignProgressState;
  onEnterRoom: (room: SpatialRoomNode) => void;
}

interface RoomScreenBadge {
  roomId: string;
  x: number;
  y: number;
}

export const SpatialRoomMap3D: React.FC<SpatialRoomMap3DProps> = ({
  levelId,
  campaign,
  onEnterRoom
}) => {
  const levelSpec = CAMPAIGN_LEVELS[levelId];
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [nearbyRoom, setNearbyRoom] = useState<SpatialRoomNode | null>(levelSpec.rooms[0] || null);
  const [screenBadges, setScreenBadges] = useState<RoomScreenBadge[]>([]);

  // Robo 3D target & continuous keyboard/D-pad state
  const roboPosRef = useRef(new THREE.Vector3(0, 0, 0.2));
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const pendingRoomRef = useRef<SpatialRoomNode | null>(null);
  const inputVecRef = useRef({ x: 0, z: 0 });
  const nearbyRoomRef = useRef<SpatialRoomNode | null>(nearbyRoom);
  nearbyRoomRef.current = nearbyRoom;

  const isRoomCompleted = (room: SpatialRoomNode): boolean => {
    if (room.consoleAction === 'l3_return_auth') return campaign.l3ReturnAuthorized;
    if (!room.miniGameId) return false;
    return campaign.completedMiniGames.includes(room.miniGameId);
  };

  useEffect(() => {
    // Reset Robo start position near central corridor/first room on level switch
    const startRoom = levelSpec.rooms[0];
    if (startRoom) {
      roboPosRef.current.set(0, 0, 0);
      walkTargetRef.current = null;
      pendingRoomRef.current = null;
      setNearbyRoom(startRoom);
    }
  }, [levelId, levelSpec.rooms]);

  // Keyboard WASD / Arrow Controls + Enter to open nearby door
  useEffect(() => {
    const keysDown = new Set<string>();
    const recomputeInput = () => {
      let x = 0;
      let z = 0;
      if (keysDown.has('ArrowLeft') || keysDown.has('KeyA')) x -= 1;
      if (keysDown.has('ArrowRight') || keysDown.has('KeyD')) x += 1;
      if (keysDown.has('ArrowUp') || keysDown.has('KeyW')) z -= 1;
      if (keysDown.has('ArrowDown') || keysDown.has('KeyS')) z += 1;
      inputVecRef.current = { x, z };
      if (x !== 0 || z !== 0) {
        walkTargetRef.current = null;
        pendingRoomRef.current = null;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) {
        keysDown.add(e.code);
        recomputeInput();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        if (nearbyRoomRef.current) {
          soundManager.playClick();
          onEnterRoom(nearbyRoomRef.current);
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.delete(e.code);
      recomputeInput();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onEnterRoom]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let rafId = 0;

    try {
      const width = Math.max(container.clientWidth || 960, 320);
      const height = Math.max(container.clientHeight || 480, 320);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 120);
      camera.position.set(0, 15.5, 13.5);
      camera.lookAt(0, 0, 0.2);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      // Lighting
      scene.add(new THREE.AmbientLight(0xe0f2fe, 0.9));
      const keyLight = new THREE.DirectionalLight(0xffffff, 1.45);
      keyLight.position.set(8, 18, 10);
      scene.add(keyLight);

      // Main Station / Base Floor Deck + Level-Specific 3D Environment
      const deckColor = levelId === 3 ? 0x334155 : levelId === 2 ? 0x091224 : 0x0f1d3a;
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(25, 0.4, 15),
        new THREE.MeshStandardMaterial({ color: deckColor, roughness: 0.72, metalness: 0.25 })
      );
      floor.position.y = -0.25;
      scene.add(floor);

      // Level 2 Spacecraft Fuselage Ribs / Handrails & Level 3 Lunar Craters
      const floatingZeroGProps: THREE.Mesh[] = [];
      if (levelId === 2) {
        for (let hx = -9; hx <= 9; hx += 6) {
          const rib = new THREE.Mesh(
            new THREE.TorusGeometry(6.8, 0.08, 8, 28, Math.PI),
            new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.28 })
          );
          rib.rotation.y = Math.PI / 2;
          rib.position.set(hx, 0.05, 0);
          scene.add(rib);
        }
        // Corridor Zero-G yellow handrails + drifting 3D objects
        [-0.75, 0.75].forEach((rzRail) => {
          const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 19, 10),
            new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.35 })
          );
          rail.rotation.z = Math.PI / 2;
          rail.position.set(0, 0.38, rzRail);
          scene.add(rail);
        });
        for (let i = 0; i < 4; i++) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.32, 0.24, 0.24),
            new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0xfbbf24 })
          );
          cube.position.set(-6 + i * 4, 0.9, i % 2 === 0 ? -0.3 : 0.35);
          scene.add(cube);
          floatingZeroGProps.push(cube);
        }
      } else if (levelId === 3) {
        // 3D Lunar Craters across Moon outpost perimeter
        [
          [-10.5, -6.2, 1.4],
          [10.2, 5.8, 1.7],
          [-9.8, 6.0, 1.15],
          [0, -6.4, 1.3]
        ].forEach(([cx, cz, cr]) => {
          const crater = new THREE.Mesh(
            new THREE.TorusGeometry(cr, 0.22, 8, 22),
            new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
          );
          crater.rotation.x = Math.PI / 2;
          crater.position.set(cx, 0.04, cz);
          scene.add(crater);
        });
      }

      const grid = new THREE.GridHelper(24, 24, 0x38bdf8, 0x1e3a8a);
      grid.position.y = -0.02;
      scene.add(grid);

      // Central illuminated corridor spine connecting rooms
      const corridorStrip = new THREE.Mesh(
        new THREE.BoxGeometry(20, 0.05, 1.4),
        new THREE.MeshBasicMaterial({ color: levelId === 3 ? 0xfbbf24 : 0x0284c7, transparent: true, opacity: 0.35 })
      );
      corridorStrip.position.y = 0.01;
      scene.add(corridorStrip);

      // Build 3D Cutaway Rooms + Interior Props + Door Frames
      const doorGlowMeshes: THREE.Mesh[] = [];
      for (const room of levelSpec.rooms) {
        const [rx, rz] = room.pos;
        const [rw, rd] = room.size;
        const accentColor = new THREE.Color(room.accentHex);
        const completed = isRoomCompleted(room);

        // Room base pad
        const roomPod = new THREE.Mesh(
          new THREE.BoxGeometry(rw, 0.5, rd),
          new THREE.MeshStandardMaterial({
            color: completed ? 0x064e3b : 0x172554,
            roughness: 0.45,
            metalness: 0.35
          })
        );
        roomPod.position.set(rx, 0.22, rz);
        scene.add(roomPod);

        // Isometric 2.5D/3D Cutaway Back Wall
        const backWallZ = rz < 0 ? rz - rd / 2 + 0.08 : rz + rd / 2 - 0.08;
        const backWall = new THREE.Mesh(
          new THREE.BoxGeometry(rw, 0.95, 0.14),
          new THREE.MeshStandardMaterial({
            color: 0x1e293b,
            roughness: 0.4,
            metalness: 0.45
          })
        );
        backWall.position.set(rx, 0.75, backWallZ);
        scene.add(backWall);

        // Special Room 3D Interior Props
        if (room.id === 'launch_area') {
          const rocketBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.36, 1.65, 12),
            new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.35 })
          );
          rocketBody.position.set(rx, 1.25, rz);
          const nose = new THREE.Mesh(
            new THREE.ConeGeometry(0.28, 0.55, 12),
            new THREE.MeshStandardMaterial({ color: 0xf97316 })
          );
          nose.position.set(rx, 2.35, rz);
          scene.add(rocketBody, nose);
        } else if (room.id === 'solar_panel_field') {
          const panel = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.08, 1.2),
            new THREE.MeshStandardMaterial({ color: 0x0284c7, emissive: 0x0369a1, emissiveIntensity: 0.45 })
          );
          panel.rotation.x = 0.25;
          panel.position.set(rx, 1.05, rz);
          scene.add(panel);
        } else if (room.id.includes('food') || room.id.includes('nutrition')) {
          const growRack = new THREE.Mesh(
            new THREE.BoxGeometry(1.5, 0.45, 0.75),
            new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0xa21caf, emissiveIntensity: 0.35 })
          );
          growRack.position.set(rx, 0.85, rz);
          scene.add(growRack);
        }

        // Glowing top perimeter frame
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(rw + 0.14, 0.12, rd + 0.14),
          new THREE.MeshStandardMaterial({
            color: completed ? 0x10b981 : accentColor,
            emissive: completed ? 0x059669 : accentColor,
            emissiveIntensity: 0.55
          })
        );
        rim.position.set(rx, 0.52, rz);
        scene.add(rim);

        // Glowing door portal facing corridor
        const doorDirZ = rz < -1 ? rd / 2 + 0.08 : rz > 1 ? -rd / 2 - 0.08 : 0;
        const doorPortal = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.85, 0.22),
          new THREE.MeshBasicMaterial({ color: completed ? 0x34d399 : accentColor })
        );
        doorPortal.position.set(rx, 0.5, rz + doorDirZ);
        scene.add(doorPortal);
        doorGlowMeshes.push(doorPortal);
      }

      // Articulated 3D Robo Avatar
      const roboGroup = new THREE.Group();
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.38, 0.9, 16),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.25 })
      );
      torso.position.y = 0.7;
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.46, 20, 16),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.2 })
      );
      head.position.y = 1.45;
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.26, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x38bdf8, emissiveIntensity: 0.75 })
      );
      visor.position.set(0, 1.48, 0.35);
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      core.position.set(0, 0.75, 0.4);
      const shadowDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.55, 20),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
      );
      shadowDisc.rotation.x = -Math.PI / 2;
      shadowDisc.position.y = 0.03;
      roboGroup.add(shadowDisc, torso, head, visor, core);
      roboGroup.position.copy(roboPosRef.current);
      scene.add(roboGroup);

      const handleResize = () => {
        if (!container || !renderer) return;
        const w = Math.max(container.clientWidth || 960, 320);
        const h = Math.max(container.clientHeight || 480, 320);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      const clock = new THREE.Clock();
      const tempVec = new THREE.Vector3();
      let frame = 0;

      const animate = () => {
        rafId = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        // Manual WASD/D-pad velocity
        const { x: ix, z: iz } = inputVecRef.current;
        if (ix !== 0 || iz !== 0) {
          const speed = 7.5 * dt;
          const len = Math.hypot(ix, iz) || 1;
          roboPosRef.current.x = THREE.MathUtils.clamp(roboPosRef.current.x + (ix / len) * speed, -10.8, 10.8);
          roboPosRef.current.z = THREE.MathUtils.clamp(roboPosRef.current.z + (iz / len) * speed, -6.2, 6.2);
          roboGroup.rotation.y = Math.atan2(ix, iz);
        } else if (walkTargetRef.current) {
          const dist = roboPosRef.current.distanceTo(walkTargetRef.current);
          if (dist < 0.3) {
            walkTargetRef.current = null;
            const targetRoom = pendingRoomRef.current;
            pendingRoomRef.current = null;
            if (targetRoom) {
              onEnterRoom(targetRoom);
            }
          } else {
            const dir = tempVec.copy(walkTargetRef.current).sub(roboPosRef.current).normalize();
            roboPosRef.current.addScaledVector(dir, 9.5 * dt);
            roboGroup.rotation.y = Math.atan2(dir.x, dir.z);
          }
        }

        // Hover / 0G float / Lunar 0.16G hop animation
        const hoverY =
          levelId === 2
            ? 0.24 + Math.sin(t * 2.1) * 0.14
            : levelId === 3
            ? Math.abs(Math.sin(t * 2.4)) * 0.2
            : Math.sin(t * 4) * 0.08;
        roboGroup.position.set(roboPosRef.current.x, hoverY, roboPosRef.current.z);

        floatingZeroGProps.forEach((p, idx) => {
          p.position.y = 0.95 + Math.sin(t * 1.8 + idx) * 0.18;
          p.rotation.x += dt * 0.6;
          p.rotation.y += dt * 0.8;
        });

        // Pulse doors
        for (let i = 0; i < doorGlowMeshes.length; i++) {
          doorGlowMeshes[i].scale.y = 0.92 + Math.sin(t * 3 + i) * 0.08;
        }

        // Nearest room detection
        let bestRoom: SpatialRoomNode | null = null;
        let bestDist = Infinity;
        for (const room of levelSpec.rooms) {
          const d = Math.hypot(roboPosRef.current.x - room.pos[0], roboPosRef.current.z - room.pos[1]);
          if (d < bestDist) {
            bestDist = d;
            bestRoom = room;
          }
        }
        if (bestRoom && bestRoom.id !== nearbyRoomRef.current?.id) {
          setNearbyRoom(bestRoom);
        }

        renderer?.render(scene, camera);

        frame++;
        if (frame % 3 === 0 || frame === 1) {
          const badges: RoomScreenBadge[] = levelSpec.rooms.map((r) => {
            tempVec.set(r.pos[0], 1.15, r.pos[1]);
            tempVec.project(camera);
            return {
              roomId: r.id,
              x: (tempVec.x * 0.5 + 0.5) * 100,
              y: (-tempVec.y * 0.5 + 0.5) * 100
            };
          });
          setScreenBadges(badges);
        }
      };
      animate();

      return () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', handleResize);
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.geometry?.dispose();
            if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
            else obj.material?.dispose();
          }
        });
        renderer?.dispose();
      };
    } catch {
      setWebglFailed(true);
    }
  }, [levelId, levelSpec, campaign.completedMiniGames, campaign.l3ReturnAuthorized, onEnterRoom]);

  const handleWalkAndOpenRoom = (room: SpatialRoomNode) => {
    soundManager.playClick();
    setNearbyRoom(room);
    if (webglFailed) {
      onEnterRoom(room);
      return;
    }
    const doorOffsetZ = room.pos[1] < -1 ? 1.8 : room.pos[1] > 1 ? -1.8 : 0.8;
    walkTargetRef.current = new THREE.Vector3(room.pos[0], 0, room.pos[1] + doorOffsetZ);
    pendingRoomRef.current = room;
  };

  const nudgeRobo = (dx: number, dz: number) => {
    walkTargetRef.current = null;
    pendingRoomRef.current = null;
    roboPosRef.current.x = THREE.MathUtils.clamp(roboPosRef.current.x + dx, -10.8, 10.8);
    roboPosRef.current.z = THREE.MathUtils.clamp(roboPosRef.current.z + dz, -6.2, 6.2);
  };

  return (
    <div className="relative w-full h-[460px] sm:h-[520px] rounded-[2rem] border-4 border-cyan-400/75 bg-gradient-to-b from-slate-950 via-[#081330] to-slate-950 overflow-hidden shadow-2xl select-none">
      {/* Three.js 3D Floorplan Canvas */}
      <div
        ref={mountRef}
        data-testid={`spatial-room-map-3d-l${levelId}`}
        className="absolute inset-0 w-full h-full"
      />

      {/* Labeled 3D-Projected Door Buttons */}
      <div className="absolute inset-0 pointer-events-none">
        {levelSpec.rooms.map((room, idx) => {
          const badge = screenBadges.find((b) => b.roomId === room.id);
          const fallbackCols = levelSpec.rooms.length > 8 ? 4 : 3;
          const fallbackX = 16 + (idx % fallbackCols) * (68 / Math.max(fallbackCols - 1, 1));
          const fallbackY = 22 + Math.floor(idx / fallbackCols) * 26;
          const left = Math.max(8, Math.min(92, badge?.x ?? fallbackX));
          const top = Math.max(15, Math.min(86, badge?.y ?? fallbackY));
          const completed = isRoomCompleted(room);
          const isNear = nearbyRoom?.id === room.id;

          return (
            <button
              key={room.id}
              type="button"
              data-testid={`room-door-${room.id}`}
              onClick={() => handleWalkAndOpenRoom(room)}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className={`pointer-events-auto absolute px-2 sm:px-3 py-1.5 rounded-xl border-2 text-right transition-all cursor-pointer backdrop-blur-md shadow-lg max-w-[140px] sm:max-w-[175px] ${
                completed
                  ? 'bg-emerald-950/90 border-emerald-400 text-emerald-100 hover:scale-105'
                  : isNear
                  ? 'bg-sky-900/95 border-amber-300 text-white scale-105 ring-2 ring-amber-300/60'
                  : 'bg-slate-900/90 border-cyan-400/80 text-white hover:border-amber-300 hover:scale-105'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base">{room.icon}</span>
                <span className="font-hud font-black text-[10px] sm:text-xs truncate">
                  {room.nameAr}
                </span>
                {completed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
              </div>
              <span className="block font-mono text-[9px] text-cyan-200/90 truncate">
                {room.nameEn}
              </span>
            </button>
          );
        })}
      </div>

      {/* Top Objective Hint Bar */}
      <div className="absolute top-3 right-3 left-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/70 text-xs font-hud font-black text-cyan-100 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span>
            اضغط على أي باب أو حرّك روبو بالأسهم / WASD • {levelSpec.rooms.length} غرف في الخريطة ثلاثية الأبعاد
          </span>
        </div>

        {nearbyRoom && (
          <button
            type="button"
            onClick={() => {
              soundManager.playClick();
              onEnterRoom(nearbyRoom);
            }}
            className="pointer-events-auto px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-hud font-black text-xs sm:text-sm border-2 border-white shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
          >
            <DoorOpen className="w-4 h-4" />
            <span>ادخل: {nearbyRoom.nameAr}</span>
          </button>
        )}
      </div>

      {/* Bottom-Left Compact Touch Robo D-Pad */}
      <div className="absolute bottom-3 left-3 flex flex-col items-center gap-1 bg-slate-950/85 border border-cyan-400/60 rounded-2xl p-2 backdrop-blur-md">
        <button
          type="button"
          aria-label="تحريك روبو للأعلى"
          onClick={() => nudgeRobo(0, -1.6)}
          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="تحريك روبو لليسار"
            onClick={() => nudgeRobo(-1.6, 0)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="تحريك روبو للأسفل"
            onClick={() => nudgeRobo(0, 1.6)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            aria-label="تحريك روبو لليمين"
            onClick={() => nudgeRobo(1.6, 0)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center cursor-pointer"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
