"""
AstroNutri — Stage 2: Live Blender 5.3 MCP Vast Planetary Biomes & Drivable Space Rover
Connects cleanly inside live Blender 5.3 (or headless Blender) and exports:
  1. public/models/astronaut_rover.glb         (< 180 KB, RoverChassis + RoverHeadlights + 4 wheel axles)
  2. public/models/sector1_earth_colony.glb    (< 350 KB, 128m x 128m lush green Earth Spaceport Valley + tarmac road)
  3. public/models/sector2_iss_atrium.glb      (< 300 KB, bright sunlit 52m x 24m orbital truss station deck)
  4. public/models/sector3_lunar_biodome.glb   (< 350 KB, 136m x 136m Moon Shackleton crater basin & biodome)
  5. public/models/sector4_orion_recovery.glb  (< 350 KB, 136m x 136m Martian Red Canyon basin & recovery runway)
  6. public/models/massive_space_island_world.glb (< 350 KB, brightened Sector 1 lush green hills)
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


def smoothstep(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / max(1e-6, e1 - e0)))
    return t * t * (3.0 - 2.0 * t)


def lerp3(a, b, t):
    return (
        a[0] + (b[0] - a[0]) * t,
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
    )


def eval_stage2_sector_height(biome, x, yb):
    """
    Exact terrain surface elevation matching TypeScript evalSectorFloorHeight(levelId, x, z)
    with yb = -z_three. Central plaza (|x| <= 17.5, |yb| <= 8.5) stays cleanly flat at 0.
    """
    px = smoothstep(17.0, 22.0, abs(x))
    py = smoothstep(8.2, 13.0, abs(yb))
    out_plaza = max(px, py)

    if biome == "earth":
        cliff_x = smoothstep(35.0, 56.0, abs(x))
        cliff_y = smoothstep(23.5, 48.0, abs(yb))
        cliff = max(cliff_x, cliff_y)
        hills = math.sin(x * 0.13 + yb * 0.09) * 0.85 + math.cos(x * 0.21 - yb * 0.16) * 0.55 + 0.55
        cliff_ridge = cliff * (9.2 + 2.4 * math.sin(x * 0.18) * math.cos(yb * 0.18))
        return out_plaza * (max(0.0, hills) * 1.15 + cliff_ridge)

    if biome == "iss":
        back_rim = smoothstep(9.2, 11.8, abs(yb))
        side_rim = smoothstep(23.5, 26.0, abs(x))
        return max(back_rim, side_rim) * 0.55

    if biome == "moon":
        cliff = max(smoothstep(37.5, 58.0, abs(x)), smoothstep(25.5, 50.0, abs(yb)))
        undul = math.sin(x * 0.14 - yb * 0.11) * 0.72 + math.cos(x * 0.24 + yb * 0.19) * 0.42
        d_c1 = math.hypot(x + 27.0, yb - 16.0)
        crater1 = -0.85 * math.exp(-((d_c1 / 6.0) ** 2)) + 0.65 * math.exp(-(((d_c1 - 7.5) / 2.2) ** 2))
        d_c2 = math.hypot(x - 28.0, yb + 15.0)
        crater2 = -0.85 * math.exp(-((d_c2 / 6.2) ** 2)) + 0.65 * math.exp(-(((d_c2 - 7.8) / 2.2) ** 2))
        rim = cliff * (11.8 + 2.6 * math.sin(x * 0.15 + yb * 0.17))
        return out_plaza * (undul * 0.58 + crater1 + crater2 + rim)

    # Mars Martian Red Canyon ('orion' -> Level 4)
    cliff = max(smoothstep(37.5, 58.0, abs(x)), smoothstep(25.5, 50.0, abs(yb)))
    dune = math.sin(x * 0.12 + yb * 0.17) * 0.78 + math.cos(x * 0.22 - yb * 0.14) * 0.44
    canyon_wall = (
        cliff * 11.2
        + math.sin(cliff * 10.0) * 0.35
        + math.cos(x * 0.16 - yb * 0.16) * cliff * 2.0
    )
    return out_plaza * (dune * 0.68 + canyon_wall)


def add_part_list_to_bmesh(parts_list, bm):
    for p in parts_list:
        bm_sub = bmesh.new()
        ptype = p["type"]
        if ptype == "cylinder":
            bmesh.ops.create_cone(
                bm_sub,
                cap_ends=True,
                cap_tris=True,
                segments=p.get("segments", 10),
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
                u_segments=p.get("u_seg", 12),
                v_segments=p.get("v_seg", 8),
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
                    bm_sub.faces.new((
                        ring_verts[iu][iv],
                        ring_verts[iu2][iv],
                        ring_verts[iu2][iv2],
                        ring_verts[iu][iv2],
                    ))
        else:
            bmesh.ops.create_cube(bm_sub, size=1.0)
            bmesh.ops.scale(bm_sub, vec=p.get("scale", (1, 1, 1)), verts=bm_sub.verts)

        if "rot" in p:
            bmesh.ops.rotate(
                bm_sub, cent=(0, 0, 0), matrix=Euler(p["rot"], "XYZ").to_matrix(), verts=bm_sub.verts
            )
        bmesh.ops.translate(bm_sub, vec=p.get("loc", (0, 0, 0)), verts=bm_sub.verts)
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


def export_astronaut_rover_glb():
    """
    Exports public/models/astronaut_rover.glb (< 180 KB) with:
      - RoverChassis (white/orange Artemis rover body, solar rear wing, open cockpit, roll bar, antenna)
      - RoverHeadlights (front LED headlight bar + warm amber rear taillights)
      - RoverWheelFL, RoverWheelFR, RoverWheelRL, RoverWheelRR (axles centered at origin for smooth Three.js spin)
    """
    mcp_safe_reset_scene()
    m_body = phase1.p_mat()
    m_led = phase1.glow_mat("rover_headlight_led", (0.85, 0.97, 1.0), 1.9)

    C_WHITE = (0.94, 0.96, 0.99)
    C_TITAN = (0.48, 0.54, 0.64)
    C_DARK = (0.14, 0.17, 0.24)
    C_ORANGE = (0.98, 0.45, 0.12)
    C_GOLD = (0.96, 0.76, 0.18)
    C_SOLAR = (0.09, 0.34, 0.82)
    C_CYAN = (0.20, 0.85, 0.98)

    # Note: In Blender Z-up -> glTF Three.js Y-up:
    # +Y_three = +Z_bl, +Z_three (Forward) = -Y_bl
    chassis_parts = [
        # Lower armored belly pan & rocker suspension crossbars
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.0, 0.38), "scale": (1.16, 2.38, 0.20), "bevel": 0.04},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TITAN, "loc": (0, -0.88, 0.36), "scale": (1.52, 0.14, 0.14)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TITAN, "loc": (0, 0.88, 0.36), "scale": (1.52, 0.14, 0.14)},
        # Main stylized sculpted white hood & side fenders
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, -0.82, 0.56), "scale": (1.28, 0.82, 0.26), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, -1.24, 0.50), "scale": (1.14, 0.18, 0.20), "bevel": 0.03},
        # Side skirt rails (left/right) leaving open seat cavity in middle
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.54, 0.10, 0.58), "scale": (0.22, 1.32, 0.30), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.54, 0.10, 0.58), "scale": (0.22, 1.32, 0.30), "bevel": 0.03},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-0.64, 0.10, 0.58), "scale": (0.05, 1.24, 0.12)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0.64, 0.10, 0.58), "scale": (0.05, 1.24, 0.12)},
        # Ergonomic Astronaut Pilot Seat & Front Steering Console
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.12, 0.50), "scale": (0.66, 0.62, 0.10), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, 0.44, 0.80), "scale": (0.58, 0.14, 0.52), "bevel": 0.03},
        {"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, -0.46, 0.72), "scale": (0.48, 0.22, 0.22), "rot": (0.35, 0, 0)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CYAN, "loc": (0, -0.32, 0.84), "radius": 0.15, "depth": 0.05, "rot": (1.15, 0, 0), "segments": 12},
        # Rear Battery Pack, Articulated Roll-Bar Arch & Tilted Solar Wing
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITAN, "loc": (0, 0.94, 0.62), "scale": (1.12, 0.64, 0.34), "bevel": 0.04},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITAN, "loc": (-0.52, 0.60, 0.98), "radius": 0.055, "depth": 0.76, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITAN, "loc": (0.52, 0.60, 0.98), "radius": 0.055, "depth": 0.76, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, 0.60, 1.36), "radius": 0.06, "depth": 1.12, "rot": (0, math.pi * 0.5, 0), "segments": 8},
        # Rear Solar Deck + Gold Trim + Telemetry Dish Antenna
        {"type": "cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (0, 0.96, 0.92), "scale": (1.28, 0.58, 0.05), "rot": (-0.28, 0, 0)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0.96, 0.92), "scale": (0.08, 0.60, 0.06), "rot": (-0.28, 0, 0)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITAN, "loc": (-0.42, 1.08, 1.15), "radius": 0.03, "depth": 0.55, "segments": 8},
        {"type": "cone", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-0.42, 1.02, 1.44), "r1": 0.24, "r2": 0.03, "depth": 0.14, "rot": (0.45, 0, 0), "segments": 12},
    ]
    # Headlight & Taillight emissive faces merged cleanly into RoverChassis (saves 2 draw calls)
    chassis_parts.extend([
        {"type": "bevel_cube", "mat_idx": 1, "loc": (-0.40, -1.32, 0.54), "scale": (0.26, 0.08, 0.11), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 1, "loc": (0.40, -1.32, 0.54), "scale": (0.26, 0.08, 0.11), "bevel": 0.02},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-0.42, 1.28, 0.62), "scale": (0.24, 0.06, 0.09)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0.42, 1.28, 0.62), "scale": (0.24, 0.06, 0.09)},
    ])
    gba.build_mesh_object("RoverChassis", chassis_parts, [m_body, m_led], location=(0, 0, 0), smooth_auto=False)

    # 4 Separately Rotatable Wheels centered cleanly on axle pivots (1 material each -> 4 draw calls total!)
    wheel_positions = {
        "RoverWheelFL": (-0.78, -0.88, 0.36),
        "RoverWheelFR": (0.78, -0.88, 0.36),
        "RoverWheelRL": (-0.78, 0.88, 0.36),
        "RoverWheelRR": (0.78, 0.88, 0.36),
    }
    for w_name, w_loc in wheel_positions.items():
        tire_parts = [
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 0), "radius": 0.36, "depth": 0.24, "rot": (0, math.pi * 0.5, 0), "segments": 16},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITAN, "loc": (0, 0, 0), "radius": 0.22, "depth": 0.26, "rot": (0, math.pi * 0.5, 0), "segments": 12},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_CYAN, "loc": (0, 0, 0), "radius": 0.10, "depth": 0.28, "rot": (0, math.pi * 0.5, 0), "segments": 10},
            {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, 0, 0), "scale": (0.27, 0.07, 0.44)},
            {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, 0, 0), "scale": (0.27, 0.44, 0.07)},
        ]
        gba.build_mesh_object(w_name, tire_parts, [m_body], location=w_loc, smooth_auto=False)

    gba.export_glb("astronaut_rover.glb")
    p = os.path.join(MODELS_DIR, "astronaut_rover.glb")
    return {"file": "astronaut_rover.glb", "size_kb": round(os.path.getsize(p) / 1024.0, 1)}


def build_vast_sector_glb(filename, obj_name, biome):
    mcp_safe_reset_scene()
    m_base = phase1.p_mat()
    glow_rgb = {
        "earth": (0.18, 0.86, 0.52),
        "iss": (0.25, 0.82, 1.0),
        "moon": (0.38, 0.84, 1.0),
        "orion": (0.98, 0.62, 0.24),
    }[biome]
    m_glow = phase1.glow_mat(f"{biome}_glow", glow_rgb, 1.3)
    m_glass = phase1.glass_mat(f"{biome}_glass", (0.38, 0.92, 1.0), 0.34) if biome == "moon" else None

    bm = bmesh.new()
    col_layer = bm.loops.layers.color.new("Col")

    if biome == "iss":
        nx, ny = 36, 18
        width_x, depth_y = 52.0, 24.0
    elif biome == "earth":
        nx, ny = 52, 52
        width_x, depth_y = 128.0, 128.0
    else:
        nx, ny = 52, 52
        width_x, depth_y = 136.0, 136.0

    half_x = width_x * 0.5
    half_y = depth_y * 0.5
    verts = [[None for _ in range(ny)] for _ in range(nx)]
    vcols = {}

    for ix in range(nx):
        x = -half_x + (ix / (nx - 1)) * width_x
        for iy in range(ny):
            yb = -half_y + (iy / (ny - 1)) * depth_y
            z = eval_stage2_sector_height(biome, x, yb)

            if biome == "earth":
                grass_tone = 0.5 + 0.5 * math.sin(x * 0.16 + yb * 0.14)
                c_grass = lerp3((0.24, 0.78, 0.32), (0.42, 0.88, 0.34), grass_tone)
                c_cliff = (0.56, 0.60, 0.66)
                c_walkway = (0.80, 0.77, 0.70)
                c_pad = (0.64, 0.68, 0.74)
                cliff_w = smoothstep(3.0, 7.0, z)
                col = lerp3(c_grass, c_cliff, cliff_w)
                # Bright sunlit sandstone footpath along station row & spawn plaza surrounded immediately by lush green grass
                if abs(x) < 16.5 and abs(yb - 0.5) < 1.9:
                    col = c_walkway
                elif math.hypot(x, yb + 3.0) < 2.6:
                    col = c_pad
                elif abs(yb - 3.4) < 1.8 and abs(x) < 15.8:
                    col = lerp3(c_pad, c_grass, smoothstep(1.1, 1.8, abs(yb - 3.4)))
            elif biome == "iss":
                plate = ((ix // 3 + iy // 3) % 2) * 0.05
                col = (0.44 + plate, 0.52 + plate, 0.64 + plate)
                if abs(yb) < 5.5 and abs(x) < 21.0:
                    col = (0.58 + plate, 0.66 + plate, 0.76 + plate)
            elif biome == "moon":
                noise_t = 0.5 + 0.5 * math.sin(x * 0.22 - yb * 0.18)
                c_reg = lerp3((0.46, 0.50, 0.58), (0.60, 0.64, 0.72), noise_t)
                c_rim = (0.28, 0.32, 0.40)
                col = lerp3(c_reg, c_rim, smoothstep(3.5, 9.5, z))
                if abs(x) < 19.8 and abs(yb) < 7.6:
                    col = (0.38, 0.43, 0.52)
            else:
                # Mars Red Canyon
                dune_t = 0.5 + 0.5 * math.sin(x * 0.18 + yb * 0.22)
                c_sand = lerp3((0.76, 0.32, 0.16), (0.90, 0.48, 0.22), dune_t)
                c_mesa = (0.52, 0.20, 0.12)
                col = lerp3(c_sand, c_mesa, smoothstep(3.2, 9.2, z))
                if abs(x) < 19.8 and abs(yb) < 7.6:
                    col = (0.22, 0.28, 0.38)

            v = bm.verts.new((x, yb, z))
            verts[ix][iy] = v
            vcols[v] = gba.col4(*col, 1.0)

    for ix in range(nx - 1):
        for iy in range(ny - 1):
            v0, v1, v2, v3 = verts[ix][iy], verts[ix + 1][iy], verts[ix + 1][iy + 1], verts[ix][iy + 1]
            if (ix + iy) % 2 == 0:
                f1 = bm.faces.new((v0, v1, v2))
                f2 = bm.faces.new((v0, v2, v3))
            else:
                f1 = bm.faces.new((v0, v1, v3))
                f2 = bm.faces.new((v1, v2, v3))
            for f in (f1, f2):
                f.material_index = 0
                f.smooth = (biome != "iss")
                for loop in f.loops:
                    loop[col_layer] = vcols[loop.vert]

    # Add perimeter under-skirt for ISS deck so edges look crisp in orbit
    if biome == "iss":
        bm.edges.ensure_lookup_table()
        b_edges = [e for e in bm.edges if len(e.link_faces) == 1]
        keel_verts = {}
        for e in b_edges:
            for v in e.verts:
                if v not in keel_verts:
                    keel_verts[v] = bm.verts.new((v.co.x * 0.94, v.co.y * 0.88, v.co.z - 2.4))
        lin_keel = gba.col4(0.10, 0.15, 0.25, 1.0)
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
            f.smooth = False
            for loop in f.loops:
                loop[col_layer] = lin_keel

    # Architectural Promenade Borders & Biome Landmarks
    C_GOLD = (0.95, 0.74, 0.16)
    C_DARK = (0.14, 0.18, 0.28)
    C_STEEL = (0.74, 0.80, 0.88)
    C_SOLAR = (0.10, 0.38, 0.86)

    extras = [
        {"type": "cube", "mat_idx": 1, "loc": (0.0, -7.2, 0.04), "scale": (38.0, 0.22, 0.08)},
        {"type": "cube", "mat_idx": 1, "loc": (0.0, 7.2, 0.04), "scale": (38.0, 0.22, 0.08)},
    ]
    for k in range(8):
        ang = (k / 8.0) * math.pi * 2.0
        px = math.cos(ang) * 1.95
        py = -3.0 + math.sin(ang) * 1.95
        extras.append({
            "type": "cube",
            "mat_idx": 0,
            "vcolor": C_GOLD if k % 2 == 0 else C_DARK,
            "loc": (px, py, 0.045),
            "scale": (0.44, 0.18, 0.05),
            "rot": (0.0, 0.0, ang + math.pi * 0.5),
        })

    if biome == "earth":
        # Tall Red Artemis Gantry Framing Launchpad + Solar Arrays
        for gx in (-13.2, 13.2):
            for pdx in (-0.42, 0.42):
                extras.append({"type": "cube", "mat_idx": 0, "vcolor": (0.88, 0.24, 0.18), "loc": (gx + pdx, 7.8, 2.4), "scale": (0.18, 0.18, 4.4)})
            for cz in (1.2, 2.5, 3.8):
                extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (gx, 7.8, cz), "scale": (0.95, 0.15, 0.12)})
            extras.append({"type": "cube", "mat_idx": 1, "loc": (gx, 7.65, 4.5), "scale": (1.1, 0.25, 0.16)})
        for sx in (-6.5, 6.5):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (sx, 8.4, 0.95), "radius": 0.10, "depth": 1.4, "segments": 8})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, 8.4, 1.75), "scale": (2.4, 0.92, 0.05), "rot": (-0.42, 0, 0)})
    elif biome == "iss":
        for ax in (-12.5, 0.0, 12.5):
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (ax - 1.5, 7.8, 2.1), "scale": (0.22, 0.24, 4.0)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (ax + 1.5, 7.8, 2.1), "scale": (0.22, 0.24, 4.0)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (ax, 7.8, 4.1), "scale": (3.2, 0.30, 0.24)})
            extras.append({"type": "torus", "mat_idx": 1, "loc": (ax, 7.6, 2.4), "major": 1.15, "minor": 0.07, "rot": (math.pi / 2.0, 0, 0), "seg_u": 18, "seg_v": 6})
        for sx in (-17.5, -7.5, 7.5, 17.5):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (sx, 9.0, 1.55), "radius": 0.10, "depth": 2.4, "segments": 8})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx, 9.0, 2.75), "scale": (3.1, 1.15, 0.05), "rot": (-0.38, 0, 0)})
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (sx, 9.0, 2.75), "scale": (0.12, 1.18, 0.07), "rot": (-0.38, 0, 0)})
    elif biome == "moon":
        extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (0.0, 8.6, 0.25), "radius": 2.65, "depth": 0.30, "segments": 18})
        extras.append({"type": "torus", "mat_idx": 1, "loc": (0.0, 8.6, 0.45), "major": 2.55, "minor": 0.08, "seg_u": 24, "seg_v": 6})
        for rot_y in (0.0, math.pi / 3.0, -math.pi / 3.0):
            extras.append({"type": "torus", "mat_idx": 0, "vcolor": C_STEEL, "loc": (0.0, 8.6, 0.45), "major": 2.48, "minor": 0.06, "rot": (math.pi / 2.0, rot_y, 0), "seg_u": 20, "seg_v": 6})
        for cx_crop in (-1.0, 0.0, 1.0):
            extras.append({"type": "cube", "mat_idx": 0, "vcolor": (0.16, 0.84, 0.38), "loc": (cx_crop, 8.6, 0.62), "scale": (0.52, 1.55, 0.30)})
        extras.append({"type": "sphere", "mat_idx": 2 if m_glass else 1, "loc": (0.0, 8.6, 0.45), "radius": 2.42, "u_seg": 16, "v_seg": 10, "scale": (1.0, 1.0, 0.82)})
    else:
        # Mars Red Canyon Comms Relays & Beacon Towers along canyon rim apron
        for rx in (-10.5, 10.5):
            extras.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (rx, 8.4, 1.85), "radius": 0.16, "depth": 3.2, "segments": 8})
            extras.append({"type": "cone", "mat_idx": 1, "loc": (rx, 8.4, 3.65), "r1": 0.82, "r2": 0.05, "depth": 0.42, "rot": (-0.45, 0, 0), "segments": 14})

    add_part_list_to_bmesh(extras, bm)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])

    mesh = bpy.data.meshes.new(f"{obj_name}Mesh")
    bm.to_mesh(mesh)
    bm.free()

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


def build_stage2_live_viewport():
    """Assembles the sunlit Earth Spaceport Valley + parked Space Rover inside the open Blender 5.3 viewport."""
    mcp_safe_reset_scene()
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, "sector1_earth_colony.glb"))
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, "astronaut_rover.glb"))
    for ob in bpy.context.scene.objects:
        if ob.name.startswith("Rover"):
            ob.location.x += 5.5
            ob.location.y -= 6.5

    world = bpy.data.worlds.new("Stage2DaylightWorld")
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.32, 0.65, 0.96, 1.0)
        bg.inputs["Strength"].default_value = 1.15

    sun_data = bpy.data.lights.new("SunKey", type="SUN")
    sun_data.energy = 3.2
    sun_obj = bpy.data.objects.new("SunKey", sun_data)
    sun_obj.rotation_euler = (0.72, -0.35, 0.55)
    bpy.context.scene.collection.objects.link(sun_obj)
    return {"objects": len(bpy.context.scene.objects)}


if __name__ == "__main__":
    rover_info = export_astronaut_rover_glb()
    earth_info = build_vast_sector_glb("sector1_earth_colony.glb", "Sector1EarthColony", "earth")
    iss_info = build_vast_sector_glb("sector2_iss_atrium.glb", "Sector2ISSAtrium", "iss")
    moon_info = build_vast_sector_glb("sector3_lunar_biodome.glb", "Sector3LunarBiodome", "moon")
    mars_info = build_vast_sector_glb("sector4_orion_recovery.glb", "Sector4OrionRecovery", "orion")
    massive_info = massive.export_massive_island_glb()
    viewport_info = build_stage2_live_viewport()

    audit = {
        "rover": rover_info,
        "sectors": [earth_info, iss_info, moon_info, mars_info],
        "massive_island": massive_info,
        "viewport": viewport_info,
    }
    print("STAGE2_BLENDER_MCP_RESULT:", json.dumps(audit))
