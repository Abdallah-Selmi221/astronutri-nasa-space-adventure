"""
AstroNutri — Phase 2 Blender 5.3 Stylized Earth Spaceport & Academy Hub Pipeline
Generates 9 stylized, lightweight (< 350 KB each), grounded (z = 0 base pivot with -0.25..-0.85m
anchor skirts so ZERO props ever float on slopes) PBR .glb assets into public/models/:
  1. earth_kitchen_dome.glb       (Space Nutrition Kitchen Biodome + solar wing + entry arch)
  2. earth_suit_hangar.glb        (Astronaut Suit & Prep Hangar + open recessed bay + SpinRadar)
  3. earth_medical_pavilion.glb   (Medical & Fitness Pavilion + curved clinic wing + MedHaloRing)
  4. earth_launch_complex.glb     (Artemis SLS/Orion Rocket + red umbilical tower + flame trench)
  5. earth_academy_hq.glb         (Main Hub Astronaut Academy HQ + observatory dome + East Garage Bay)
  6. earth_discovery_kiosk.glb    (Side Space-Discovery Learning Kiosk + holo panel + SpinRadar)
  7. earth_tree_round.glb         (Organic multi-lobe rounded canopy tree: TreeTrunk + TreeCanopy)
  8. earth_bush_flower.glb        (Rounded meadow shrub + flowers: BushBody + BushBlossoms)
  9. earth_cliff_layered.glb      (Stratified sandstone/slate boulder cliff cluster: CliffRock)

Run via:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background --python scripts/generate_phase2_earth_assets.py
"""

import json
import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
MODELS_DIR = os.path.join(PROJECT_ROOT, "public", "models")

if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import bpy
import bmesh
from mathutils import Vector

import generate_blender_assets as gba
import generate_space_phase1_models as phase1

gba.OUT_DIR = MODELS_DIR


def pbr_mat(name="earth_pbr", roughness=0.48, metallic=0.14):
    return gba.make_material(
        name,
        (1.0, 1.0, 1.0, 1.0),
        roughness=roughness,
        metallic=metallic,
        use_vertex_color=True,
    )


def perturb_mesh_organic(obj, freq=2.6, amp=0.11, bias_z=0.0):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    for v in bm.verts:
        n = (
            math.sin(v.co.x * freq + v.co.y * (freq * 0.7)) * 0.55
            + math.cos(v.co.y * (freq * 1.1) - v.co.z * freq) * 0.45
        )
        scale = 1.0 + amp * n
        v.co.x *= scale
        v.co.y *= scale
        v.co.z += bias_z * n * 0.35
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    gba.ensure_uvs_box(obj)


def mesh_bounds_and_tris():
    total_tris = 0
    total_verts = 0
    min_z = 999.0
    max_z = -999.0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        obj.data.calc_loop_triangles()
        total_tris += len(obj.data.loop_triangles)
        total_verts += len(obj.data.vertices)
        for v in obj.data.vertices:
            wz = (obj.matrix_world @ v.co).z
            if wz < min_z:
                min_z = wz
            if wz > max_z:
                max_z = wz
    return {
        "vertices": total_verts,
        "triangles": total_tris,
        "min_z": round(min_z, 3),
        "max_z": round(max_z, 3),
    }


def export_and_report(filename):
    gba.export_glb(filename)
    stats = mesh_bounds_and_tris()
    out_path = os.path.join(MODELS_DIR, filename)
    stats["file"] = filename
    stats["size_kb"] = round(os.path.getsize(out_path) / 1024.0, 1)
    return stats


