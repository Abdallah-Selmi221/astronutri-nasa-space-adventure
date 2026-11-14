import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface ColoredGeometryPart {
  geometry: THREE.BufferGeometry;
  color: THREE.ColorRepresentation;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

/**
 * Merges heterogeneous Three.js geometries into one single draw-call BufferGeometry
 * with baked per-vertex colors, uniform non-indexed attributes, and clean disposal.
 */
export function mergeColoredParts(parts: ColoredGeometryPart[]): THREE.BufferGeometry {
  const prepared: THREE.BufferGeometry[] = [];
  const mat4 = new THREE.Matrix4();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scl = new THREE.Vector3();

  for (const part of parts) {
    const geom = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    part.geometry.dispose();

    if (part.position || part.rotation || part.scale) {
      pos.set(...(part.position ?? [0, 0, 0]));
      euler.set(...(part.rotation ?? [0, 0, 0]));
      quat.setFromEuler(euler);
      scl.set(...(part.scale ?? [1, 1, 1]));
      mat4.compose(pos, quat, scl);
      geom.applyMatrix4(mat4);
    }

    if (!geom.getAttribute('normal')) {
      geom.computeVertexNormals();
    }
    if (!geom.getAttribute('uv')) {
      const count = geom.getAttribute('position').count;
      geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }

    for (const key of Object.keys(geom.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
        geom.deleteAttribute(key);
      }
    }

    const col = new THREE.Color(part.color);
    const count = geom.getAttribute('position').count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    prepared.push(geom);
  }

  const merged = mergeGeometries(prepared, false);
  prepared.forEach((g) => g.dispose());
  if (!merged) {
    throw new Error('Failed to merge colored geometries');
  }
  return merged;
}
