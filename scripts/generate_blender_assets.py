"""
AstroNutri — Headless Blender 5.3 Procedural 3D Asset Pipeline
Generates three stylized, lightweight (< 1.5 MB, < 12k tris, minimal draw calls)
UV-unwrapped PBR .glb assets:
  1. public/models/astronaut_hero.glb   (SPACE-FIT X Prototype 1.0 with articulated pivots,
                                         live customizer material slots & packed AstroNutri badge)
  2. public/models/earth_island.glb     (Multi-tiered floating archipelago island with trees,
                                         flowers, crystals & launch pad marker)
  3. public/models/spaceship_craft.glb  (Sleek aerodynamic spacecraft with delta fins & canopy)

Run via:
  "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" --background --python scripts/generate_blender_assets.py
"""

import math
import os
import random
import bpy
import bmesh
from mathutils import Vector, Matrix, Euler


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(PROJECT_ROOT, "public", "models")


def srgb_to_lin(c):
    return (c ** 2.2) if c > 0 else 0.0


def col4(r, g, b, a=1.0):
    return (srgb_to_lin(r), srgb_to_lin(g), srgb_to_lin(b), a)


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for col in list(bpy.data.collections):
        bpy.data.collections.remove(col)


def set_bsdf_input(bsdf, names, value):
    for n in names:
        if n in bsdf.inputs:
            bsdf.inputs[n].default_value = value
            return


def make_material(
    name,
    color=(0.8, 0.8, 0.8, 1.0),
    roughness=0.5,
    metallic=0.0,
    emission_color=None,
    emission_strength=0.0,
    alpha=1.0,
    image=None,
    use_vertex_color=False,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    bsdf = nodes.get("Principled BSDF")
    if bsdf is None:
        bsdf = nodes.new("ShaderNodeBsdfPrincipled")

    lin_col = col4(color[0], color[1], color[2], color[3])
    set_bsdf_input(bsdf, ("Base Color",), lin_col)
    set_bsdf_input(bsdf, ("Roughness",), roughness)
    set_bsdf_input(bsdf, ("Metallic",), metallic)
    set_bsdf_input(bsdf, ("Specular IOR Level", "Specular"), 0.42)

    if emission_color is not None and emission_strength > 0.0:
        lin_em = col4(emission_color[0], emission_color[1], emission_color[2], 1.0)
        set_bsdf_input(bsdf, ("Emission Color", "Emission"), lin_em)
        set_bsdf_input(bsdf, ("Emission Strength",), emission_strength)

    if alpha < 1.0:
        set_bsdf_input(bsdf, ("Alpha",), alpha)
        mat.blend_method = "BLEND"

    if use_vertex_color:
        vcol = nodes.new("ShaderNodeVertexColor")
        vcol.layer_name = "Col"
        links.new(vcol.outputs["Color"], bsdf.inputs["Base Color"])

    if image is not None:
        tex_node = nodes.new("ShaderNodeTexImage")
        tex_node.image = image
        tex_node.extension = "CLIP"
        links.new(tex_node.outputs["Color"], bsdf.inputs["Base Color"])

    return mat


def create_astronutri_badge_image():
    """Creates a crisp packed RGBA AstroNutri emblem texture using pure Python."""
    w, h = 256, 128
    img = bpy.data.images.new("AstroNutriBadgeTex", width=w, height=h, alpha=False)
    pixels = [0.0] * (w * h * 4)

    def put_px(x, y, r, g, b):
        if 0 <= x < w and 0 <= y < h:
            idx = (y * w + x) * 4
            pixels[idx] = r
            pixels[idx + 1] = g
            pixels[idx + 2] = b
            pixels[idx + 3] = 1.0

    for y in range(h):
        ty = y / max(1, h - 1)
        for x in range(w):
            tx = x / max(1, w - 1)
            is_border = x < 6 or x >= w - 6 or y < 6 or y >= h - 6
            if is_border:
                put_px(x, y, 0.22, 0.74, 0.97)
            else:
                put_px(x, y, 0.06 + 0.04 * tx, 0.11 + 0.06 * ty, 0.22 + 0.08 * tx)

    cx, cy = 44, 64
    for y in range(cy - 32, cy + 33):
        for x in range(cx - 20, cx + 21):
            dx = abs(x - cx) / 18.0
            dy = abs(y - cy) / 28.0
            if dx + dy <= 1.0:
                put_px(x, y, 0.13, 0.83, 0.93)

    for y in range(cy - 9, cy + 10):
        for x in range(cx - 9, cx + 10):
            if (x - cx) ** 2 + (y - cy + 16) ** 2 <= 42:
                put_px(x, y, 0.96, 0.62, 0.05)

    FONT = {
        "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
        "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
        "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
        "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
        "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
        "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
        "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
        "I": ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
        "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
        "C": ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
        "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
        "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
        "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
        "-": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
        " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    }

    def draw_text(text, x0, y0, scale, color):
        cur_x = x0
        for ch in text:
            rows = FONT.get(ch, FONT[" "])
            for ry, row in enumerate(rows):
                for rx, bit in enumerate(row):
                    if bit == "1":
                        for sy in range(scale):
                            for sx in range(scale):
                                put_px(cur_x + rx * scale + sx, y0 - ry * scale - sy, *color)
            cur_x += 6 * scale

    draw_text("ASTRONUTRI", 76, 86, 2, (0.97, 0.98, 0.99))
    draw_text("SPACE-FIT X", 76, 52, 2, (0.22, 0.74, 0.97))

    img.pixels.foreach_set(pixels)
    img.pack()
    return img


def ensure_uvs_box(obj, scale=1.0):
    mesh = obj.data
    bm = bmesh.new()
    bm.from_mesh(mesh)
    uv_layer = bm.loops.layers.uv.verify()
    for face in bm.faces:
        n = face.normal
        ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
        for loop in face.loops:
            co = loop.vert.co * scale
            if az >= ax and az >= ay:
                u, v = co.x, co.y
            elif ax >= ay and ax >= az:
                u, v = co.y, co.z
            else:
                u, v = co.x, co.z
            loop[uv_layer].uv = (u * 0.5 + 0.5, v * 0.5 + 0.5)
    bm.to_mesh(mesh)
    bm.free()


def build_mesh_object(name, parts, materials, parent=None, location=(0, 0, 0), smooth_auto=False):
    """
    Builds a single compact bmesh object with per-loop sRGB->linear vertex colors ("Col")
    and explicit material index per part so multi-colored geometry merges into minimal draw calls!
    """
    mesh = bpy.data.meshes.new(name + "Mesh")
    bm = bmesh.new()
    col_layer = bm.loops.layers.color.new("Col")

    for p in parts:
        sub = bmesh.new()
        ptype = p["type"]
        loc = Vector(p.get("loc", (0.0, 0.0, 0.0)))
        rot = Euler(p.get("rot", (0.0, 0.0, 0.0)), "XYZ").to_matrix().to_4x4()
        scl = p.get("scale", (1.0, 1.0, 1.0))
        if isinstance(scl, (int, float)):
            scl = (scl, scl, scl)
        mat_s = Matrix.Diagonal((scl[0], scl[1], scl[2], 1.0))
        xf = Matrix.Translation(loc) @ rot @ mat_s

        if ptype == "cube":
            bmesh.ops.create_cube(sub, size=1.0)
        elif ptype == "bevel_cube":
            bmesh.ops.create_cube(sub, size=1.0)
            bmesh.ops.bevel(
                sub,
                geom=list(sub.edges),
                offset=p.get("bevel", 0.08),
                segments=p.get("segments", 2),
                affect="EDGES",
            )
        elif ptype == "sphere":
            bmesh.ops.create_uvsphere(
                sub,
                u_segments=p.get("u_seg", 12),
                v_segments=p.get("v_seg", 8),
                radius=p.get("radius", 0.5),
            )
        elif ptype == "icosphere":
            bmesh.ops.create_icosphere(
                sub,
                subdivisions=p.get("subdiv", 2),
                radius=p.get("radius", 0.5),
            )
        elif ptype == "cone":
            bmesh.ops.create_cone(
                sub,
                cap_ends=True,
                cap_tris=False,
                segments=p.get("segments", 10),
                radius1=p.get("r1", 0.5),
                radius2=p.get("r2", 0.0),
                depth=p.get("depth", 1.0),
            )
        elif ptype == "cylinder":
            bmesh.ops.create_cone(
                sub,
                cap_ends=True,
                cap_tris=False,
                segments=p.get("segments", 10),
                radius1=p.get("radius", 0.5),
                radius2=p.get("radius2", p.get("radius", 0.5)),
                depth=p.get("depth", 1.0),
            )
        elif ptype == "torus":
            major = p.get("major", 0.5)
            minor = p.get("minor", 0.08)
            seg_u = p.get("seg_u", 16)
            seg_v = p.get("seg_v", 6)
            verts_ring = []
            for iu in range(seg_u):
                au = (iu / seg_u) * math.pi * 2.0
                cu, su = math.cos(au), math.sin(au)
                ring = []
                for iv in range(seg_v):
                    av = (iv / seg_v) * math.pi * 2.0
                    cv, sv = math.cos(av), math.sin(av)
                    ring.append(sub.verts.new(((major + minor * cv) * cu, (major + minor * cv) * su, minor * sv)))
                verts_ring.append(ring)
            for iu in range(seg_u):
                iu_next = (iu + 1) % seg_u
                for iv in range(seg_v):
                    iv_next = (iv + 1) % seg_v
                    sub.faces.new(
                        (
                            verts_ring[iu][iv],
                            verts_ring[iu_next][iv],
                            verts_ring[iu_next][iv_next],
                            verts_ring[iu][iv_next],
                        )
                    )

        bmesh.ops.transform(sub, matrix=xf, verts=sub.verts)

        mat_idx = p.get("mat_idx", 0)
        vc = p.get("vcolor", (1.0, 1.0, 1.0))
        lin_vc = col4(vc[0], vc[1], vc[2], 1.0)

        vert_map = {}
        for v in sub.verts:
            vert_map[v] = bm.verts.new(v.co)
        for f in sub.faces:
            try:
                nf = bm.faces.new([vert_map[v] for v in f.verts])
                nf.material_index = mat_idx
                nf.smooth = p.get("smooth", smooth_auto)
                for loop in nf.loops:
                    loop[col_layer] = lin_vc
            except ValueError:
                pass
        sub.free()

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    for m in materials:
        obj.data.materials.append(m)
    obj.location = location
    bpy.context.scene.collection.objects.link(obj)
    if parent is not None:
        obj.parent = parent
    ensure_uvs_box(obj)
    return obj


def make_empty(name, location=(0, 0, 0), parent=None):
    emp = bpy.data.objects.new(name, None)
    emp.empty_display_size = 0.2
    emp.location = location
    bpy.context.scene.collection.objects.link(emp)
    if parent is not None:
        emp.parent = parent
    return emp


def count_scene_tris():
    total = 0
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            obj.data.calc_loop_triangles()
            total += len(obj.data.loop_triangles)
    return total


def export_glb(filename):
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, filename)
    tris = count_scene_tris()
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_texcoords=True,
        export_normals=True,
        export_draco_mesh_compression_enable=False,
    )
    size_kb = os.path.getsize(out_path) / 1024.0
    print(f"[Blender Export] {out_path} -> {tris} tris, {size_kb:.1f} KB")