# ==============================================================================
# 1. SPACE NUTRITION KITCHEN BIODOME (earth_kitchen_dome.glb) — ~10m wide
# ==============================================================================
def gen_earth_kitchen_dome():
    gba.reset_scene()
    m_pbr = pbr_mat("kitchen_pbr", roughness=0.44, metallic=0.18)
    m_glow = phase1.glow_mat("kitchen_cyan_glow", (0.20, 0.90, 1.0), 1.3)
    m_warm = phase1.glow_mat("kitchen_warm_glow", (1.0, 0.78, 0.25), 1.25)
    m_glass = phase1.glass_mat("kitchen_dome_glass", (0.50, 0.94, 1.0), 0.32)

    C_CONC = (0.64, 0.68, 0.74)
    C_DARK = (0.14, 0.19, 0.28)
    C_WHITE = (0.95, 0.97, 1.00)
    C_SOLAR = (0.10, 0.36, 0.85)
    C_GOLD = (0.96, 0.74, 0.16)
    C_ORANGE = (0.96, 0.48, 0.14)
    C_LEAF = (0.20, 0.82, 0.36)
    C_PLANTER = (0.48, 0.32, 0.18)

    solid = [
        # Deeply grounded concrete foundation slab & stepped apron (z = -0.45..0.28)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, -0.18), "radius": 5.3, "radius2": 5.1, "depth": 0.56, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, 0, 0.18), "radius": 4.9, "radius2": 4.75, "depth": 0.24, "segments": 16},
        # Front entry ramp (-Y_bl -> +Z_three)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, -4.9, 0.04), "scale": (3.2, 2.2, 0.28), "rot": (-0.12, 0, 0), "bevel": 0.04},
        # Circular perimeter dwarf wall + geodesic dome base ring
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.72), "radius": 4.2, "radius2": 4.15, "depth": 0.88, "segments": 20},
        {"type": "torus", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 1.18), "major": 4.18, "minor": 0.14, "seg_u": 24, "seg_v": 6},
        # Interior kitchen island + hydroponic shelves visible inside dome
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.2, 0.75), "scale": (3.2, 1.4, 0.90), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, -0.52, 0.75), "scale": (2.8, 0.22, 0.72), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_LEAF, "loc": (-1.75, 1.1, 1.45), "scale": (1.5, 0.65, 1.6), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_LEAF, "loc": (1.75, 1.1, 1.45), "scale": (1.5, 0.65, 1.6), "bevel": 0.06},
        # Welcoming arched front airlock portal at -Y
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, -4.05, 1.45), "scale": (2.9, 1.35, 2.3), "bevel": 0.12},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, -4.15, 2.48), "scale": (3.15, 1.45, 0.28), "bevel": 0.05},
        {"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, -4.55, 1.20), "scale": (1.75, 0.45, 1.90)},
        # Front courtyard planters
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLANTER, "loc": (-2.4, -4.45, 0.48), "scale": (1.25, 0.75, 0.45), "bevel": 0.04},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_LEAF, "loc": (-2.4, -4.45, 0.92), "radius": 0.45, "subdiv": 1, "scale": (1.2, 0.9, 0.75)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLANTER, "loc": (2.4, -4.45, 0.48), "scale": (1.25, 0.75, 0.45), "bevel": 0.04},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_LEAF, "loc": (2.4, -4.45, 0.92), "radius": 0.45, "subdiv": 1, "scale": (1.2, 0.9, 0.75)},
        # Crown exhaust vent cupolas
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 5.25), "radius": 0.95, "radius2": 0.70, "depth": 0.55, "segments": 12},
        # Side solar wing pergola annex (+X side)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (4.7, 0, 1.8), "radius": 0.14, "depth": 3.4, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (6.4, 0, 1.8), "radius": 0.14, "depth": 3.4, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (5.55, 0, 3.6), "scale": (2.8, 3.2, 0.12), "rot": (0, -0.28, 0), "bevel": 0.03},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (5.55, 0, 3.65), "scale": (0.14, 3.25, 0.14), "rot": (0, -0.28, 0)},
    ]
    # Structural white geodesic ribs arching over the dome
    for ang_deg in (0, 45, 90, 135):
        rad = math.radians(ang_deg)
        solid.append({
            "type": "torus",
            "mat_idx": 0,
            "vcolor": C_WHITE,
            "loc": (0, 0, 1.18),
            "major": 4.10,
            "minor": 0.10,
            "rot": (math.pi * 0.5, 0, rad),
            "seg_u": 24,
            "seg_v": 6,
        })

    gba.build_mesh_object("KitchenDomeBody", solid, [m_pbr], smooth_auto=False)

    # Glass Biodome canopy
    gba.build_mesh_object(
        "KitchenDomeGlass",
        [
            {"type": "sphere", "mat_idx": 0, "loc": (0, 0, 1.15), "radius": 4.02, "u_seg": 22, "v_seg": 14, "scale": (1.0, 1.0, 0.98)},
        ],
        [m_glass],
        smooth_auto=True,
    )

    # Emissive sign & lighting bands
    gba.build_mesh_object(
        "KitchenDomeGlow",
        [
            {"type": "torus", "mat_idx": 0, "loc": (0, 0, 1.24), "major": 4.24, "minor": 0.06, "seg_u": 24, "seg_v": 6},
            {"type": "cube", "mat_idx": 0, "loc": (0, -4.74, 2.25), "scale": (1.5, 0.08, 0.24)},
            {"type": "cube", "mat_idx": 1, "loc": (0, -4.55, 1.32), "scale": (1.35, 0.12, 1.45)},
        ],
        [m_glow, m_warm],
        smooth_auto=False,
    )

    return export_and_report("earth_kitchen_dome.glb")


