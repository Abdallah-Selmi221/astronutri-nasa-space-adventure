import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAMPAIGN_LEVELS, SpatialRoomNode } from '../../data/campaignLevels';
import { CampaignLevelId, CampaignProgressState, SpaceFitXState } from '../../types/game';
import { soundManager } from '../../utils/sound';
import { CheckCircle2, DoorOpen } from 'lucide-react';
import { buildSpaceFitXCharacter } from './buildSpaceFitXCharacter';
import {
  createCosmicSkyBackdrop,
  createFloatingIslandMesh,
  createStationBuildingMesh
} from './archipelagoPrimitives';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';
import { ThirdPersonControlsOverlay } from './ThirdPersonControlsOverlay';

interface SpatialRoomMap3DProps {
  levelId: CampaignLevelId;
  campaign: CampaignProgressState;
  onEnterRoom: (room: SpatialRoomNode) => void;
  suitState?: SpaceFitXState;
}

interface PositionedRoom {
  room: SpatialRoomNode;
  pos: THREE.Vector3;
  yawToCenter: number;
}

function getBiomeTheme(levelId: CampaignLevelId) {
  switch (levelId) {
    case 1:
      return {
        topColor: 0x15803d,
        rimColor: 0x38bdf8,
        rockColor: 0x78350f,
        crystalColor: 0x22d3ee,
        gravity: 21,
        jumpVel: 8.4,
        gravityLabelAr: 'جاذبية الأرض 1G',
        isZeroG: false,
        accentCraters: false
      };
    case 2:
      return {
        topColor: 0x1e293b,
        rimColor: 0x818cf8,
        rockColor: 0x334155,
        crystalColor: 0x60a5fa,
        gravity: 5.8,
        jumpVel: 5.8,
        gravityLabelAr: 'انعدام الوزن 0G — طفو حر',
        isZeroG: true,
        accentCraters: false
      };
    case 3:
      return {
        topColor: 0x64748b,
        rimColor: 0xf59e0b,
        rockColor: 0x334155,
        crystalColor: 0xfbbf24,
        gravity: 7.4,
        jumpVel: 7.6,
        gravityLabelAr: 'جاذبية القمر 0.16G — قفزة عالية',
        isZeroG: false,
        accentCraters: true
      };
    case 4:
    default:
      return {
        topColor: 0x0369a1,
        rimColor: 0x34d399,
        rockColor: 0x0f766e,
        crystalColor: 0x10b981,
        gravity: 21,
        jumpVel: 8.4,
        gravityLabelAr: 'جاذبية العودة للأرض 1G',
        isZeroG: false,
        accentCraters: false
      };
  }
}

