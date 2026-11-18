"""
AstroNutri — Phase 1 Blender 5.3 Space & Indoor Prop 3D Asset Generator
Generates 9 stylized, lightweight (< 200 KB, minimal draw calls) PBR .glb assets:
  Nodes:
    1. public/models/earth_launchpad.glb      (Rocket on concrete flame-trench launch complex + red umbilical tower)
    2. public/models/iss_orbit_station.glb    (ISS core cylindrical modules + cupola + 4 articulated blue/gold solar wings)
    3. public/models/lunar_biodome_base.glb   (Cratered Shackleton pad + geodesic hydroponic glass biodome + rover + dish)
    4. public/models/orion_reentry_capsule.glb (PICA-X heat-shielded conical capsule + crew windows + parachutes/canopies)
  Indoor Station Props:
    5. public/models/prop_kitchen_counter.glb (Galley prep console + mounted Sinai honey & food pouches)
    6. public/models/prop_suit_rack.glb       (Titanium SPACE-FIT X suit harness rack + glowing display)
    7. public/models/prop_medical_pod.glb     (Biometric scanner pod + arched sensor halo + vitals screen)
    8. public/models/prop_hydro_rack.glb      (Multi-tier hydroponic grow tower + LED lights + crisp rosettes)
    9. public/models/prop_storm_console.glb   (Curved solar storm shield command desk + telemetry screens + dish)

Run via:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background --python scripts/generate_space_phase1_models.py
"""

import math
import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

import bpy
from generate_blender_assets import (
    reset_scene,
    make_material,
    build_mesh_object,
    export_glb,
)


def p_mat():
    return make_material(
        "space_pbr",
        (1.0, 1.0, 1.0, 1.0),
        roughness=0.45,
        metallic=0.18,
        use_vertex_color=True,
    )


def glow_mat(name="space_glow", rgb=(0.22, 0.85, 1.0), strength=1.25):
    return make_material(
        name,
        (rgb[0], rgb[1], rgb[2], 1.0),
        roughness=0.18,
        metallic=0.0,
        emission_color=(rgb[0], rgb[1], rgb[2], 1.0),
        emission_strength=strength,
    )


def glass_mat(name="space_glass", rgb=(0.45, 0.90, 1.0), alpha=0.38):
    return make_material(
        name,
        (rgb[0], rgb[1], rgb[2], 1.0),
        roughness=0.12,
        metallic=0.08,
        emission_color=(rgb[0] * 0.4, rgb[1] * 0.6, rgb[2], 1.0),
        emission_strength=0.35,
        alpha=alpha,
    )


