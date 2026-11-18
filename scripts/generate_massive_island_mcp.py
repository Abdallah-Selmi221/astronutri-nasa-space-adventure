"""
AstroNutri — Massive Connected 3D Space Terra-Island (Blender 5.3 Live MCP + GLB Export)
Sculpts a large, continuous vertex-colored 3D landscape (4 biomes, rocky hills, lunar crater,
canyons, neon walkways & inter-sector bridge pylons) at E:/Nasa team/public/models/massive_space_island_world.glb
AND builds the full connected 3D colony live inside the open Blender 5.3 viewport on 127.0.0.1:9876!
"""

import math
import os
import sys

SCRIPTS_DIR = r"E:\Nasa team\scripts"
MODELS_DIR = r"E:\Nasa team\public\models"

if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import bpy
import bmesh
from mathutils import Euler, Vector

import generate_blender_assets as gba
import generate_space_phase1_models as phase1

gba.OUT_DIR = MODELS_DIR


def mcp_safe_reset_scene():
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for datablock_list in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.lights,
        bpy.data.cameras,
        bpy.data.worlds,
        bpy.data.actions,
    ):
        for item in list(datablock_list):
            try:
                datablock_list.remove(item)
            except Exception:
                pass


gba.reset_scene = mcp_safe_reset_scene
phase1.reset_scene = mcp_safe_reset_scene

# Exact Blender-space sector hubs matching Three.js TRAJECTORY_NODES (y_blender = -z_three, z_blender = y_three)
SECTORS = [
    {"id": 1, "x": -11.0, "y": -2.0, "z": -0.4, "rad": 2.8},
    {"id": 2, "x": -3.8, "y": 1.8, "z": 1.8, "rad": 2.5},
    {"id": 3, "x": 3.8, "y": -1.6, "z": 2.0, "rad": 2.7},
    {"id": 4, "x": 11.0, "y": 1.6, "z": -0.3, "rad": 2.7},
]


def smoothstep(edge0, edge1, x):
    t = max(0.0, min(1.0, (x - edge0) / max(1e-6, edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)


def lerp3(a, b, t):
    return (
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    )


def ridge_noise(x, y):
    return (
        math.sin(x * 0.42 + y * 0.25) * 0.45
        + math.cos(x * 0.85 - y * 0.62) * 0.28
        + math.sin((x + y) * 1.15) * 0.16
    )


def dist_to_path(x, y):
    """Minimum distance from point (x, y) to the piecewise winding road linking Sectors 1->2->3->4."""
    best = 999.0
    for i in range(len(SECTORS) - 1):
        ax, ay = SECTORS[i]["x"], SECTORS[i]["y"]
        bx, by = SECTORS[i + 1]["x"], SECTORS[i + 1]["y"]
        dx, dy = bx - ax, by - ay
        l2 = dx * dx + dy * dy
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / max(1e-6, l2)))
        px, py = ax + dx * t, ay + dy * t
        d = math.hypot(x - px, y - py)
        if d < best:
            best = d
    return best