# ==============================================================================
# 1. ASTRONAUT HERO (astronaut_hero.glb) — Only ~18 active draw calls!
#    Material 0: astronaut_vcolor (Vertex Color PBR for skin, hair, eyes, silver plates, boots)
#    Material 1: suit_theme_primary (Theme-customizable suit cloth/shell)
#    Material 2: suit_theme_accent  (Theme-customizable glowing electric cyan trim)
#    Material 3: visor_glass        (Toggleable translucent EVA helmet bubble)
#    Material 4: astronutri_badge   (Packed UV-unwrapped AstroNutri emblem on chest & back)
# ==============================================================================
def generate_astronaut_hero():
    reset_scene()
    badge_img = create_astronutri_badge_image()

    mat_vcolor = make_material("astronaut_vcolor", (1.0, 1.0, 1.0, 1.0), roughness=0.52, metallic=0.18, use_vertex_color=True)
    mat_primary = make_material("suit_theme_primary", (0.07, 0.09, 0.14, 1.0), roughness=0.72, metallic=0.14)
    mat_cyan = make_material(
        "suit_theme_accent",
        (0.13, 0.83, 0.93, 1.0),
        roughness=0.25,
        metallic=0.35,
        emission_color=(0.06, 0.65, 0.91, 1.0),
        emission_strength=1.45,
    )
    mat_visor = make_material(
        "visor_glass",
        (0.75, 0.94, 1.0, 1.0),
        roughness=0.06,
        metallic=0.18,
        emission_color=(0.05, 0.55, 0.85, 1.0),
        emission_strength=0.25,
        alpha=0.28,
    )
    mat_badge = make_material(
        "astronutri_badge",
        (1.0, 1.0, 1.0, 1.0),
        roughness=0.32,
        metallic=0.1,
        emission_color=(0.15, 0.45, 0.65, 1.0),
        emission_strength=0.15,
        image=badge_img,
    )

    # Color constants (sRGB 0..1)
    C_SILVER = (0.86, 0.90, 0.94)
    C_JOINT = (0.14, 0.17, 0.23)
    C_SKIN = (0.96, 0.72, 0.56)
    C_HAIR = (0.16, 0.11, 0.08)
    C_WHITE = (0.98, 0.99, 1.00)
    C_IRIS = (0.12, 0.56, 0.92)
    C_PUPIL = (0.04, 0.05, 0.08)
    C_MOUTH = (0.86, 0.32, 0.34)
    C_GOLD = (0.96, 0.74, 0.10)

    root = make_empty("AstronautRoot", (0, 0, 0))
    body_pivot = make_empty("BodyPivot", (0, 0, 0.92), parent=root)
    torso_group = make_empty("TorsoGroup", (0, 0, 0), parent=body_pivot)

    # Torso (3 draw calls: primary theme, silver/joint/gold vcolor, cyan glow)
    build_mesh_object(
        "TorsoArmor",
        [
            {"type": "bevel_cube", "mat_idx": 1, "loc": (0, 0, 0.02), "scale": (0.48, 0.29, 0.56), "bevel": 0.06},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, -0.02, 0.08), "scale": (0.50, 0.30, 0.34), "bevel": 0.05},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, 0, -0.22), "scale": (0.44, 0.27, 0.11), "bevel": 0.03},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.28, 0, 0.22), "scale": (0.14, 0.22, 0.10), "rot": (0, 0.25, 0), "bevel": 0.025},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0.28, 0, 0.22), "scale": (0.14, 0.22, 0.10), "rot": (0, -0.25, 0), "bevel": 0.025},
            {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (-0.16, -0.168, 0.18), "scale": (0.075, 0.025, 0.075)},
            {"type": "bevel_cube", "mat_idx": 2, "loc": (0, -0.155, -0.22), "scale": (0.14, 0.03, 0.08), "bevel": 0.01},
            {"type": "torus", "mat_idx": 2, "loc": (0, 0, 0.30), "major": 0.16, "minor": 0.025, "seg_u": 16, "seg_v": 6},
            {"type": "cylinder", "mat_idx": 2, "loc": (-0.21, -0.11, 0.02), "radius": 0.014, "depth": 0.42},
            {"type": "cylinder", "mat_idx": 2, "loc": (0.21, -0.11, 0.02), "radius": 0.014, "depth": 0.42},
        ],
        [mat_vcolor, mat_primary, mat_cyan],
        parent=torso_group,
        smooth_auto=True,
    )

    # Merged SuitBadge Front + Back into 1 SINGLE Mesh / Draw Call!
    badge_mesh = bpy.data.meshes.new("SuitBadgesMesh")
    bm = bmesh.new()
    uv_layer = bm.loops.layers.uv.verify()
    w2, h2 = 0.135, 0.068
    z_off = 0.05
    # Front (-Y)
    vf = [
        bm.verts.new((-w2, -0.176, z_off - h2)),
        bm.verts.new((w2, -0.176, z_off - h2)),
        bm.verts.new((w2, -0.176, z_off + h2)),
        bm.verts.new((-w2, -0.176, z_off + h2)),
    ]
    ff = bm.faces.new(vf)
    for loop, uv in zip(ff.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop[uv_layer].uv = uv
    # Back (+Y)
    vb = [
        bm.verts.new((w2, 0.176, z_off - h2)),
        bm.verts.new((-w2, 0.176, z_off - h2)),
        bm.verts.new((-w2, 0.176, z_off + h2)),
        bm.verts.new((w2, 0.176, z_off + h2)),
    ]
    fb = bm.faces.new(vb)
    for loop, uv in zip(fb.loops, [(0, 0), (1, 0), (1, 1), (0, 1)]):
        loop[uv_layer].uv = uv
    bm.to_mesh(badge_mesh)
    bm.free()
    badge_obj = bpy.data.objects.new("SuitBadges", badge_mesh)
    badge_obj.data.materials.append(mat_badge)
    bpy.context.scene.collection.objects.link(badge_obj)
    badge_obj.parent = torso_group

    # Backpacks (2 draw calls when active)
    build_mesh_object(
        "BackpackECLSS",
        [
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, 0.21, 0.04), "scale": (0.34, 0.15, 0.42), "bevel": 0.03},
            {"type": "cube", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0.295, -0.06), "scale": (0.14, 0.02, 0.10)},
            {"type": "cylinder", "mat_idx": 1, "loc": (-0.08, 0.24, 0.05), "radius": 0.055, "depth": 0.34},
            {"type": "cylinder", "mat_idx": 1, "loc": (0.08, 0.24, 0.05), "radius": 0.055, "depth": 0.34},
        ],
        [mat_vcolor, mat_cyan],
        parent=torso_group,
        smooth_auto=True,
    )

    build_mesh_object(
        "BackpackThruster",
        [
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, 0.21, 0.04), "scale": (0.32, 0.14, 0.36), "bevel": 0.03},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (-0.22, 0.22, 0.10), "scale": (0.20, 0.04, 0.14), "rot": (0, 0.35, 0), "bevel": 0.01},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0.22, 0.22, 0.10), "scale": (0.20, 0.04, 0.14), "rot": (0, -0.35, 0), "bevel": 0.01},
            {"type": "cone", "mat_idx": 1, "loc": (-0.10, 0.24, -0.18), "r1": 0.06, "r2": 0.035, "depth": 0.14},
            {"type": "cone", "mat_idx": 1, "loc": (0.10, 0.24, -0.18), "r1": 0.06, "r2": 0.035, "depth": 0.14},
        ],
        [mat_vcolor, mat_cyan],
        parent=torso_group,
        smooth_auto=True,
    )

    # HeadGroup -> HeadStylized (just 2 draw calls!) + HelmetVisor (2 draw calls, toggleable!)
    head_group = make_empty("HeadGroup", (0, 0, 0.36), parent=torso_group)
    build_mesh_object(
        "HeadStylized",
        [
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_SKIN, "loc": (0, 0, 0.05), "radius": 0.085, "depth": 0.12},
            {"type": "icosphere", "mat_idx": 0, "vcolor": C_SKIN, "loc": (0, 0, 0.24), "radius": 0.245, "subdiv": 2},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_HAIR, "loc": (0, 0.03, 0.31), "radius": 0.25, "scale": (1.02, 0.96, 0.85)},
            {"type": "cone", "mat_idx": 0, "vcolor": C_HAIR, "loc": (-0.06, -0.16, 0.45), "r1": 0.08, "r2": 0.01, "depth": 0.16, "rot": (0.65, 0, 0.25)},
            {"type": "cone", "mat_idx": 0, "vcolor": C_HAIR, "loc": (0.05, -0.15, 0.46), "r1": 0.07, "r2": 0.01, "depth": 0.14, "rot": (0.55, 0, -0.30)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_SKIN, "loc": (-0.23, 0.01, 0.23), "radius": 0.052},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_SKIN, "loc": (0.23, 0.01, 0.23), "radius": 0.052},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_JOINT, "loc": (-0.255, 0.01, 0.23), "radius": 0.062, "scale": (0.55, 1.0, 1.1)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0.255, 0.01, 0.23), "radius": 0.062, "scale": (0.55, 1.0, 1.1)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.085, -0.215, 0.255), "radius": 0.044, "scale": (1.0, 0.55, 1.15)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.085, -0.215, 0.255), "radius": 0.044, "scale": (1.0, 0.55, 1.15)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_IRIS, "loc": (-0.085, -0.235, 0.255), "radius": 0.028, "scale": (1.0, 0.55, 1.05)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_IRIS, "loc": (0.085, -0.235, 0.255), "radius": 0.028, "scale": (1.0, 0.55, 1.05)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_PUPIL, "loc": (-0.085, -0.244, 0.255), "radius": 0.017, "scale": (1.0, 0.55, 1.0)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_PUPIL, "loc": (0.085, -0.244, 0.255), "radius": 0.017, "scale": (1.0, 0.55, 1.0)},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_WHITE, "loc": (-0.095, -0.250, 0.268), "radius": 0.008},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_WHITE, "loc": (0.075, -0.250, 0.268), "radius": 0.008},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_MOUTH, "loc": (0, -0.228, 0.155), "scale": (0.09, 0.022, 0.024), "bevel": 0.006},
            {"type": "cylinder", "mat_idx": 1, "loc": (0.14, -0.18, 0.15), "radius": 0.011, "depth": 0.18, "rot": (0.2, 0, -1.15)},
        ],
        [mat_vcolor, mat_cyan],
        parent=head_group,
        smooth_auto=True,
    )

    build_mesh_object(
        "HelmetVisor",
        [
            {"type": "icosphere", "mat_idx": 0, "loc": (0, -0.01, 0.25), "radius": 0.34, "subdiv": 2},
        ],
        [mat_visor],
        parent=head_group,
        smooth_auto=True,
    )

    # Articulated Arms (3 draw calls each)
    for side_name, sx in (("LeftArmPivot", -1.0), ("RightArmPivot", 1.0)):
        arm_pivot = make_empty(side_name, (sx * 0.35, 0, 0.21), parent=torso_group)
        parts = [
            {"type": "sphere", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, 0, 0), "radius": 0.095},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, 0, -0.28), "radius": 0.072},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, 0, -0.41), "radius": 0.068, "radius2": 0.056, "depth": 0.22},
            {"type": "sphere", "mat_idx": 0, "vcolor": C_SKIN, "loc": (0, 0, -0.55), "radius": 0.068},
            {"type": "cylinder", "mat_idx": 1, "loc": (0, 0, -0.15), "radius": 0.075, "radius2": 0.068, "depth": 0.24},
            {"type": "torus", "mat_idx": 2, "loc": (0, 0, -0.16), "major": 0.082, "minor": 0.015, "seg_u": 14, "seg_v": 6},
            {"type": "cylinder", "mat_idx": 2, "loc": (sx * 0.085, 0, -0.27), "radius": 0.012, "depth": 0.44},
        ]
        if sx < 0:
            parts.append({"type": "cube", "mat_idx": 2, "loc": (-0.062, -0.02, -0.44), "scale": (0.024, 0.065, 0.09)})
        build_mesh_object(side_name + "Mesh", parts, [mat_vcolor, mat_primary, mat_cyan], parent=arm_pivot, smooth_auto=True)

    # Articulated Legs (3 draw calls each)
    for side_name, sx in (("LeftLegPivot", -1.0), ("RightLegPivot", 1.0)):
        leg_pivot = make_empty(side_name, (sx * 0.14, 0, -0.22), parent=body_pivot)
        parts = [
            {"type": "sphere", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, 0, -0.02), "radius": 0.10},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, -0.088, -0.32), "scale": (0.11, 0.04, 0.11), "bevel": 0.012},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_SILVER, "loc": (0, 0, -0.45), "radius": 0.082, "radius2": 0.072, "depth": 0.26},
            {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_JOINT, "loc": (0, -0.04, -0.62), "scale": (0.15, 0.25, 0.12), "bevel": 0.02},
            {"type": "cylinder", "mat_idx": 1, "loc": (0, 0, -0.17), "radius": 0.092, "radius2": 0.082, "depth": 0.26},
            {"type": "cylinder", "mat_idx": 2, "loc": (sx * 0.095, 0, -0.32), "radius": 0.013, "depth": 0.46},
            {"type": "cube", "mat_idx": 2, "loc": (0, -0.04, -0.685), "scale": (0.158, 0.26, 0.03)},
        ]
        build_mesh_object(side_name + "Mesh", parts, [mat_vcolor, mat_primary, mat_cyan], parent=leg_pivot, smooth_auto=True)

    export_glb("astronaut_hero.glb")