export const SpatialRoomMap3D: React.FC<SpatialRoomMap3DProps> = ({
  levelId,
  campaign,
  onEnterRoom,
  suitState
}) => {
  const levelSpec = CAMPAIGN_LEVELS[levelId];
  const theme = getBiomeTheme(levelId);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const [nearbyRoom, setNearbyRoom] = useState<SpatialRoomNode | null>(levelSpec.rooms[0] || null);
  const nearbyRoomRef = useRef<SpatialRoomNode | null>(nearbyRoom);

  const playerPosRef = useRef(new THREE.Vector3(0, 0, 0));
  const playerVelYRef = useRef(0);
  const isGroundedRef = useRef(true);
  const walkTargetRef = useRef<THREE.Vector3 | null>(null);
  const pendingRoomRef = useRef<SpatialRoomNode | null>(null);
  const joystickVecRef = useRef({ x: 0, z: 0 });
  const isSprintingRef = useRef(false);
  const cameraOrbitYawRef = useRef(0);
  const cameraOrbitPitchRef = useRef(0.38);

  const suitStateRef = useRef(suitState);
  suitStateRef.current = suitState;

  const onEnterRoomRef = useRef(onEnterRoom);
  onEnterRoomRef.current = onEnterRoom;

  const isRoomCompleted = (room: SpatialRoomNode): boolean => {
    if (room.consoleAction === 'l3_return_auth') return campaign.l3ReturnAuthorized;
    if (!room.miniGameId) return false;
    return campaign.completedMiniGames.includes(room.miniGameId);
  };

  const triggerJump = () => {
    if (isGroundedRef.current || theme.isZeroG) {
      playerVelYRef.current = theme.jumpVel;
      isGroundedRef.current = false;
      soundManager.playClick();
    }
  };

  const enterCurrentRoom = () => {
    const target = nearbyRoomRef.current || levelSpec.rooms[0];
    if (target) {
      soundManager.playClick();
      onEnterRoomRef.current(target);
    }
  };

  useEffect(() => {
    // Reset astronaut to central courtyard plaza when switching level islands
    playerPosRef.current.set(0, 0, 0);
    playerVelYRef.current = 0;
    isGroundedRef.current = true;
    walkTargetRef.current = null;
    pendingRoomRef.current = null;
    setNearbyRoom(levelSpec.rooms[0] || null);
    nearbyRoomRef.current = levelSpec.rooms[0] || null;
  }, [levelId]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      setWebglFailed(true);
      return;
    }

    const getDims = () => ({
      w: Math.max(mount.clientWidth || window.innerWidth, 320),
      h: Math.max(mount.clientHeight || window.innerHeight, 320)
    });

    const dims = getDims();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(dims.w, dims.h);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, dims.w / dims.h, 0.1, 200);
    camera.position.set(0, 5.8, 10.2);

    const skyHandle = createCosmicSkyBackdrop(scene);

    // Biome Lighting
    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.35);
    scene.add(hemi);
    const dir = new THREE.DirectionalLight(0xffffff, 1.8);
    dir.position.set(16, 26, 18);
    scene.add(dir);
    const fill = new THREE.DirectionalLight(theme.rimColor, 0.75);
    fill.position.set(-16, 8, -14);
    scene.add(fill);

    // Compute Spacious Radial Courtyard Ring Layout (ZERO collisions even at 12 rooms)
    const rooms = levelSpec.rooms;
    const roomCount = Math.max(1, rooms.length);
    const ringRadius = Math.max(9.8, roomCount * 1.48);
    const islandRadius = ringRadius + 5.8;

    // Floating Island Terrain Platform
    const island = createFloatingIslandMesh({
      radius: islandRadius,
      depth: 7.4,
      topColor: theme.topColor,
      rimColor: theme.rimColor,
      rockColor: theme.rockColor,
      crystalColor: theme.crystalColor,
      accentCraters: theme.accentCraters
    });
    scene.add(island);

    const disposableTextures: THREE.Texture[] = [
      ...((island.userData.disposableTextures as THREE.Texture[] | undefined) || [])
    ];

    // Central Emblem Landing Beacon in Courtyard Center
    const centerBeacon = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.1, 10, 40),
      new THREE.MeshBasicMaterial({ color: theme.rimColor })
    );
    centerBeacon.rotation.x = Math.PI / 2;
    centerBeacon.position.y = 0.06;
    scene.add(centerBeacon);

    // Microgravity floating orbital props around perimeter in Level 2 (1 InstancedMesh!)
    const orbitSatelliteTransforms: { angle: number; y: number }[] = [];
    let orbitSatellitesInst: THREE.InstancedMesh | null = null;
    if (theme.isZeroG) {
      orbitSatellitesInst = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.65, 0),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.35 }),
        4
      );
      for (let k = 0; k < 4; k++) {
        orbitSatelliteTransforms.push({ angle: (k / 4) * Math.PI * 2, y: 2.5 + k * 0.4 });
      }
      scene.add(orbitSatellitesInst);
    }

    // Build Sculpted Station Buildings & Merged Walkways Along Courtyard Ring (Low Draw Calls)
    const clickTargets: { group: THREE.Group; room: SpatialRoomNode; entrySpot: THREE.Vector3; pos: THREE.Vector3 }[] = [];
    const walkwayParts: ColoredGeometryPart[] = [];

    const positionedRooms: PositionedRoom[] = rooms.map((room, idx) => {
      const theta = (idx / roomCount) * Math.PI * 2 - Math.PI / 2;
      const rx = Math.cos(theta) * ringRadius;
      const rz = Math.sin(theta) * ringRadius;
      const yawToCenter = Math.atan2(-rx, -rz);
      return {
        room,
        pos: new THREE.Vector3(rx, 0, rz),
        yawToCenter
      };
    });

    // 2 InstancedMesh objects handle ALL room portals & curtains across the courtyard (2 draw calls!)
    const portalRingsInst = new THREE.InstancedMesh(
      new THREE.TorusGeometry(0.72, 0.11, 12, 28, Math.PI * 1.15),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.42, roughness: 0.25 }),
      roomCount
    );
    const curtainsInst = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.65, 24),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, side: THREE.DoubleSide }),
      roomCount
    );
    const portalMeta: { basePos: THREE.Vector3; yaw: number; completed: boolean }[] = [];
    const courtyardBuildingGeoms: THREE.BufferGeometry[] = [];
    const rotEuler = new THREE.Euler();
    const rotQuat = new THREE.Quaternion();
    const unitScale = new THREE.Vector3(1, 1, 1);
    const mat4 = new THREE.Matrix4();

    positionedRooms.forEach(({ room, pos, yawToCenter }, idx) => {
      const completed = isRoomCompleted(room);
      const bld = createStationBuildingMesh(room, completed, { skipPortals: true });
      bld.group.position.copy(pos);
      bld.group.rotation.y = yawToCenter;
      const archMesh = bld.group.children.find((c): c is THREE.Mesh => c instanceof THREE.Mesh);
      if (archMesh) {
        rotEuler.set(0, yawToCenter, 0);
        rotQuat.setFromEuler(rotEuler);
        mat4.compose(pos, rotQuat, unitScale);
        const worldArchGeom = archMesh.geometry.clone();
        worldArchGeom.applyMatrix4(mat4);
        courtyardBuildingGeoms.push(worldArchGeom);
        bld.group.remove(archMesh);
        archMesh.geometry.dispose();
        if (Array.isArray(archMesh.material)) {
          archMesh.material.forEach((m) => m.dispose());
        } else {
          archMesh.material.dispose();
        }
      }
      bld.portalRing.geometry.dispose();
      (bld.portalRing.material as THREE.Material).dispose();
      bld.curtain.geometry.dispose();
      (bld.curtain.material as THREE.Material).dispose();

      scene.add(bld.group);
      disposableTextures.push(...bld.disposeTextures);

      const portalWorldPos = new THREE.Vector3(0, 0.88, 1.15)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), yawToCenter)
        .add(pos);
      portalMeta.push({ basePos: portalWorldPos, yaw: yawToCenter, completed });
      const ringCol = new THREE.Color(completed ? '#10b981' : room.accentHex);
      portalRingsInst.setColorAt(idx, ringCol);
      curtainsInst.setColorAt(idx, ringCol);

      // Promenade Walkway part merged into one courtyard walkway mesh
      const dirToRoom = pos.clone().normalize();
      const pathLen = Math.max(2, ringRadius - 3.6);
      const pathCenter = dirToRoom.clone().multiplyScalar(2.1 + pathLen / 2);
      walkwayParts.push({
        geometry: new THREE.BoxGeometry(1.1, 0.05, pathLen),
        color: completed ? 0x10b981 : theme.rimColor,
        position: [pathCenter.x, 0.03, pathCenter.z],
        rotation: [0, yawToCenter, 0]
      });

      const entrySpot = pos.clone().sub(dirToRoom.clone().multiplyScalar(2.5));
      clickTargets.push({ group: bld.group, room, entrySpot, pos });
    });

    if (portalRingsInst.instanceColor) portalRingsInst.instanceColor.needsUpdate = true;
    if (curtainsInst.instanceColor) curtainsInst.instanceColor.needsUpdate = true;
    scene.add(portalRingsInst, curtainsInst);

    let courtyardBuildingsMesh: THREE.Mesh | null = null;
    if (courtyardBuildingGeoms.length > 0) {
      const mergedBuildingsGeom = mergeGeometries(courtyardBuildingGeoms, false);
      if (mergedBuildingsGeom) {
        courtyardBuildingsMesh = new THREE.Mesh(
          mergedBuildingsGeom,
          new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.36 })
        );
        scene.add(courtyardBuildingsMesh);
      }
      courtyardBuildingGeoms.forEach((g) => g.dispose());
    }

    if (walkwayParts.length > 0) {
      const walkwaysMesh = new THREE.Mesh(
        mergeColoredParts(walkwayParts),
        new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.42 })
      );
      scene.add(walkwaysMesh);
    }

    // Articulated Robo Character wearing SPACE-FIT X IVA Suit (No EVA Helmet inside station)
    const hero = buildSpaceFitXCharacter();
    hero.group.scale.setScalar(1.06);
    hero.group.position.copy(playerPosRef.current);
    scene.add(hero.group);

    // Keyboard & Pointer Controls
    const keysDown = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          if (k === ' ' || k.startsWith('arrow')) e.preventDefault();
        }
      }
      keysDown.add(k);
      if (k === ' ' || e.code === 'Space') triggerJump();
      if (k === 'e' || k === 'enter') enterCurrentRoom();
      if (k === 'shift') isSprintingRef.current = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keysDown.delete(k);
      if (k === 'shift') isSprintingRef.current = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    let dragOrbiting = false;
    let pointerDownPos = { x: 0, y: 0 };
    let prevPointerPos = { x: 0, y: 0 };
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();
    const domEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      dragOrbiting = true;
      pointerDownPos = { x: e.clientX, y: e.clientY };
      prevPointerPos = { x: e.clientX, y: e.clientY };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      const dx = e.clientX - prevPointerPos.x;
      const dy = e.clientY - prevPointerPos.y;
      prevPointerPos = { x: e.clientX, y: e.clientY };
      cameraOrbitYawRef.current -= dx * 0.0065;
      cameraOrbitPitchRef.current = Math.max(0.18, Math.min(0.92, cameraOrbitPitchRef.current + dy * 0.004));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!dragOrbiting) return;
      dragOrbiting = false;
      if (Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y) > 7) return;

      const rect = domEl.getBoundingClientRect();
      pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointerNdc, camera);

      const intersectables: THREE.Object3D[] = clickTargets.map((ct) => ct.group);
      if (courtyardBuildingsMesh) intersectables.push(courtyardBuildingsMesh);
      const hits = raycaster.intersectObjects(intersectables, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        let found = clickTargets.find((ct) => {
          let p: THREE.Object3D | null = hitObj;
          while (p) {
            if (p === ct.group) return true;
            p = p.parent;
          }
          return false;
        });
        if (!found && courtyardBuildingsMesh && hitObj === courtyardBuildingsMesh) {
          const hitPt = hits[0].point;
          let bestDist = Infinity;
          for (const ct of clickTargets) {
            const d = hitPt.distanceTo(ct.pos);
            if (d < bestDist) {
              bestDist = d;
              found = ct;
            }
          }
        }
        if (found) {
          soundManager.playClick();
          // If already standing right near that room, enter directly; otherwise walk straight up to it
          const d = playerPosRef.current.distanceTo(found.pos);
          if (d < 4.5) {
            onEnterRoomRef.current(found.room);
          } else {
            walkTargetRef.current = found.entrySpot.clone();
            pendingRoomRef.current = found.room;
          }
        }
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const handleResize = () => {
      if (!mountRef.current) return;
      const d = getDims();
      camera.aspect = d.w / d.h;
      camera.updateProjectionMatrix();
      renderer.setSize(d.w, d.h);
    };
    window.addEventListener('resize', handleResize);
    const resizeObs = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    if (resizeObs) resizeObs.observe(mount);

    const portalDummy = new THREE.Object3D();
    const satDummy = new THREE.Object3D();
    let rafId = 0;
    let lastTime = performance.now();
    const startTime = lastTime;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      skyHandle.update(elapsed);

      portalMeta.forEach((pm, idx) => {
        portalDummy.position.copy(pm.basePos);
        portalDummy.rotation.set(0, pm.yaw, Math.sin(elapsed * 1.4 + idx) * 0.09);
        const s = pm.completed ? 1.04 : 1 + Math.sin(elapsed * 2.2 + idx) * 0.03;
        portalDummy.scale.setScalar(s);
        portalDummy.updateMatrix();
        portalRingsInst.setMatrixAt(idx, portalDummy.matrix);

        portalDummy.rotation.set(0, pm.yaw, 0);
        const pulse = 0.9 + Math.sin(elapsed * 2.4 + idx) * 0.08;
        portalDummy.scale.set(pulse, pulse, 1);
        portalDummy.updateMatrix();
        curtainsInst.setMatrixAt(idx, portalDummy.matrix);
      });
      portalRingsInst.instanceMatrix.needsUpdate = true;
      curtainsInst.instanceMatrix.needsUpdate = true;

      if (orbitSatellitesInst) {
        orbitSatelliteTransforms.forEach((tr, idx) => {
          satDummy.position.set(
            Math.cos(tr.angle) * (islandRadius + 2.8),
            tr.y + Math.sin(elapsed * 1.1 + idx) * 0.45,
            Math.sin(tr.angle) * (islandRadius + 2.8)
          );
          satDummy.rotation.set(elapsed * 0.4 + idx, elapsed * 0.55, 0);
          satDummy.scale.setScalar(1);
          satDummy.updateMatrix();
          orbitSatellitesInst?.setMatrixAt(idx, satDummy.matrix);
        });
        orbitSatellitesInst.instanceMatrix.needsUpdate = true;
      }

      // Third-person movement relative to camera orbit yaw
      let ix = joystickVecRef.current.x;
      let iz = joystickVecRef.current.z;
      if (keysDown.has('a') || keysDown.has('arrowleft')) ix -= 1;
      if (keysDown.has('d') || keysDown.has('arrowright')) ix += 1;
      if (keysDown.has('w') || keysDown.has('arrowup')) iz -= 1;
      if (keysDown.has('s') || keysDown.has('arrowdown')) iz += 1;

      const yaw = cameraOrbitYawRef.current;
      const forwardX = -Math.sin(yaw);
      const forwardZ = -Math.cos(yaw);
      const rightX = Math.cos(yaw);
      const rightZ = -Math.sin(yaw);

      const pos = playerPosRef.current;
      const sprint = isSprintingRef.current || keysDown.has('shift');
      let moveSpeed = 0;
      const maxWalkRadius = islandRadius - 1.4;

      if (Math.abs(ix) > 0.08 || Math.abs(iz) > 0.08) {
        walkTargetRef.current = null;
        pendingRoomRef.current = null;
        const len = Math.hypot(ix, iz);
        const nx = ix / len;
        const nz = iz / len;
        const worldDirX = rightX * nx + forwardX * (-nz);
        const worldDirZ = rightZ * nx + forwardZ * (-nz);
        const spd = sprint ? 11.4 : 7.4;

        pos.x += worldDirX * spd * dt;
        pos.z += worldDirZ * spd * dt;
        moveSpeed = spd;
        hero.group.rotation.y = Math.atan2(worldDirX, worldDirZ);
      } else if (walkTargetRef.current) {
        const dx = walkTargetRef.current.x - pos.x;
        const dz = walkTargetRef.current.z - pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.45) {
          const spd = 9.2;
          const step = Math.min(dist, spd * dt);
          pos.x += (dx / dist) * step;
          pos.z += (dz / dist) * step;
          moveSpeed = spd;
          hero.group.rotation.y = Math.atan2(dx, dz);
        } else {
          walkTargetRef.current = null;
          const enterRoom = pendingRoomRef.current;
          pendingRoomRef.current = null;
          if (enterRoom) onEnterRoomRef.current(enterRoom);
        }
      }

      // Soft Circular Island Perimeter Containment
      const rFromCenter = Math.hypot(pos.x, pos.z);
      if (rFromCenter > maxWalkRadius) {
        const scale = maxWalkRadius / rFromCenter;
        pos.x *= scale;
        pos.z *= scale;
      }

      // Level-Specific Gravity Physics (1G / 0G / 0.16G)
      if (!isGroundedRef.current || pos.y > 0.02) {
        playerVelYRef.current -= theme.gravity * dt;
        pos.y += playerVelYRef.current * dt;
        if (pos.y <= 0) {
          pos.y = 0;
          playerVelYRef.current = 0;
          isGroundedRef.current = true;
        }
      }

      // Find Nearest Station Building Portal
      let closestRoom: SpatialRoomNode | null = null;
      let closestDist = Infinity;
      positionedRooms.forEach((pr) => {
        const d = Math.hypot(pos.x - pr.pos.x, pos.z - pr.pos.z);
        if (d < closestDist) {
          closestDist = d;
          closestRoom = pr.room;
        }
      });

      if (closestRoom && (closestRoom as SpatialRoomNode).id !== nearbyRoomRef.current?.id) {
        nearbyRoomRef.current = closestRoom;
        setNearbyRoom(closestRoom);
      }

      hero.group.position.copy(pos);
      hero.update({
        t: elapsed,
        moveSpeed,
        isRunning: sprint && moveSpeed > 0.1,
        isJumping: !isGroundedRef.current,
        isZeroG: theme.isZeroG,
        suitState: suitStateRef.current
      });

      // Third-Person Follow Camera
      const camDist = 10.6;
      const horizDist = camDist * Math.cos(cameraOrbitPitchRef.current);
      const camHeight = 2.3 + camDist * Math.sin(cameraOrbitPitchRef.current);
      const desiredCamX = pos.x + Math.sin(yaw) * horizDist;
      const desiredCamZ = pos.z + Math.cos(yaw) * horizDist;
      const desiredCamY = pos.y + camHeight;

      camera.position.x += (desiredCamX - camera.position.x) * 0.14;
      camera.position.y += (desiredCamY - camera.position.y) * 0.14;
      camera.position.z += (desiredCamZ - camera.position.z) * 0.14;
      camera.lookAt(pos.x, pos.y + 1.45, pos.z);

      renderer.render(scene, camera);
      mount.dataset.drawCalls = String(renderer.info.render.calls);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', handleResize);
      if (resizeObs) resizeObs.disconnect();

      skyHandle.dispose();
      hero.dispose();
      disposableTextures.forEach((tex) => tex.dispose());
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry?.dispose();
          const m = obj.material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m?.dispose();
        } else if (obj instanceof THREE.Sprite) {
          obj.material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [levelId, campaign.completedMiniGames, campaign.l3ReturnAuthorized]);

  if (webglFailed) {
    return (
      <div
        data-testid={`spatial-room-map-3d-l${levelId}`}
        className="w-full h-full flex items-center justify-center bg-slate-950 p-6 overflow-y-auto"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full" dir="rtl">
          {levelSpec.rooms.map((room) => {
            const done = isRoomCompleted(room);
            return (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onEnterRoom(room);
                }}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-700 hover:border-cyan-400 text-right cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{room.icon}</span>
                  {done && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="font-bold text-white text-sm">{room.nameAr}</div>
                <div className="text-xs text-slate-400 mt-1">{room.shortObjectiveAr}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nearbyCompleted = nearbyRoom ? isRoomCompleted(nearbyRoom) : false;

  return (
    <div
      data-testid={`spatial-room-map-3d-l${levelId}`}
      className="relative w-full h-full overflow-hidden select-none"
    >
      {/* Full-Viewport 3D Island Courtyard Canvas */}
      <div
        ref={mountRef}
        data-testid="three-canvas-mount"
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Compact Non-Overlapping Top-Center Target Indicator */}
      {nearbyRoom && (
        <div
          dir="rtl"
          className="pointer-events-none fixed top-20 inset-x-0 z-20 flex justify-center px-3"
        >
          <div className="pointer-events-auto inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-2xl bg-slate-950/80 border border-cyan-400/40 backdrop-blur-md shadow-xl">
            <span className="text-lg">{nearbyRoom.icon}</span>
            <span className="text-xs font-bold text-white">{nearbyRoom.nameAr}</span>
            {nearbyCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            <button
              type="button"
              onClick={enterCurrentRoom}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/60 text-[11px] font-bold text-cyan-100 flex items-center gap-1 cursor-pointer"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              <span>دخول</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Edge Third-Person Controls */}
      <ThirdPersonControlsOverlay
        promptLabelAr={nearbyRoom ? `دخول ${nearbyRoom.icon} ${nearbyRoom.nameAr}` : null}
        promptSubAr={nearbyRoom?.shortObjectiveAr}
        onInteract={enterCurrentRoom}
        onJoystickMove={(vec) => {
          joystickVecRef.current = vec;
        }}
        onJump={triggerJump}
        onSprintChange={(s) => {
          isSprintingRef.current = s;
        }}
        gravityLabelAr={theme.gravityLabelAr}
        hintAr="WASD / الأسهم للمشي • Space للقفز • اضغط أي بوابة ثلاثية الأبعاد للدخول"
      />
    </div>
  );
};