# ------------------------------------------------------------------------------
# 1. EARTH LAUNCHPAD (earth_launchpad.glb) — Vertical +Z up in Blender -> +Y in GLB
# ------------------------------------------------------------------------------
def gen_earth_launchpad():
    reset_scene()
    m_base = p_mat()
    m_cyan = glow_mat("pad_cyan", (0.18, 0.85, 1.0), 1.4)
    m_flame = glow_mat("pad_flame", (1.0, 0.55, 0.12), 1.6)

    C_CONCRETE = (0.36, 0.40, 0.48)
    C_DARK = (0.14, 0.18, 0.24)
    C_TOWER = (0.86, 0.24, 0.18)
    C_TANK = (0.90, 0.46, 0.12)
    C_WHITE = (0.94, 0.96, 0.99)
    C_SILVER = (0.72, 0.78, 0.84)

    parts = [
        # Layered octagonal launch concrete pad
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CONCRETE, "loc": (0, 0, -0.14), "radius": 1.35, "radius2": 1.48, "depth": 0.28, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 0.04), "scale": (1.55, 1.55, 0.12), "bevel": 0.02},
        # Flame trench deflectors
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0.42, 0, 0.14), "scale": (0.28, 0.72, 0.14), "bevel": 0.02},
        # Glowing cyan pad ring lights
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.09), "major": 1.05, "minor": 0.03, "seg_u": 24, "seg_v": 6},

        # Red steel Launch Umbilical Tower beside rocket
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.64, -0.05, 0.85), "scale": (0.22, 0.22, 1.52)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOWER, "loc": (-0.64, -0.05, 1.62), "scale": (0.28, 0.28, 0.10)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.36, -0.05, 1.24), "scale": (0.44, 0.08, 0.07)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.36, -0.05, 0.78), "scale": (0.42, 0.08, 0.06)},

        # Artemis / SLS Rocket Stack at center
        # Glowing engine nozzle heat base
        {"type": "cone", "mat_idx": 2, "loc": (0.04, 0, 0.18), "r1": 0.14, "r2": 0.08, "depth": 0.16, "segments": 10},
        # Core orange LH2/LOX tank
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TANK, "loc": (0.04, 0, 0.78), "radius": 0.16, "depth": 1.04, "segments": 12},
        # Upper white spacecraft adapter & Orion payload fairing
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.44), "radius": 0.145, "radius2": 0.12, "depth": 0.28, "segments": 12},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0, 1.72), "r1": 0.125, "r2": 0.025, "depth": 0.30, "segments": 12},
        # Launch abort escape spire
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0, 1.94), "radius": 0.022, "radius2": 0.012, "depth": 0.18, "segments": 6},
        # Twin White Solid Rocket Boosters (SRBs)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, -0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 10},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, -0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.04, 0.25, 0.68), "radius": 0.075, "depth": 0.92, "segments": 10},
        {"type": "cone", "mat_idx": 0, "vcolor": C_TOWER, "loc": (0.04, 0.25, 1.21), "r1": 0.075, "r2": 0.015, "depth": 0.16, "segments": 10},
    ]

    build_mesh_object("EarthLaunchpadComplex", parts, [m_base, m_cyan, m_flame], smooth_auto=False)
    export_glb("earth_launchpad.glb")


# ------------------------------------------------------------------------------
# 2. ISS ORBIT STATION (iss_orbit_station.glb)
# ------------------------------------------------------------------------------
def gen_iss_orbit_station():
    reset_scene()
    m_base = p_mat()
    m_cyan = glow_mat("iss_cyan", (0.20, 0.88, 1.0), 1.35)

    C_HULL = (0.91, 0.94, 0.97)
    C_GOLD = (0.94, 0.72, 0.18)
    C_TRUSS = (0.64, 0.70, 0.78)
    C_SOLAR = (0.10, 0.34, 0.78)
    C_RAD = (0.96, 0.97, 0.99)

    parts = [
        # Integrated Truss Backbone along X axis
        {"type": "cube", "mat_idx": 0, "vcolor": C_TRUSS, "loc": (0, 0, 0.42), "scale": (2.35, 0.14, 0.14)},
        # Main pressurized lab spine along Y axis
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (0, 0, 0.36), "radius": 0.18, "depth": 1.32, "rot": (math.pi / 2.0, 0, 0), "segments": 12},
        # Side science lab pods (Columbus & Kibo)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (-0.34, 0.18, 0.36), "radius": 0.13, "depth": 0.56, "rot": (0, math.pi / 2.0, 0), "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (0.34, 0.18, 0.36), "radius": 0.13, "depth": 0.56, "rot": (0, math.pi / 2.0, 0), "segments": 10},
        # Gold node couplers & cupola dome
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0.22, 0.36), "radius": 0.21, "depth": 0.22, "rot": (math.pi / 2.0, 0, 0), "segments": 10},
        {"type": "sphere", "mat_idx": 1, "loc": (0, 0.0, 0.54), "radius": 0.14, "u_seg": 10, "v_seg": 6},
        # Glowing docking rings
        {"type": "torus", "mat_idx": 1, "loc": (0, 0.68, 0.36), "major": 0.16, "minor": 0.025, "rot": (math.pi / 2.0, 0, 0), "seg_u": 14, "seg_v": 5},
        {"type": "torus", "mat_idx": 1, "loc": (0, -0.68, 0.36), "major": 0.16, "minor": 0.025, "rot": (math.pi / 2.0, 0, 0), "seg_u": 14, "seg_v": 5},
        # White thermal radiators
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RAD, "loc": (-0.38, -0.34, 0.42), "scale": (0.18, 0.46, 0.02), "bevel": 0.005},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RAD, "loc": (0.38, -0.34, 0.42), "scale": (0.18, 0.46, 0.02), "bevel": 0.005},
    ]

    # 4 Pairs of Iconic Blue/Gold Solar Panel Arrays
    for sx in (-0.98, -0.66, 0.66, 0.98):
        for sy in (-0.54, 0.54):
            parts.append({
                "type": "bevel_cube",
                "mat_idx": 0,
                "vcolor": C_SOLAR,
                "loc": (sx, sy, 0.44),
                "scale": (0.24, 0.82, 0.02),
                "rot": (0.24, 0, 0),
                "bevel": 0.006,
            })
            parts.append({
                "type": "cube",
                "mat_idx": 0,
                "vcolor": C_GOLD,
                "loc": (sx, sy * 0.5, 0.43),
                "scale": (0.04, 0.25, 0.04),
            })

    build_mesh_object("ISSOrbitStation", parts, [m_base, m_cyan], smooth_auto=False)
    export_glb("iss_orbit_station.glb")