def eval_terrain_height_and_color(x, y):
    """
    Computes stylized sculpted elevation (Blender Z = Three Y) and rich biome sRGB vertex color
    across one massive connected Terra-Island spanning [-15.5..15.5] x [-7.0..7.0].
    """
    # Gentle serpentine base elevation transitioning between Sectors 1..4
    base_z = -0.35 + 1.85 * math.exp(-((x / 7.2) ** 2))
    hills = ridge_noise(x, y)

    # Tall scenic northern ridge backdrop (y > 2.2) so terrain looks sculpted & epic
    north_ridge = smoothstep(1.8, 5.2, y) * (1.85 + max(0.0, hills) * 1.1)
    # Soft southern cliff lip
    south_roll = -smoothstep(-3.0, -6.0, y) * 0.55

    # Inter-sector scenic canyons between Sector platforms
    canyon1 = 1.15 * math.exp(-(((x + 7.4) / 1.35) ** 2))
    canyon2 = 1.25 * math.exp(-(((x - 0.0) / 1.40) ** 2))
    canyon3 = 1.15 * math.exp(-(((x - 7.4) / 1.35) ** 2))

    # Lunar Shackleton crater rim ring around Sector 3
    d_moon = math.hypot(x - 3.8, y + 1.6)
    crater_rim = 0.72 * math.exp(-(((d_moon - 3.0) / 0.85) ** 2))

    z = base_z + hills * 0.52 + north_ridge + south_roll + crater_rim - (canyon1 + canyon2 + canyon3)

    # Flatten smoothly at each Sector plateau so bases rest cleanly
    for s in SECTORS:
        d = math.hypot(x - s["x"], y - s["y"])
        w = 1.0 - smoothstep(s["rad"] * 0.65, s["rad"] * 1.45, d)
        z = z * (1.0 - w) + (s["z"] - 0.10) * w

    # Flatten slightly along winding inter-sector roadway spine
    d_road = dist_to_path(x, y)
    w_road = (1.0 - smoothstep(0.45, 1.45, d_road)) * 0.48
    # Approximate road height interpolation
    nearest_h = z
    for i in range(len(SECTORS) - 1):
        ax, ay, az = SECTORS[i]["x"], SECTORS[i]["y"], SECTORS[i]["z"]
        bx, by, bz = SECTORS[i + 1]["x"], SECTORS[i + 1]["y"], SECTORS[i + 1]["z"]
        if ax - 0.5 <= x <= bx + 0.5:
            t = max(0.0, min(1.0, (x - ax) / max(1e-5, bx - ax)))
            nearest_h = az * (1.0 - t) + bz * t - 0.14
            break
    z = z * (1.0 - w_road) + nearest_h * w_road

    # Biome vertex color (4 seamless regions + canyon mineral bands)
    c_earth_grass = (0.14, 0.72, 0.42)
    c_earth_hill = (0.10, 0.56, 0.34)
    c_orbit_ridge = (0.16, 0.28, 0.52)
    c_lunar_regolith = (0.58, 0.64, 0.74)
    c_lunar_rim = (0.42, 0.48, 0.60)
    c_reentry_coast = (0.86, 0.54, 0.26)
    c_road_slate = (0.14, 0.22, 0.34)
    c_canyon_glow = (0.10, 0.44, 0.58)

    if x < -5.8:
        t = smoothstep(-9.0, -5.8, x)
        col = lerp3(c_earth_grass if hills > 0 else c_earth_hill, c_orbit_ridge, t)
    elif x < 0.8:
        t = smoothstep(-0.8, 0.8, x)
        col = lerp3(c_orbit_ridge, c_lunar_regolith, t)
    elif x < 7.2:
        t = smoothstep(5.5, 7.2, x)
        lunar_col = lerp3(c_lunar_regolith, c_lunar_rim, smoothstep(2.2, 3.2, d_moon))
        col = lerp3(lunar_col, c_reentry_coast, t)
    else:
        col = lerp3(c_reentry_coast, (0.20, 0.68, 0.64), smoothstep(10.5, 14.5, x) * 0.45)

    # Blend roadway slate border & canyon teal shadow
    canyon_mix = min(1.0, (canyon1 + canyon2 + canyon3) * 0.65)
    col = lerp3(col, c_canyon_glow, canyon_mix * 0.55)
    if d_road < 0.85:
        col = lerp3(col, c_road_slate, (1.0 - smoothstep(0.45, 0.85, d_road)) * 0.85)

    return z, col


def assign_tri_vcolor(bm, col_layer, face, rgb):
    lin = gba.col4(rgb[0], rgb[1], rgb[2], 1.0)
    for loop in face.loops:
        loop[col_layer] = lin


