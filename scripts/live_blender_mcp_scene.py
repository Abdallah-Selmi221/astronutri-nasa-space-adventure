"""
AstroNutri — Live Blender 5.3 MCP Showcase & GLB Exporter
Executed directly inside the user's live Blender 5.3 session via TCP 127.0.0.1:9876!
1. Exports all Phase-1 space assets + SPACE-FIT X Astronaut hero into E:/Nasa team/public/models/*.glb
2. Assembles the full AstroNutri Space Showcase Diorama inside the open Blender 5.3 viewport
   with dark cosmic world shader, studio lighting, and 120-frame looping keyframe animations.
"""

import math
import os
import sys

SCRIPTS_DIR = r"E:\Nasa team\scripts"
MODELS_DIR = r"E:\Nasa team\public\models"

if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

import bpy
from mathutils import Euler, Vector

import generate_blender_assets as gba
import generate_space_phase1_models as phase1

# Ensure OUT_DIR resolves properly even when run inside MCP exec()
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
            if item.users == 0:
                datablock_list.remove(item)
            else:
                try:
                    datablock_list.remove(item)
                except Exception:
                    pass


gba.reset_scene = mcp_safe_reset_scene
phase1.reset_scene = mcp_safe_reset_scene


def export_all_astronutri_glbs():
    exported = []
    # Export stylized SPACE-FIT X Astronaut Hero
    gba.generate_astronaut_hero()
    # Export all 9 Space Mission Map & Station Prop GLBs
    phase1.gen_earth_launchpad()
    phase1.gen_iss_orbit_station()
    phase1.gen_lunar_biodome_base()
    phase1.gen_orion_reentry_capsule()
    phase1.gen_prop_kitchen_counter()
    phase1.gen_prop_suit_rack()
    phase1.gen_prop_medical_pod()
    phase1.gen_prop_hydro_rack()
    phase1.gen_prop_storm_console()

    expected = [
        "astronaut_hero.glb",
        "earth_launchpad.glb",
        "iss_orbit_station.glb",
        "lunar_biodome_base.glb",
        "orion_reentry_capsule.glb",
        "prop_kitchen_counter.glb",
        "prop_suit_rack.glb",
        "prop_medical_pod.glb",
        "prop_hydro_rack.glb",
        "prop_storm_console.glb",
    ]
    for fname in expected:
        fpath = os.path.join(MODELS_DIR, fname)
        size_kb = round(os.path.getsize(fpath) / 1024.0, 1) if os.path.exists(fpath) else -1
        exported.append({"file": fname, "size_kb": size_kb})
    return exported


def create_showcase_anchor(name, glb_file, loc, scale=(1.0, 1.0, 1.0), rot_deg=(0.0, 0.0, 0.0)):
    anchor = bpy.data.objects.new(name, None)
    anchor.empty_display_type = "PLAIN_AXES"
    anchor.empty_display_size = 0.25
    bpy.context.scene.collection.objects.link(anchor)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(MODELS_DIR, glb_file))
    imported = [o for o in bpy.data.objects if o not in before]
    for obj in imported:
        if obj.parent is None:
            obj.parent = anchor

    anchor.location = Vector(loc)
    anchor.scale = Vector(scale)
    anchor.rotation_euler = Euler(
        (math.radians(rot_deg[0]), math.radians(rot_deg[1]), math.radians(rot_deg[2])),
        "XYZ",
    )
    return anchor


def add_bob_and_spin_keyframes(obj, base_loc, amp_z=0.18, spin_deg=0.0, sway_deg=6.0):
    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 120
    frames = [1, 31, 61, 91, 121]
    base_rot = tuple(obj.rotation_euler)
    for i, f in enumerate(frames):
        phase = (i / 4.0) * math.pi * 2.0
        obj.location = (
            base_loc[0],
            base_loc[1],
            base_loc[2] + math.sin(phase) * amp_z,
        )
        obj.rotation_euler = (
            base_rot[0] + math.sin(phase) * math.radians(sway_deg * 0.4),
            base_rot[1] + math.cos(phase) * math.radians(sway_deg * 0.4),
            base_rot[2] + math.radians(spin_deg * (i / 4.0)),
        )
        obj.keyframe_insert(data_path="location", frame=f)
        obj.keyframe_insert(data_path="rotation_euler", frame=f)