# ------------------------------------------------------------------------------
# 3. LUNAR BIODOME BASE (lunar_biodome_base.glb)
# ------------------------------------------------------------------------------
def gen_lunar_biodome_base():
    reset_scene()
    m_base = p_mat()
    m_glass = glass_mat("lunar_dome_glass", (0.36, 0.92, 1.0), 0.36)
    m_cyan = glow_mat("lunar_base_cyan", (0.20, 0.88, 1.0), 1.15)

    C_REGOLITH = (0.54, 0.58, 0.64)
    C_CRATER = (0.40, 0.44, 0.52)
    C_METAL = (0.86, 0.90, 0.94)
    C_PLANT = (0.16, 0.78, 0.34)
    C_SOLAR = (0.12, 0.36, 0.82)
    C_GOLD = (0.95, 0.72, 0.16)

    solid_parts = [
        # Cratered Shackleton base pad
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_REGOLITH, "loc": (0, 0, -0.10), "radius": 1.38, "radius2": 1.50, "depth": 0.22, "segments": 12},
        {"type": "torus", "mat_idx": 0, "vcolor": C_CRATER, "loc": (-0.86, 0.58, 0.02), "major": 0.26, "minor": 0.06, "seg_u": 12, "seg_v": 5},
        # Habitat Dome Floor Ring + Internal Hydroponic Green Crop Beds!
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_METAL, "loc": (0.08, 0, 0.06), "radius": 0.76, "depth": 0.10, "segments": 16},
        {"type": "torus", "mat_idx": 2, "loc": (0.08, 0, 0.11), "major": 0.74, "minor": 0.03, "seg_u": 20, "seg_v": 6},
        # Crops inside dome
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLANT, "loc": (-0.10, -0.18, 0.18), "scale": (0.30, 0.18, 0.14), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLANT, "loc": (0.28, -0.18, 0.18), "scale": (0.30, 0.18, 0.14), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLANT, "loc": (0.08, 0.24, 0.18), "scale": (0.48, 0.18, 0.14), "bevel": 0.04},

        # Pressurized Airlock Tunnel + Solar Wing
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_METAL, "loc": (-0.72, -0.12, 0.24), "radius": 0.18, "depth": 0.54, "rot": (0, math.pi / 2.0, 0.2), "segments": 10},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (0.98, 0.35, 0.28), "scale": (0.45, 0.24, 0.03), "rot": (0.38, 0, -0.2), "bevel": 0.005},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_METAL, "loc": (0.98, 0.35, 0.14), "radius": 0.04, "depth": 0.26, "segments": 6},

        # Parked Stylized Pressurized Moon Rover
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_METAL, "loc": (-0.65, -0.78, 0.18), "scale": (0.42, 0.26, 0.18), "bevel": 0.03},
        {"type": "cube", "mat_idx": 2, "loc": (-0.46, -0.78, 0.22), "scale": (0.05, 0.20, 0.10)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-0.72, -0.78, 0.34), "radius": 0.09, "radius2": 0.01, "depth": 0.08, "rot": (0.4, 0, 0), "segments": 8},
    ]

    for wx in (-0.78, -0.52):
        for wy in (-0.94, -0.62):
            solid_parts.append({
                "type": "cylinder",
                "mat_idx": 0,
                "vcolor": C_CRATER,
                "loc": (wx, wy, 0.08),
                "radius": 0.075,
                "depth": 0.06,
                "rot": (math.pi / 2.0, 0, 0),
                "segments": 8,
            })

    glass_parts = [
        {"type": "sphere", "mat_idx": 1, "loc": (0.08, 0, 0.11), "radius": 0.72, "u_seg": 14, "v_seg": 10, "scale": (1.0, 1.0, 0.85)},
    ]

    build_mesh_object("LunarBiodomeBase", solid_parts, [m_base, m_glass, m_cyan], smooth_auto=False)
    build_mesh_object("LunarDomeGlass", glass_parts, [m_base, m_glass, m_cyan], smooth_auto=True)
    export_glb("lunar_biodome_base.glb")


