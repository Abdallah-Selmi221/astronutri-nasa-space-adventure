import * as THREE from 'three';
import { attachRoverGlb, disposeObject3D } from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';

export type SpaceRoverVariant = 'buggy_4x4' | 'lunar_6x6';

export interface SpaceRoverController {
  group: THREE.Group;
  visualRoot: THREE.Group;
  seatOffset: THREE.Vector3;
  getSeatWorldTransform: (targetPos: THREE.Vector3, targetQuat: THREE.Quaternion) => void;
  setHeadlights: (active: boolean) => void;
  updateVisuals: (opts: {
    dt: number;
    speed: number;
    steerAngle: number;
    normal: { x: number; y: number; z: number };
  }) => void;
  dispose: () => void;
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Creates a drivable 3D Artemis Space Rover (4-Wheel Buggy on Earth/Mars or 6-Wheel Heavy Lunar
 * Exploration Rover on Moon Level 3) with immediate stylized PBR geometry, async swap to
 * /models/astronaut_rover.glb or /models/moon_rover_6x6.glb, rotating wheels, front headlight cones,
 * terrain-normal pitch/roll alignment, and exact cockpit seat world transform for seated driving.
 */
export function createSpaceRoverVehicle(opts: {
  scene: THREE.Scene;
  position: [number, number, number];
  rotationY?: number;
  variant?: SpaceRoverVariant;
  isDisposed: () => boolean;
}): SpaceRoverController {
  const variant: SpaceRoverVariant = opts.variant ?? 'buggy_4x4';
  const is6x6 = variant === 'lunar_6x6';
  const group = new THREE.Group();
  group.position.set(...opts.position);
  if (opts.rotationY !== undefined) {
    group.rotation.y = opts.rotationY;
  }

  const visualRoot = new THREE.Group();
  group.add(visualRoot);

  const fallbackGroup = new THREE.Group();
  const bodyGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(is6x6 ? 1.56 : 1.24, 0.24, is6x6 ? 2.8 : 2.3), color: 0x1e293b, position: [0, 0.4, 0] },
    { geometry: new THREE.BoxGeometry(is6x6 ? 1.44 : 1.18, 0.22, 0.85), color: 0xf8fafc, position: [0, 0.58, is6x6 ? 0.96 : 0.72] },
    { geometry: new THREE.BoxGeometry(1.06, 0.16, 0.22), color: is6x6 ? 0xe11d48 : 0xf97316, position: [0, 0.52, is6x6 ? 1.38 : 1.18] },
    { geometry: new THREE.BoxGeometry(0.66, 0.48, 0.14), color: is6x6 ? 0xe11d48 : 0xf97316, position: [0, 0.8, -0.34] },
    { geometry: new THREE.BoxGeometry(1.26, 0.06, 0.62), color: 0x0284c7, position: [0, 0.94, is6x6 ? -1.04 : -0.96], rotation: [0.28, 0, 0] }
  ]);
  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.22,
    flatShading: true
  });
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
  fallbackGroup.add(bodyMesh);

  let fallbackWheels: THREE.Object3D[] = [];
  let wheelInst: THREE.InstancedMesh | null = null;
  const wheelTransforms: { pos: THREE.Vector3; scale: THREE.Vector3; isSteered: boolean }[] = [];
  const wheelDummy = new THREE.Object3D();
  wheelDummy.rotation.order = 'YXZ';

  const applyWheelInstances = (spin: number, steer: number) => {
    if (!wheelInst) return;
    for (let i = 0; i < wheelTransforms.length; i++) {
      wheelDummy.position.copy(wheelTransforms[i].pos);
      wheelDummy.scale.copy(wheelTransforms[i].scale);
      wheelDummy.rotation.set(spin, wheelTransforms[i].isSteered ? steer : 0, 0);
      wheelDummy.updateMatrix();
      wheelInst.setMatrixAt(i, wheelDummy.matrix);
    }
    wheelInst.instanceMatrix.needsUpdate = true;
  };

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.25,
    flatShading: true
  });

  const makeFallbackWheel = (x: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(wheelGeo, wheelMat);
    m.position.set(x, 0.36, z);
    m.rotation.order = 'YXZ';
    fallbackGroup.add(m);
    return m;
  };

  if (is6x6) {
    fallbackWheels = [
      makeFallbackWheel(-0.92, 1.02),
      makeFallbackWheel(0.92, 1.02),
      makeFallbackWheel(-0.94, 0.0),
      makeFallbackWheel(0.94, 0.0),
      makeFallbackWheel(-0.92, -1.02),
      makeFallbackWheel(0.92, -1.02)
    ];
  } else {
    fallbackWheels = [
      makeFallbackWheel(-0.78, 0.88),
      makeFallbackWheel(0.78, 0.88),
      makeFallbackWheel(-0.78, -0.88),
      makeFallbackWheel(0.78, -0.88)
    ];
  }

  visualRoot.add(fallbackGroup);

  // Additive Volumetric-Style Headlight Beams (2 light cones merged to 1 draw call)
  const beamParts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.ConeGeometry(0.55, 4.4, 12, 1, true),
      color: 0xe0f2fe,
      position: [-0.42, 0.50, 3.6],
      rotation: [Math.PI / 2, 0, 0]
    },
    {
      geometry: new THREE.ConeGeometry(0.55, 4.4, 12, 1, true),
      color: 0xe0f2fe,
      position: [0.42, 0.50, 3.6],
      rotation: [Math.PI / 2, 0, 0]
    }
  ];
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xbaf3ff,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const headlightBeams = new THREE.Mesh(mergeColoredParts(beamParts), beamMat);
  headlightBeams.visible = false;
  visualRoot.add(headlightBeams);

  attachRoverGlb({
    targetParent: visualRoot,
    url: is6x6 ? '/models/moon_rover_6x6.glb' : '/models/astronaut_rover.glb',
    fallbackNodes: [fallbackGroup],
    isDisposed: opts.isDisposed,
    onLoaded: (glb) => {
      const candidateNames = is6x6
        ? ['RoverWheelFL', 'RoverWheelFR', 'RoverWheelML', 'RoverWheelMR', 'RoverWheelRL', 'RoverWheelRR']
        : ['RoverWheelFL', 'RoverWheelFR', 'RoverWheelRL', 'RoverWheelRR'];
      const foundMeshes: THREE.Mesh[] = [];
      for (const wName of candidateNames) {
        const obj = glb.getObjectByName(wName);
        if (obj instanceof THREE.Mesh) {
          foundMeshes.push(obj);
        }
      }

      if (foundMeshes.length >= 4) {
        foundMeshes.forEach((w, idx) => {
          wheelTransforms.push({
            pos: w.position.clone(),
            scale: w.scale.clone(),
            isSteered: idx < 2
          });
        });
        const inst = new THREE.InstancedMesh(
          foundMeshes[0].geometry.clone(),
          foundMeshes[0].material,
          foundMeshes.length
        );
        inst.castShadow = true;
        inst.receiveShadow = true;
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        inst.name = 'RoverWheelsInstanced';

        foundMeshes.forEach((w, idx) => {
          w.parent?.remove(w);
          w.geometry?.dispose();
          if (idx > 0) {
            const m = w.material;
            if (Array.isArray(m)) m.forEach((mat) => mat?.dispose());
            else m?.dispose();
          }
        });

        glb.add(inst);
        wheelInst = inst;
        fallbackWheels = [];
        applyWheelInstances(wheelSpin, currentSteer);
      } else {
        fallbackWheels = [];
        for (const wName of candidateNames) {
          const obj = glb.getObjectByName(wName);
          if (obj) {
            obj.rotation.order = 'YXZ';
            fallbackWheels.push(obj);
          }
        }
      }
    }
  });

  opts.scene.add(group);

  let wheelSpin = 0;
  let currentSteer = 0;
  const worldNormal = new THREE.Vector3();
  const invYawQuat = new THREE.Quaternion();
  const targetTiltQuat = new THREE.Quaternion();
  const yawAxis = new THREE.Vector3(0, 1, 0);
  const yawQuat = new THREE.Quaternion();
  const seatOffset = new THREE.Vector3(0, 0.14, -0.06);
  const rotatedSeatOffset = new THREE.Vector3();

  const setHeadlights = (active: boolean) => {
    headlightBeams.visible = active;
  };

  const getSeatWorldTransform = (targetPos: THREE.Vector3, targetQuat: THREE.Quaternion) => {
    yawQuat.setFromAxisAngle(yawAxis, group.rotation.y);
    targetQuat.copy(yawQuat).multiply(visualRoot.quaternion);
    rotatedSeatOffset.copy(seatOffset).applyQuaternion(targetQuat);
    targetPos.copy(group.position).add(rotatedSeatOffset);
  };

  const updateVisuals = ({
    dt,
    speed,
    steerAngle,
    normal
  }: {
    dt: number;
    speed: number;
    steerAngle: number;
    normal: { x: number; y: number; z: number };
  }) => {
    wheelSpin += (speed * dt) / 0.36;
    currentSteer += (steerAngle - currentSteer) * Math.min(1, dt * 10);

    if (wheelInst) {
      applyWheelInstances(wheelSpin, currentSteer);
    } else {
      fallbackWheels.forEach((w, idx) => {
        w.rotation.x = wheelSpin;
        if (idx < 2) w.rotation.y = currentSteer;
      });
    }

    // Align rover body smoothly to terrain normal inside local yaw frame
    worldNormal.set(normal.x, normal.y, normal.z).normalize();
    invYawQuat.setFromAxisAngle(yawAxis, -group.rotation.y);
    worldNormal.applyQuaternion(invYawQuat).normalize();
    targetTiltQuat.setFromUnitVectors(UP_AXIS, worldNormal);
    visualRoot.quaternion.slerp(targetTiltQuat, Math.min(1, dt * 8.5));
  };

  const dispose = () => {
    disposeObject3D(group);
  };

  return {
    group,
    visualRoot,
    seatOffset,
    getSeatWorldTransform,
    setHeadlights,
    updateVisuals,
    dispose
  };
}
