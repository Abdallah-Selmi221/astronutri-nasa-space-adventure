import * as THREE from 'three';
import { attachRoverGlb, disposeObject3D } from './blenderModelLoader';
import { ColoredGeometryPart, mergeColoredParts } from './threeMergeUtils';

export interface SpaceRoverController {
  group: THREE.Group;
  seatOffset: THREE.Vector3;
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
 * Creates a drivable 3D Artemis Space Rover with immediate stylized PBR geometry,
 * async swap to /models/astronaut_rover.glb, rotating wheels, front headlight cones,
 * and terrain-normal pitch/roll alignment.
 */
export function createSpaceRoverVehicle(opts: {
  scene: THREE.Scene;
  position: [number, number, number];
  rotationY?: number;
  isDisposed: () => boolean;
}): SpaceRoverController {
  const group = new THREE.Group();
  group.position.set(...opts.position);
  if (opts.rotationY !== undefined) {
    group.rotation.y = opts.rotationY;
  }

  const visualRoot = new THREE.Group();
  group.add(visualRoot);

  const fallbackGroup = new THREE.Group();
  const bodyGeom = mergeColoredParts([
    { geometry: new THREE.BoxGeometry(1.24, 0.24, 2.3), color: 0x1e293b, position: [0, 0.4, 0] },
    { geometry: new THREE.BoxGeometry(1.18, 0.22, 0.85), color: 0xf8fafc, position: [0, 0.58, 0.72] },
    { geometry: new THREE.BoxGeometry(1.06, 0.16, 0.22), color: 0xf97316, position: [0, 0.52, 1.18] },
    { geometry: new THREE.BoxGeometry(0.62, 0.45, 0.14), color: 0xf97316, position: [0, 0.8, -0.44] },
    { geometry: new THREE.BoxGeometry(1.26, 0.06, 0.56), color: 0x0284c7, position: [0, 0.94, -0.96], rotation: [0.28, 0, 0] }
  ]);
  const bodyMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.22,
    flatShading: true
  });
  const bodyMesh = new THREE.Mesh(bodyGeom, bodyMat);
  fallbackGroup.add(bodyMesh);

  let wheelFL: THREE.Object3D | null = null;
  let wheelFR: THREE.Object3D | null = null;
  let wheelRL: THREE.Object3D | null = null;
  let wheelRR: THREE.Object3D | null = null;
  let wheelInst: THREE.InstancedMesh | null = null;
  const wheelTransforms: { pos: THREE.Vector3; scale: THREE.Vector3 }[] = [];
  const wheelDummy = new THREE.Object3D();
  wheelDummy.rotation.order = 'YXZ';

  const applyWheelInstances = (spin: number, steer: number) => {
    if (!wheelInst) return;
    for (let i = 0; i < wheelTransforms.length; i++) {
      wheelDummy.position.copy(wheelTransforms[i].pos);
      wheelDummy.scale.copy(wheelTransforms[i].scale);
      wheelDummy.rotation.set(spin, i < 2 ? steer : 0, 0);
      wheelDummy.updateMatrix();
      wheelInst.setMatrixAt(i, wheelDummy.matrix);
    }
    wheelInst.instanceMatrix.needsUpdate = true;
  };

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 14);
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

  wheelFL = makeFallbackWheel(-0.78, 0.88);
  wheelFR = makeFallbackWheel(0.78, 0.88);
  wheelRL = makeFallbackWheel(-0.78, -0.88);
  wheelRR = makeFallbackWheel(0.78, -0.88);

  visualRoot.add(fallbackGroup);

  // Additive Volumetric-Style Headlight Beams (2 light cones merged to 1 draw call)
  const beamParts: ColoredGeometryPart[] = [
    {
      geometry: new THREE.ConeGeometry(0.55, 4.4, 12, 1, true),
      color: 0xe0f2fe,
      position: [-0.4, 0.48, 3.5],
      rotation: [Math.PI / 2, 0, 0]
    },
    {
      geometry: new THREE.ConeGeometry(0.55, 4.4, 12, 1, true),
      color: 0xe0f2fe,
      position: [0.4, 0.48, 3.5],
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
    fallbackNodes: [fallbackGroup],
    isDisposed: opts.isDisposed,
    onLoaded: (glb) => {
      const fl = glb.getObjectByName('RoverWheelFL');
      const fr = glb.getObjectByName('RoverWheelFR');
      const rl = glb.getObjectByName('RoverWheelRL');
      const rr = glb.getObjectByName('RoverWheelRR');
      if (
        fl instanceof THREE.Mesh &&
        fr instanceof THREE.Mesh &&
        rl instanceof THREE.Mesh &&
        rr instanceof THREE.Mesh
      ) {
        const ordered = [fl, fr, rl, rr];
        ordered.forEach((w) => {
          wheelTransforms.push({ pos: w.position.clone(), scale: w.scale.clone() });
        });
        const inst = new THREE.InstancedMesh(fl.geometry.clone(), fl.material, 4);
        inst.castShadow = true;
        inst.receiveShadow = true;
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        inst.name = 'RoverWheelsInstanced';

        ordered.forEach((w, idx) => {
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
        wheelFL = null;
        wheelFR = null;
        wheelRL = null;
        wheelRR = null;
        applyWheelInstances(wheelSpin, currentSteer);
      } else {
        if (fl) {
          fl.rotation.order = 'YXZ';
          wheelFL = fl;
        }
        if (fr) {
          fr.rotation.order = 'YXZ';
          wheelFR = fr;
        }
        if (rl) {
          rl.rotation.order = 'YXZ';
          wheelRL = rl;
        }
        if (rr) {
          rr.rotation.order = 'YXZ';
          wheelRR = rr;
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

  const setHeadlights = (active: boolean) => {
    headlightBeams.visible = active;
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
      [wheelFL, wheelFR, wheelRL, wheelRR].forEach((w) => {
        if (w) w.rotation.x = wheelSpin;
      });
      if (wheelFL) wheelFL.rotation.y = currentSteer;
      if (wheelFR) wheelFR.rotation.y = currentSteer;
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
    seatOffset: new THREE.Vector3(0, 0.56, -0.08),
    setHeadlights,
    updateVisuals,
    dispose
  };
}
