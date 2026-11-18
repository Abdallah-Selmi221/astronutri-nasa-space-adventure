import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const sharedLoader = new GLTFLoader();
const templateCache = new Map<string, Promise<THREE.Group | null>>();
const loadedUrls = new Set<string>();

export function disposeObject3D(obj: THREE.Object3D): void {
  if (obj.parent) {
    obj.parent.remove(obj);
  }
  obj.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) {
      node.geometry?.dispose();
      const m = node.material;
      if (Array.isArray(m)) m.forEach((x) => x?.dispose());
      else m?.dispose();
    } else if (node instanceof THREE.Sprite) {
      node.material?.dispose();
    }
  });
}

/**
 * Loads and caches a GLB model once per session, then returns an isolated clone
 * (cloned BufferGeometries + Materials, shared Textures) so component cleanup/disposal
 * never invalidates the cached template across route or level switches.
 * Resolves to null cleanly on fetch/parse error so procedural fallbacks keep working.
 */
export function loadCachedGlbClone(url: string): Promise<THREE.Group | null> {
  let pending = templateCache.get(url);
  if (!pending) {
    pending = new Promise<THREE.Group | null>((resolve) => {
      try {
        sharedLoader.load(
          url,
          (gltf) => {
            loadedUrls.add(url);
            resolve(gltf.scene);
          },
          undefined,
          () => {
            resolve(null);
          }
        );
      } catch {
        resolve(null);
      }
    });
    templateCache.set(url, pending);
  }

  return pending.then((template) => {
    if (!template) return null;
    const cloned = template.clone(true);
    cloned.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        if (obj.geometry) {
          obj.geometry = obj.geometry.clone();
        }
        if (Array.isArray(obj.material)) {
          obj.material = obj.material.map((m) => m.clone());
        } else if (obj.material) {
          obj.material = obj.material.clone();
        }
      }
    });
    return cloned;
  });
}

function attachGlbScene(opts: {
  url: string;
  name: string;
  targetParent: THREE.Object3D;
  scale?: [number, number, number];
  position?: [number, number, number];
  rotationY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (glb: THREE.Group) => void;
}): void {
  void loadCachedGlbClone(opts.url).then((glb) => {
    if (!glb) return;
    if (opts.isDisposed()) {
      disposeObject3D(glb);
      return;
    }
    glb.name = opts.name;
    if (opts.scale) glb.scale.set(...opts.scale);
    if (opts.position) glb.position.set(...opts.position);
    if (opts.rotationY !== undefined) glb.rotation.y = opts.rotationY;
    opts.fallbackNodes?.forEach((node) => disposeObject3D(node));
    opts.targetParent.add(glb);
    opts.onLoaded?.(glb);
  });
}