# ==============================================================================
# 2. FLOATING EARTH ISLAND WITH 3D WATER POND & WATERFALL (earth_island.glb) — 3 DRAW CALLS TOTAL!
# ==============================================================================
def generate_earth_island():
    reset_scene()
    rng = random.Random(42)

    mat_terrain = make_material("earth_island_pbr", (1.0, 1.0, 1.0, 1.0), roughness=0.78, metallic=0.05, use_vertex_color=True)
    mat_crystal = make_material(
        "earth_island_crystal",
        (0.22, 0.80, 0.98, 1.0),
        roughness=0.22,
        metallic=0.22,
        emission_color=(0.15, 0.72, 0.96, 1.0),
        emission_strength=0.65,
    )
    mat_pond_water = make_material(
        "earth_pond_water",
        (0.08, 0.78, 0.96, 1.0),
        roughness=0.08,
        metallic=0.12,
        emission_color=(0.05, 0.56, 0.84, 1.0),
        emission_strength=0.38,
        alpha=0.82,
    )

    C_GRASS = (0.14, 0.72, 0.34)
    C_SAND = (0.86, 0.72, 0.48)
    C_ROCK_WARM = (0.56, 0.34, 0.20)
    C_ROCK_DEEP = (0.38, 0.22, 0.14)
    C_PEBBLE_LIGHT = (0.64, 0.68, 0.74)
    C_PEBBLE_DARK = (0.42, 0.48, 0.56)
    C_POND_BED = (0.06, 0.32, 0.44)
    C_BARK = (0.42, 0.22, 0.09)
    C_LEAF = (0.10, 0.56, 0.24)
    C_LEAF_HI = (0.28, 0.82, 0.42)
    C_FLOWER = (0.98, 0.78, 0.22)
    C_LOTUS = (0.98, 0.44, 0.68)
    C_FOAM = (0.86, 0.97, 1.00)
    C_PAD = (0.20, 0.26, 0.36)

    pond_cx, pond_cy = 0.56, 0.34

    terrain_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GRASS, "loc": (0, 0, -0.025), "radius": 0.99, "radius2": 1.00, "depth": 0.05, "segments": 32},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_SAND, "loc": (0, 0, -0.018), "radius": 0.36, "depth": 0.04, "segments": 24},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SAND, "loc": (0, 0, -0.018), "scale": (1.52, 0.14, 0.04)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_SAND, "loc": (0, 0, -0.018), "scale": (0.14, 1.52, 0.04)},
        # Recessed Oasis Lagoon Bed & Sandy Shore Margin
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_SAND, "loc": (pond_cx, pond_cy, -0.016), "radius": 0.25, "depth": 0.036, "segments": 22},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_POND_BED, "loc": (pond_cx, pond_cy, -0.022), "radius": 0.20, "depth": 0.028, "segments": 20},
        # Rocky strata underneath
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_ROCK_WARM, "loc": (0, 0, -0.14), "radius": 0.76, "radius2": 0.95, "depth": 0.18, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_ROCK_DEEP, "loc": (0, 0, -0.31), "radius": 0.44, "radius2": 0.74, "depth": 0.18, "segments": 14},
        {"type": "cone", "mat_idx": 0, "vcolor": C_ROCK_DEEP, "loc": (0, 0, -0.50), "r1": 0.08, "r2": 0.42, "depth": 0.22, "segments": 10},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ROCK_WARM, "loc": (-0.64, -0.45, -0.22), "radius": 0.15, "subdiv": 1, "scale": (1.2, 1.0, 1.4)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ROCK_DEEP, "loc": (0.68, -0.38, -0.24), "radius": 0.16, "subdiv": 1, "scale": (1.1, 1.2, 1.3)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ROCK_WARM, "loc": (0.20, 0.72, -0.25), "radius": 0.14, "subdiv": 1},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ROCK_DEEP, "loc": (-0.42, 0.55, -0.44), "radius": 0.08, "subdiv": 1},
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ROCK_WARM, "loc": (0.46, -0.50, -0.48), "radius": 0.07, "subdiv": 1},
    ]

    # Shore pebbles & grass tufts + lotus pads around the Oasis Water Pond
    for i in range(14):
        pang = (i / 14.0) * math.pi * 2.0
        pr = 0.215 + (i % 3) * 0.015
        px, py = pond_cx + math.cos(pang) * pr, pond_cy + math.sin(pang) * pr
        # Leave slight spillway channel toward cliff edge (pang around 0.55 rad)
        if abs(((pang - 0.55 + math.pi) % (2 * math.pi)) - math.pi) < 0.35:
            continue
        terrain_parts.append({
            "type": "icosphere",
            "mat_idx": 0,
            "vcolor": C_PEBBLE_LIGHT if i % 2 == 0 else C_PEBBLE_DARK,
            "loc": (px, py, 0.008),
            "radius": 0.028 + (i % 2) * 0.009,
            "subdiv": 1,
            "scale": (1.2, 0.95, 0.55),
        })
        if i % 3 == 0:
            terrain_parts.append({
                "type": "cone",
                "mat_idx": 0,
                "vcolor": C_LEAF_HI,
                "loc": (px * 0.98 + 0.02 * math.cos(pang), py * 0.98 + 0.02 * math.sin(pang), 0.035),
                "r1": 0.020,
                "r2": 0.002,
                "depth": 0.065,
                "segments": 5,
            })

    # Two charming floating lily pads + pink lotus blossoms on the pond
    for lx, ly, has_lotus in ((pond_cx - 0.06, pond_cy + 0.04, True), (pond_cx + 0.07, pond_cy - 0.05, False)):
        terrain_parts.append({
            "type": "cylinder",
            "mat_idx": 0,
            "vcolor": C_LEAF_HI,
            "loc": (lx, ly, 0.008),
            "radius": 0.036,
            "depth": 0.008,
            "segments": 8,
        })
        if has_lotus:
            terrain_parts.append({
                "type": "icosphere",
                "mat_idx": 0,
                "vcolor": C_LOTUS,
                "loc": (lx, ly, 0.020),
                "radius": 0.017,
                "subdiv": 1,
                "scale": (1.0, 1.0, 0.72),
            })

    # Lush grass hillocks around island rim
    for i in range(10):
        ang = (i / 10.0) * math.pi * 2.0 + 0.18
        r = 0.84 + rng.uniform(0.0, 0.08)
        gx, gy = math.cos(ang) * r, math.sin(ang) * r
        if math.hypot(gx - pond_cx, gy - pond_cy) < 0.28:
            continue
        terrain_parts.append({
            "type": "sphere",
            "mat_idx": 0,
            "vcolor": C_GRASS,
            "loc": (gx, gy, -0.01),
            "radius": 0.12,
            "scale": (1.3, 1.1, 0.32),
            "u_seg": 10,
            "v_seg": 6,
        })

    # Pine & oasis trees around outer edge (keep pond open & visible)
    for i in range(6):
        ang = (i / 6.0) * math.pi * 2.0 + 0.52
        r = 0.87
        tx, ty = math.cos(ang) * r, math.sin(ang) * r
        if math.hypot(tx - pond_cx, ty - pond_cy) < 0.30:
            ang += 0.35
            tx, ty = math.cos(ang) * r, math.sin(ang) * r
        terrain_parts.extend([
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_BARK, "loc": (tx, ty, 0.055), "radius": 0.022, "radius2": 0.016, "depth": 0.11, "segments": 7},
            {"type": "cone", "mat_idx": 0, "vcolor": C_LEAF, "loc": (tx, ty, 0.14), "r1": 0.095, "r2": 0.01, "depth": 0.13, "segments": 7},
            {"type": "cone", "mat_idx": 0, "vcolor": C_LEAF_HI, "loc": (tx, ty, 0.21), "r1": 0.072, "r2": 0.01, "depth": 0.11, "segments": 7},
            {"type": "cone", "mat_idx": 0, "vcolor": C_LEAF_HI, "loc": (tx, ty, 0.265), "r1": 0.048, "r2": 0.005, "depth": 0.08, "segments": 7},
        ])

    for i in range(12):
        ang = (i / 12.0) * math.pi * 2.0 + 0.25
        r = 0.82 + (i % 2) * 0.09
        fx, fy = math.cos(ang) * r, math.sin(ang) * r
        if math.hypot(fx - pond_cx, fy - pond_cy) < 0.26:
            continue
        if i % 3 == 0:
            terrain_parts.append({
                "type": "cone",
                "mat_idx": 1,
                "loc": (fx, fy, 0.04),
                "r1": 0.028,
                "r2": 0.003,
                "depth": 0.09,
                "rot": (rng.uniform(-0.18, 0.18), rng.uniform(-0.18, 0.18), ang),
                "segments": 5,
            })
        else:
            terrain_parts.append({
                "type": "icosphere",
                "mat_idx": 0,
                "vcolor": C_FLOWER,
                "loc": (fx, fy, 0.018),
                "radius": 0.022,
                "subdiv": 1,
                "scale": (1.1, 1.1, 0.55),
            })

    # Cascading waterfall foam puff at cliff bottom + launchpad disc
    terrain_parts.extend([
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_FOAM, "loc": (0.94, 0.54, -0.34), "radius": 0.065, "subdiv": 1, "scale": (1.2, 1.2, 0.6)},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_PAD, "loc": (-0.70, -0.42, 0.004), "radius": 0.14, "depth": 0.012, "segments": 12},
    ])

    island_obj = build_mesh_object("EarthIslandTerrain", terrain_parts, [mat_terrain, mat_crystal], smooth_auto=False)
    bm = bmesh.new()
    bm.from_mesh(island_obj.data)
    for v in bm.verts:
        if v.co.z < -0.06:
            jitter = 1.0 + 0.09 * math.sin(v.co.x * 9.0 + v.co.z * 7.0) + 0.07 * math.cos(v.co.y * 8.0)
            v.co.x *= jitter
            v.co.y *= jitter
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(island_obj.data)
    bm.free()
    ensure_uvs_box(island_obj)

    # Named Oasis Water Pond + Cliff Spillway Stream (1 single translucent animated draw call)
    water_parts = [
        {"type": "cylinder", "mat_idx": 0, "loc": (pond_cx, pond_cy, 0.003), "radius": 0.195, "depth": 0.012, "segments": 24},
        # Spillway stream heading to outer cliff rim
        {"type": "bevel_cube", "mat_idx": 0, "loc": (0.76, 0.44, 0.002), "scale": (0.28, 0.085, 0.012), "rot": (0, 0, 0.48), "bevel": 0.004},
        # Cascading vertical waterfall ribbon over the cliff edge
        {"type": "bevel_cube", "mat_idx": 0, "loc": (0.93, 0.53, -0.17), "scale": (0.045, 0.085, 0.34), "rot": (0, 0.12, 0.48), "bevel": 0.008},
    ]
    build_mesh_object("OasisWaterPond", water_parts, [mat_pond_water], smooth_auto=True)

    export_glb("earth_island.glb")