# ==============================================================================
# 2. ASTRONAUT SUIT & PREP HANGAR (earth_suit_hangar.glb) — ~12m x 10m
# ==============================================================================
def gen_earth_suit_hangar():
    gba.reset_scene()
    m_pbr = pbr_mat("hangar_pbr", roughness=0.45, metallic=0.26)
    m_cyan = phase1.glow_mat("hangar_cyan", (0.20, 0.88, 1.0), 1.4)
    m_amber = phase1.glow_mat("hangar_amber", (1.0, 0.62, 0.14), 1.25)

    C_CONC = (0.58, 0.62, 0.68)
    C_DARK = (0.14, 0.18, 0.26)
    C_WHITE = (0.94, 0.96, 0.99)
    C_NAVY = (0.16, 0.28, 0.52)
    C_ORANGE = (0.98, 0.44, 0.12)
    C_STEEL = (0.72, 0.78, 0.86)

    solid = [
        # Grounded heavy concrete hangar apron (z = -0.45..0.28)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, -0.18), "scale": (12.2, 10.6, 0.56), "bevel": 0.08},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, 0, 0.16), "scale": (11.6, 10.0, 0.24), "bevel": 0.06},
        # Front vehicle/astronaut entry ramp with warning hazard trim
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, -5.8, 0.04), "scale": (6.2, 2.2, 0.26), "rot": (-0.10, 0, 0), "bevel": 0.04},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-2.85, -5.8, 0.14), "scale": (0.28, 2.1, 0.08), "rot": (-0.10, 0, 0)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (2.85, -5.8, 0.14), "scale": (0.28, 2.1, 0.08), "rot": (-0.10, 0, 0)},
        # Side & rear hangar walls leaving open bay front at -Y
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-4.4, 0.2, 2.25), "scale": (1.35, 8.6, 4.1), "bevel": 0.08},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (4.4, 0.2, 2.25), "scale": (1.35, 8.6, 4.1), "bevel": 0.08},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_NAVY, "loc": (0, 3.8, 2.55), "scale": (8.6, 1.35, 4.6), "bevel": 0.08},
        # Recessed suit diagnostic racks inside open hangar bay
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (-2.4, 2.1, 1.45), "scale": (1.5, 0.75, 2.4), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-2.4, 1.9, 1.55), "scale": (0.72, 0.45, 1.45), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (2.4, 2.1, 1.45), "scale": (1.5, 0.75, 2.4), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (2.4, 1.9, 1.55), "scale": (0.72, 0.45, 1.45), "bevel": 0.06},
        # Arched Hangar Barrel Roof + Exterior Steel Ribs + NASA Orange Accent Strip
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.1, 4.15), "radius": 4.95, "depth": 8.6, "rot": (math.pi * 0.5, 0, 0), "scale": (1.05, 0.54, 1.0), "segments": 20},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_NAVY, "loc": (0, -4.18, 4.15), "radius": 5.05, "depth": 0.52, "rot": (math.pi * 0.5, 0, 0), "scale": (1.06, 0.55, 1.0), "segments": 20},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-4.5, 0.1, 2.8), "scale": (1.42, 8.7, 0.35), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (4.5, 0.1, 2.8), "scale": (1.42, 8.7, 0.35), "bevel": 0.03},
        # Side roof steel buttress ribs
        *[{"type": "bevel_cube", "mat_idx": 0, "vcolor": C_STEEL, "loc": (0, ry, 4.30), "scale": (10.5, 0.38, 4.9), "bevel": 0.05} for ry in (-2.4, 0.2, 2.6) if False],
    ]
    for ry in (-2.4, 0.2, 2.6):
        solid.append({
            "type": "cylinder",
            "mat_idx": 0,
            "vcolor": C_STEEL,
            "loc": (0, ry, 4.18),
            "radius": 5.10,
            "depth": 0.36,
            "rot": (math.pi * 0.5, 0, 0),
            "scale": (1.06, 0.56, 1.0),
            "segments": 18,
        })
    # Roof comms pylon
    solid.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_STEEL, "loc": (-3.0, 1.2, 7.1), "radius": 0.20, "depth": 1.4, "segments": 8})

    gba.build_mesh_object("SuitHangarBody", solid, [m_pbr], smooth_auto=False)

    # Interior cyan suit diagnostic arch + hangar door beacons
    gba.build_mesh_object(
        "SuitHangarGlow",
        [
            {"type": "cube", "mat_idx": 0, "loc": (0, 2.15, 2.35), "scale": (2.2, 0.16, 2.6)},
            {"type": "cube", "mat_idx": 0, "loc": (-3.75, -4.35, 2.35), "scale": (0.18, 0.18, 3.4)},
            {"type": "cube", "mat_idx": 0, "loc": (3.75, -4.35, 2.35), "scale": (0.18, 0.18, 3.4)},
            {"type": "cube", "mat_idx": 1, "loc": (0, -4.45, 4.05), "scale": (4.4, 0.22, 0.32)},
        ],
        [m_cyan, m_amber],
        smooth_auto=False,
    )

    # Rotating Radar Dish (preserved animated node name SpinRadar)
    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.18), "r1": 0.16, "r2": 1.15, "depth": 0.42, "rot": (0.55, 0, 0), "segments": 14},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, -0.15, 0.42), "radius": 0.08, "depth": 0.52, "rot": (0.55, 0, 0), "segments": 8},
        ],
        [m_pbr],
        location=(-3.0, 1.2, 7.75),
        smooth_auto=False,
    )

    return export_and_report("earth_suit_hangar.glb")