# ------------------------------------------------------------------------------
# 4. ORION RE-ENTRY CAPSULE (orion_reentry_capsule.glb)
# ------------------------------------------------------------------------------
def gen_orion_reentry_capsule():
    reset_scene()
    m_base = p_mat()
    m_cyan = glow_mat("orion_cyan", (0.25, 0.88, 1.0), 1.2)
    m_heat = glow_mat("orion_pica_heat", (1.0, 0.42, 0.10), 0.9)

    C_CAP = (0.86, 0.90, 0.95)
    C_SHIELD = (0.44, 0.22, 0.10)
    C_DARK = (0.14, 0.18, 0.24)
    C_ORANGE = (0.98, 0.45, 0.12)
    C_CHUTE_W = (0.98, 0.98, 1.0)

    parts = [
        # PICA-X Heat Shield Base + Ablative Glow Rim
        {"type": "sphere", "mat_idx": 0, "vcolor": C_SHIELD, "loc": (0, 0, 0.18), "radius": 0.62, "u_seg": 16, "v_seg": 8, "scale": (1.0, 1.0, 0.34)},
        {"type": "torus", "mat_idx": 2, "loc": (0, 0, 0.22), "major": 0.60, "minor": 0.04, "seg_u": 20, "seg_v": 6},
        # Gumdrop Conical Orion Crew Module
        {"type": "cone", "mat_idx": 0, "vcolor": C_CAP, "loc": (0, 0, 0.56), "r1": 0.58, "r2": 0.25, "depth": 0.66, "segments": 16},
        # Top docking ring collar
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0, 0.94), "radius": 0.23, "depth": 0.12, "segments": 12},
        # Crew Windows
        {"type": "bevel_cube", "mat_idx": 1, "loc": (0.34, 0.0, 0.60), "scale": (0.14, 0.22, 0.10), "rot": (0, 0.45, 0), "bevel": 0.02},
        # Triple Splashdown Chute Canopies floating cleanly above!
        {"type": "sphere", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-0.42, 0.0, 1.72), "radius": 0.38, "u_seg": 12, "v_seg": 8, "scale": (1.0, 1.0, 0.55)},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_CHUTE_W, "loc": (0.42, 0.0, 1.72), "radius": 0.38, "u_seg": 12, "v_seg": 8, "scale": (1.0, 1.0, 0.55)},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0.0, 0.38, 1.82), "radius": 0.38, "u_seg": 12, "v_seg": 8, "scale": (1.0, 1.0, 0.55)},
        # Thin suspension risers connecting chutes to capsule top collar
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (-0.21, 0, 1.32), "radius": 0.015, "depth": 0.78, "rot": (0, -0.45, 0), "segments": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0.21, 0, 1.32), "radius": 0.015, "depth": 0.78, "rot": (0, 0.45, 0), "segments": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.19, 1.38), "radius": 0.015, "depth": 0.86, "rot": (0.40, 0, 0), "segments": 6},
    ]

    build_mesh_object("OrionReentryCapsule", parts, [m_base, m_cyan, m_heat], smooth_auto=False)
    export_glb("orion_reentry_capsule.glb")