def generate_massive_terra_island_mesh(mat_terrain, mat_glow):
    bm = bmesh.new()
    col_layer = bm.loops.layers.color.new("Col")

    nx = 58
    ny = 24
    x_min, x_max = -15.6, 15.6
    y_min, y_max = -6.8, 6.8

    # 1. Build continuous sculpted perimeter island mask
    grid_verts = [[None for _ in range(ny)] for _ in range(nx)]
    valid_mask = [[False for _ in range(ny)] for _ in range(nx)]

    for ix in range(nx):
        ux = ix / (nx - 1)
        x = x_min + ux * (x_max - x_min)
        spine_y = math.sin(x * 0.22) * 1.45
        for iy in range(ny):
            vy = iy / (ny - 1)
            y = y_min + vy * (y_max - y_min)
            # Keep connected organic silhouette wide enough for all 4 sectors + winding bridges
            edge_wobble = 0.14 * math.sin(x * 0.7 + iy * 0.9)
            r_norm = ((x / 15.0) ** 2) * 0.82 + (((y - spine_y) / 5.4) ** 2)
            # Also guarantee sectors are always inside island mask
            in_sector = any(math.hypot(x - s["x"], y - s["y"]) < s["rad"] + 0.9 for s in SECTORS)
            if r_norm <= (1.0 + edge_wobble) or in_sector:
                valid_mask[ix][iy] = True
                z, col = eval_terrain_height_and_color(x, y)
                v = bm.verts.new((x, y, z))
                grid_verts[ix][iy] = (v, col)

    bm.verts.ensure_lookup_table()

    # Connect quad/tri faces on the top landscape
    top_faces = []
    for ix in range(nx - 1):
        for iy in range(ny - 1):
            pts = [
                grid_verts[ix][iy],
                grid_verts[ix + 1][iy],
                grid_verts[ix + 1][iy + 1],
                grid_verts[ix][iy + 1],
            ]
            if all(p is not None for p in pts):
                v0, c0 = pts[0]
                v1, c1 = pts[1]
                v2, c2 = pts[2]
                v3, c3 = pts[3]
                avg_col = (
                    (c0[0] + c1[0] + c2[0] + c3[0]) * 0.25,
                    (c0[1] + c1[1] + c2[1] + c3[1]) * 0.25,
                    (c0[2] + c1[2] + c2[2] + c3[2]) * 0.25,
                )
                try:
                    # Deterministic diagonal split along alternating checkerboard for stylized faceted look
                    if (ix + iy) % 2 == 0:
                        f1 = bm.faces.new((v0, v1, v2))
                        f2 = bm.faces.new((v0, v2, v3))
                    else:
                        f1 = bm.faces.new((v0, v1, v3))
                        f2 = bm.faces.new((v1, v2, v3))
                    f1.material_index = 0
                    f2.material_index = 0
                    assign_tri_vcolor(bm, col_layer, f1, avg_col)
                    assign_tri_vcolor(bm, col_layer, f2, avg_col)
                    top_faces.extend((f1, f2))
                except ValueError:
                    pass

    # 2. Extrude deep rocky floating asteroid cliff strata underneath boundary edges
    bm.edges.ensure_lookup_table()
    boundary_edges = [e for e in bm.edges if len(e.link_faces) == 1]
    c_cliff_upper = (0.34, 0.25, 0.22)
    c_cliff_mid = (0.23, 0.19, 0.24)
    c_cliff_keel = (0.11, 0.14, 0.22)

    if boundary_edges:
        bottom_keel_verts = {}
        mid_verts = {}
        for e in boundary_edges:
            for v in e.verts:
                if v not in mid_verts:
                    mx = v.co.x * 0.87
                    my = v.co.y * 0.80
                    mz = v.co.z - 1.9 - 0.35 * abs(math.sin(v.co.x * 0.55))
                    mid_verts[v] = bm.verts.new((mx, my, mz))
                if v not in bottom_keel_verts:
                    kx = v.co.x * 0.48
                    ky = v.co.y * 0.40
                    kz = v.co.z - 4.4 - 0.55 * abs(math.cos(v.co.x * 0.42))
                    bottom_keel_verts[v] = bm.verts.new((kx, ky, kz))

        for e in boundary_edges:
            v_a, v_b = e.verts[0], e.verts[1]
            # Orient outward wall winding consistent with face loop
            lf = e.link_faces[0]
            v_next = None
            for i, lv in enumerate(lf.verts):
                if lv == v_a:
                    v_next = lf.verts[(i + 1) % len(lf.verts)]
                    break
            if v_next == v_b:
                t1, t2 = v_b, v_a
            else:
                t1, t2 = v_a, v_b

            m1, m2 = mid_verts[t1], mid_verts[t2]
            k1, k2 = bottom_keel_verts[t1], bottom_keel_verts[t2]

            try:
                f_up = bm.faces.new((t1, t2, m2, m1))
                f_up.material_index = 0
                wall_tint = lerp3(c_cliff_upper, (0.28, 0.32, 0.44), smoothstep(-4.0, 6.0, t1.co.x))
                assign_tri_vcolor(bm, col_layer, f_up, wall_tint)

                f_lo = bm.faces.new((m1, m2, k2, k1))
                f_lo.material_index = 0
                assign_tri_vcolor(bm, col_layer, f_lo, lerp3(c_cliff_mid, c_cliff_keel, 0.55))
            except ValueError:
                pass

    # Cap bottom center tip cleanly so no hollow underside hole shows if camera orbits low
    keel_ring = list({v.index: v for v in bm.verts if v.co.z < -3.0}.values())
    if len(keel_ring) >= 3:
        center_tip = bm.verts.new((0.0, 0.0, -5.2))
        keel_ring.sort(key=lambda vv: math.atan2(vv.co.y, vv.co.x))
        for i in range(len(keel_ring)):
            va = keel_ring[i]
            vb = keel_ring[(i + 1) % len(keel_ring)]
            try:
                fc = bm.faces.new((vb, va, center_tip))
                fc.material_index = 0
                assign_tri_vcolor(bm, col_layer, fc, c_cliff_keel)
            except ValueError:
                pass

    # 3. Add stylized multi-tier trees, crater boulders, launch trusses, solar arrays & arched truss bridges
    props_added = []
    # Layered emerald conifer clusters on Sector 1 hills
    tree_spots = [
        (-13.8, 2.7, 1.15), (-12.5, 3.8, 0.95), (-9.8, 3.4, 1.05),
        (-13.4, -3.9, 0.92), (-8.6, -4.1, 0.88), (-14.1, 0.6, 1.0),
    ]
    for tx, ty, sc in tree_spots:
        tz, _ = eval_terrain_height_and_color(tx, ty)
        props_added.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.45, 0.27, 0.14), "loc": (tx, ty, tz + 0.30 * sc), "radius": 0.13 * sc, "depth": 0.60 * sc, "segments": 6})
        props_added.append({"type": "cone", "mat_idx": 0, "vcolor": (0.12, 0.72, 0.34), "loc": (tx, ty, tz + 0.78 * sc), "r1": 0.56 * sc, "r2": 0.08 * sc, "depth": 0.72 * sc, "segments": 8})
        props_added.append({"type": "cone", "mat_idx": 0, "vcolor": (0.18, 0.84, 0.42), "loc": (tx, ty, tz + 1.18 * sc), "r1": 0.40 * sc, "r2": 0.03, "depth": 0.66 * sc, "segments": 8})

    # Sector 1 Peripheral Beveled Launch Floodlight Pylons & Warning Pad Segments
    for fx, fy in [(-12.6, -0.4), (-9.4, -3.5)]:
        fz, _ = eval_terrain_height_and_color(fx, fy)
        props_added.append({"type": "cube", "mat_idx": 0, "vcolor": (0.76, 0.82, 0.88), "loc": (fx, fy, fz + 0.55), "scale": (0.12, 0.12, 1.10)})
        props_added.append({"type": "cube", "mat_idx": 1, "loc": (fx, fy, fz + 1.12), "scale": (0.28, 0.14, 0.12), "rot": (0.25, 0, -0.3)})

    # Sector 2 Orbital Truss Spine & Solar Array Booms along North Ridge
    for sx, sy in [(-5.4, 3.6), (-2.2, 3.8)]:
        sz, _ = eval_terrain_height_and_color(sx, sy)
        props_added.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.64, 0.72, 0.82), "loc": (sx, sy, sz + 0.48), "radius": 0.08, "depth": 0.96, "segments": 8})
        props_added.append({"type": "cube", "mat_idx": 0, "vcolor": (0.12, 0.38, 0.84), "loc": (sx, sy + 0.15, sz + 0.96), "scale": (0.95, 0.42, 0.04), "rot": (0.35, 0, 0)})
        props_added.append({"type": "cube", "mat_idx": 0, "vcolor": (0.95, 0.74, 0.22), "loc": (sx, sy + 0.15, sz + 0.96), "scale": (0.06, 0.44, 0.05), "rot": (0.35, 0, 0)})

    # Multi-faceted Lunar Crater Boulders & Glowing Mineral Clusters on Ridge/Canyons
    boulder_spots = [
        (-7.2, 2.2, 0.9), (-6.8, -2.5, 0.8), (0.2, 2.9, 1.0),
        (2.4, 3.1, 0.9), (5.8, -3.2, 1.0), (1.9, -3.5, 0.85), (6.8, -2.8, 0.95),
    ]
    for cx, cy, sc in boulder_spots:
        cz, _ = eval_terrain_height_and_color(cx, cy)
        props_added.append({"type": "cone", "mat_idx": 1, "loc": (cx, cy, cz + 0.45 * sc), "r1": 0.22 * sc, "r2": 0.02, "depth": 0.95 * sc, "rot": (0.18, -0.22, 0.4), "segments": 5})
        props_added.append({"type": "cone", "mat_idx": 0, "vcolor": (0.42, 0.46, 0.56), "loc": (cx + 0.45, cy - 0.35, cz + 0.22 * sc), "r1": 0.34 * sc, "r2": 0.14 * sc, "depth": 0.48 * sc, "rot": (0.1, 0.25, 0.6), "segments": 6})

    # Sector 4 Coastal Landing Apron Chevrons & Radar Mast
    s4z, _ = eval_terrain_height_and_color(12.8, 3.2)
    props_added.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.78, 0.84, 0.90), "loc": (12.8, 3.2, s4z + 0.55), "radius": 0.07, "depth": 1.1, "segments": 8})
    props_added.append({"type": "cone", "mat_idx": 1, "loc": (12.8, 3.2, s4z + 1.15), "r1": 0.30, "r2": 0.03, "depth": 0.18, "rot": (0.4, 0, -0.6), "segments": 10})

    # Arched Steel & Plasma Truss Bridges spanning Canyons 1->2, 2->3, 3->4 (merged into terrain BMesh!)
    for i in range(len(SECTORS) - 1):
        ax, ay, az = SECTORS[i]["x"], SECTORS[i]["y"], SECTORS[i]["z"]
        bx, by, bz = SECTORS[i + 1]["x"], SECTORS[i + 1]["y"], SECTORS[i + 1]["z"]
        mx, my, mz = (ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5
        ang = math.atan2(by - ay, bx - ax)
        pitch = -(bz - az) / max(1.0, math.hypot(bx - ax, by - ay))
        span_len = math.hypot(bx - ax, by - ay) * 0.48
        # Heavy steel deck slab + segmented amber/slate traction pads
        props_added.append({
            "type": "bevel_cube",
            "mat_idx": 0,
            "vcolor": (0.15, 0.22, 0.35),
            "loc": (mx, my, mz - 0.16),
            "scale": (span_len, 1.02, 0.18),
            "rot": (0.0, pitch, ang),
        })
        for frac in (-0.30, 0.0, 0.30):
            px_b = mx + math.cos(ang) * (span_len * frac)
            py_b = my + math.sin(ang) * (span_len * frac)
            pz_b = mz - 0.05 + (bz - az) * (frac * 0.48)
            props_added.append({
                "type": "cube",
                "mat_idx": 0,
                "vcolor": (0.94, 0.72, 0.16),
                "loc": (px_b, py_b, pz_b),
                "scale": (0.28, 0.78, 0.04),
                "rot": (0.0, pitch, ang),
            })
        # Left & Right Neon Rail Strips + Overhanging Truss Gate Arches
        for side in (-0.48, 0.48):
            nx_off = -math.sin(ang) * side
            ny_off = math.cos(ang) * side
            props_added.append({
                "type": "cube",
                "mat_idx": 1,
                "loc": (mx + nx_off, my + ny_off, mz - 0.01),
                "scale": (span_len * 0.98, 0.07, 0.08),
                "rot": (0.0, pitch, ang),
            })
            props_added.append({
                "type": "cube",
                "mat_idx": 0,
                "vcolor": (0.72, 0.78, 0.86),
                "loc": (mx + nx_off, my + ny_off, mz + 0.42),
                "scale": (0.09, 0.09, 0.84),
                "rot": (0.0, pitch, ang),
            })
        # Crossbeam overhead bridge gantry arch
        props_added.append({
            "type": "cube",
            "mat_idx": 1,
            "loc": (mx, my, mz + 0.84),
            "scale": (0.14, 1.06, 0.09),
            "rot": (0.0, pitch, ang),
        })

    # Merge auxiliary hillside props/bridges directly into same BMesh (keeps 2 draw calls!)
    for p in props_added:
        bm_sub = bmesh.new()
        ptype = p["type"]
        if ptype == "cylinder":
            bmesh.ops.create_cone(
                bm_sub,
                cap_ends=True,
                cap_tris=True,
                segments=p.get("segments", 8),
                radius1=p.get("radius", 0.5),
                radius2=p.get("radius2", p.get("radius", 0.5)),
                depth=p.get("depth", 1.0),
            )
        elif ptype == "cone":
            bmesh.ops.create_cone(
                bm_sub,
                cap_ends=True,
                cap_tris=True,
                segments=p.get("segments", 6),
                radius1=p.get("r1", 0.4),
                radius2=p.get("r2", 0.02),
                depth=p.get("depth", 0.9),
            )
        else:
            bmesh.ops.create_cube(bm_sub, size=1.0)
            bmesh.ops.scale(bm_sub, vec=p.get("scale", (1, 1, 1)), verts=bm_sub.verts)

        rot = p.get("rot")
        if rot:
            bmesh.ops.rotate(bm_sub, cent=(0, 0, 0), matrix=Euler(rot, "XYZ").to_matrix(), verts=bm_sub.verts)
        bmesh.ops.translate(bm_sub, vec=p["loc"], verts=bm_sub.verts)

        bmesh.ops.triangulate(bm_sub, faces=bm_sub.faces[:])
        lin = gba.col4(*(p.get("vcolor", (0.2, 0.88, 1.0))), 1.0)
        sub_col = bm_sub.loops.layers.color.new("Col")
        mat_idx = p.get("mat_idx", 0)
        for f in bm_sub.faces:
            f.material_index = mat_idx
            for loop in f.loops:
                loop[sub_col] = lin

        # Append into main bm cleanly via temporary mesh
        tmp_mesh = bpy.data.meshes.new("_tmp_sub")
        bm_sub.to_mesh(tmp_mesh)
        bm_sub.free()
        bm.from_mesh(tmp_mesh)
        bpy.data.meshes.remove(tmp_mesh)

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    mesh = bpy.data.meshes.new("SpaceTerraIslandMesh")
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = False

    obj = bpy.data.objects.new("SpaceTerraIsland", mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(mat_terrain)
    obj.data.materials.append(mat_glow)
    return obj


def export_massive_island_glb():
    mcp_safe_reset_scene()
    m_terrain = phase1.p_mat()
    m_glow = phase1.glow_mat("island_neon_trim", (0.16, 0.88, 1.0), 1.45)
    generate_massive_terra_island_mesh(m_terrain, m_glow)
    gba.export_glb("massive_space_island_world.glb")
    out_path = os.path.join(MODELS_DIR, "massive_space_island_world.glb")
    return {
        "file": "massive_space_island_world.glb",
        "size_kb": round(os.path.getsize(out_path) / 1024.0, 1) if os.path.exists(out_path) else -1,
    }


def import_and_place(name, glb_file, loc, scale=(1.0, 1.0, 1.0), rot_deg=(0, 0, 0)):
    anchor = bpy.data.objects.new(name, None)
    anchor.empty_display_type = "PLAIN_AXES"
    anchor.empty_display_size = 0.25
    bpy.context.scene.collection.objects.link(anchor)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, glb_file))
    for obj in [o for o in bpy.data.objects if o not in before]:
        if obj.parent is None:
            obj.parent = anchor

    anchor.location = Vector(loc)
    anchor.scale = Vector(scale)
    anchor.rotation_euler = Euler(
        (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2])),
        "XYZ",
    )
    return anchor