# ==============================================================================
# 3. MEDICAL & FITNESS PAVILION (earth_medical_pavilion.glb) — ~11m x 9.5m
# ==============================================================================
def gen_earth_medical_pavilion():
    gba.reset_scene()
    m_pbr = pbr_mat("med_pbr", roughness=0.40, metallic=0.16)
    m_mint = phase1.glow_mat("med_mint_glow", (0.18, 0.92, 0.65), 1.3)
    m_cyan = phase1.glow_mat("med_cyan_glow", (0.20, 0.86, 1.0), 1.3)
    m_glass = phase1.glass_mat("med_glass", (0.45, 0.92, 1.0), 0.35)

    C_CONC = (0.64, 0.70, 0.74)
    C_DARK = (0.14, 0.20, 0.28)
    C_WHITE = (0.96, 0.98, 1.00)
    C_MINT = (0.12, 0.78, 0.56)
    C_RED = (0.94, 0.24, 0.28)

    solid = [
        # Grounded clinic pad (z = -0.45..0.28)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, -0.18), "radius": 5.4, "radius2": 5.2, "depth": 0.56, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, 0, 0.16), "radius": 5.05, "radius2": 4.9, "depth": 0.24, "segments": 18},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, -5.0, 0.04), "scale": (3.8, 2.2, 0.26), "rot": (-0.10, 0, 0), "bevel": 0.04},
        # Curved main biomedical hall + side fitness wing
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.1, 0.4, 2.05), "scale": (6.6, 5.4, 3.6), "bevel": 0.25},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (2.9, 0.5, 1.85), "radius": 2.6, "depth": 3.2, "segments": 18},
        # Roof overhang + mint green trim band
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.2, 0.3, 4.05), "scale": (9.4, 6.2, 0.46), "bevel": 0.14},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_MINT, "loc": (0.2, 0.3, 3.85), "scale": (9.6, 6.4, 0.22), "bevel": 0.04},
        # Front curved clinic awning + bold NASA medical cross crest
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.1, -3.15, 1.85), "scale": (3.4, 2.2, 2.8), "bevel": 0.12},
        {"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (-1.1, -4.15, 1.32), "scale": (1.85, 0.40, 2.15)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_RED, "loc": (-1.1, -4.32, 3.65), "scale": (1.10, 0.22, 0.34)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_RED, "loc": (-1.1, -4.32, 3.65), "scale": (0.34, 0.22, 1.10)},
        # Rooftop Helipad/Medical Sensor Deck
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (2.8, 0.4, 4.40), "radius": 2.0, "depth": 0.24, "segments": 18},
    ]
    gba.build_mesh_object("MedicalPavilionBody", solid, [m_pbr], smooth_auto=False)

    # Panoramic glass windows + fitness annex dome
    gba.build_mesh_object(
        "MedicalPavilionGlass",
        [
            {"type": "bevel_cube", "mat_idx": 0, "loc": (-1.1, -2.30, 2.05), "scale": (5.2, 0.24, 1.65), "bevel": 0.04},
            {"type": "sphere", "mat_idx": 0, "loc": (2.9, 0.5, 3.45), "radius": 2.35, "u_seg": 16, "v_seg": 10, "scale": (1.0, 1.0, 0.65)},
        ],
        [m_glass],
        smooth_auto=True,
    )

    gba.build_mesh_object(
        "MedicalPavilionGlow",
        [
            {"type": "cube", "mat_idx": 0, "loc": (-1.1, -4.25, 2.75), "scale": (2.6, 0.14, 0.22)},
            {"type": "cube", "mat_idx": 1, "loc": (-1.1, -4.10, 1.32), "scale": (1.45, 0.12, 1.75)},
            {"type": "torus", "mat_idx": 0, "loc": (2.8, 0.4, 4.54), "major": 1.65, "minor": 0.08, "seg_u": 24, "seg_v": 6},
        ],
        [m_mint, m_cyan],
        smooth_auto=False,
    )

    # Animated Floating Scan Halo Ring
    gba.build_mesh_object(
        "MedHaloRing",
        [
            {"type": "torus", "mat_idx": 0, "loc": (0, 0, 0), "major": 1.35, "minor": 0.09, "seg_u": 24, "seg_v": 8},
        ],
        [m_cyan],
        location=(2.8, 0.4, 5.25),
        smooth_auto=True,
    )

    return export_and_report("earth_medical_pavilion.glb")