def build_live_blender_showcase():
    gba.reset_scene()
    scene = bpy.context.scene

    # Deep space world background shader
    world = bpy.data.worlds.new("AstroNutriDeepSpace")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs["Color"].default_value = (0.010, 0.020, 0.058, 1.0)
        bg.inputs["Strength"].default_value = 1.1

    # Import all 5 flagship hero models into one cohesive Space Trajectory Showcase
    a_astro = create_showcase_anchor("SpaceFitX_Astronaut_Hero", "astronaut_hero.glb", (0.0, -1.2, 0.0), scale=(1.15, 1.15, 1.15), rot_deg=(0, 0, 12))
    a_earth = create_showcase_anchor("Node1_Earth_Launchpad", "earth_launchpad.glb", (-5.4, 1.2, 0.0), scale=(1.05, 1.05, 1.05), rot_deg=(0, 0, -18))
    a_iss = create_showcase_anchor("Node2_ISS_Orbit_Station", "iss_orbit_station.glb", (-2.2, 2.2, 1.5), scale=(1.12, 1.12, 1.12), rot_deg=(8, -6, 15))
    a_lunar = create_showcase_anchor("Node3_Lunar_Biodome_Base", "lunar_biodome_base.glb", (2.4, 2.0, 0.35), scale=(1.15, 1.15, 1.15), rot_deg=(0, 0, 22))
    a_orion = create_showcase_anchor("Node4_Orion_Reentry_Capsule", "orion_reentry_capsule.glb", (5.5, 1.1, 0.8), scale=(1.12, 1.12, 1.12), rot_deg=(0, 0, -14))

    # Stylized glowing orbital runway deck ring beneath the hero astronaut
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=1.55, depth=0.14, location=(0.0, -1.2, -0.07))
    deck = bpy.context.active_object
    deck.name = "Orbital_Hero_Deck"
    mat_deck = gba.make_material("deck_dark", (0.06, 0.11, 0.22, 1.0), roughness=0.35, metallic=0.55)
    deck.data.materials.append(mat_deck)

    bpy.ops.mesh.primitive_torus_add(major_radius=1.56, minor_radius=0.04, location=(0.0, -1.2, 0.0))
    ring = bpy.context.active_object
    ring.name = "Orbital_Deck_Glow_Ring"
    mat_ring = gba.glow_mat_local if hasattr(gba, "glow_mat_local") else phase1.glow_mat("deck_cyan_glow", (0.14, 0.85, 1.0), 1.8)
    ring.data.materials.append(mat_ring)

    # Animate all 5 flagship models for live Blender 5.3 viewport feedback
    add_bob_and_spin_keyframes(a_astro, (0.0, -1.2, 0.0), amp_z=0.14, spin_deg=18.0, sway_deg=4.0)
    add_bob_and_spin_keyframes(a_earth, (-5.4, 1.2, 0.0), amp_z=0.06, spin_deg=0.0, sway_deg=1.5)
    add_bob_and_spin_keyframes(a_iss, (-2.2, 2.2, 1.5), amp_z=0.22, spin_deg=24.0, sway_deg=6.0)
    add_bob_and_spin_keyframes(a_lunar, (2.4, 2.0, 0.35), amp_z=0.08, spin_deg=8.0, sway_deg=2.0)
    add_bob_and_spin_keyframes(a_orion, (5.5, 1.1, 0.8), amp_z=0.26, spin_deg=-15.0, sway_deg=8.0)

    # Studio 3-point lighting
    bpy.ops.object.light_add(type="SUN", location=(6.0, -8.0, 9.0))
    sun = bpy.context.active_object
    sun.name = "CosmicKeySun"
    sun.data.energy = 3.2
    sun.rotation_euler = (math.radians(48), math.radians(15), math.radians(32))

    bpy.ops.object.light_add(type="POINT", location=(-4.5, -5.0, 4.0))
    rim_cyan = bpy.context.active_object
    rim_cyan.name = "CyanRimLight"
    rim_cyan.data.color = (0.22, 0.86, 1.0)
    rim_cyan.data.energy = 260.0

    bpy.ops.object.light_add(type="POINT", location=(5.0, -4.0, 3.5))
    rim_amber = bpy.context.active_object
    rim_amber.name = "SolarWarmRim"
    rim_amber.data.color = (1.0, 0.72, 0.35)
    rim_amber.data.energy = 190.0

    # Framing Camera
    bpy.ops.object.camera_add(location=(0.0, -11.4, 3.6))
    cam = bpy.context.active_object
    cam.name = "AstroNutriShowcaseCamera"
    direction = Vector((0.0, 1.0, 1.15)) - cam.location
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.frame_set(18)

    # Switch any open VIEW_3D area to Material Preview + Camera View + Play
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
        "scene_objects": [o.name for o in bpy.data.objects],
        "frame_range": [scene.frame_start, scene.frame_end],
    }


if __name__ == "__main__" or True:
    exported = export_all_astronutri_glbs()
    showcase = build_live_blender_showcase()
    result = {
        "exported_glbs": exported,
        "showcase": showcase,
    }
