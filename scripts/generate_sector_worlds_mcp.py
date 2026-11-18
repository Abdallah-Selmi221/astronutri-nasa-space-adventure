"""
AstroNutri — Wave 1: Live Blender 5.3 MCP Sector Terrains + Articulated Station Props
Connects to Blender 5.3 on 127.0.0.1:9876 and:
  1. Sculpts & exports 4 biome-rich 3D Colony Sector decks (<160 KB, 2 draw calls each):
       - public/models/sector1_earth_colony.glb
       - public/models/sector2_iss_atrium.glb
       - public/models/sector3_lunar_biodome.glb
       - public/models/sector4_orion_recovery.glb
  2. Exports articulated prop & node GLBs with separately rotatable/pulsing named child objects:
       - earth_launchpad.glb -> RocketFlameCone
       - iss_orbit_station.glb -> ISSolarArray
       - prop_medical_pod.glb -> MedHaloRing
       - prop_hydro_rack.glb -> HydroBubbles
       - prop_storm_console.glb -> SpinRadar
  3. Rebuilds the Massive Connected World showcase in the live Blender 5.3 viewport.
"""

import json
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
import generate_massive_island_mcp as massive

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


def add_part_list_to_bmesh(parts_list, bm):
    sub_col = bm.loops.layers.color.get("Col") or bm.loops.layers.color.new("Col")
    for p in parts_list:
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
                segments=p.get("segments", 8),
                radius1=p.get("r1", 0.4),
                radius2=p.get("r2", 0.02),
                depth=p.get("depth", 0.9),
            )
        elif ptype == "sphere":
            bmesh.ops.create_uvsphere(
                bm_sub,
                u_segments=p.get("u_seg", 10),
                v_segments=p.get("v_seg", 6),
                radius=p.get("radius", 0.5),
            )
            if "scale" in p:
                bmesh.ops.scale(bm_sub, vec=p["scale"], verts=bm_sub.verts)
        elif ptype == "torus":
            segs_u = p.get("seg_u", 16)
            segs_v = p.get("seg_v", 6)
            maj = p.get("major", 0.5)
            mnr = p.get("minor", 0.04)
            ring_verts = []
            for iu in range(segs_u):
                au = (iu / segs_u) * math.pi * 2.0
                cu, su = math.cos(au), math.sin(au)
                row = []
                for iv in range(segs_v):
                    av = (iv / segs_v) * math.pi * 2.0
                    cv, sv = math.cos(av), math.sin(av)
                    r = maj + mnr * cv
                    row.append(bm_sub.verts.new((r * cu, r * su, mnr * sv)))
                ring_verts.append(row)
            for iu in range(segs_u):
                iu2 = (iu + 1) % segs_u
                for iv in range(segs_v):
                    iv2 = (iv + 1) % segs_v
                    bm_sub.faces.new(
                        (
                            ring_verts[iu][iv],
                            ring_verts[iu2][iv],
                            ring_verts[iu2][iv2],
                            ring_verts[iu][iv2],
                        )
                    )
        else:
            bmesh.ops.create_cube(bm_sub, size=1.0)
            bmesh.ops.scale(bm_sub, vec=p.get("scale", (1, 1, 1)), verts=bm_sub.verts)

        if "rot" in p:
            bmesh.ops.rotate(
                bm_sub, cent=(0, 0, 0), matrix=Euler(p["rot"], "XYZ").to_matrix(), verts=bm_sub.verts
            )
        bmesh.ops.translate(bm_sub, vec=p["loc"], verts=bm_sub.verts)
        bmesh.ops.triangulate(bm_sub, faces=bm_sub.faces[:])
        lin = gba.col4(*p.get("vcolor", (0.2, 0.88, 1.0)), 1.0)
        sc = bm_sub.loops.layers.color.new("Col")
        mat_idx = p.get("mat_idx", 0)
        for f in bm_sub.faces:
            f.material_index = mat_idx
            for loop in f.loops:
                loop[sc] = lin

        tmp_mesh = bpy.data.meshes.new("_tmp_p")
        bm_sub.to_mesh(tmp_mesh)
        bm_sub.free()
        bm.from_mesh(tmp_mesh)
        bpy.data.meshes.remove(tmp_mesh)