export function attachBlenderEarthIsland(opts: {
  targetParent: THREE.Object3D;
  radius: number;
  depthScaleY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (islandGlb: THREE.Group) => void;
}): void {
  const sy = opts.radius * (opts.depthScaleY ?? 0.52);
  attachGlbScene({
    url: '/models/earth_island.glb',
    name: 'BlenderEarthIsland',
    targetParent: opts.targetParent,
    scale: [opts.radius, sy, opts.radius],
    position: [0, 0, 0],
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export function attachBlenderLunarIsland(opts: {
  targetParent: THREE.Object3D;
  radius: number;
  depthScaleY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (islandGlb: THREE.Group) => void;
}): void {
  const sy = opts.radius * (opts.depthScaleY ?? 0.52);
  attachGlbScene({
    url: '/models/lunar_island.glb',
    name: 'BlenderLunarIsland',
    targetParent: opts.targetParent,
    scale: [opts.radius, sy, opts.radius],
    position: [0, 0, 0],
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export function attachBlenderOrbitalStation(opts: {
  targetParent: THREE.Object3D;
  radius: number;
  depthScaleY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (stationGlb: THREE.Group) => void;
}): void {
  const sy = opts.radius * (opts.depthScaleY ?? 0.52);
  attachGlbScene({
    url: '/models/orbital_station.glb',
    name: 'BlenderOrbitalStation',
    targetParent: opts.targetParent,
    scale: [opts.radius, sy, opts.radius],
    position: [0, 0, 0],
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export function attachBlenderSpaceship(opts: {
  targetParent: THREE.Object3D;
  position: [number, number, number];
  rotationY?: number;
  scale?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (craftGlb: THREE.Group) => void;
}): void {
  const s = opts.scale ?? 1;
  attachGlbScene({
    url: '/models/spaceship_craft.glb',
    name: 'BlenderSpaceshipCraft',
    targetParent: opts.targetParent,
    scale: [s, s, s],
    position: opts.position,
    rotationY: opts.rotationY ?? 0,
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export interface PlanetPlacement {
  nodeName: 'PlanetEarth' | 'PlanetMoon' | 'PlanetMars' | 'PlanetSaturn';
  id: string;
  position: [number, number, number];
  scale: number;
}

/**
 * Loads /models/planet_pack.glb once and places each named celestial body cleanly in orbit.
 */
export function attachBlenderPlanetsFromPack(opts: {
  targetParent: THREE.Object3D;
  placements: PlanetPlacement[];
  isDisposed: () => boolean;
  onLoaded?: (planetGroups: Record<string, THREE.Object3D>) => void;
}): void {
  void loadCachedGlbClone('/models/planet_pack.glb').then((packGlb) => {
    if (!packGlb) return;
    if (opts.isDisposed()) {
      disposeObject3D(packGlb);
      return;
    }
    const mounted: Record<string, THREE.Object3D> = {};
    const wantedNames = new Set<string>(opts.placements.map((p) => p.nodeName));

    opts.placements.forEach((p) => {
      const match = packGlb.getObjectByName(p.nodeName);
      if (match) {
        const clone = match.clone(true);
        clone.traverse((node) => {
          if (node instanceof THREE.Mesh) {
            if (node.geometry) node.geometry = node.geometry.clone();
            if (Array.isArray(node.material)) node.material = node.material.map((m) => m.clone());
            else if (node.material) node.material = node.material.clone();
          }
        });
        clone.position.set(...p.position);
        clone.scale.setScalar(p.scale);
        clone.name = p.id;
        opts.targetParent.add(clone);
        mounted[p.id] = clone;
      }
    });

    // Dispose unused pack container so no extra geometries linger
    packGlb.traverse((node) => {
      if (!wantedNames.has(node.name)) {
        // leave to disposeObject3D below
      }
    });
    disposeObject3D(packGlb);
    opts.onLoaded?.(mounted);
  });
}

/**
 * Animates named sub-meshes exported inside environment GLB scenes
 * (OasisWaterPond shimmer/ripple, SolarWingSpin sun-tracking, Asteroid2010PK tumble).
 */
export function animateBlenderEnvironmentGlb(root: THREE.Object3D, elapsed: number): void {
  const pond = root.getObjectByName('OasisWaterPond');
  if (pond) {
    pond.position.y = Math.sin(elapsed * 2.4) * 0.004;
    const ripple = 1 + Math.sin(elapsed * 1.9) * 0.012;
    pond.scale.set(ripple, 1, ripple);
    pond.traverse((n) => {
      if (n instanceof THREE.Mesh && n.material instanceof THREE.MeshStandardMaterial) {
        n.material.emissiveIntensity = 0.36 + Math.sin(elapsed * 3.1) * 0.14;
      }
    });
  }

  const solarWing = root.getObjectByName('SolarWingSpin');
  if (solarWing) {
    solarWing.rotation.x = Math.sin(elapsed * 0.45) * 0.38 + 0.2;
  }

  const asteroid = root.getObjectByName('Asteroid2010PK');
  if (asteroid) {
    asteroid.rotation.y = elapsed * 0.48;
    asteroid.rotation.x = elapsed * 0.31;
    asteroid.position.y = 0.26 + Math.sin(elapsed * 1.25) * 0.06;
  }
}

export type SpaceNodeModelKey =
  | 'earth_launchpad'
  | 'iss_orbit_station'
  | 'lunar_biodome_base'
  | 'orion_reentry_capsule';

export type StationPropModelKey =
  | SpaceNodeModelKey
  | 'prop_kitchen_counter'
  | 'prop_suit_rack'
  | 'prop_medical_pod'
  | 'prop_hydro_rack'
  | 'prop_storm_console';

export function attachSpaceNodeGlb(opts: {
  modelKey: SpaceNodeModelKey;
  targetParent: THREE.Object3D;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (nodeGlb: THREE.Group) => void;
}): void {
  const s = opts.scale ?? 1.85;
  attachGlbScene({
    url: `/models/${opts.modelKey}.glb`,
    name: `Blender_${opts.modelKey}`,
    targetParent: opts.targetParent,
    scale: [s, s, s],
    position: opts.position ?? [0, 0, 0],
    rotationY: opts.rotationY ?? 0,
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export function attachStationPropGlb(opts: {
  propKey: StationPropModelKey;
  targetParent: THREE.Object3D;
  scale?: number;
  position?: [number, number, number];
  rotationY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (propGlb: THREE.Group) => void;
}): void {
  const s = opts.scale ?? 1.25;
  attachGlbScene({
    url: `/models/${opts.propKey}.glb`,
    name: `BlenderProp_${opts.propKey}`,
    targetParent: opts.targetParent,
    scale: [s, s, s],
    position: opts.position ?? [0, 0, 0],
    rotationY: opts.rotationY ?? 0,
    fallbackNodes: opts.fallbackNodes,
    isDisposed: opts.isDisposed,
    onLoaded: opts.onLoaded
  });
}

export function getLoadedGlbUrls(): string[] {
  return Array.from(loadedUrls);
}