# ==============================================================================
# 3. SLEEK SPACESHIP CRAFT (spaceship_craft.glb) — ONLY 2 DRAW CALLS TOTAL!
# ==============================================================================
def generate_spaceship_craft():
    reset_scene()

    mat_craft = make_material("spaceship_pbr", (1.0, 1.0, 1.0, 1.0), roughness=0.32, metallic=0.28, use_vertex_color=True)
    mat_glow = make_material(
        "spaceship_emissive",
        (0.22, 0.85, 0.99, 1.0),
        roughness=0.12,
        metallic=0.35,
        emission_color=(0.10, 0.78, 0.98, 1.0),
        emission_strength=1.4,
    )

    C_HULL = (0.94, 0.96, 0.99)
    C_NOSE = (0.95, 0.36, 0.12)
    C_SLATE = (0.16, 0.22, 0.32)

    craft_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_SLATE, "loc": (0, 0, 0.07), "radius": 0.88, "radius2": 0.96, "depth": 0.14, "segments": 12},
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.15), "major": 0.78, "minor": 0.032, "seg_u": 20, "seg_v": 6},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_SLATE, "loc": (0, 0, 0.32), "radius": 0.36, "radius2": 0.44, "depth": 0.26, "segments": 14},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL, "loc": (0, 0, 1.02), "radius": 0.44, "radius2": 0.34, "depth": 1.18, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_NOSE, "loc": (0, 0, 1.94), "r1": 0.34, "r2": 0.02, "depth": 0.68, "segments": 16},
        {"type": "sphere", "mat_idx": 1, "loc": (0, -0.35, 1.24), "radius": 0.19, "scale": (1.05, 0.68, 1.35), "u_seg": 14, "v_seg": 10},
        {"type": "torus", "mat_idx": 0, "vcolor": C_NOSE, "loc": (0, 0, 0.72), "major": 0.435, "minor": 0.028, "seg_u": 18, "seg_v": 6},
        {"type": "cone", "mat_idx": 0, "vcolor": C_SLATE, "loc": (-0.18, 0, 0.22), "r1": 0.15, "r2": 0.09, "depth": 0.24, "segments": 10},
        {"type": "cone", "mat_idx": 0, "vcolor": C_SLATE, "loc": (0.18, 0, 0.22), "r1": 0.15, "r2": 0.09, "depth": 0.24, "segments": 10},
        {"type": "icosphere", "mat_idx": 1, "loc": (-0.18, 0, 0.14), "radius": 0.095, "subdiv": 1},
        {"type": "icosphere", "mat_idx": 1, "loc": (0.18, 0, 0.14), "radius": 0.095, "subdiv": 1},
    ]

    for k in range(3):
        ang = (k / 3.0) * math.pi * 2.0 + math.pi / 6.0
        craft_parts.append({
            "type": "bevel_cube",
            "mat_idx": 0,
            "vcolor": C_NOSE,
            "loc": (math.cos(ang) * 0.48, math.sin(ang) * 0.48, 0.56),
            "scale": (0.36, 0.06, 0.54),
            "rot": (0, -0.24, ang),
            "bevel": 0.012,
        })

    build_mesh_object("SpaceshipCraft", craft_parts, [mat_craft, mat_glow], smooth_auto=True)
    export_glb("spaceship_craft.glb")