def build_connected_live_viewport():
    mcp_safe_reset_scene()
    scene = bpy.context.scene

    # Deep Space Backdrop
    world = bpy.data.worlds.new("AstroNutriConnectedWorld")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.012, 0.024, 0.068, 1.0)
        bg.inputs["Strength"].default_value = 1.15

    # Import Massive Connected Sculpted Terrain
    import_and_place("Massive_Connected_TerraIsland", "massive_space_island_world.glb", (0.0, 0.0, 0.0))

    # Ground All 4 Sector Structures + Hero Astronaut directly onto Terrain Plateaus & Roads!
    a_s1 = import_and_place("Sector1_Launchpad_Complex", "earth_launchpad.glb", (-11.0, -2.0, -0.45), scale=(1.35, 1.35, 1.35), rot_deg=(0, 0, -14))
    a_s2 = import_and_place("Sector2_ISS_Relay_Deck", "iss_orbit_station.glb", (-3.8, 1.8, 2.35), scale=(1.35, 1.35, 1.35), rot_deg=(6, -4, 10))
    a_s3 = import_and_place("Sector3_Lunar_Biodome", "lunar_biodome_base.glb", (3.8, -1.6, 1.95), scale=(1.40, 1.40, 1.40), rot_deg=(0, 0, 18))
    a_s4 = import_and_place("Sector4_Orion_Splashdown", "orion_reentry_capsule.glb", (11.0, 1.6, -0.35), scale=(1.35, 1.35, 1.35), rot_deg=(0, 0, -12))
    a_hero = import_and_place("SpaceFitX_Astronaut_Explorer", "astronaut_hero.glb", (-7.4, -0.1, 0.45), scale=(1.35, 1.35, 1.35), rot_deg=(0, 0, 22))

    # Glowing Laser Energy Beams linking Sector 1->2->3->4 in Live Blender Viewport
    mat_beam = phase1.glow_mat("laser_bridge_plasma", (0.14, 0.96, 0.72), 2.1)
    for i in range(len(SECTORS) - 1):
        a, b = SECTORS[i], SECTORS[i + 1]
        p1 = Vector((a["x"], a["y"], a["z"] + 0.55))
        p2 = Vector((b["x"], b["y"], b["z"] + 0.55))
        mid = (p1 + p2) * 0.5
        diff = p2 - p1
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.075, depth=diff.length, location=mid)
        beam = bpy.context.active_object
        beam.name = f"Laser_Energy_Bridge_{i+1}_{i+2}"
        beam.rotation_euler = diff.to_track_quat("Z", "Y").to_euler()
        beam.data.materials.append(mat_beam)

    # Animate ISS hover & Astronaut explorer wave along connected island
    scene.frame_start = 1
    scene.frame_end = 120
    for f, dz, rot_z in [(1, 0.0, 0.0), (31, 0.16, 4.0), (61, 0.0, 8.0), (91, 0.16, 4.0), (121, 0.0, 0.0)]:
        a_s2.location = (-3.8, 1.8, 2.35 + dz)
        a_s2.rotation_euler = (math.radians(6), math.radians(-4), math.radians(10 + rot_z))
        a_s2.keyframe_insert(data_path="location", frame=f)
        a_s2.keyframe_insert(data_path="rotation_euler", frame=f)

        a_hero.location = (-7.4, -0.1, 0.45 + dz * 0.85)
        a_hero.rotation_euler = (0.0, 0.0, math.radians(22 + rot_z * 1.5))
        a_hero.keyframe_insert(data_path="location", frame=f)
        a_hero.keyframe_insert(data_path="rotation_euler", frame=f)

    # Wide Studio Lighting + Full-World Framing Camera
    bpy.ops.object.light_add(type="SUN", location=(8.0, -14.0, 18.0))
    sun = bpy.context.active_object
    sun.name = "ColonySunLight"
    sun.data.energy = 3.4
    sun.rotation_euler = (math.radians(44), math.radians(12), math.radians(28))

    bpy.ops.object.light_add(type="POINT", location=(-10.0, -8.0, 7.0))
    l_cyan = bpy.context.active_object
    l_cyan.data.color = (0.22, 0.86, 1.0)
    l_cyan.data.energy = 420.0

    bpy.ops.object.light_add(type="POINT", location=(10.0, -6.0, 8.0))
    l_warm = bpy.context.active_object
    l_warm.data.color = (1.0, 0.78, 0.42)
    l_warm.data.energy = 340.0

    bpy.ops.object.camera_add(location=(0.0, -23.5, 11.5))
    cam = bpy.context.active_object
    cam.name = "ConnectedTerraIslandCamera"
    cam.data.lens = 30.0
    direction = Vector((0.0, 0.0, 0.6)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.frame_set(18)

    try:
        for win in bpy.context.window_manager.windows:
            for area in win.screen.areas:
                if area.type == "VIEW_3D":
                    space = area.spaces.active
                    space.shading.type = "MATERIAL"
                    for region in area.regions:
                        if region.type == "WINDOW":
                            with bpy.context.temp_override(window=win, area=area, region=region):
                                space.region_3d.view_perspective = "CAMERA"
                            break
    except Exception:
        pass

    return {
        "objects": len(bpy.data.objects),
        "sample_names": [o.name for o in list(bpy.data.objects)[:16]],
    }


if __name__ == "__main__" or True:
    exported = export_massive_island_glb()
    viewport_info = build_connected_live_viewport()
    result = {
        "exported": exported,
        "viewport": viewport_info,
    }