# ------------------------------------------------------------------------------
# 5. INDOOR PROP: 3D SPACE KITCHEN COUNTER (prop_kitchen_counter.glb)
# ------------------------------------------------------------------------------
def gen_prop_kitchen_counter():
    reset_scene()
    m_base = p_mat()
    m_cyan = glow_mat("kitchen_cyan", (0.18, 0.90, 0.72), 1.1)

    C_BODY = (0.90, 0.94, 0.98)
    C_TOP = (0.14, 0.22, 0.34)
    C_HONEY = (0.98, 0.72, 0.14)
    C_SALAD = (0.18, 0.80, 0.36)
    C_ORANGE = (0.96, 0.46, 0.16)

    parts = [
        # Main kitchen galley cabinet & countertop
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BODY, "loc": (0, 0, 0.44), "scale": (1.55, 0.78, 0.86), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TOP, "loc": (0, 0, 0.90), "scale": (1.64, 0.86, 0.08), "bevel": 0.02},
        # Glowing emerald front edge bar
        {"type": "cube", "mat_idx": 1, "loc": (0, -0.41, 0.82), "scale": (1.52, 0.04, 0.05)},
        # Overhead galley scanner canopy
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOP, "loc": (-0.68, 0.28, 1.38), "scale": (0.08, 0.08, 0.92)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_TOP, "loc": (0.68, 0.28, 1.38), "scale": (0.08, 0.08, 0.92)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BODY, "loc": (0, 0.22, 1.84), "scale": (1.56, 0.32, 0.22), "bevel": 0.03},
        {"type": "cube", "mat_idx": 1, "loc": (0, 0.05, 1.84), "scale": (1.30, 0.02, 0.10)},
        # Mounted Sinai Honey Squeeze Pouch + Hydroponic Salad Bowl + Drink Valve
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_HONEY, "loc": (-0.38, -0.05, 1.08), "scale": (0.20, 0.12, 0.26), "bevel": 0.03},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE if False else C_BODY, "loc": (-0.38, -0.05, 1.24), "radius": 0.04, "depth": 0.07, "segments": 8},
        {"type": "sphere", "mat_idx": 0, "vcolor": C_SALAD, "loc": (0.04, -0.02, 1.02), "radius": 0.18, "u_seg": 10, "v_seg": 6, "scale": (1.1, 1.0, 0.7)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (0.44, -0.02, 1.06), "scale": (0.22, 0.14, 0.22), "bevel": 0.03},
    ]

    build_mesh_object("PropKitchenCounter", parts, [m_base, m_cyan], smooth_auto=False)
    export_glb("prop_kitchen_counter.glb")


# ------------------------------------------------------------------------------
# 6. INDOOR PROP: 3D SPACE-FIT X SUIT RACK (prop_suit_rack.glb)
# ------------------------------------------------------------------------------
def gen_prop_suit_rack():
    reset_scene()
    m_base = p_mat()
    m_cyan = glow_mat("rack_cyan", (0.18, 0.86, 1.0), 1.3)

    C_METAL = (0.22, 0.28, 0.38)
    C_SUIT = (0.12, 0.15, 0.20)
    C_PLATE = (0.86, 0.90, 0.95)
    C_HELMET = (0.94, 0.96, 0.99)

    parts = [
        # Heavy base pedestal & gantry uprights
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_METAL, "loc": (0, 0, 0.06), "radius": 0.72, "depth": 0.12, "segments": 12},
        {"type": "cube", "mat_idx": 0, "vcolor": C_METAL, "loc": (-0.56, 0.20, 0.92), "scale": (0.10, 0.10, 1.65)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_METAL, "loc": (0.56, 0.20, 0.92), "scale": (0.10, 0.10, 1.65)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_METAL, "loc": (0, 0.20, 1.76), "scale": (1.28, 0.16, 0.14), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0, 0.11, 1.76), "scale": (1.05, 0.03, 0.06)},

        # Mounted SPACE-FIT X Exo-Compression Suit Rig
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SUIT, "loc": (0, 0.05, 1.05), "scale": (0.48, 0.24, 0.56), "bevel": 0.04},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_PLATE, "loc": (0, -0.07, 1.12), "scale": (0.40, 0.08, 0.34), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0, -0.12, 1.15), "scale": (0.18, 0.02, 0.12)},
        # Articulated shoulders & hanging sleeves
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SUIT, "loc": (-0.34, 0.05, 1.02), "scale": (0.14, 0.14, 0.48), "rot": (0, 0.14, 0), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SUIT, "loc": (0.34, 0.05, 1.02), "scale": (0.14, 0.14, 0.48), "rot": (0, -0.14, 0), "bevel": 0.03},
        # EVA Visor Helmet docked on rack crown
        {"type": "sphere", "mat_idx": 0, "vcolor": C_HELMET, "loc": (0, 0.04, 1.50), "radius": 0.20, "u_seg": 12, "v_seg": 8},
        {"type": "sphere", "mat_idx": 1, "loc": (0, -0.06, 1.50), "radius": 0.15, "u_seg": 10, "v_seg": 6, "scale": (1.05, 0.72, 0.78)},
    ]

    build_mesh_object("PropSuitRack", parts, [m_base, m_cyan], smooth_auto=False)
    export_glb("prop_suit_rack.glb")


