"""
AstroNutri — Phase 3 Blender 5.3 Full Planetary Production Asset Pipeline
Generates 8 stylized, lightweight (< 350 KB each), grounded (z = 0 base pivot with -0.35..-12.0m
anchor skirts so ZERO props ever float on slopes) PBR .glb assets into public/models/:
  1. moon_modular_base.glb     (NASA-Style Modular Lunar Habitat: white & red striped rectangular sci-fi
                                modules, upper glass control tower, exterior ladders, ribbed airlocks,
                                metallic sloped vehicle entry ramp)
  2. moon_rover_6x6.glb        (6-Wheel Heavy Lunar Exploration Rover: RoverChassis + metallic roll cage
                                + solar/comm mast + warm LED headlights + open seated astronaut cockpit
                                + steering yoke + 6 rotatable wheels RoverWheelFL/FR/ML/MR/RL/RR)
  3. moon_comm_tower.glb       (Lunar Comm Dish Tower + Twin Solar Wing Array: SpinRadar + SolarWingSpin)
  4. moon_crater_rocks.glb     (Faceted Lunar Basalt & Anorthosite Boulder Outcrop: MoonRock)
  5. mars_return_base.glb      (Mars Science Outpost & Orion Return Launchpad: weathered terracotta dust
                                skirts, pressurized dome connectors, launch gantry + Orion return capsule)
  6. mars_canyon_cliffs.glb    (Sculpted Stratified Red Sandstone Mesa / Cliff Outcrop: MarsCliff)
  7. mars_canyon_ring.glb      (360° Towering Red Canyon Rim Walls surrounding the Martian valley floor:
                                MarsCanyonRing)
  8. iss_orbital_ribs.glb      (Crisp ISS Metallic Module Ribs, Warm Gold Interior Handhold Bars,
                                Cupola Observation Frame & Twin Exterior Solar Wing Arrays: ISSolarArray)

Run via:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background --python scripts/generate_phase3_planets_assets.py
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

import generate_blender_assets as gba
import generate_space_phase1_models as phase1
import generate_phase2_earth_assets as phase2

gba.OUT_DIR = MODELS_DIR


def pbr_mat(name="phase3_pbr", roughness=0.46, metallic=0.18):
    return gba.make_material(
        name,
        (1.0, 1.0, 1.0, 1.0),
        roughness=roughness,
        metallic=metallic,
        use_vertex_color=True,
    )


# ==============================================================================
# 1. NASA-STYLE MODULAR LUNAR HABITAT (moon_modular_base.glb) — ~14m x 12m
# ==============================================================================
def gen_moon_modular_base():
    gba.reset_scene()
    m_pbr = pbr_mat("moon_base_pbr", roughness=0.40, metallic=0.25)
    m_cyan = phase1.glow_mat("moon_base_cyan", (0.22, 0.90, 1.0), 1.45)
    m_amber = phase1.glow_mat("moon_base_amber", (1.0, 0.72, 0.16), 1.35)
    m_glass = phase1.glass_mat("moon_base_glass", (0.48, 0.92, 1.0), 0.34)

    C_REG_DARK = (0.24, 0.27, 0.34)
    C_TITANIUM = (0.56, 0.62, 0.70)
    C_WHITE = (0.95, 0.97, 1.00)
    C_RED = (0.88, 0.19, 0.22)
    C_SLATE = (0.16, 0.20, 0.28)
    C_GOLD = (0.96, 0.72, 0.16)
    C_SOLAR = (0.10, 0.28, 0.68)

    solid = [
        # Deeply grounded lunar foundation pad & anchor skirt (z = -0.55..0.32)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_REG_DARK, "loc": (0, 0, -0.22), "scale": (14.4, 12.2, 0.64), "bevel": 0.10},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 0, 0.18), "scale": (13.6, 11.4, 0.26), "bevel": 0.08},
        # Metallic Sloped Vehicle & Astronaut Entry Ramp at front (-Y_bl -> +Z_three)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, -6.6, 0.04), "scale": (5.4, 3.2, 0.34), "rot": (-0.14, 0, 0), "bevel": 0.05},
        {"type": "cube", "mat_idx": 0, "vcolor": C_RED, "loc": (-2.45, -6.6, 0.18), "scale": (0.26, 3.0, 0.10), "rot": (-0.14, 0, 0)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_RED, "loc": (2.45, -6.6, 0.18), "scale": (0.26, 3.0, 0.10), "rot": (-0.14, 0, 0)},
        # Main Rectangular Pressurized Sci-Fi Habitat Module (White with Bold NASA Red Stripes!)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.4, 2.25), "scale": (8.6, 5.4, 3.8), "bevel": 0.34},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0.4, 3.45), "scale": (8.72, 5.52, 0.36), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0.4, 1.15), "scale": (8.72, 5.52, 0.28), "bevel": 0.05},
        # East & West Interconnected Pressurized Wing Modules
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-5.2, 0.5, 1.85), "scale": (3.4, 4.4, 3.0), "bevel": 0.26},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (-5.2, 0.5, 2.75), "scale": (3.5, 4.5, 0.28), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (5.2, 0.5, 1.85), "scale": (3.4, 4.4, 3.0), "bevel": 0.26},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (5.2, 0.5, 2.75), "scale": (3.5, 4.5, 0.28), "bevel": 0.05},
        # Ribbed Cylindrical Front Airlock Tunnel facing ramp (-Y)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, -3.55, 1.65), "radius": 1.65, "depth": 2.9, "rot": (math.pi * 0.5, 0, 0), "segments": 16},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SLATE, "loc": (0, -5.02, 1.55), "scale": (1.85, 0.22, 2.15), "bevel": 0.04},
        # Upper Observation Control Tower Deck + Support Neck
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 0.6, 4.55), "radius": 2.15, "radius2": 2.45, "depth": 0.95, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.6, 6.45), "radius": 2.55, "radius2": 2.35, "depth": 0.45, "segments": 16},
        {"type": "torus", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0.6, 6.50), "major": 2.48, "minor": 0.12, "seg_u": 20, "seg_v": 6},
        # Side Gold Foil ECLSS Oxygen/Water Tanks
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-5.5, -2.35, 1.55), "radius": 0.58, "depth": 2.3, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-4.1, -2.35, 1.55), "radius": 0.58, "depth": 2.3, "segments": 12},
        # Rooftop Solar Wing Array on East Module
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (5.2, 0.5, 3.85), "radius": 0.16, "depth": 1.1, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (5.2, 0.5, 4.45), "scale": (3.2, 1.8, 0.12), "rot": (0.28, 0, 0), "bevel": 0.03},
    ]

    # Ribbed Airlock Structural Rings
    for ry in (-2.5, -3.5, -4.5):
        solid.append({
            "type": "torus",
            "mat_idx": 0,
            "vcolor": C_RED if ry == -3.5 else C_TITANIUM,
            "loc": (0, ry, 1.65),
            "major": 1.68,
            "minor": 0.11,
            "rot": (math.pi * 0.5, 0, 0),
            "seg_u": 18,
            "seg_v": 6,
        })

    # Exterior Maintenance Ladder on West Face of Main Habitat
    lx = -3.85
    ly = -2.38
    solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (lx - 0.28, ly, 2.25), "scale": (0.08, 0.08, 3.8)})
    solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (lx + 0.28, ly, 2.25), "scale": (0.08, 0.08, 3.8)})
    for rz in (0.65, 1.15, 1.65, 2.15, 2.65, 3.15, 3.65):
        solid.append({"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (lx, ly, rz), "scale": (0.56, 0.07, 0.07)})

    gba.build_mesh_object("MoonModularBaseBody", solid, [m_pbr], smooth_auto=False)

    # Upper Glass Observation Control Tower & Side Viewport Windows
    gba.build_mesh_object(
        "MoonModularBaseGlass",
        [
            {"type": "cylinder", "mat_idx": 0, "loc": (0, 0.6, 5.65), "radius": 2.38, "radius2": 2.18, "depth": 1.35, "segments": 18},
            {"type": "bevel_cube", "mat_idx": 0, "loc": (-2.6, -2.32, 2.35), "scale": (1.65, 0.16, 0.92), "bevel": 0.03},
            {"type": "bevel_cube", "mat_idx": 0, "loc": (2.6, -2.32, 2.35), "scale": (1.65, 0.16, 0.92), "bevel": 0.03},
        ],
        [m_glass],
        smooth_auto=True,
    )

    # Emissive Airlock Beacons & Ramp Guide Strips
    gba.build_mesh_object(
        "MoonModularBaseGlow",
        [
            {"type": "cube", "mat_idx": 0, "loc": (0, -5.06, 1.55), "scale": (1.45, 0.10, 1.75)},
            {"type": "torus", "mat_idx": 0, "loc": (0, 0.6, 4.95), "major": 2.32, "minor": 0.07, "seg_u": 20, "seg_v": 6},
            {"type": "cube", "mat_idx": 1, "loc": (-2.15, -6.6, 0.22), "scale": (0.14, 2.8, 0.08), "rot": (-0.14, 0, 0)},
            {"type": "cube", "mat_idx": 1, "loc": (2.15, -6.6, 0.22), "scale": (0.14, 2.8, 0.08), "rot": (-0.14, 0, 0)},
        ],
        [m_cyan, m_amber],
        smooth_auto=False,
    )

    # Rotating Rooftop Radar Dish
    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.22), "r1": 0.16, "r2": 1.15, "depth": 0.42, "rot": (0.52, 0, 0), "segments": 14},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_RED, "loc": (0, -0.15, 0.44), "radius": 0.07, "depth": 0.50, "rot": (0.52, 0, 0), "segments": 8},
        ],
        [m_pbr],
        location=(0, 0.6, 6.85),
        smooth_auto=False,
    )

    return phase2.export_and_report("moon_modular_base.glb")


# ==============================================================================
# 2. 6-WHEEL HEAVY LUNAR EXPLORATION ROVER (moon_rover_6x6.glb)
#    Exports RoverChassis + 6 named rotatable wheel meshes:
#    RoverWheelFL, RoverWheelFR, RoverWheelML, RoverWheelMR, RoverWheelRL, RoverWheelRR
# ==============================================================================
def gen_moon_rover_6x6():
    gba.reset_scene()
    m_pbr = pbr_mat("moon_rover_pbr", roughness=0.38, metallic=0.32)
    m_glow = phase1.glow_mat("moon_rover_glow", (1.0, 0.88, 0.42), 1.45)

    C_WHITE = (0.95, 0.97, 1.00)
    C_RED = (0.88, 0.20, 0.22)
    C_GOLD = (0.96, 0.72, 0.14)
    C_DARK = (0.14, 0.17, 0.24)
    C_TITANIUM = (0.56, 0.62, 0.70)
    C_SOLAR = (0.10, 0.28, 0.68)
    C_TIRE = (0.16, 0.18, 0.22)

    # Note: Blender -Y is Three.js +Z (forward in our Rover controller!)
    chassis_parts = [
        # Heavy 6x6 articulated lunar chassis tub & gold thermal battery belly (z = 0.28..0.60)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.0, 0.34), "scale": (1.58, 2.95, 0.22), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0.0, 0.50), "scale": (1.68, 2.82, 0.18), "bevel": 0.05},
        # NASA Red Stripe fenders along both sides
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (-0.82, 0.0, 0.54), "scale": (0.14, 2.74, 0.14), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0.82, 0.0, 0.54), "scale": (0.14, 2.74, 0.14), "bevel": 0.03},
        # Rocker-Bogie Suspension Arms linking Front-Middle-Rear axles on Left & Right
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (-0.78, 0.0, 0.34), "scale": (0.10, 2.35, 0.10), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0.78, 0.0, 0.34), "scale": (0.10, 2.35, 0.10), "bevel": 0.02},
        # Open Astronaut Driver Cockpit Seat (cushion at z = 0.56, backrest at y = +0.26)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.04, 0.58), "scale": (0.74, 0.56, 0.12), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, 0.32, 0.90), "scale": (0.72, 0.14, 0.62), "rot": (0.16, 0, 0), "bevel": 0.03},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0.30, 1.24), "scale": (0.44, 0.14, 0.18), "bevel": 0.03},
        # Front Hood Nose & Steering Yoke Console (at y = -0.52 so seated astronaut hands reach it!)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, -1.08, 0.64), "scale": (1.42, 0.76, 0.28), "rot": (0.18, 0, 0), "bevel": 0.05},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, -0.46, 0.74), "radius": 0.045, "depth": 0.46, "rot": (-0.52, 0, 0), "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_DARK, "loc": (0, -0.35, 0.92), "scale": (0.44, 0.08, 0.14), "rot": (-0.35, 0, 0), "bevel": 0.02},
        # Metallic Roll Cage Frame (leaves clean sightline for seated astronaut head!)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (-0.68, -0.55, 1.05), "radius": 0.04, "depth": 0.96, "rot": (-0.22, 0, 0), "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0.68, -0.55, 1.05), "radius": 0.04, "depth": 0.96, "rot": (-0.22, 0, 0), "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (-0.68, 0.48, 1.08), "radius": 0.04, "depth": 1.02, "segments": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0.68, 0.48, 1.08), "radius": 0.04, "depth": 1.02, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0.48, 1.56), "scale": (1.42, 0.10, 0.09), "bevel": 0.02},
        # Rear Gold Thermal Payload Trunk + Solar Deck + High-Gain Comm Mast
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0.96, 0.78), "scale": (1.36, 0.86, 0.44), "bevel": 0.05},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (0, 1.02, 1.04), "scale": (1.28, 0.78, 0.08), "rot": (-0.15, 0, 0), "bevel": 0.02},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0.52, 1.15, 1.38), "radius": 0.035, "depth": 0.95, "segments": 8},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.52, 1.15, 1.88), "r1": 0.05, "r2": 0.36, "depth": 0.18, "rot": (0.55, 0, 0), "segments": 12},
        # Warm LED Headlight Bar at Front (-Y)
        {"type": "bevel_cube", "mat_idx": 1, "loc": (-0.46, -1.46, 0.62), "scale": (0.28, 0.08, 0.14), "bevel": 0.02},
        {"type": "bevel_cube", "mat_idx": 1, "loc": (0.46, -1.46, 0.62), "scale": (0.28, 0.08, 0.14), "bevel": 0.02},
    ]
    gba.build_mesh_object("RoverChassis", chassis_parts, [m_pbr, m_glow], smooth_auto=False)

    # 6 Chunky Woven-Mesh Lunar Rover Wheels (FL, FR, ML, MR, RL, RR)
    wheel_specs = [
        ("RoverWheelFL", -0.94, -1.04, 0.34),
        ("RoverWheelFR", 0.94, -1.04, 0.34),
        ("RoverWheelML", -0.96, 0.00, 0.34),
        ("RoverWheelMR", 0.96, 0.00, 0.34),
        ("RoverWheelRL", -0.94, 1.04, 0.34),
        ("RoverWheelRR", 0.94, 1.04, 0.34),
    ]
    for w_name, wx, wy, wz in wheel_specs:
        w_parts = [
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_TIRE, "loc": (0, 0, 0), "radius": 0.34, "depth": 0.28, "rot": (0, math.pi * 0.5, 0), "segments": 14},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0, 0), "radius": 0.19, "depth": 0.30, "rot": (0, math.pi * 0.5, 0), "segments": 10},
            {"type": "cube", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0, 0), "scale": (0.31, 0.42, 0.08)},
        ]
        gba.build_mesh_object(w_name, w_parts, [m_pbr], location=(wx, wy, wz), smooth_auto=False)

    return phase2.export_and_report("moon_rover_6x6.glb")


# ==============================================================================
# 3. LUNAR COMM DISH TOWER & SOLAR WING ARRAY (moon_comm_tower.glb)
# ==============================================================================
def gen_moon_comm_tower():
    gba.reset_scene()
    m_pbr = pbr_mat("moon_comm_pbr", roughness=0.40, metallic=0.28)
    m_glow = phase1.glow_mat("moon_comm_glow", (0.20, 0.88, 1.0), 1.45)

    C_REG_DARK = (0.22, 0.25, 0.32)
    C_TITANIUM = (0.62, 0.68, 0.76)
    C_WHITE = (0.95, 0.97, 1.00)
    C_RED = (0.88, 0.20, 0.22)
    C_GOLD = (0.96, 0.72, 0.16)
    C_SOLAR = (0.10, 0.28, 0.68)

    solid = [
        # Deeply grounded anchor base (z = -0.50..0.35)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_REG_DARK, "loc": (0, 0, -0.18), "radius": 1.85, "radius2": 1.65, "depth": 0.64, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 0, 0.24), "radius": 1.48, "radius2": 1.25, "depth": 0.28, "segments": 12},
        # Gold-Foil Telemetry Cabinet + Vertical Truss Mast
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0, 0.85), "scale": (1.35, 1.35, 0.95), "bevel": 0.06},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 2.85), "radius": 0.26, "radius2": 0.20, "depth": 3.4, "segments": 10},
        {"type": "torus", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0, 2.15), "major": 0.32, "minor": 0.06, "seg_u": 14, "seg_v": 6},
        {"type": "torus", "mat_idx": 0, "vcolor": C_RED, "loc": (0, 0, 3.65), "major": 0.28, "minor": 0.06, "seg_u": 14, "seg_v": 6},
        # Glowing cyan beacon collar
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.38), "major": 1.36, "minor": 0.06, "seg_u": 18, "seg_v": 6},
    ]
    gba.build_mesh_object("MoonCommTowerBody", solid, [m_pbr, m_glow], smooth_auto=False)

    # Twin Tilted Solar Wing Array (Animated SolarWingSpin)
    gba.build_mesh_object(
        "SolarWingSpin",
        [
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0, 0), "radius": 0.08, "depth": 4.4, "rot": (0, math.pi * 0.5, 0), "segments": 8},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (-1.35, 0, 0), "scale": (1.65, 0.92, 0.06), "bevel": 0.02},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (1.35, 0, 0), "scale": (1.65, 0.92, 0.06), "bevel": 0.02},
        ],
        [m_pbr],
        location=(0, 0, 2.85),
        smooth_auto=False,
    )

    # Top High-Gain Deep Space Dish (Animated SpinRadar)
    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.25), "r1": 0.18, "r2": 1.38, "depth": 0.50, "rot": (0.48, 0, 0), "segments": 16},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_RED, "loc": (0, -0.22, 0.56), "radius": 0.07, "depth": 0.62, "rot": (0.48, 0, 0), "segments": 8},
        ],
        [m_pbr],
        location=(0, 0, 4.60),
        smooth_auto=False,
    )

    return phase2.export_and_report("moon_comm_tower.glb")


# ==============================================================================
# 4. FACETED LUNAR CRATER BOULDER CLUSTER (moon_crater_rocks.glb)
#    Single-material object "MoonRock" with deep -0.85m anchor base
# ==============================================================================
def gen_moon_crater_rocks():
    gba.reset_scene()
    m_rock = pbr_mat("moon_rock_pbr", roughness=0.88, metallic=0.06)

    C_BASALT_DARK = (0.34, 0.37, 0.44)
    C_ANORTH_LIGHT = (0.68, 0.72, 0.78)
    C_REG_MID = (0.50, 0.54, 0.62)

    parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASALT_DARK, "loc": (0.0, 0.0, 0.25), "radius": 2.15, "radius2": 1.45, "depth": 2.20, "segments": 7},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_REG_MID, "loc": (-0.65, 0.35, 0.95), "radius": 1.35, "subdiv": 1, "scale": (1.25, 1.05, 0.92)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ANORTH_LIGHT, "loc": (0.85, -0.40, 0.65), "radius": 1.05, "subdiv": 1, "scale": (1.15, 0.95, 0.82)},
    ]
    rock_obj = gba.build_mesh_object("MoonRock", parts, [m_rock], smooth_auto=False)
    phase2.perturb_mesh_organic(rock_obj, freq=2.4, amp=0.16, bias_z=0.14)

    return phase2.export_and_report("moon_crater_rocks.glb")


# ==============================================================================
# 5. MARS SCIENCE OUTPOST & ORION RETURN LAUNCHPAD (mars_return_base.glb)
# ==============================================================================
def gen_mars_return_base():
    gba.reset_scene()
    m_pbr = pbr_mat("mars_base_pbr", roughness=0.46, metallic=0.24)
    m_amber = phase1.glow_mat("mars_base_amber", (1.0, 0.64, 0.16), 1.45)
    m_cyan = phase1.glow_mat("mars_base_cyan", (0.22, 0.88, 1.0), 1.35)
    m_glass = phase1.glass_mat("mars_base_glass", (0.50, 0.90, 1.0), 0.35)

    C_DUST_SKIRT = (0.64, 0.28, 0.14)
    C_TERRACOTTA = (0.78, 0.36, 0.18)
    C_SLATE = (0.18, 0.20, 0.26)
    C_DARK_SLATE = (0.14, 0.17, 0.22)
    C_WHITE = (0.95, 0.96, 0.98)
    C_ORANGE = (0.94, 0.44, 0.12)
    C_GOLD = (0.96, 0.72, 0.16)

    solid = [
        # Weathered Terracotta Dust Skirt & Deep Foundation Slab (z = -0.60..0.36)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DUST_SKIRT, "loc": (0, 0, -0.22), "radius": 8.4, "radius2": 7.6, "depth": 0.76, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TERRACOTTA, "loc": (0, 0, 0.22), "radius": 7.4, "radius2": 6.8, "depth": 0.28, "segments": 12},
        # Front Vehicle/Astronaut Entry Ramp (-Y_bl -> +Z_three)
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TERRACOTTA, "loc": (0, -7.2, 0.06), "scale": (4.8, 3.0, 0.38), "rot": (-0.15, 0, 0), "bevel": 0.05},
        # West Pressurized Mars Science Habitat Dome + Connector Tunnel
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-4.4, -0.6, 1.15), "radius": 2.65, "depth": 1.65, "segments": 16},
        {"type": "torus", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (-4.4, -0.6, 1.95), "major": 2.65, "minor": 0.12, "seg_u": 20, "seg_v": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-2.0, -0.6, 1.15), "radius": 1.05, "depth": 2.4, "rot": (0, math.pi * 0.5, 0), "segments": 12},
        # Central Orion Ascent & Return Launch Table + Service Gantry
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_SLATE, "loc": (1.6, 0.4, 0.85), "radius": 3.1, "radius2": 2.8, "depth": 1.05, "segments": 10},
        # Service Gantry Tower next to Return Capsule
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (4.5, 0.4, 4.2), "scale": (1.35, 1.35, 7.6), "bevel": 0.06},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (3.1, 0.4, 5.6), "scale": (2.2, 0.65, 0.42), "bevel": 0.04},
        # Orion Return Spacecraft & Ascent Stage Ready on Pad!
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK_SLATE, "loc": (1.6, 0.4, 1.85), "radius": 1.45, "radius2": 1.25, "depth": 0.95, "segments": 16},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (1.6, 0.4, 3.15), "radius": 1.38, "depth": 1.75, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (1.6, 0.4, 5.05), "r1": 1.48, "r2": 0.44, "depth": 2.10, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK_SLATE, "loc": (1.6, 0.4, 6.35), "radius": 0.44, "radius2": 0.28, "depth": 0.55, "segments": 14},
        {"type": "cone", "mat_idx": 0, "vcolor": C_ORANGE, "loc": (1.6, 0.4, 7.55), "r1": 0.24, "r2": 0.04, "depth": 1.95, "segments": 10},
    ]
    gba.build_mesh_object("MarsReturnBaseBody", solid, [m_pbr], smooth_auto=False)

    gba.build_mesh_object(
        "MarsReturnBaseGlass",
        [
            {"type": "sphere", "mat_idx": 0, "loc": (-4.4, -0.6, 1.95), "radius": 2.52, "u_seg": 18, "v_seg": 12, "scale": (1.0, 1.0, 0.76)},
        ],
        [m_glass],
        smooth_auto=True,
    )

    gba.build_mesh_object(
        "MarsReturnBaseGlow",
        [
            {"type": "torus", "mat_idx": 0, "loc": (1.6, 0.4, 1.40), "major": 2.85, "minor": 0.09, "seg_u": 20, "seg_v": 6},
            {"type": "torus", "mat_idx": 1, "loc": (1.6, 0.4, 4.95), "major": 1.15, "minor": 0.07, "seg_u": 18, "seg_v": 6},
            {"type": "cube", "mat_idx": 0, "loc": (0, -7.2, 0.22), "scale": (3.8, 0.18, 0.10)},
        ],
        [m_amber, m_cyan],
        smooth_auto=False,
    )

    gba.build_mesh_object(
        "SpinRadar",
        [
            {"type": "cone", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 0, 0.22), "r1": 0.16, "r2": 1.10, "depth": 0.42, "rot": (0.50, 0, 0), "segments": 14},
        ],
        [m_pbr],
        location=(4.5, 0.4, 8.20),
        smooth_auto=False,
    )

    return phase2.export_and_report("mars_return_base.glb")


# ==============================================================================
# 6. SCULPTED STRATIFIED RED CANYON CLIFF / MESA CLUSTER (mars_canyon_cliffs.glb)
#    Single-material object "MarsCliff" with deep -1.1m anchor base
# ==============================================================================
def gen_mars_canyon_cliffs():
    gba.reset_scene()
    m_cliff = pbr_mat("mars_cliff_pbr", roughness=0.86, metallic=0.05)

    C_IRON_BASE = (0.48, 0.18, 0.10)
    C_RUST_MID = (0.74, 0.30, 0.14)
    C_OCHRE_BAND = (0.88, 0.46, 0.20)
    C_CAP_DUST = (0.82, 0.38, 0.18)

    parts = [
        # Deeply sunk iron-oxide base tier (down to z = -1.10 so mesas never float)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_IRON_BASE, "loc": (0.0, 0.0, 0.50), "radius": 3.10, "radius2": 2.45, "depth": 3.20, "segments": 8},
        # Middle terracotta sandstone stratum
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_RUST_MID, "loc": (-0.35, 0.20, 2.35), "radius": 2.35, "radius2": 1.85, "depth": 2.40, "segments": 8},
        # Upper ochre sedimentary shelf + flat mesa cap
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_OCHRE_BAND, "loc": (-0.25, 0.15, 3.85), "radius": 1.80, "radius2": 1.55, "depth": 1.45, "segments": 7},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_CAP_DUST, "loc": (1.35, -0.55, 1.35), "radius": 1.75, "radius2": 1.20, "depth": 2.65, "segments": 7},
    ]
    cliff_obj = gba.build_mesh_object("MarsCliff", parts, [m_cliff], smooth_auto=False)
    phase2.perturb_mesh_organic(cliff_obj, freq=1.6, amp=0.15, bias_z=0.10)

    return phase2.export_and_report("mars_canyon_cliffs.glb")


# ==============================================================================
# 7. 360° TOWERING MARS RED CANYON WALL RING (mars_canyon_ring.glb)
#    Terraced stratified red sandstone canyon rim walls surrounding Level 4
# ==============================================================================
def gen_mars_canyon_ring():
    gba.reset_scene()
    m_ring = pbr_mat("mars_canyon_ring_pbr", roughness=0.86, metallic=0.05)

    mesh = bpy.data.meshes.new("MarsCanyonRingMesh")
    obj = bpy.data.objects.new("MarsCanyonRing", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(m_ring)

    bm = bmesh.new()
    color_layer = bm.loops.layers.color.new("Col")

    ang_segs = 88
    radii = [92.0, 99.0, 108.0, 118.0, 130.0, 144.0]
    rad_bands = len(radii)

    def mesa_noise(ang, r_idx):
        w1 = math.sin(ang * 5.0 + 0.4) * 0.55 + math.cos(ang * 8.0 - 0.7) * 0.45
        w2 = 1.0 - abs(math.sin(ang * 11.0 + r_idx * 0.6))
        # Stepped plateau quantization for authentic Martian canyon mesas!
        raw = 0.5 + 0.35 * w1 + 0.30 * w2
        stepped = math.floor(raw * 4.5) / 4.5
        return raw * 0.45 + stepped * 0.55

    grid = []
    for i in range(ang_segs):
        base_ang = (i / float(ang_segs)) * math.pi * 2.0
        row = []
        for j in range(rad_bands):
            ang_jit = base_ang + math.sin(i * 2.3 + j * 1.7) * 0.012
            r_jit = radii[j] + math.cos(i * 3.1 - j * 2.1) * 2.0
            mn = mesa_noise(base_ang, j)

            if j == 0:
                z = -10.0
            elif j == 1:
                z = 4.5 + mn * 8.5
            elif j == 2:
                z = 15.0 + mn * 16.5
            elif j == 3:
                z = 26.0 + mn * 24.0
            elif j == 4:
                z = 22.0 + mn * 18.0
            else:
                z = -10.0

            vx = math.cos(ang_jit) * r_jit
            vy = math.sin(ang_jit) * r_jit
            v = bm.verts.new((vx, vy, z))
            row.append((v, z, j, mn))
        grid.append(row)

    bm.verts.ensure_lookup_table()

    def mars_strata_color(z_val):
        if z_val < 6.0:
            return (0.52, 0.20, 0.11, 1.0)
        elif z_val < 16.0:
            return (0.72, 0.28, 0.14, 1.0)
        elif z_val < 26.0:
            return (0.86, 0.40, 0.18, 1.0)
        elif z_val < 34.0:
            return (0.66, 0.25, 0.13, 1.0)
        else:
            return (0.92, 0.52, 0.24, 1.0)

    for i in range(ang_segs):
        ni = (i + 1) % ang_segs
        for j in range(rad_bands - 1):
            a = grid[i][j]
            b = grid[ni][j]
            c = grid[ni][j + 1]
            d = grid[i][j + 1]
            for t0, t1, t2 in ((a, b, c), (a, c, d)):
                try:
                    f = bm.faces.new((t0[0], t1[0], t2[0]))
                    f.smooth = False
                    for loop, meta in zip(f.loops, (t0, t1, t2)):
                        loop[color_layer] = mars_strata_color(meta[1])
                except ValueError:
                    pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    gba.ensure_uvs_box(obj)

    return phase2.export_and_report("mars_canyon_ring.glb")


# ==============================================================================
# 8. ISS SUNLIT ORBITAL ATRIUM RIBS, HANDHOLDS & SOLAR WINGS (iss_orbital_ribs.glb)
# ==============================================================================
def gen_iss_orbital_ribs():
    gba.reset_scene()
    m_pbr = pbr_mat("iss_atrium_pbr", roughness=0.34, metallic=0.38)
    m_glow = phase1.glow_mat("iss_atrium_glow", (0.24, 0.88, 1.0), 1.45)
    m_warm = phase1.glow_mat("iss_handhold_glow", (1.0, 0.78, 0.20), 1.25)

    C_WHITE = (0.94, 0.96, 1.00)
    C_TITANIUM = (0.48, 0.54, 0.64)
    C_DARK = (0.16, 0.20, 0.28)
    C_GOLD = (0.96, 0.74, 0.14)
    C_SOLAR = (0.08, 0.24, 0.62)

    solid = []
    glows = []

    # 5 Crisp Metallic Curved Module Structural Ribs arching over the Level 2 deck (X = -15, -7.5, 0, +7.5, +15)
    # Placed at +Y_bl (-Z_three, behind the stations at Z = -3.4) so the rear camera at +Z_three (-Y_bl) has 100% clear sightlines!
    for rx in (-15.0, -7.5, 0.0, 7.5, 15.0):
        solid.extend([
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (rx, 7.2, 2.8), "scale": (0.65, 0.75, 5.6), "bevel": 0.06},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (rx, 6.0, 6.2), "scale": (0.58, 2.8, 0.55), "rot": (-0.38, 0, 0), "bevel": 0.05},
            # Warm Gold Interior Zero-G Crew Handhold Bars mounted along stanchions & deck!
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (rx, 6.55, 1.85), "radius": 0.05, "depth": 1.45, "segments": 8},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (rx + 3.6, 6.75, 1.35), "radius": 0.048, "depth": 2.6, "rot": (0, math.pi * 0.5, 0), "segments": 8} if rx < 14.0 else {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (rx, 6.55, 3.25), "radius": 0.05, "depth": 1.15, "segments": 8},
        ])
        glows.append({"type": "cube", "mat_idx": 0, "loc": (rx, 6.72, 2.8), "scale": (0.14, 0.08, 4.8)})

    # Longitudinal Overhead ISS Utility Conduit Truss Beam & Cupola Observation Window Frame (at +Y_bl -> -Z_three horizon!)
    solid.extend([
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0, 5.6, 6.7), "scale": (33.0, 0.85, 0.55), "bevel": 0.06},
        # Forward Cupola Observation Framing overlooking the Massive Rotating Blue Earth at -Z_three (+Y_bl)
        {"type": "torus", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 8.2, 3.1), "major": 4.2, "minor": 0.24, "rot": (math.pi * 0.5, 0, 0), "seg_u": 20, "seg_v": 6},
        # Warm Gold Handhold Safety Rail along the Cupola Promenade & Side Handholds
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 6.6, 1.05), "radius": 0.055, "depth": 28.0, "rot": (0, math.pi * 0.5, 0), "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-16.2, 0.0, 1.05), "radius": 0.055, "depth": 11.5, "rot": (math.pi * 0.5, 0, 0), "segments": 10},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (16.2, 0.0, 1.05), "radius": 0.055, "depth": 11.5, "rot": (math.pi * 0.5, 0, 0), "segments": 10},
    ])
    glows.extend([
        {"type": "cube", "mat_idx": 0, "loc": (0, 5.52, 6.42), "scale": (31.5, 0.16, 0.10)},
        {"type": "cube", "mat_idx": 1, "loc": (0, 6.6, 1.05), "scale": (26.0, 0.09, 0.09)},
    ])

    gba.build_mesh_object("ISSAtriumRibsBody", solid, [m_pbr], smooth_auto=False)
    gba.build_mesh_object("ISSAtriumRibsGlow", glows, [m_glow, m_warm], smooth_auto=False)

    # Massive Exterior Glowing Solar Array Wings flanking both ends of the ISS Deck (ISSolarArray)
    solar_parts = []
    for sx in (-22.5, 22.5):
        solar_parts.extend([
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (sx, 0, 0), "radius": 0.18, "depth": 14.5, "rot": (math.pi * 0.5, 0, 0), "segments": 8},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx - 2.1, 0, 0), "scale": (3.6, 13.6, 0.08), "bevel": 0.02},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (sx + 2.1, 0, 0), "scale": (3.6, 13.6, 0.08), "bevel": 0.02},
            {"type": "cube", "mat_idx": 1, "loc": (sx, 0, 0.06), "scale": (0.22, 13.6, 0.06)},
        ])
    gba.build_mesh_object("ISSolarArray", solar_parts, [m_pbr, m_warm], location=(0, 2.0, 2.6), smooth_auto=False)

    return phase2.export_and_report("iss_orbital_ribs.glb")


if __name__ == "__main__":
    results = [
        gen_moon_modular_base(),
        gen_moon_rover_6x6(),
        gen_moon_comm_tower(),
        gen_moon_crater_rocks(),
        gen_mars_return_base(),
        gen_mars_canyon_cliffs(),
        gen_mars_canyon_ring(),
        gen_iss_orbital_ribs(),
    ]
    print("PHASE3_BLENDER_ASSETS:", json.dumps(results, indent=2))