# ==============================================================================
# 4. ARTEMIS ROCKET LAUNCHPAD COMPLEX (earth_launch_complex.glb) — ~14m x 21m
# ==============================================================================
def gen_earth_launch_complex():
    gba.reset_scene()
    m_pbr = pbr_mat("launch_pbr", roughness=0.42, metallic=0.28)
    m_amber = phase1.glow_mat("launch_amber", (1.0, 0.62, 0.16), 1.45)
    m_cyan = phase1.glow_mat("launch_cyan", (0.20, 0.88, 1.0), 1.35)

    C_CONC = (0.52, 0.56, 0.62)
    C_DARK = (0.14, 0.17, 0.24)
    C_TOWER = (0.86, 0.22, 0.16)
    C_ORANGE = (0.94, 0.44, 0.12)
    C_WHITE = (0.96, 0.98, 1.00)
    C_SILVER = (0.76, 0.80, 0.88)

    solid = [
        # Heavy concrete blast complex base extending z = -0.55..0.75
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, -0.20), "radius": 7.4, "radius2": 7.0, "depth": 0.72, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, 0, 0.42), "radius": 6.6, "radius2": 6.1, "depth": 0.66, "segments": 8},
        # Front entry ramp facing road (-Y_bl -> +Z_three)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, -6.6, 0.22), "scale": (4.6, 3.2, 0.64), "rot": (-0.18, 0, 0), "bevel": 0.06},
        # Blast trench walls & launch mount table
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (-1.85, 0, 0.92), "scale": (1.1, 3.6, 0.65), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (1.85, 0, 0.92), "scale": (1.1, 3.6, 0.65), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, 0, 1.10), "scale": (3.1, 3.1, 0.55), "bevel": 0.04},
    ]

    # Towering Red-Steel Artemis Umbilical Gantry at X = -3.6
    gx, gy = -3.6, 0.3
    for px in (-0.85, 0.85):
        for py in (-0.85, 0.85):
            solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (gx + px, gy + py, 9.2), "scale": (0.28, 0.28, 17.2)})
    for tz in (2.8, 5.6, 8.4, 11.2, 14.0, 16.8):
        solid.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (gx, gy, tz), "scale": (2.15, 2.15, 0.28), "bevel": 0.03})
        # Diagonal bracing bar on front face
        solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (gx, gy - 0.85, tz - 1.35), "scale": (0.14, 0.14, 2.8), "rot": (0, 0.56, 0)})
    # Crew access bridge & umbilical arms reaching toward rocket
    solid.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.75, 0.2, 12.6), "scale": (2.6, 0.72, 0.52), "bevel": 0.04})
    solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-1.75, 0.2, 8.6), "scale": (2.4, 0.32, 0.24)})
    # Lightning protection spire on tower top
    solid.append({"type": "cone", "mat_idx": 0, "vcolor": C_SILVER, "loc": (gx, gy, 19.2), "r1": 0.22, "r2": 0.02, "depth": 2.8, "segments": 6})

    # Full Artemis SLS + Orion Spacecraft standing on Launch Mount!
    solid.extend([
        # Core orange LH2/LOX tank stage
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0, 0, 6.4), "radius": 1.02, "depth": 9.6, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 1.5), "radius": 1.05, "depth": 0.6, "segments": 18},
        # Twin White Solid Rocket Boosters (SRBs)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.42, 0, 5.2), "radius": 0.42, "depth": 7.6, "segments": 14},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.42, 0, 9.55), "r1": 0.42, "r2": 0.04, "depth": 1.15, "segments": 14},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (-1.42, 0, 1.38), "radius": 0.45, "radius2": 0.36, "depth": 0.50, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (1.42, 0, 5.2), "radius": 0.42, "depth": 7.6, "segments": 14},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (1.42, 0, 9.55), "r1": 0.42, "r2": 0.04, "depth": 1.15, "segments": 14},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (1.42, 0, 1.38), "radius": 0.45, "radius2": 0.36, "depth": 0.50, "segments": 12},
        # Interstage + ICPS + Orion Service Module + Crew Capsule + Launch Abort Tower
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 12.1), "radius": 0.96, "radius2": 0.72, "depth": 1.8, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 13.5), "radius": 0.70, "depth": 1.0, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 14.7), "r1": 0.72, "r2": 0.24, "depth": 1.45, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 16.5), "r1": 0.22, "r2": 0.03, "depth": 2.2, "segments": 10},
    ])

    # 4 Perimeter Floodlight Masts
    glows = [
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.80), "major": 5.5, "minor": 0.09, "seg_u": 24, "seg_v": 6},
        {"type": "cube", "mat_idx": 0, "loc": (gx, gy, 17.85), "scale": (1.6, 1.6, 0.22)},
    ]
    for lx, ly in ((-5.2, -4.6), (5.2, -4.6), (-5.2, 4.6), (5.2, 4.6)):
        solid.append({"type": "cylinder", "mat_idx": 0, "vcolor": C_SILVER, "loc": (lx, ly, 2.2), "radius": 0.14, "depth": 3.4, "segments": 8})
        glows.append({"type": "bevel_cube", "mat_idx": 0, "loc": (lx, ly, 4.0), "scale": (0.75, 0.42, 0.36), "bevel": 0.04})

    gba.build_mesh_object("LaunchComplexBody", solid, [m_pbr], smooth_auto=False)
    gba.build_mesh_object("LaunchComplexGlow", glows, [m_amber, m_cyan], smooth_auto=False)

    return export_and_report("earth_launch_complex.glb")


