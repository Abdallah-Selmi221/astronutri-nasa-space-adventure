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

export function attachBlenderEarthIsland(opts: {
  targetParent: THREE.Object3D;
  radius: number;
  depthScaleY?: number;
  fallbackNodes?: THREE.Object3D[];
  isDisposed: () => boolean;
  onLoaded?: (islandGlb: THREE.Group) => void;
}): void {
  void loadCachedGlbClone('/models/earth_island.glb').then((islandGlb) => {
    if (!islandGlb) return;
    if (opts.isDisposed()) {
      disposeObject3D(islandGlb);
      return;
    }
    const sy = opts.radius * (opts.depthScaleY ?? 0.52);
    islandGlb.name = 'BlenderEarthIsland';
    islandGlb.scale.set(opts.radius, sy, opts.radius);
    islandGlb.position.set(0, 0, 0);
    opts.fallbackNodes?.forEach((node) => disposeObject3D(node));
    opts.targetParent.add(islandGlb);
    opts.onLoaded?.(islandGlb);
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
  void loadCachedGlbClone('/models/spaceship_craft.glb').then((craftGlb) => {
    if (!craftGlb) return;
    if (opts.isDisposed()) {
      disposeObject3D(craftGlb);
      return;
    }
    craftGlb.name = 'BlenderSpaceshipCraft';
    craftGlb.position.set(...opts.position);
    craftGlb.rotation.y = opts.rotationY ?? 0;
    craftGlb.scale.setScalar(opts.scale ?? 1);
    opts.fallbackNodes?.forEach((node) => disposeObject3D(node));
    opts.targetParent.add(craftGlb);
    opts.onLoaded?.(craftGlb);
  });
}

export function getLoadedGlbUrls(): string[] {
  return Array.from(loadedUrls);
}