def build_sculpted_sector_deck(
    filename,
    obj_name,
    width_x,
    depth_y,
    biome,
):
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    glow_rgb = {
        "earth": (0.20, 0.90, 0.65),
        "iss": (0.25, 0.82, 1.0),
        "moon": (0.52, 0.82, 1.0),
        "orion": (0.18, 0.92, 0.86),
    }[biome]
    m_glow = phase1.glow_mat(f"{biome}_glow", glow_rgb, 1.35)
    m_glass = phase1.glass_mat(f"{biome}_glass", (0.38, 0.92, 1.0), 0.34) if biome == "moon" else None

    bm = bmesh.new()
    col_layer = bm.loops.layers.color.new("Col")

    nx = 48
    ny = 20
    half_x = width_x * 0.5
    half_y = depth_y * 0.5

    verts = [[None for _ in range(ny)] for _ in range(nx)]
    colors = [[(0.2, 0.5, 0.4) for _ in range(ny)] for _ in range(nx)]

    for ix in range(nx):
        ux = ix / (nx - 1)
        x = -half_x + ux * width_x
        for iy in range(ny):
            vy = iy / (ny - 1)
            y = -half_y + vy * depth_y
            back_hill = massive.smoothstep(4.2, half_y, y)
            side_berm = massive.smoothstep(half_x - 2.4, half_x, abs(x))
            rim_factor = max(back_hill, side_berm * 0.6)
            rip = 0.22 * math.sin(x * 0.65 + y * 0.5) + 0.14 * math.cos(x * 1.1 - y * 0.8)

            z = 0.0
            if biome == "earth":
                z = rim_factor * (1.32 + max(0.0, rip))
                c = massive.lerp3((0.15, 0.62, 0.36), (0.10, 0.46, 0.28), rim_factor)
                if abs(y) < 3.6 and abs(x) < half_x - 2.2:
                    c = (0.18, 0.25, 0.35)
                elif y < -4.0:
                    c = (0.22, 0.52, 0.32)
            elif biome == "iss":
                z = rim_factor * 0.68
                c = massive.lerp3((0.12, 0.17, 0.28), (0.22, 0.32, 0.50), rim_factor)
                if abs(y) < 3.4:
                    c = (0.16, 0.22, 0.34)
            elif biome == "moon":
                crater_ring = max(back_hill, side_berm * 0.85)
                z = crater_ring * (1.62 + rip * 0.58)
                c = massive.lerp3((0.46, 0.50, 0.58), (0.32, 0.36, 0.46), crater_ring)
                if abs(y) < 3.6 and abs(x) < half_x - 2.2:
                    c = (0.38, 0.43, 0.52)
            else:
                z = -0.06 if y < -4.4 else (rim_factor * 0.78)
                c = (0.06, 0.42, 0.68) if y < -4.2 else massive.lerp3((0.15, 0.24, 0.38), (0.76, 0.56, 0.32), back_hill)

            verts[ix][iy] = bm.verts.new((x, y, z))
            colors[ix][iy] = c

    for ix in range(nx - 1):
        for iy in range(ny - 1):
            v0, v1, v2, v3 = verts[ix][iy], verts[ix + 1][iy], verts[ix + 1][iy + 1], verts[ix][iy + 1]
            c_avg = tuple(
                (colors[ix][iy][k] + colors[ix + 1][iy][k] + colors[ix + 1][iy + 1][k] + colors[ix][iy + 1][k]) * 0.25
                for k in range(3)
            )
            f1 = bm.faces.new((v0, v1, v2))
            f2 = bm.faces.new((v0, v2, v3))
            f1.material_index = 0
            f2.material_index = 0
            massive.assign_tri_vcolor(bm, col_layer, f1, c_avg)
            massive.assign_tri_vcolor(bm, col_layer, f2, c_avg)

    bm.edges.ensure_lookup_table()
    b_edges = [e for e in bm.edges if len(e.link_faces) == 1]
    keel_verts = {}
    for e in b_edges:
        for v in e.verts:
            if v not in keel_verts:
                keel_verts[v] = bm.verts.new((v.co.x * 0.86, v.co.y * 0.82, v.co.z - 2.3))

    cliff_col = {
        "earth": (0.34, 0.24, 0.19),
        "iss": (0.08, 0.12, 0.22),
        "moon": (0.24, 0.27, 0.35),
        "orion": (0.10, 0.20, 0.34),
    }[biome]
    for e in b_edges:
        va, vb = e.verts[0], e.verts[1]
        lf = e.link_faces[0]
        v_next = None
        for i, lv in enumerate(lf.verts):
            if lv == va:
                v_next = lf.verts[(i + 1) % len(lf.verts)]
                break
        t1, t2 = (vb, va) if v_next == vb else (va, vb)
        f = bm.faces.new((t1, t2, keel_verts[t2], keel_verts[t1]))
        f.material_index = 0
        massive.assign_tri_vcolor(bm, col_layer, f, cliff_col)

    # Architectural promenade borders + hazard chevron landing pads + biome structures
    C_STRIPE_GOLD = (0.95, 0.72, 0.14)
    C_STEEL = (0.70, 0.76, 0.84)
    C_DARK = (0.14, 0.18, 0.28)
    C_SOLAR = (0.10, 0.36, 0.84)
    extras = [
        {"type": "cube", "mat_idx": 1, "loc": (0.0, -4.3, 0.03), "scale": (width_x - 3.6, 0.18, 0.08)},
        {"type": "cube", "mat_idx": 1, "loc": (0.0, 4.1, 0.04), "scale": (width_x - 3.6, 0.16, 0.08)},
    ]
    # Segmented yellow/dark warning-striped central landing apron at spawn (0, -3.0, 0.03)
    for k in range(8):
        ang = (k / 8.0) * math.pi * 2.0
        px = math.cos(ang) * 1.92
        py = -3.0 + math.sin(ang) * 1.92
        extras.append({
            "type": "cube",
            "mat_idx": 0,
            "vcolor": C_STRIPE_GOLD if k % 2 == 0 else C_DARK,
            "loc": (px, py, 0.045),
            "scale": (0.42, 0.18, 0.05),
            "rot": (0.0, 0.0, ang + math.pi * 0.5),
        })

    if biome == "earth":
        # Multi-tier pine conifer trees along hills
        for tx, ty, sc in [(-13.2, 5.1, 1.15), (-8.5, 5.8, 0.95), (6.5, 5.6, 1.05), (12.8, 5.0, 1.18), (-14.2, -5.2, 0.9), (13.8, -5.1, 0.95)]:
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.45, 0.28, 0.14), "loc": (tx, ty, 0.85), "radius": 0.14 * sc, "depth": 0.72 * sc, "segments": 6})
            extras.append({"type": "cone", "mat_idx": 0, "vcolor": (0.10, 0.72, 0.34), "loc": (tx, ty, 1.42), "r1": 0.65 * sc, "r2": 0.08 * sc, "depth": 0.85 * sc, "segments": 8})
            extras.append({"type": "cone", "mat_idx": 0, "vcolor": (0.18, 0.86, 0.42), "loc": (tx, ty, 1.98), "r1": 0.45 * sc, "r2": 0.03, "depth": 0.75 * sc, "segments": 8})
        # Beveled NASA Launch Gantry Steel Trusses & Solar Relay Arrays along back perimeter
        for gx in (-10.8, 10.6):
            for post_dx in (-0.36, 0.36):
                extras.append({"type": "cube", "mat_idx": 0, "vcolor": (0.86, 0.24, 0.18), "loc": (gx + post_dx, 4.9, 2.1), "scale": (0.14, 0.14, 3.2)})
            for cross_z in (1.1, 2.1, 3.1):
                extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (gx, 4.9, cross_z), "scale": (0.82, 0.12, 0.10)})
            extras.append({"type": "cube", "mat_idx": 1, "loc": (gx, 4.78, 3.65), "scale": (0.95, 0.22, 0.14)})
        for sx in (-3.8, 3.8):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (sx, 5.2, 0.85), "radius": 0.08, "depth": 1.1, "segments": 8})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, 5.2, 1.48), "scale": (1.85, 0.72, 0.04), "rot": (-0.42, 0, 0)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STRIPE_GOLD, "loc": (sx, 5.2, 1.48), "scale": (0.08, 0.74, 0.05), "rot": (-0.42, 0, 0)})

    elif biome == "iss":
        # Overhead Beveled Steel Truss Bay Arches + Multi-Panel Blue/Gold Solar Wings on Booms
        for ax in (-8.5, 0.0, 8.5):
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (ax - 1.2, 5.1, 1.85), "scale": (0.18, 0.22, 3.4)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (ax + 1.2, 5.1, 1.85), "scale": (0.18, 0.22, 3.4)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (ax, 5.1, 3.55), "scale": (2.65, 0.28, 0.22)})
            extras.append({"type": "torus", "mat_idx": 1, "loc": (ax, 4.95, 2.15), "major": 0.92, "minor": 0.06, "rot": (math.pi / 2.0, 0, 0), "seg_u": 18, "seg_v": 6})
        for sx in (-11.2, -4.4, 4.4, 11.2):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (sx, 5.7, 1.35), "radius": 0.08, "depth": 2.1, "segments": 8})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, 5.7, 2.35), "scale": (2.35, 0.92, 0.04), "rot": (-0.38, 0, 0)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STRIPE_GOLD, "loc": (sx, 5.7, 2.35), "scale": (0.10, 0.94, 0.06), "rot": (-0.38, 0, 0)})

    elif biome == "moon":
        # Jagged Multi-Faceted Regolith Crater Boulders + Crystal Veins
        for cx, cy, sc in [(-12.8, 5.4, 1.2), (-6.2, 5.9, 1.0), (5.8, 5.8, 1.15), (12.4, 5.2, 1.25), (-13.6, -5.2, 0.9), (13.4, -5.0, 1.0)]:
            extras.append({"type": "cone", "mat_idx": 0, "vcolor": (0.36, 0.40, 0.48), "loc": (cx + 0.55, cy, 0.95), "r1": 0.58 * sc, "r2": 0.18 * sc, "depth": 0.95 * sc, "rot": (0.18, 0.25, 0.6), "segments": 6})
            extras.append({"type": "cone", "mat_idx": 1, "loc": (cx, cy, 1.35), "r1": 0.24 * sc, "r2": 0.02, "depth": 1.05 * sc, "rot": (0.12, -0.2, 0.3), "segments": 5})
        # Hydroponic Geodesic Glass Bio-Dome & Interior Illuminated Crop Arches on Back North Crater Shelf!
        extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (0.0, 5.8, 0.95), "radius": 2.35, "depth": 0.25, "segments": 16})
        extras.append({"type": "torus", "mat_idx": 1, "loc": (0.0, 5.8, 1.12), "major": 2.25, "minor": 0.08, "seg_u": 24, "seg_v": 6})
        for rot_y in (0.0, math.pi / 3.0, -math.pi / 3.0):
            extras.append({"type": "torus", "mat_idx": 0, "vcolor": C_STEEL, "loc": (0.0, 5.8, 1.12), "major": 2.18, "minor": 0.05, "rot": (math.pi / 2.0, rot_y, 0), "seg_u": 20, "seg_v": 6})
        for cx_crop in (-0.9, 0.0, 0.9):
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": (0.14, 0.80, 0.34), "loc": (cx_crop, 5.8, 1.28), "scale": (0.48, 1.35, 0.28)})
        extras.append({"type": "sphere", "mat_idx": 2 if m_glass else 1, "loc": (0.0, 5.8, 1.12), "radius": 2.15, "u_seg": 16, "v_seg": 10, "scale": (1.0, 1.0, 0.82)})

    else:
        # Coastal Ocean Swells, Warning-Striped Recovery Buoys & Communication Radar Truss Tower
        for bx in (-10.8, -3.6, 3.6, 10.8):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.98, 0.44, 0.14), "loc": (bx, -5.6, 0.14), "radius": 0.32, "radius2": 0.20, "depth": 0.36, "segments": 10})
            extras.append({"type": "sphere", "mat_idx": 1, "loc": (bx, -5.6, 0.44), "radius": 0.14, "u_seg": 8, "v_seg": 6})
        for rx in (-8.2, 8.2):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (rx, 5.4, 1.45), "radius": 0.14, "depth": 2.4, "segments": 8})
            extras.append({"type": "cone", "mat_idx": 1, "loc": (rx, 5.4, 2.82), "r1": 0.68, "r2": 0.05, "depth": 0.36, "rot": (-0.45, 0, 0), "segments": 14})

    add_part_list_to_bmesh(extras, bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    mesh = bpy.data.meshes.new(f"{obj_name}Mesh")
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False

    tris = sum(max(1, len(p.vertices) - 2) for p in mesh.polygons)
    vcount = len(mesh.vertices)

    obj = bpy.data.objects.new(obj_name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(m_base)
    obj.data.materials.append(m_glow)
    if m_glass is not None:
        obj.data.materials.append(m_glass)
    gba.export_glb(filename)
    path = os.path.join(MODELS_DIR, filename)
    return {
        "file": filename,
        "size_kb": round(os.path.getsize(path) / 1024.0, 1),
        "vertices": vcount,
        "triangles": tris,
    }


def export_articulated_station_glbs():
    out = []

    # 1. earth_launchpad.glb with Lattice Truss Tower + Warning Stripes + RocketFlameCone
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_cyan = phase1.glow_mat("pad_cyan", (0.18, 0.85, 1.0), 1.4)
    m_flame = phase1.glow_mat("pad_flame", (1.0, 0.55, 0.12), 1.75)
    C_CONCRETE = (0.36, 0.40, 0.48)
    C_DARK = (0.14, 0.18, 0.24)
    C_TOWER = (0.86, 0.24, 0.18)
    C_TANK = (0.90, 0.46, 0.12)
    C_WHITE = (0.94, 0.96, 0.99)
    C_SILVER = (0.72, 0.78, 0.84)
    C_GOLD = (0.95, 0.74, 0.16)
    pad_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONCRETE, "loc": (0, 0, -0.14), "radius": 1.38, "radius2": 1.52, "depth": 0.28, "segments": 12},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 0.04), "scale": (1.60, 1.60, 0.12), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.09), "major": 1.08, "minor": 0.032, "seg_u": 24, "seg_v": 6},
        # Open-Frame Lattice Umbilical Tower (4 corner columns + cross braces + lightning mast)
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.74, -0.16, 0.86), "scale": (0.06, 0.06, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.54, -0.16, 0.86), "scale": (0.06, 0.06, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.74, 0.06, 0.86), "scale": (0.06, 0.06, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.54, 0.06, 0.86), "scale": (0.06, 0.06, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.64, -0.05, 1.66), "scale": (0.30, 0.30, 0.08)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.64, -0.05, 1.84), "radius": 0.015, "depth": 0.34, "segments": 6},
        {"type": "cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.36, -0.05, 1.30), "scale": (0.46, 0.09, 0.07)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.36, -0.05, 0.82), "scale": (0.44, 0.08, 0.06)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TANK, "loc": (0.04, 0, 0.78), "radius": 0.165, "depth": 1.04, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.44), "radius": 0.145, "radius2": 0.12, "depth": 0.28, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.72), "r1": 0.125, "r2": 0.025, "depth": 0.30, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0, 1.94), "radius": 0.022, "radius2": 0.012, "depth": 0.18, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, -0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 12},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, -0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 12},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 12},
    ]
    for z_brace in (0.36, 0.72, 1.08, 1.44):
        pad_parts.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-0.64, -0.05, z_brace), "scale": (0.24, 0.24, 0.04)})
    for sk in range(6):
        ang = (sk / 6.0) * math.pi * 2.0
        pad_parts.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD if sk % 2 == 0 else C_DARK, "loc": (math.cos(ang) * 1.24, math.sin(ang) * 1.24, 0.02), "scale": (0.28, 0.12, 0.04), "rot": (0, 0, ang + 1.57)})
    gba.build_mesh_object("EarthLaunchpadComplex", pad_parts, [m_base, m_cyan, m_flame], smooth_auto=False)
    gba.build_mesh_object(
        "RocketFlameCone",
        [{"type": "cone", "mat_idx": 2, "loc": (0.04, 0, 0.16), "r1": 0.18, "r2": 0.06, "depth": 0.26, "segments": 12}],
        [m_base, m_cyan, m_flame],
        smooth_auto=True,
    )
    gba.export_glb("earth_launchpad.glb")
    out.append("earth_launchpad.glb")

    # 2. iss_orbit_station.glb with separate articulated ISSolarArray
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_cyan = phase1.glow_mat("iss_cyan", (0.20, 0.88, 1.0), 1.35)
    C_HULL, C_GOLD, C_TRUSS, C_SOLAR, C_RAD = (0.91, 0.94, 0.97), (0.94, 0.72, 0.18), (0.64, 0.70, 0.78), (0.10, 0.34, 0.78), (0.96, 0.97, 0.99)
    iss_core = [
        {"type": "cube", "mat_idx": 0, "vcolor": C_TRUSS, "loc": (0, 0, 0.42), "scale": (2.35, 0.14, 0.14)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (0, 0, 0.36), "radius": 0.18, "depth": 1.32, "rot": (math.pi / 2.0, 0, 0), "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (-0.34, 0.18, 0.36), "radius": 0.13, "depth": 0.56, "rot": (0, math.pi / 2.0, 0), "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (0.34, 0.18, 0.36), "radius": 0.13, "depth": 0.56, "rot": (0, math.pi / 2.0, 0), "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0.22, 0.36), "radius": 0.21, "depth": 0.22, "rot": (math.pi / 2.0, 0, 0), "segments": 10},
        {"type": "sphere", "mat_idx": 1, "loc": (0, 0.0, 0.54), "radius": 0.14, "u_seg": 10, "v_seg": 6},
        {"type": "torus", "mat_idx": 1, "loc": (0, 0.68, 0.36), "major": 0.16, "minor": 0.025, "rot": (math.pi / 2.0, 0, 0), "seg_u": 14, "seg_v": 5},
        {"type": "torus", "mat_idx": 1, "loc": (0, -0.68, 0.36), "major": 0.16, "minor": 0.025, "rot": (math.pi / 2.0, 0, 0), "seg_u": 14, "seg_v": 5},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RAD, "loc": (-0.38, -0.34, 0.42), "scale": (0.18, 0.46, 0.02), "bevel": 0.005},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RAD, "loc": (0.38, -0.34, 0.42), "scale": (0.18, 0.46, 0.02), "bevel": 0.005},
    ]
    iss_wings = []
    for sx in (-0.98, -0.66, 0.66, 0.98):
        for sy in (-0.54, 0.54):
            iss_wings.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, sy, 0.0), "scale": (0.24, 0.82, 0.022), "rot": (0.24, 0, 0), "bevel": 0.006})
            # Transverse solar cell grid ribs & gold busbars
            for rib_i in (-0.28, 0.0, 0.28):
                iss_wings.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (sx, sy + rib_i * 0.96, rib_i * 0.24), "scale": (0.25, 0.028, 0.032), "rot": (0.24, 0, 0)})
            iss_wings.append({"type": "cube", "mat_idx": 0, "vcolor": C_TRUSS, "loc": (sx - 0.115, sy, 0.0), "scale": (0.022, 0.84, 0.032), "rot": (0.24, 0, 0)})
            iss_wings.append({"type": "cube", "mat_idx": 0, "vcolor": C_TRUSS, "loc": (sx + 0.115, sy, 0.0), "scale": (0.022, 0.84, 0.032), "rot": (0.24, 0, 0)})
            iss_wings.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (sx, sy * 0.5, 0.0), "scale": (0.04, 0.25, 0.04)})
    # Add Cupola bay frame & dorsal communications antenna to ISS core
    iss_core.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_TRUSS, "loc": (0, 0.0, 0.50), "radius": 0.17, "depth": 0.08, "segments": 8})
    iss_core.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0.18, -0.22, 0.62), "radius": 0.014, "depth": 0.34, "segments": 6})
    iss_core.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_RAD, "loc": (0.18, -0.22, 0.78), "radius": 0.12, "radius2": 0.03, "depth": 0.05, "segments": 12})
    gba.build_mesh_object("ISSOrbitStation", iss_core, [m_base, m_cyan], smooth_auto=False)
    wing_obj = gba.build_mesh_object("ISSolarArray", iss_wings, [m_base, m_cyan], smooth_auto=False)
    wing_obj.location = (0, 0, 0.44)
    gba.export_glb("iss_orbit_station.glb")
    out.append("iss_orbit_station.glb")

    # 3. prop_medical_pod.glb -> PropMedicalPod + rotatable MedHaloRing (2 materials/draw calls!)
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_med = phase1.glow_mat("med_pink_cyan", (0.96, 0.35, 0.65), 1.2)
    m_cyan = phase1.glow_mat("med_holo", (0.22, 0.88, 1.0), 1.25)
    C_WHITE, C_BED = (0.94, 0.96, 0.99), (0.18, 0.34, 0.56)
    pod_parts = [
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.28), "scale": (1.52, 0.76, 0.38), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BED, "loc": (0, 0, 0.50), "scale": (1.36, 0.62, 0.12), "bevel": 0.04},
        {"type": "cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.68, -0.34, 0.72), "scale": (0.10, 0.10, 0.98)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": (0.12, 0.16, 0.24), "loc": (0.68, -0.34, 1.28), "scale": (0.44, 0.08, 0.32), "rot": (-0.25, 0, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0.68, -0.39, 1.28), "scale": (0.36, 0.02, 0.22), "rot": (-0.25, 0, 0)},
    ]
    gba.build_mesh_object("PropMedicalPod", pod_parts, [m_base, m_med, m_cyan], smooth_auto=False)
    halo_obj = gba.build_mesh_object(
        "MedHaloRing",
        [{"type": "torus", "mat_idx": 2, "loc": (0, 0, 0), "major": 0.48, "minor": 0.05, "rot": (0, math.pi / 2.0, 0), "seg_u": 20, "seg_v": 6}],
        [m_base, m_med, m_cyan],
        smooth_auto=True,
    )
    halo_obj.location = (-0.18, 0, 0.85)
    gba.export_glb("prop_medical_pod.glb")
    out.append("prop_medical_pod.glb")

    # 4. prop_hydro_rack.glb -> PropHydroRack + HydroBubbles
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_led = phase1.glow_mat("hydro_pink_led", (0.98, 0.42, 0.86), 1.35)
    m_water = phase1.glow_mat("hydro_water_cyan", (0.16, 0.85, 0.95), 1.05)
    C_FRAME, C_GREEN, C_LIME = (0.82, 0.87, 0.92), (0.18, 0.80, 0.34), (0.38, 0.88, 0.28)
    rack_parts = [
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, 0.22), "scale": (1.42, 0.68, 0.42), "bevel": 0.03},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (-0.64, -0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0.64, -0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (-0.64, 0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0.64, 0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, 1.76), "scale": (1.38, 0.60, 0.08), "bevel": 0.02},
    ]
    for tz in (0.68, 1.24):
        rack_parts.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, tz), "scale": (1.34, 0.56, 0.08), "bevel": 0.02})
        rack_parts.append({"type": "cube", "mat_idx": 1, "loc": (0, 0, tz + 0.42), "scale": (1.24, 0.14, 0.04)})
        for px in (-0.42, -0.14, 0.14, 0.42):
            rack_parts.append({"type": "icosphere", "mat_idx": 0, "vcolor": C_GREEN if px < 0 else C_LIME, "loc": (px, 0, tz + 0.14), "radius": 0.12, "subdiv": 1, "scale": (1.1, 1.1, 0.78)})
    gba.build_mesh_object("PropHydroRack", rack_parts, [m_base, m_led, m_water], smooth_auto=False)
    bub_parts = [
        {"type": "cube", "mat_idx": 2, "loc": (0, -0.33, 0.24), "scale": (1.12, 0.04, 0.22)},
        {"type": "sphere", "mat_idx": 2, "loc": (-0.32, -0.35, 0.24), "radius": 0.05, "u_seg": 8, "v_seg": 6},
        {"type": "sphere", "mat_idx": 2, "loc": (0.18, -0.35, 0.26), "radius": 0.045, "u_seg": 8, "v_seg": 6},
    ]
    gba.build_mesh_object("HydroBubbles", bub_parts, [m_base, m_led, m_water], smooth_auto=True)
    gba.export_glb("prop_hydro_rack.glb")
    out.append("prop_hydro_rack.glb")

    # 5. prop_storm_console.glb -> PropStormConsole + SpinRadar
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_amber = phase1.glow_mat("console_amber", (1.0, 0.65, 0.12), 1.35)
    m_cyan = phase1.glow_mat("console_cyan", (0.20, 0.88, 1.0), 1.3)
    C_DESK, C_TRIM = (0.18, 0.24, 0.34), (0.78, 0.84, 0.90)
    console_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DESK, "loc": (0, 0, 0.38), "radius": 0.78, "radius2": 0.66, "depth": 0.74, "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TRIM, "loc": (0, 0, 0.78), "radius": 0.84, "depth": 0.08, "segments": 10},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (0, 0.16, 1.18), "scale": (0.68, 0.08, 0.44), "rot": (0.18, 0, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 2, "loc": (0, 0.11, 1.18), "scale": (0.58, 0.02, 0.34), "rot": (0.18, 0, 0)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (-0.64, 0.02, 1.14), "scale": (0.46, 0.08, 0.36), "rot": (0.18, 0.42, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (-0.60, -0.02, 1.14), "scale": (0.38, 0.02, 0.28), "rot": (0.18, 0.42, 0)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (0.64, 0.02, 1.14), "scale": (0.46, 0.08, 0.36), "rot": (0.18, -0.42, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0.60, -0.02, 1.14), "scale": (0.38, 0.02, 0.28), "rot": (0.18, -0.42, 0)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TRIM, "loc": (0, 0.28, 1.60), "radius": 0.04, "depth": 0.38, "segments": 8},
    ]
    gba.build_mesh_object("PropStormConsole", console_parts, [m_base, m_amber, m_cyan], smooth_auto=False)
    radar_obj = gba.build_mesh_object(
        "SpinRadar",
        [{"type": "cone", "mat_idx": 2, "loc": (0, 0, 0), "r1": 0.28, "r2": 0.02, "depth": 0.15, "rot": (-0.45, 0, 0), "segments": 12}],
        [m_base, m_amber, m_cyan],
        smooth_auto=False,
    )
    radar_obj.location = (0, 0.28, 1.82)
    # 6. lunar_biodome_base.glb -> Geodesic Glass Rib Arches + 6-Wheel Pressurized Rover
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_glass = phase1.glass_mat("lunar_dome_glass", (0.36, 0.92, 1.0), 0.36)
    m_cyan = phase1.glow_mat("lunar_base_cyan", (0.20, 0.88, 1.0), 1.15)
    C_REG, C_CRAT, C_MET, C_PL, C_SOL, C_GLD = (0.54, 0.58, 0.64), (0.36, 0.40, 0.48), (0.86, 0.90, 0.94), (0.16, 0.80, 0.34), (0.12, 0.36, 0.84), (0.95, 0.72, 0.16)
    lunar_solid = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_REG, "loc": (0, 0, -0.10), "radius": 1.40, "radius2": 1.54, "depth": 0.22, "segments": 16},
        {"type": "torus", "mat_idx": 0, "vcolor": C_CRAT, "loc": (-0.86, 0.58, 0.02), "major": 0.28, "minor": 0.06, "seg_u": 14, "seg_v": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_MET, "loc": (0.08, 0, 0.06), "radius": 0.78, "depth": 0.10, "segments": 18},
        {"type": "torus", "mat_idx": 2, "loc": (0.08, 0, 0.11), "major": 0.75, "minor": 0.032, "seg_u": 22, "seg_v": 6},
        {"type": "torus", "mat_idx": 0, "vcolor": C_MET, "loc": (0.08, 0, 0.11), "major": 0.74, "minor": 0.022, "rot": (math.pi / 2.0, 0, 0), "seg_u": 20, "seg_v": 5},
        {"type": "torus", "mat_idx": 0, "vcolor": C_MET, "loc": (0.08, 0, 0.11), "major": 0.74, "minor": 0.022, "rot": (math.pi / 2.0, math.pi / 3.0, 0), "seg_u": 20, "seg_v": 5},
        {"type": "torus", "mat_idx": 0, "vcolor": C_MET, "loc": (0.08, 0, 0.11), "major": 0.74, "minor": 0.022, "rot": (math.pi / 2.0, -math.pi / 3.0, 0), "seg_u": 20, "seg_v": 5},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PL, "loc": (-0.10, -0.18, 0.18), "scale": (0.30, 0.18, 0.14), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PL, "loc": (0.28, -0.18, 0.18), "scale": (0.30, 0.18, 0.14), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PL, "loc": (0.08, 0.24, 0.18), "scale": (0.48, 0.18, 0.14), "bevel": 0.04},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_MET, "loc": (-0.72, -0.12, 0.24), "radius": 0.18, "depth": 0.54, "rot": (0, math.pi / 2.0, 0.2), "segments": 12},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOL, "loc": (0.98, 0.35, 0.28), "scale": (0.48, 0.26, 0.03), "rot": (0.38, 0, -0.2), "bevel": 0.005},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GLD, "loc": (0.98, 0.35, 0.29), "scale": (0.04, 0.26, 0.035), "rot": (0.38, 0, -0.2)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_MET, "loc": (0.98, 0.35, 0.14), "radius": 0.04, "depth": 0.26, "segments": 8},
        # 6-Wheel Pressurized Rover
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_MET, "loc": (-0.65, -0.78, 0.18), "scale": (0.46, 0.26, 0.18), "bevel": 0.03},
        {"type": "cube", "mat_idx": 2, "loc": (-0.44, -0.78, 0.22), "scale": (0.05, 0.20, 0.10)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GLD, "loc": (-0.72, -0.78, 0.34), "radius": 0.09, "radius2": 0.01, "depth": 0.08, "rot": (0.4, 0, 0), "segments": 10},
    ]
    for wx in (-0.82, -0.65, -0.48):
        for wy in (-0.94, -0.62):
            lunar_solid.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_CRAT, "loc": (wx, wy, 0.08), "radius": 0.068, "depth": 0.06, "rot": (math.pi / 2.0, 0, 0), "segments": 10})
    gba.build_mesh_object("LunarBiodomeBase", lunar_solid, [m_base, m_glass, m_cyan], smooth_auto=False)
    gba.build_mesh_object("LunarDomeGlass", [{"type": "sphere", "mat_idx": 1, "loc": (0.08, 0, 0.11), "radius": 0.72, "u_seg": 18, "v_seg": 12, "scale": (1.0, 1.0, 0.85)}], [m_base, m_glass, m_cyan], smooth_auto=True)
    gba.export_glb("lunar_biodome_base.glb")
    out.append("lunar_biodome_base.glb")

    # 7. orion_reentry_capsule.glb -> PICA-X Heat Shield + RCS Pods + Chutes
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    m_cyan = phase1.glow_mat("orion_cyan", (0.25, 0.88, 1.0), 1.2)
    m_heat = phase1.glow_mat("orion_pica_heat", (1.0, 0.42, 0.10), 0.95)
    C_CAP, C_SH, C_DK, C_OR, C_WH = (0.86, 0.90, 0.95), (0.44, 0.22, 0.10), (0.14, 0.18, 0.24), (0.98, 0.45, 0.12), (0.98, 0.98, 1.0)
    orion_parts = [
        {"type": "sphere", "mat_idx": 0, "vcolor": C_SH, "loc": (0, 0, 0.18), "radius": 0.64, "u_seg": 20, "v_seg": 10, "scale": (1.0, 1.0, 0.34)},
        {"type": "torus", "mat_idx": 2, "loc": (0, 0, 0.22), "major": 0.61, "minor": 0.042, "seg_u": 24, "seg_v": 6},
        {"type": "cone", "mat_idx": 0, "vcolor": C_CAP, "loc": (0, 0, 0.56), "r1": 0.58, "r2": 0.25, "depth": 0.66, "segments": 20},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DK, "loc": (0, 0, 0.94), "radius": 0.23, "depth": 0.12, "segments": 14},
        {"type": "bevel_cube", "mat_idx": 1, "loc": (0.34, 0.0, 0.60), "scale": (0.14, 0.22, 0.10), "rot": (0, 0.45, 0), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DK, "loc": (-0.42, 0.0, 0.46), "scale": (0.12, 0.12, 0.10), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DK, "loc": (0.0, -0.42, 0.46), "scale": (0.12, 0.12, 0.10), "bevel": 0.02},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_OR, "loc": (-0.42, 0.0, 1.72), "radius": 0.38, "u_seg": 14, "v_seg": 9, "scale": (1.0, 1.0, 0.55)},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_WH, "loc": (0.42, 0.0, 1.72), "radius": 0.38, "u_seg": 14, "v_seg": 9, "scale": (1.0, 1.0, 0.55)},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_OR, "loc": (0.0, 0.38, 1.82), "radius": 0.38, "u_seg": 14, "v_seg": 9, "scale": (1.0, 1.0, 0.55)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DK, "loc": (-0.21, 0, 1.32), "radius": 0.015, "depth": 0.78, "rot": (0, -0.45, 0), "segments": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DK, "loc": (0.21, 0, 1.32), "radius": 0.015, "depth": 0.78, "rot": (0, 0.45, 0), "segments": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DK, "loc": (0, 0.19, 1.38), "radius": 0.015, "depth": 0.86, "rot": (0.40, 0, 0), "segments": 6},
    ]
    gba.build_mesh_object("OrionReentryCapsule", orion_parts, [m_base, m_cyan, m_heat], smooth_auto=False)
    gba.export_glb("orion_reentry_capsule.glb")
    out.append("orion_reentry_capsule.glb")
    return out