# ==============================================================================
# 5. MAIN HUB ASTRONAUT ACADEMY HQ & EAST VEHICLE GARAGE (earth_academy_hq.glb)
# ==============================================================================
def gen_earth_academy_hq():
    gba.reset_scene()
    m_pbr = pbr_mat("academy_pbr", roughness=0.40, metallic=0.20)
    m_cyan = phase1.glow_mat("academy_cyan", (0.20, 0.88, 1.0), 1.35)
    m_gold = phase1.glow_mat("academy_gold", (1.0, 0.78, 0.18), 1.3)
    m_glass = phase1.glass_mat("academy_glass", (0.45, 0.90, 1.0), 0.34)

    C_CONC = (0.64, 0.68, 0.74)
    C_DARK = (0.14, 0.18, 0.28)
    C_WHITE = (0.95, 0.97, 1.00)
    C_BLUE = (0.14, 0.46, 0.88)
    C_GOLD = (0.96, 0.74, 0.16)
    C_ORANGE = (0.96, 0.48, 0.14)

    solid = [
        # Grounded broad terrace slab (z = -0.45..0.32) spanning HQ + East Garage
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (2.2, 0, -0.18), "scale": (19.6, 12.6, 0.60), "bevel": 0.10},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (2.2, 0, 0.20), "scale": (18.8, 11.8, 0.28), "bevel": 0.08},
        # Front Grand Steps facing +Z_three (-Y_bl)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_CONC, "loc": (-1.2, -6.2, 0.08), "scale": (6.4, 2.0, 0.28), "rot": (-0.10, 0, 0), "bevel": 0.04},
        # Main Academy Hall (centered around x = -1.2)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.2, 0.6, 2.6), "scale": (10.8, 7.6, 4.8), "bevel": 0.28},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BLUE, "loc": (-1.2, 0.6, 5.15), "scale": (11.4, 8.2, 0.42), "bevel": 0.10},
        # Side arched wings
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-6.6, 0.8, 2.2), "radius": 2.4, "depth": 3.8, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BLUE, "loc": (-6.6, 0.8, 4.15), "radius": 2.55, "depth": 0.34, "segments": 16},
        # Central entrance colonnade portico + AstroNutri crest pillars
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.2, -3.5, 2.1), "scale": (5.2, 1.8, 3.6), "bevel": 0.12},
        {"type": "cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (-1.2, -4.3, 1.5), "scale": (2.6, 0.4, 2.4)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-3.3, -4.5, 2.0), "radius": 0.30, "depth": 3.6, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.9, -4.5, 2.0), "radius": 0.30, "depth": 3.6, "segments": 12},
        # Observatory Planetarium Crown Base
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-1.2, 0.8, 5.7), "radius": 3.3, "depth": 0.8, "segments": 20},
        # Integrated East Vehicle Garage Bay (centered at x = +8.6)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (8.6, 2.6, 1.9), "scale": (5.6, 1.1, 3.4), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (11.1, -0.4, 1.9), "scale": (0.9, 6.2, 3.4), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (8.6, -0.5, 3.85), "scale": (6.2, 6.8, 0.45), "bevel": 0.08},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (8.6, -3.7, 0.36), "scale": (4.4, 0.35, 0.06)},
        # Roof antenna spire
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BLUE, "loc": (-6.6, 0.8, 5.1), "radius": 0.16, "depth": 1.6, "segments": 8},
    ]
    gba.build_mesh_object("AcademyHQBody", solid, [m_pbr], smooth_auto=False)

    gba.build_mesh_object(
        "AcademyHQGlass",
        [
            {"type": "sphere", "mat_idx": 0, "loc": (-1.2, 0.8, 5.95), "radius": 3.15, "u_seg": 20, "v_seg": 12, "scale": (1.0, 1.0, 0.88)},
            {"type": "bevel_cube", "mat_idx": 0, "loc": (-1.2, -3.15, 2.6), "scale": (8.2, 0.22, 1.8), "bevel": 0.04},
        ],
        [m_glass],
        smooth_auto=True,
    )

    gba.build_mesh_object(
        "AcademyHQGlow",
        [
            {"type": "torus", "mat_idx": 1, "loc": (-1.2, 0.8, 5.90), "major": 3.35, "minor": 0.10, "seg_u": 24, "seg_v": 6},
            {"type": "cube", "mat_idx": 0, "loc": (-1.2, -4.32, 1.50), "scale": (2.2, 0.12, 2.1)},
            {"type": "cube", "mat_idx": 1, "loc": (-1.2, -4.50, 3.45), "scale": (4.2, 0.18, 0.28)},
            {"type": "cube", "mat_idx": 0, "loc": (8.6, -3.85, 3.85), "scale": (5.2, 0.16, 0.18)},
        ],
        [m_cyan, m_gold],
        smooth_auto=False,
    )

    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.20), "r1": 0.16, "r2": 1.05, "depth": 0.40, "rot": (0.5, 0, 0), "segments": 14},
        ],
        [m_pbr],
        location=(-6.6, 0.8, 5.95),
        smooth_auto=False,
    )

    return export_and_report("earth_academy_hq.glb")