# ------------------------------------------------------------------------------
# 7. INDOOR PROP: 3D MEDICAL BIOMETRIC POD (prop_medical_pod.glb)
# ------------------------------------------------------------------------------
def gen_prop_medical_pod():
    reset_scene()
    m_base = p_mat()
    m_med = glow_mat("med_pink_cyan", (0.96, 0.35, 0.65), 1.2)
    m_cyan = glow_mat("med_holo", (0.22, 0.88, 1.0), 1.2)

    C_WHITE = (0.94, 0.96, 0.99)
    C_BED = (0.18, 0.34, 0.56)

    parts = [
        # Biometric Reclining Cradle Base
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.28), "scale": (1.52, 0.76, 0.38), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BED, "loc": (0, 0, 0.50), "scale": (1.36, 0.62, 0.12), "bevel": 0.04},
        # Overhead Biometric Scan Halo Ring
        {"type": "torus", "mat_idx": 2, "loc": (-0.18, 0, 0.85), "major": 0.48, "minor": 0.05, "rot": (0, math.pi / 2.0, 0), "seg_u": 20, "seg_v": 6},
        # Heartbeat Monitor Console beside pod
        {"type": "cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.68, -0.34, 0.72), "scale": (0.10, 0.10, 0.98)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": (0.12, 0.16, 0.24), "loc": (0.68, -0.34, 1.28), "scale": (0.44, 0.08, 0.32), "rot": (-0.25, 0, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0.68, -0.39, 1.28), "scale": (0.36, 0.02, 0.22), "rot": (-0.25, 0, 0)},
    ]

    build_mesh_object("PropMedicalPod", parts, [m_base, m_med, m_cyan], smooth_auto=False)
    export_glb("prop_medical_pod.glb")


