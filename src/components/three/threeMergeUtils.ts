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

/**
 * Merges static opaque non-textured MeshStandardMaterial sibling meshes under each container
 * in a loaded GLB hierarchy into a single vertex-colored draw call, skipping any protected
 * animated node names (and their descendants) or translucent/textured materials.
 */
export function mergeStaticGlbSiblings(
  root: THREE.Object3D,
  protectedNames: ReadonlySet<string> = new Set()
): void {
  const containers: THREE.Object3D[] = [];
  const walk = (node: THREE.Object3D, ancestorProtected: boolean) => {
    const isProtected = ancestorProtected || (node.name !== '' && protectedNames.has(node.name));
    if (isProtected) return;
    if (node.children.length > 0) {
      containers.push(node);
      for (const child of node.children) {
        walk(child, false);
      }
    }
  };
  walk(root, false);

  const tmpCol = new THREE.Color();

  for (let cIdx = containers.length - 1; cIdx >= 0; cIdx--) {
    const parent = containers[cIdx];
    const eligible = parent.children.filter((child): child is THREE.Mesh => {
      if (!(child instanceof THREE.Mesh) || child.children.length !== 0) return false;
      if (child.name && protectedNames.has(child.name)) return false;
      if (Array.isArray(child.material) || !(child.material instanceof THREE.MeshStandardMaterial)) {
        return false;
      }
      const mat = child.material;
      if (mat.transparent || mat.map || mat.normalMap || mat.emissiveMap) return false;
      if (/(glass|holo|water)/i.test(mat.name || '')) return false;
      return Boolean(child.geometry?.getAttribute('position'));
    });

    if (eligible.length < 2) continue;

    const prepared: THREE.BufferGeometry[] = [];
    for (const m of eligible) {
      m.updateMatrix();
      const geom = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      geom.applyMatrix4(m.matrix);
      if (!geom.getAttribute('normal')) {
        geom.computeVertexNormals();
      }

      const posAttr = geom.getAttribute('position');
      const count = posAttr.count;
      const mat = m.material as THREE.MeshStandardMaterial;
      const colAttr = geom.getAttribute('color');
      const emScale = mat.emissiveIntensity > 0 ? Math.min(0.65, mat.emissiveIntensity * 0.45) : 0;
      const emR = mat.emissive.r * emScale;
      const emG = mat.emissive.g * emScale;
      const emB = mat.emissive.b * emScale;

      const colors = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        let r = mat.color.r;
        let g = mat.color.g;
        let b = mat.color.b;
        if (colAttr) {
          tmpCol.fromBufferAttribute(colAttr as THREE.BufferAttribute, i);
          r *= tmpCol.r;
          g *= tmpCol.g;
          b *= tmpCol.b;
        }
        colors[i * 3] = Math.min(1, r + emR);
        colors[i * 3 + 1] = Math.min(1, g + emG);
        colors[i * 3 + 2] = Math.min(1, b + emB);
      }
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      for (const key of Object.keys(geom.attributes)) {
        if (key !== 'position' && key !== 'normal' && key !== 'color') {
          geom.deleteAttribute(key);
        }
      }
      prepared.push(geom);
    }

    const merged = mergeGeometries(prepared, false);
    prepared.forEach((g) => g.dispose());
    if (!merged) continue;

    const firstMat = eligible[0].material as THREE.MeshStandardMaterial;
    const side = eligible.some(
      (m) => (m.material as THREE.MeshStandardMaterial).side === THREE.DoubleSide
    )
      ? THREE.DoubleSide
      : firstMat.side;

    const batchedMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: firstMat.roughness,
      metalness: firstMat.metalness,
      side
    });
    const batchedMesh = new THREE.Mesh(merged, batchedMat);
    batchedMesh.castShadow = eligible[0].castShadow;
    batchedMesh.receiveShadow = eligible[0].receiveShadow;
    batchedMesh.name = `${parent.name || 'Glb'}_BatchedStatic`;

    for (const m of eligible) {
      parent.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    parent.add(batchedMesh);
  }
}