# ==============================================================================
# 4. LUNAR CRATER COLONY ISLAND (lunar_island.glb) — ONLY 2 DRAW CALLS TOTAL!
# ==============================================================================
def generate_lunar_island():
    reset_scene()
    rng = random.Random(108)

    mat_lunar = make_material("lunar_terrain_pbr", (1.0, 1.0, 1.0, 1.0), roughness=0.86, metallic=0.06, use_vertex_color=True)
    mat_glow = make_material(
        "lunar_beacon_glow",
        (0.28, 0.85, 0.99, 1.0),
        roughness=0.16,
        metallic=0.25,
        emission_color=(0.14, 0.78, 0.98, 1.0),
        emission_strength=1.25,
    )

    C_REGOLITH = (0.78, 0.81, 0.86)
    C_REGOLITH_MID = (0.58, 0.62, 0.70)
    C_BASALT = (0.34, 0.37, 0.44)
    C_DOME = (0.94, 0.96, 0.99)
    C_SOLAR = (0.10, 0.24, 0.58)
    C_GOLD_FOIL = (0.95, 0.68, 0.14)
    C_ECLSS_TANK = (0.74, 0.86, 0.95)

    lunar_parts = [
        # Main Moon regolith plateau (dense subdivisions around edge for crater rim sculpting)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_REGOLITH, "loc": (0, 0, -0.025), "radius": 0.99, "radius2": 1.00, "depth": 0.05, "segments": 32},
        # Center rover / landing plaza (crisp dark titanium grey, flat at Z=0)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASALT, "loc": (0, 0, -0.018), "radius": 0.35, "depth": 0.04, "segments": 24},
        {"type": "cube", "mat_idx": 0, "vcolor": C_REGOLITH_MID, "loc": (0, 0, -0.018), "scale": (1.46, 0.13, 0.04)},
        {"type": "cube", "mat_idx": 0, "vcolor": C_REGOLITH_MID, "loc": (0, 0, -0.018), "scale": (0.13, 1.46, 0.04)},
        # Rocky lunar basalt crust underneath
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_REGOLITH_MID, "loc": (0, 0, -0.14), "radius": 0.74, "radius2": 0.95, "depth": 0.18, "segments": 18},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASALT, "loc": (0, 0, -0.31), "radius": 0.42, "radius2": 0.72, "depth": 0.18, "segments": 14},
        {"type": "cone", "mat_idx": 0, "vcolor": C_BASALT, "loc": (0, 0, -0.50), "r1": 0.07, "r2": 0.40, "depth": 0.22, "segments": 10},
        # Pressurized Artemis Habitat Dome & Airlock at (-0.64, -0.44)
        {"type": "sphere", "mat_idx": 0, "vcolor": C_DOME, "loc": (-0.64, -0.44, 0.01), "radius": 0.18, "scale": (1.0, 1.0, 0.78), "u_seg": 14, "v_seg": 10},
        {"type": "torus", "mat_idx": 1, "loc": (-0.64, -0.44, 0.02), "major": 0.185, "minor": 0.014, "seg_u": 18, "seg_v": 6},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_BASALT, "loc": (-0.48, -0.34, 0.055), "scale": (0.14, 0.11, 0.10), "rot": (0, 0, 0.6), "bevel": 0.015},
        {"type": "bevel_cube", "mat_idx": 1, "loc": (-0.64, -0.60, 0.08), "scale": (0.09, 0.02, 0.05), "bevel": 0.005},
        # ECLSS Water Recovery Tower at (+0.66, -0.22)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_ECLSS_TANK, "loc": (0.64, -0.22, 0.13), "radius": 0.065, "depth": 0.24, "segments": 12},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD_FOIL, "loc": (0.76, -0.18, 0.10), "radius": 0.05, "depth": 0.18, "segments": 10},
        {"type": "cylinder", "mat_idx": 1, "loc": (0.64, -0.22, 0.18), "radius": 0.069, "depth": 0.03, "segments": 12},
        # Solar Power Wing Array at (-0.16, +0.74)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASALT, "loc": (-0.16, 0.74, 0.09), "radius": 0.025, "depth": 0.16, "segments": 8},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR, "loc": (-0.16, 0.74, 0.18), "scale": (0.34, 0.14, 0.016), "rot": (0.45, 0, 0.15), "bevel": 0.005},
    ]

    # 3 Distinct Impact Craters with raised rim rings + dark basalt crater floor!
    crater_specs = [(0.56, 0.44, 0.17), (-0.64, 0.36, 0.14), (0.44, -0.64, 0.15)]
    for cx, cy, cr in crater_specs:
        lunar_parts.extend([
            {"type": "torus", "mat_idx": 0, "vcolor": C_REGOLITH, "loc": (cx, cy, 0.018), "major": cr, "minor": 0.032, "seg_u": 16, "seg_v": 6},
            {"type": "cylinder", "mat_idx": 0, "vcolor": C_BASALT, "loc": (cx, cy, -0.004), "radius": cr * 0.85, "depth": 0.016, "segments": 14},
        ])

    # Lunar rocks, regolith hills & glowing helium-3/water-ice indicator beacons
    for i in range(9):
        ang = (i / 9.0) * math.pi * 2.0 + 0.3
        r = 0.84 + rng.uniform(0.0, 0.09)
        rx, ry = math.cos(ang) * r, math.sin(ang) * r
        lunar_parts.append({
            "type": "icosphere",
            "mat_idx": 0,
            "vcolor": C_REGOLITH_MID if i % 2 == 0 else C_BASALT,
            "loc": (rx, ry, 0.025),
            "radius": 0.048 + (i % 3) * 0.018,
            "subdiv": 1,
            "scale": (1.2, 0.9, 0.7),
        })
        if i % 3 == 0:
            lunar_parts.append({
                "type": "cone",
                "mat_idx": 1,
                "loc": (rx * 0.90, ry * 0.90, 0.045),
                "r1": 0.024,
                "r2": 0.003,
                "depth": 0.085,
                "segments": 5,
            })

    lunar_obj = build_mesh_object("LunarIslandTerrain", lunar_parts, [mat_lunar, mat_glow], smooth_auto=False)
    bm = bmesh.new()
    bm.from_mesh(lunar_obj.data)
    for v in bm.verts:
        if v.co.z < -0.06:
            jitter = 1.0 + 0.11 * math.sin(v.co.x * 10.0 + v.co.z * 6.0) + 0.08 * math.cos(v.co.y * 9.0)
            v.co.x *= jitter
            v.co.y *= jitter
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(lunar_obj.data)
    bm.free()
    ensure_uvs_box(lunar_obj)

    export_glb("lunar_island.glb")