# ------------------------------------------------------------------------------
# 8. INDOOR PROP: 3D HYDROPONIC PLANT RACK (prop_hydro_rack.glb)
# ------------------------------------------------------------------------------
def gen_prop_hydro_rack():
    reset_scene()
    m_base = p_mat()
    m_led = glow_mat("hydro_pink_led", (0.98, 0.42, 0.86), 1.35)
    m_water = glow_mat("hydro_water_cyan", (0.16, 0.85, 0.95), 0.9)

    C_FRAME = (0.82, 0.87, 0.92)
    C_GREEN = (0.18, 0.80, 0.34)
    C_LIME = (0.38, 0.88, 0.28)

    parts = [
        # Hydroponic Reservoir Tank Base
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, 0.22), "scale": (1.42, 0.68, 0.42), "bevel": 0.03},
        {"type": "cube", "mat_idx": 2, "loc": (0, -0.33, 0.24), "scale": (1.12, 0.04, 0.22)},
        # Four Aluminum Frame Uprights
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (-0.64, -0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0.64, -0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (-0.64, 0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0.64, 0.26, 0.98), "scale": (0.07, 0.07, 1.56)},
    ]

    # 2 Elevated Grow Trays + Pink/Magenta LED Bars + Lush Rosette Lettuce Heads
    for tz in (0.68, 1.24):
        parts.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, tz), "scale": (1.34, 0.56, 0.08), "bevel": 0.02})
        parts.append({"type": "cube", "mat_idx": 1, "loc": (0, 0, tz + 0.42), "scale": (1.24, 0.14, 0.04)})
        for px in (-0.42, -0.14, 0.14, 0.42):
            parts.append({
                "type": "icosphere",
                "mat_idx": 0,
                "vcolor": C_GREEN if px < 0 else C_LIME,
                "loc": (px, 0, tz + 0.14),
                "radius": 0.12,
                "subdiv": 1,
                "scale": (1.1, 1.1, 0.78),
            })

    parts.append({"type": "bevel_cube", "mat_idx": 0, "vcolor": C_FRAME, "loc": (0, 0, 1.76), "scale": (1.38, 0.60, 0.08), "bevel": 0.02})
    build_mesh_object("PropHydroRack", parts, [m_base, m_led, m_water], smooth_auto=False)
    export_glb("prop_hydro_rack.glb")


# ------------------------------------------------------------------------------
# 9. INDOOR PROP: 3D SOLAR STORM SHIELD CONSOLE (prop_storm_console.glb)
# ------------------------------------------------------------------------------
def gen_prop_storm_console():
    reset_scene()
    m_base = p_mat()
    m_amber = glow_mat("console_amber", (1.0, 0.65, 0.12), 1.35)
    m_cyan = glow_mat("console_cyan", (0.20, 0.88, 1.0), 1.3)

    C_DESK = (0.18, 0.24, 0.34)
    C_TRIM = (0.78, 0.84, 0.90)

    parts = [
        # Curved Command Desk Pedestal
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DESK, "loc": (0, 0, 0.38), "radius": 0.78, "radius2": 0.66, "depth": 0.74, "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TRIM, "loc": (0, 0, 0.78), "radius": 0.84, "depth": 0.08, "segments": 10},
        # Center + Left + Right Telemetry Monitors
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (0, 0.16, 1.18), "scale": (0.68, 0.08, 0.44), "rot": (0.18, 0, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 2, "loc": (0, 0.11, 1.18), "scale": (0.58, 0.02, 0.34), "rot": (0.18, 0, 0)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (-0.64, 0.02, 1.14), "scale": (0.46, 0.08, 0.36), "rot": (0.18, 0.42, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (-0.60, -0.02, 1.14), "scale": (0.38, 0.02, 0.28), "rot": (0.18, 0.42, 0)},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DESK, "loc": (0.64, 0.02, 1.14), "scale": (0.46, 0.08, 0.36), "rot": (0.18, -0.42, 0), "bevel": 0.02},
        {"type": "cube", "mat_idx": 1, "loc": (0.60, -0.02, 1.14), "scale": (0.38, 0.02, 0.28), "rot": (0.18, -0.42, 0)},
        # Overhead Radar Dish Antenna
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TRIM, "loc": (0, 0.28, 1.60), "radius": 0.04, "depth": 0.38, "segments": 8},
        {"type": "cone", "mat_idx": 2, "loc": (0, 0.28, 1.82), "r1": 0.26, "r2": 0.02, "depth": 0.14, "rot": (-0.45, 0, 0), "segments": 12},
    ]

    build_mesh_object("PropStormConsole", parts, [m_base, m_amber, m_cyan], smooth_auto=False)
    export_glb("prop_storm_console.glb")


if __name__ == "__main__":
    gen_earth_launchpad()
    gen_iss_orbit_station()
    gen_lunar_biodome_base()
    gen_orion_reentry_capsule()
    gen_prop_kitchen_counter()
    gen_prop_suit_rack()
    gen_prop_medical_pod()
    gen_prop_hydro_rack()
    gen_prop_storm_console()
    print("[Blender Pipeline] All 9 Phase-1 space & indoor prop GLB models exported cleanly.")