# ==============================================================================
# 6. SIDE SPACE-DISCOVERY LEARNING KIOSK (earth_discovery_kiosk.glb)
# ==============================================================================
def gen_earth_discovery_kiosk():
    gba.reset_scene()
    m_pbr = pbr_mat("kiosk_pbr", roughness=0.38, metallic=0.22)
    m_cyan = phase1.glow_mat("kiosk_cyan", (0.20, 0.90, 1.0), 1.45)
    m_gold = phase1.glow_mat("kiosk_gold", (1.0, 0.80, 0.20), 1.35)

    C_CONC = (0.60, 0.66, 0.72)
    C_DARK = (0.14, 0.20, 0.30)
    C_WHITE = (0.95, 0.97, 1.00)
    C_BLUE = (0.12, 0.52, 0.92)
    C_GOLD = (0.96, 0.74, 0.16)

    solid = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, -0.15), "radius": 1.65, "radius2": 1.55, "depth": 0.45, "segments": 14},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONC, "loc": (0, 0, 0.12), "radius": 1.45, "radius2": 1.40, "depth": 0.18, "segments": 14},
        # Curved blue/white info booth frame
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BLUE, "loc": (0, 0.25, 1.35), "scale": (2.15, 0.58, 2.15), "bevel": 0.08},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.15, 2.75), "scale": (2.55, 1.55, 0.32), "rot": (-0.12, 0, 0), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, -0.25, 0.95), "scale": (1.55, 0.52, 0.85), "bevel": 0.04},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-0.95, -0.05, 1.45), "scale": (0.16, 0.16, 2.35)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0.95, -0.05, 1.45), "scale": (0.16, 0.16, 2.35)},
    ]
    gba.build_mesh_object("DiscoveryKioskBody", solid, [m_pbr], smooth_auto=False)

    gba.build_mesh_object(
        "DiscoveryKioskGlow",
        [
            {"type": "cube", "mat_idx": 0, "loc": (0, -0.06, 1.72), "scale": (1.52, 0.08, 1.05)},
            {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.22), "major": 1.38, "minor": 0.06, "seg_u": 20, "seg_v": 6},
        ],
        [m_cyan, m_gold],
        smooth_auto=False,
    )

    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "icosphere", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0, 0.35), "radius": 0.28, "subdiv": 1},
            {"type": "torus", "mat_idx": 0, "vcolor": C_BLUE, "loc": (0, 0, 0.35), "major": 0.44, "minor": 0.05, "rot": (0.45, 0.3, 0), "seg_u": 16, "seg_v": 6},
        ],
        [m_pbr],
        location=(0, 0.15, 3.0),
        smooth_auto=False,
    )

    return export_and_report("earth_discovery_kiosk.glb")


# ==============================================================================
# 7. SCULPTED MULTI-CANOPY ROUNDED TREE (earth_tree_round.glb) — NO CONES!
#    Two single-material objects: TreeTrunk & TreeCanopy (white tintable base)
# ==============================================================================
def gen_earth_tree_round():
    gba.reset_scene()
    m_trunk = pbr_mat("tree_trunk_pbr", roughness=0.86, metallic=0.0)
    m_canopy = pbr_mat("tree_canopy_pbr", roughness=0.70, metallic=0.0)

    C_BARK = (0.46, 0.27, 0.14)
    C_BARK_ROOT = (0.36, 0.20, 0.10)
    C_WHITE_SHADE_HI = (1.00, 1.00, 1.00)
    C_WHITE_SHADE_LO = (0.86, 0.88, 0.86)

    trunk_parts = [
        # Root flare buried down to z = -0.38 so trees never float on hillside slopes!
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK_ROOT, "loc": (0, 0, 0.12), "radius": 0.44, "radius2": 0.26, "depth": 1.00, "segments": 8},
        # Main slightly curved trunk
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK, "loc": (0.04, 0.02, 1.35), "radius": 0.26, "radius2": 0.18, "depth": 1.85, "rot": (0.05, -0.04, 0), "segments": 8},
        # Organic upper forked limbs
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK, "loc": (-0.38, -0.18, 2.45), "radius": 0.14, "radius2": 0.09, "depth": 1.15, "rot": (0.35, -0.52, 0), "segments": 7},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK, "loc": (0.40, 0.20, 2.52), "radius": 0.14, "radius2": 0.09, "depth": 1.20, "rot": (-0.32, 0.50, 0), "segments": 7},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK, "loc": (0.02, 0.36, 2.58), "radius": 0.13, "radius2": 0.08, "depth": 1.10, "rot": (-0.48, 0.08, 0), "segments": 7},
    ]
    gba.build_mesh_object("TreeTrunk", trunk_parts, [m_trunk], smooth_auto=True)

    # Multi-lobe rounded canopy puffs (ZERO cones!)
    canopy_parts = [
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_HI, "loc": (0.0, 0.0, 3.65), "radius": 1.25, "subdiv": 2, "scale": (1.15, 1.12, 0.94)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_LO, "loc": (-0.98, -0.55, 3.05), "radius": 0.98, "subdiv": 2, "scale": (1.12, 1.05, 0.88)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_LO, "loc": (0.96, -0.45, 3.12), "radius": 0.94, "subdiv": 2, "scale": (1.10, 1.08, 0.88)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_LO, "loc": (-0.52, 0.92, 3.18), "radius": 0.92, "subdiv": 2, "scale": (1.06, 1.12, 0.90)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_LO, "loc": (0.72, 0.78, 3.22), "radius": 0.90, "subdiv": 2, "scale": (1.08, 1.05, 0.88)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_WHITE_SHADE_HI, "loc": (0.12, -0.15, 4.45), "radius": 0.86, "subdiv": 2, "scale": (1.08, 1.06, 0.85)},
    ]
    canopy_obj = gba.build_mesh_object("TreeCanopy", canopy_parts, [m_canopy], smooth_auto=True)
    perturb_mesh_organic(canopy_obj, freq=3.2, amp=0.075, bias_z=0.14)

    return export_and_report("earth_tree_round.glb")