# ==============================================================================
# 5. ZERO-G ORBITAL STATION & ASTEROID 2010 PK (orbital_station.glb) — 4 DRAW CALLS TOTAL!
# ==============================================================================
def generate_orbital_station():
    reset_scene()

    mat_station = make_material("orbital_station_pbr", (1.0, 1.0, 1.0, 1.0), roughness=0.38, metallic=0.32, use_vertex_color=True)
    mat_glow = make_material(
        "orbital_station_glow",
        (0.20, 0.86, 0.99, 1.0),
        roughness=0.14,
        metallic=0.35,
        emission_color=(0.12, 0.78, 0.98, 1.0),
        emission_strength=1.35,
    )

    C_HULL_WHITE = (0.93, 0.96, 1.00)
    C_TITANIUM = (0.30, 0.36, 0.48)
    C_DARK_DECK = (0.16, 0.21, 0.32)
    C_SOLAR_BLUE = (0.09, 0.24, 0.62)
    C_GOLD = (0.96, 0.70, 0.12)
    C_ASTEROID = (0.42, 0.34, 0.56)

    station_parts = [
        # Main flat titanium Zero-G Station Deck (Z=0 crisp platform for walking/floating in Level 2)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_DARK_DECK, "loc": (0, 0, -0.025), "radius": 0.98, "radius2": 1.00, "depth": 0.05, "segments": 24},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 0, -0.016), "radius": 0.40, "depth": 0.036, "segments": 20},
        # Glowing outer docking ring halo
        {"type": "torus", "mat_idx": 1, "loc": (0, 0, 0.012), "major": 0.96, "minor": 0.020, "seg_u": 28, "seg_v": 6},
        # Structural under-truss + keel pod
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (0, 0, -0.16), "radius": 0.54, "radius2": 0.88, "depth": 0.20, "segments": 16},
        {"type": "cone", "mat_idx": 0, "vcolor": C_DARK_DECK, "loc": (0, 0, -0.36), "r1": 0.14, "r2": 0.44, "depth": 0.22, "segments": 12},
        # Pressurized Orbital Habitat Cupola & Research Modules around perimeter
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL_WHITE, "loc": (-0.68, -0.44, 0.08), "radius": 0.13, "depth": 0.16, "segments": 12},
        {"type": "sphere", "mat_idx": 1, "loc": (-0.68, -0.44, 0.16), "radius": 0.10, "scale": (1.0, 1.0, 0.65), "u_seg": 12, "v_seg": 8},
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_HULL_WHITE, "loc": (0.68, 0.42, 0.075), "radius": 0.11, "depth": 0.14, "segments": 12},
        {"type": "torus", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0.68, 0.42, 0.14), "major": 0.11, "minor": 0.015, "seg_u": 14, "seg_v": 6},
        # Comm Relay Dish at (-0.28, 0.78)
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_TITANIUM, "loc": (-0.28, 0.78, 0.10), "radius": 0.022, "depth": 0.18, "segments": 8},
        {"type": "cone", "mat_idx": 0, "vcolor": C_HULL_WHITE, "loc": (-0.28, 0.78, 0.21), "r1": 0.02, "r2": 0.13, "depth": 0.06, "rot": (0.5, 0, 0.4), "segments": 12},
    ]

    # 4 radial pressurized airlock collars
    for k in range(4):
        ang = (k / 4.0) * math.pi * 2.0 + math.pi / 4.0
        station_parts.append({
            "type": "bevel_cube",
            "mat_idx": 0,
            "vcolor": C_HULL_WHITE,
            "loc": (math.cos(ang) * 0.86, math.sin(ang) * 0.86, 0.055),
            "scale": (0.16, 0.12, 0.10),
            "rot": (0, 0, ang),
            "bevel": 0.015,
        })

    build_mesh_object("OrbitalStationCore", station_parts, [mat_station, mat_glow], smooth_auto=True)

    # Named Animated Solar Wing Array (tilts cleanly in animate())
    solar_parts = [
        {"type": "cylinder", "mat_idx": 0, "vcolor": C_GOLD, "loc": (0, 0, 0), "radius": 0.024, "depth": 1.35, "rot": (0, math.pi / 2.0, 0), "segments": 10},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR_BLUE, "loc": (-0.40, 0, 0), "scale": (0.48, 0.24, 0.018), "bevel": 0.004},
        {"type": "bevel_cube", "mat_idx": 0, "vcolor": C_SOLAR_BLUE, "loc": (0.40, 0, 0), "scale": (0.48, 0.24, 0.018), "bevel": 0.004},
        {"type": "cube", "mat_idx": 1, "loc": (0, 0, 0.02), "scale": (0.95, 0.02, 0.012)},
    ]
    build_mesh_object("SolarWingSpin", solar_parts, [mat_station, mat_glow], location=(0.0, 0.88, 0.22), smooth_auto=False)

    # Named Asteroid 2010 PK tumbling nearby
    asteroid_parts = [
        {"type": "icosphere", "mat_idx": 0, "vcolor": C_ASTEROID, "loc": (0, 0, 0), "radius": 0.22, "subdiv": 1, "scale": (1.28, 0.92, 0.86)},
        {"type": "cone", "mat_idx": 1, "loc": (0.14, 0.06, 0.12), "r1": 0.025, "r2": 0.003, "depth": 0.08, "rot": (0.4, 0.5, 0), "segments": 5},
    ]
    ast_obj = build_mesh_object("Asteroid2010PK", asteroid_parts, [mat_station, mat_glow], location=(1.18, 0.82, 0.26), smooth_auto=False)
    bm_a = bmesh.new()
    bm_a.from_mesh(ast_obj.data)
    for v in bm_a.verts:
        k = 1.0 + 0.14 * math.sin(v.co.x * 16.0) * math.cos(v.co.y * 14.0)
        v.co *= k
    bmesh.ops.recalc_face_normals(bm_a, faces=bm_a.faces)
    bm_a.to_mesh(ast_obj.data)
    bm_a.free()
    ensure_uvs_box(ast_obj)

    export_glb("orbital_station.glb")


