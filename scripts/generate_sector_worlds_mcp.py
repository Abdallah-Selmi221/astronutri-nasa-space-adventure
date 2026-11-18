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

    bm = bmesh.new()
    col_layer = bm.loops.layers.color.new("Col")

    nx = 36
    ny = 16
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
            # Flat safe walkable corridor across middle (|y| <= 4.6) & station zone (|x| <= half_x - 1.5)
            back_hill = massive.smoothstep(4.2, half_y, y)
            side_berm = massive.smoothstep(half_x - 2.4, half_x, abs(x))
            rim_factor = max(back_hill, side_berm * 0.6)
            rip = 0.22 * math.sin(x * 0.65 + y * 0.5) + 0.14 * math.cos(x * 1.1 - y * 0.8)

            z = 0.0
            if biome == "earth":
                z = rim_factor * (1.25 + max(0.0, rip))
                c = massive.lerp3((0.15, 0.62, 0.36), (0.10, 0.46, 0.28), rim_factor)
                if abs(y) < 3.6 and abs(x) < half_x - 2.2:
                    c = (0.18, 0.25, 0.35)
                elif y < -4.0:
                    c = (0.22, 0.52, 0.32)
            elif biome == "iss":
                z = rim_factor * 0.65
                c = massive.lerp3((0.12, 0.17, 0.28), (0.22, 0.32, 0.50), rim_factor)
                if abs(y) < 3.4:
                    c = (0.16, 0.22, 0.34)
            elif biome == "moon":
                # Crater bowl perimeter along north & sides
                crater_ring = max(back_hill, side_berm * 0.85)
                z = crater_ring * (1.55 + rip * 0.55)
                c = massive.lerp3((0.46, 0.50, 0.58), (0.32, 0.36, 0.46), crater_ring)
                if abs(y) < 3.6 and abs(x) < half_x - 2.2:
                    c = (0.38, 0.43, 0.52)
            else:  # orion recovery ocean/coastal carrier deck
                z = -0.06 if y < -4.4 else (rim_factor * 0.72)
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

    # Tapered underside rock/hull cliff apron around boundary so hovering colony deck looks thick and sculpted
    bm.edges.ensure_lookup_table()
    b_edges = [e for e in bm.edges if len(e.link_faces) == 1]
    keel_verts = {}
    for e in b_edges:
        for v in e.verts:
            if v not in keel_verts:
                keel_verts[v] = bm.verts.new((v.co.x * 0.86, v.co.y * 0.82, v.co.z - 2.2))

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

    # Biome decorative perimeter details + illuminated walkway borders
    extras = [
        {"type": "cube", "mat_idx": 1, "loc": (0.0, -4.3, 0.03), "scale": (width_x - 3.6, 0.18, 0.08)},
        {"type": "cube", "mat_idx": 1, "loc": (0.0, 4.1, 0.04), "scale": (width_x - 3.6, 0.16, 0.08)},
    ]
    if biome == "earth":
        for tx, ty, sc in [(-12.5, 5.2, 1.1), (-7.0, 5.8, 0.9), (6.5, 5.6, 1.05), (12.2, 5.0, 1.15)]:
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": (0.45, 0.28, 0.14), "loc": (tx, ty, 1.1), "radius": 0.14 * sc, "depth": 0.7 * sc, "segments": 6})
            extras.append({"type": "cone", "mat_idx": 0, "vcolor": (0.12, 0.78, 0.36), "loc": (tx, ty, 1.75), "r1": 0.62 * sc, "r2": 0.04, "depth": 1.1 * sc, "segments": 7})
    elif biome == "moon":
        for cx, cy, sc in [(-12.2, 5.4, 1.1), (-4.0, 5.9, 0.9), (5.0, 5.7, 1.0), (12.0, 5.2, 1.15)]:
            extras.append({"type": "cone", "mat_idx": 1, "loc": (cx, cy, 1.45), "r1": 0.26 * sc, "r2": 0.03, "depth": 1.1 * sc, "rot": (0.12, -0.2, 0.3), "segments": 5})
    elif biome == "iss":
        for sx in (-10.0, 0.0, 10.0):
            extras.append({"type": "torus", "mat_idx": 1, "loc": (sx, 5.6, 1.1), "major": 0.8, "minor": 0.06, "rot": (math.pi / 2.0, 0, 0), "seg_u": 16, "seg_v": 5})
    else:
        for bx in (-10.5, -3.5, 3.5, 10.5):
            extras.append({"type": "sphere", "mat_idx": 0, "vcolor": (0.98, 0.45, 0.14), "loc": (bx, -5.6, 0.15), "radius": 0.28, "u_seg": 8, "v_seg": 6})

    add_part_list_to_bmesh(extras, bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    mesh = bpy.data.meshes.new(f"{obj_name}Mesh")
    bm.to_mesh(mesh)
    bm.free()
    for p in mesh.polygons:
        p.use_smooth = False

    obj = bpy.data.objects.new(obj_name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.data.materials.append(m_base)
    obj.data.materials.append(m_glow)
    gba.export_glb(filename)
    path = os.path.join(MODELS_DIR, filename)
    return {"file": filename, "size_kb": round(os.path.getsize(path) / 1024.0, 1)}


def export_articulated_station_glbs():
    out = []

    # 1. earth_launchpad.glb with RocketFlameCone (2 meshes total -> 2-3 draw calls)
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
    pad_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONCRETE, "loc": (0, 0, -0.14), "radius": 1.35, "radius2": 1.48, "depth": 0.28, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 0.04), "scale": (1.55, 1.55, 0.12), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.09), "major": 1.05, "minor": 0.03, "seg_u": 24, "seg_v": 6},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.64, -0.05, 0.85), "scale": (0.22, 0.22, 1.52)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.64, -0.05, 1.62), "scale": (0.28, 0.28, 0.10)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.36, -0.05, 1.24), "scale": (0.44, 0.08, 0.07)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.36, -0.05, 0.78), "scale": (0.42, 0.08, 0.06)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TANK, "loc": (0.04, 0, 0.78), "radius": 0.16, "depth": 1.04, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.44), "radius": 0.145, "radius2": 0.12, "depth": 0.28, "segments": 12},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.72), "r1": 0.125, "r2": 0.025, "depth": 0.30, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0, 1.94), "radius": 0.022, "radius2": 0.012, "depth": 0.18, "segments": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, -0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 10},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, -0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 10},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 10},
    ]
    gba.build_mesh_object("EarthLaunchpadComplex", pad_parts, [m_base, m_cyan, m_flame], smooth_auto=False)
    gba.build_mesh_object(
        "RocketFlameCone",
        [{"type": "cone", "mat_idx": 2, "loc": (0.04, 0, 0.16), "r1": 0.18, "r2": 0.06, "depth": 0.26, "segments": 10}],
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
            iss_wings.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, sy, 0.0), "scale": (0.24, 0.82, 0.02), "rot": (0.24, 0, 0), "bevel": 0.006})
            iss_wings.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (sx, sy * 0.5, 0.0), "scale": (0.04, 0.25, 0.04)})
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
    gba.export_glb("prop_storm_console.glb")
    out.append("prop_storm_console.glb")
    return out


if __name__ == "__main__" or True:
    sectors = [
        build_sculpted_sector_deck("sector1_earth_colony.glb", "Sector1EarthColony", 32.0, 14.8, "earth"),
        build_sculpted_sector_deck("sector2_iss_atrium.glb", "Sector2ISSAtrium", 27.0, 14.8, "iss"),
        build_sculpted_sector_deck("sector3_lunar_biodome.glb", "Sector3LunarBiodome", 32.0, 14.8, "moon"),
        build_sculpted_sector_deck("sector4_orion_recovery.glb", "Sector4OrionRecovery", 27.0, 14.8, "orion"),
    ]
    props = export_articulated_station_glbs()
    # Refresh live Blender 5.3 viewport with connected world diorama
    massive.export_massive_island_glb()
    viewport = massive.build_connected_live_viewport()
    result = {
        "sectors": sectors,
        "articulated_props": props,
        "viewport_objects": viewport.get("objects"),
    }