# ==============================================================================
# 8. FLOWERING MEADOW BUSH (earth_bush_flower.glb) — BushBody + BushBlossoms
# ==============================================================================
def gen_earth_bush_flower():
    gba.reset_scene()
    m_bush = pbr_mat("bush_body_pbr", roughness=0.76, metallic=0.0)
    m_flower = pbr_mat("bush_flower_pbr", roughness=0.45, metallic=0.0)

    C_GREEN_A = (0.18, 0.74, 0.28)
    C_GREEN_B = (0.28, 0.82, 0.34)
    C_WHITE = (1.0, 1.0, 1.0)

    body_parts = [
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_GREEN_A, "loc": (0.0, 0.0, 0.32), "radius": 0.68, "subdiv": 2, "scale": (1.18, 1.15, 0.92)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_GREEN_B, "loc": (-0.48, -0.22, 0.22), "radius": 0.48, "subdiv": 1, "scale": (1.1, 1.05, 0.85)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_GREEN_B, "loc": (0.46, 0.20, 0.24), "radius": 0.46, "subdiv": 1, "scale": (1.08, 1.1, 0.85)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_GREEN_A, "loc": (0.08, -0.45, 0.20), "radius": 0.44, "subdiv": 1, "scale": (1.05, 1.05, 0.82)},
    ]
    bush_obj = gba.build_mesh_object("BushBody", body_parts, [m_bush], smooth_auto=True)
    perturb_mesh_organic(bush_obj, freq=5.5, amp=0.08)

    # Clustered blossom florets on upper half
    flower_parts = []
    for k in range(12):
        ang = (k / 12.0) * math.pi * 2.0
        rad = 0.28 + (k % 3) * 0.22
        fx = math.cos(ang) * rad
        fy = math.sin(ang) * rad
        fz = 0.68 - (rad * 0.32) + (k % 2) * 0.08
        flower_parts.append({
            "type": "icosphere",
            "mat_idx": 0,
            "vcolor": C_WHITE,
            "loc": (fx, fy, fz),
            "radius": 0.11,
            "subdiv": 1,
            "scale": (1.15, 1.15, 0.72),
        })
    gba.build_mesh_object("BushBlossoms", flower_parts, [m_flower], smooth_auto=False)

    return export_and_report("earth_bush_flower.glb")


# ==============================================================================
# 9. LAYERED GROUNDED CLIFF CLUSTER (earth_cliff_layered.glb)
# ==============================================================================
def gen_earth_cliff_layered():
    gba.reset_scene()
    m_cliff = pbr_mat("cliff_pbr", roughness=0.88, metallic=0.04)

    C_BASE_SLATE = (0.44, 0.48, 0.54)
    C_MID_SAND = (0.68, 0.58, 0.48)
    C_TOP_MOSS = (0.28, 0.68, 0.32)

    parts = [
        # Deep anchor boulders sunk to z = -0.85 so edges never float on slopes
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASE_SLATE, "loc": (0.0, 0.0, 0.35), "radius": 2.35, "radius2": 1.65, "depth": 2.40, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_MID_SAND, "loc": (-0.6, 0.35, 1.10), "radius": 1.60, "radius2": 1.15, "depth": 2.10, "segments": 7},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_MID_SAND, "loc": (1.15, -0.45, 0.65), "radius": 1.45, "radius2": 0.95, "depth": 1.85, "segments": 7},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_TOP_MOSS, "loc": (-0.25, 0.15, 2.05), "radius": 1.05, "subdiv": 1, "scale": (1.35, 1.15, 0.46)},
    ]
    cliff_obj = gba.build_mesh_object("CliffRock", parts, [m_cliff], smooth_auto=False)
    perturb_mesh_organic(cliff_obj, freq=1.9, amp=0.14, bias_z=0.12)

    return export_and_report("earth_cliff_layered.glb")


if __name__ == "__main__":
    results = [
        gen_earth_kitchen_dome(),
        gen_earth_suit_hangar(),
        gen_earth_medical_pavilion(),
        gen_earth_launch_complex(),
        gen_earth_academy_hq(),
        gen_earth_discovery_kiosk(),
        gen_earth_tree_round(),
        gen_earth_bush_flower(),
        gen_earth_cliff_layered(),
    ]
    print("PHASE2_BLENDER_ASSETS:", json.dumps(results, indent=2))