# ==============================================================================
# 6. PLANETARY FLIGHT PACK (planet_pack.glb) — Sculpted Earth, Moon, Mars & Saturn!
# ==============================================================================
def generate_planet_pack():
    reset_scene()

    mat_planet = make_material("planet_pack_pbr", (1.0, 1.0, 1.0, 1.0), roughness=0.58, metallic=0.08, use_vertex_color=True)
    mat_halo = make_material(
        "planet_atmosphere_glow",
        (0.28, 0.86, 1.00, 1.0),
        roughness=0.18,
        metallic=0.05,
        emission_color=(0.15, 0.72, 0.98, 1.0),
        emission_strength=0.65,
        alpha=0.26,
    )

    # 1) PlanetEarth (Origin at 0,0,0 — radius 1.0)
    earth_parts = [
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.10, 0.45, 0.92), "loc": (0, 0, 0), "radius": 1.0, "u_seg": 20, "v_seg": 14},
        # Low-poly green continent patches hugging sphere surface
        {"type": "icosphere", "mat_idx": 0, "vcolor": (0.18, 0.74, 0.36), "loc": (0.36, -0.52, 0.56), "radius": 0.42, "subdiv": 1, "scale": (1.1, 0.8, 0.9)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": (0.24, 0.78, 0.40), "loc": (-0.54, 0.36, 0.48), "radius": 0.38, "subdiv": 1, "scale": (0.95, 1.15, 0.8)},
        {"type": "icosphere", "mat_idx": 0, "vcolor": (0.88, 0.78, 0.50), "loc": (0.48, 0.45, 0.25), "radius": 0.34, "subdiv": 1, "scale": (0.85, 0.9, 0.7)},
        # White polar cap & wispy clouds
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.96, 0.98, 1.0), "loc": (0, 0, 0.82), "radius": 0.32, "u_seg": 12, "v_seg": 8, "scale": (1.3, 1.3, 0.5)},
        # Translucent cyan atmosphere shell
        {"type": "sphere", "mat_idx": 1, "loc": (0, 0, 0), "radius": 1.08, "u_seg": 18, "v_seg": 12},
    ]
    build_mesh_object("PlanetEarth", earth_parts, [mat_planet, mat_halo], location=(0, 0, 0), smooth_auto=True)

    # 2) PlanetMoon (Radius 1.0)
    moon_parts = [
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.76, 0.79, 0.84), "loc": (0, 0, 0), "radius": 1.0, "u_seg": 18, "v_seg": 12},
        {"type": "icosphere", "mat_idx": 0, "vcolor": (0.50, 0.54, 0.62), "loc": (0.42, -0.58, 0.38), "radius": 0.34, "subdiv": 1, "scale": (1.0, 0.6, 1.0)},
        {"type": "torus", "mat_idx": 0, "vcolor": (0.84, 0.86, 0.90), "loc": (-0.50, -0.64, 0.30), "major": 0.24, "minor": 0.055, "rot": (1.1, 0.2, 0.5), "seg_u": 14, "seg_v": 6},
        {"type": "torus", "mat_idx": 0, "vcolor": (0.68, 0.72, 0.78), "loc": (0.35, -0.50, -0.60), "major": 0.20, "minor": 0.045, "rot": (-0.9, 0.4, 0.2), "seg_u": 14, "seg_v": 6},
    ]
    build_mesh_object("PlanetMoon", moon_parts, [mat_planet], location=(0, 0, 0), smooth_auto=False)

    # 3) PlanetMars (Radius 1.0)
    mars_parts = [
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.86, 0.36, 0.16), "loc": (0, 0, 0), "radius": 1.0, "u_seg": 18, "v_seg": 12},
        {"type": "icosphere", "mat_idx": 0, "vcolor": (0.60, 0.22, 0.12), "loc": (-0.42, -0.52, -0.18), "radius": 0.44, "subdiv": 1, "scale": (1.1, 0.75, 0.9)},
        {"type": "cone", "mat_idx": 0, "vcolor": (0.92, 0.46, 0.22), "loc": (0.46, -0.76, 0.22), "r1": 0.24, "r2": 0.04, "depth": 0.24, "rot": (1.3, 0, -0.5), "segments": 10},
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.98, 0.96, 0.95), "loc": (0, 0, 0.86), "radius": 0.26, "u_seg": 12, "v_seg": 8, "scale": (1.25, 1.25, 0.45)},
    ]
    build_mesh_object("PlanetMars", mars_parts, [mat_planet], location=(0, 0, 0), smooth_auto=True)

    # 4) PlanetSaturn (Radius 1.0 sphere + wide sculpted multi-band ice ring to ~2.1)
    saturn_parts = [
        {"type": "sphere", "mat_idx": 0, "vcolor": (0.95, 0.78, 0.44), "loc": (0, 0, 0), "radius": 1.0, "u_seg": 18, "v_seg": 12, "scale": (1.0, 1.0, 0.90)},
        {"type": "torus", "mat_idx": 0, "vcolor": (0.98, 0.88, 0.62), "loc": (0, 0, 0), "major": 1.55, "minor": 0.12, "scale": (1.0, 1.0, 0.14), "rot": (0.36, 0.18, 0), "seg_u": 28, "seg_v": 6},
        {"type": "torus", "mat_idx": 0, "vcolor": (0.84, 0.68, 0.42), "loc": (0, 0, 0), "major": 1.92, "minor": 0.09, "scale": (1.0, 1.0, 0.12), "rot": (0.36, 0.18, 0), "seg_u": 28, "seg_v": 6},
    ]
    build_mesh_object("PlanetSaturn", saturn_parts, [mat_planet], location=(0, 0, 0), smooth_auto=True)

    export_glb("planet_pack.glb")


if __name__ == "__main__":
    generate_astronaut_hero()
    generate_earth_island()
    generate_spaceship_craft()
    generate_lunar_island()
    generate_orbital_station()
    generate_planet_pack()
    print("[Blender Pipeline] All 6 GLB assets exported cleanly.")