if __name__ == "__main__" or True:
    sectors = [
        build_sculpted_sector_deck("sector1_earth_colony.glb", "Sector1EarthColony", 32.0, 14.8, "earth"),
        build_sculpted_sector_deck("sector2_iss_atrium.glb", "Sector2ISSAtrium", 27.0, 14.8, "iss"),
        build_sculpted_sector_deck("sector3_lunar_biodome.glb", "Sector3LunarBiodome", 32.0, 14.8, "moon"),
        build_sculpted_sector_deck("sector4_orion_recovery.glb", "Sector4OrionRecovery", 27.0, 14.8, "orion"),
    ]
    props = export_articulated_station_glbs()
    massive_info = massive.export_massive_island_glb()
    # Forensic mesh audit across EVERY exported .glb file in public/models/
    glb_audit = []
    for fname in sorted(os.listdir(MODELS_DIR)):
        if fname.endswith(".glb"):
            fp = os.path.join(MODELS_DIR, fname)
            mcp_safe_reset_scene()
            bpy.ops.import_scene.gltf(filepath=fp)
            verts = 0
            tris = 0
            mesh_count = 0
            for ob in bpy.context.scene.objects:
                if ob.type == "MESH" and ob.data is not None:
                    mesh_count += 1
                    verts += len(ob.data.vertices)
                    tris += sum(max(1, len(p.vertices) - 2) for p in ob.data.polygons)
            glb_audit.append({
                "file": fname,
                "size_kb": round(os.path.getsize(fp) / 1024.0, 1),
                "meshes": mesh_count,
                "vertices": verts,
                "triangles": tris,
            })
    viewport = massive.build_connected_live_viewport()
    result = {
        "sectors": sectors,
        "articulated_props": props,
        "massive_island": massive_info,
        "glb_audit": glb_audit,
        "viewport_objects": viewport.get("objects"),
    }
    print("BLENDER_FORENSIC_AUDIT:", json.dumps(result))
