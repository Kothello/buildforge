import bpy
import bmesh
import os
import math

OUTPUT_DIR = os.path.expanduser("~/Desktop/ProductEngineering-1/client/public/models/steel/")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def clear_scene():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)


def create_steel_material(name, color, metallic=0.9, roughness=0.4, alpha=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        mat.blend_method = 'BLEND' if hasattr(mat, 'blend_method') else None
        mat.surface_render_method = 'BLENDED' if hasattr(mat, 'surface_render_method') else None
    return mat


def export_glb(filepath):
    bpy.ops.export_scene.gltf(
        filepath=filepath,
        export_format='GLB',
        use_selection=False,
        export_apply=True
    )
    size = os.path.getsize(filepath)
    print(f"Exported: {os.path.basename(filepath)} ({size:,} bytes)")
    return size


def set_smooth(obj):
    for poly in obj.data.polygons:
        poly.use_smooth = True


def inches_to_feet(inches):
    return inches / 12.0


# =============================================================================
# 1. C-Channel
# =============================================================================
def generate_c_channel():
    clear_scene()

    web_h = inches_to_feet(6)
    flange_w = inches_to_feet(2)
    thick = inches_to_feet(0.125)
    length = 1.0

    bm = bmesh.new()

    verts = [
        (0, 0, 0),
        (flange_w, 0, 0),
        (flange_w, 0, thick),
        (thick, 0, thick),
        (thick, 0, web_h - thick),
        (flange_w, 0, web_h - thick),
        (flange_w, 0, web_h),
        (0, 0, web_h),
    ]

    front_verts = [bm.verts.new(v) for v in verts]
    back_verts = [bm.verts.new((v[0], length, v[2])) for v in verts]

    n = len(verts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([front_verts[i], front_verts[j], back_verts[j], back_verts[i]])

    bm.faces.new(front_verts)
    bm.faces.new(list(reversed(back_verts)))

    bm.normal_update()

    mesh = bpy.data.meshes.new("CChannel")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("CChannel", mesh)
    bpy.context.collection.objects.link(obj)

    bbox = [obj.matrix_world @ v.co for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= cz

    mat = create_steel_material("SteelGray", (0.5, 0.5, 0.52))
    obj.data.materials.append(mat)
    set_smooth(obj)

    export_glb(os.path.join(OUTPUT_DIR, "c-channel.glb"))


# =============================================================================
# 2. I-Beam (W8x10)
# =============================================================================
def generate_i_beam():
    clear_scene()

    height = inches_to_feet(8)
    flange_w = inches_to_feet(4)
    web_t = inches_to_feet(0.25)
    flange_t = inches_to_feet(0.31)
    length = 1.0

    half_fw = flange_w / 2
    half_wt = web_t / 2

    bm = bmesh.new()

    profile = [
        (-half_fw, 0),
        (half_fw, 0),
        (half_fw, flange_t),
        (half_wt, flange_t),
        (half_wt, height - flange_t),
        (half_fw, height - flange_t),
        (half_fw, height),
        (-half_fw, height),
        (-half_fw, height - flange_t),
        (-half_wt, height - flange_t),
        (-half_wt, flange_t),
        (-half_fw, flange_t),
    ]

    front_verts = [bm.verts.new((x, 0, z)) for x, z in profile]
    back_verts = [bm.verts.new((x, length, z)) for x, z in profile]

    n = len(profile)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([front_verts[i], front_verts[j], back_verts[j], back_verts[i]])

    bm.faces.new(front_verts)
    bm.faces.new(list(reversed(back_verts)))

    bm.normal_update()

    mesh = bpy.data.meshes.new("IBeam")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("IBeam", mesh)
    bpy.context.collection.objects.link(obj)

    bbox = [v.co.copy() for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= cz

    mat = create_steel_material("RedOxide", (0.545, 0.145, 0.0))
    obj.data.materials.append(mat)
    set_smooth(obj)

    export_glb(os.path.join(OUTPUT_DIR, "i-beam.glb"))


# =============================================================================
# 3. Wall Panel (corrugated)
# =============================================================================
def generate_wall_panel():
    clear_scene()

    width = 3.0
    height = 1.0
    thick = inches_to_feet(0.018)
    rib_height = inches_to_feet(1.0)
    major_spacing = 1.0
    num_major = int(width / major_spacing)

    bm = bmesh.new()

    x_positions = []
    z_offsets = []

    steps_per_rib = 6
    x = 0.0
    rib_top_w = inches_to_feet(1.5)
    rib_slope_w = inches_to_feet(0.75)

    segments = []
    cur_x = 0.0
    seg_width = width / num_major

    for r in range(num_major):
        base_x = r * seg_width
        flat1_end = base_x + (seg_width - rib_top_w - 2 * rib_slope_w) / 2
        slope_up_end = flat1_end + rib_slope_w
        top_end = slope_up_end + rib_top_w
        slope_down_end = top_end + rib_slope_w

        segments.append((base_x, 0))
        segments.append((flat1_end, 0))
        segments.append((slope_up_end, rib_height))
        segments.append((top_end, rib_height))
        segments.append((slope_down_end, 0))

    segments.append((width, 0))

    xs = [s[0] for s in segments]
    zs = [s[1] for s in segments]

    front_bottom = [bm.verts.new((x, 0, z)) for x, z in zip(xs, zs)]
    front_top = [bm.verts.new((x, 0, z + height)) for x, z in zip(xs, zs)]
    back_bottom = [bm.verts.new((x, thick, z)) for x, z in zip(xs, zs)]
    back_top = [bm.verts.new((x, thick, z + height)) for x, z in zip(xs, zs)]

    n = len(xs)
    for i in range(n - 1):
        bm.faces.new([front_bottom[i], front_bottom[i+1], front_top[i+1], front_top[i]])
        bm.faces.new([back_bottom[i+1], back_bottom[i], back_top[i], back_top[i+1]])

    for i in range(n - 1):
        bm.faces.new([front_top[i], front_top[i+1], back_top[i+1], back_top[i]])
        bm.faces.new([front_bottom[i+1], front_bottom[i], back_bottom[i], back_bottom[i+1]])

    bm.faces.new([front_bottom[0], back_bottom[0], back_top[0], front_top[0]])
    bm.faces.new([front_bottom[-1], front_top[-1], back_top[-1], back_bottom[-1]])

    bm.normal_update()

    mesh = bpy.data.meshes.new("WallPanel")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("WallPanel", mesh)
    bpy.context.collection.objects.link(obj)

    bbox = [v.co.copy() for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= cz

    mat = create_steel_material("LightGray", (0.7, 0.7, 0.72))
    obj.data.materials.append(mat)

    export_glb(os.path.join(OUTPUT_DIR, "wall-panel.glb"))


# =============================================================================
# 4. Roof Panel (standing seam)
# =============================================================================
def generate_roof_panel():
    clear_scene()

    width = inches_to_feet(16)
    length = 1.0
    thick = inches_to_feet(0.018)
    seam_h = inches_to_feet(1.5)
    seam_w = inches_to_feet(0.5)

    bm = bmesh.new()

    half_seam = seam_w / 2

    profile_x = [0, half_seam, half_seam, half_seam + inches_to_feet(0.25)]
    profile_z = [seam_h, seam_h, 0, 0]

    mid = width / 2
    right_start = width - half_seam - inches_to_feet(0.25)
    profile_x += [right_start, width - half_seam, width - half_seam, width]
    profile_z += [0, 0, seam_h, seam_h]

    front_bottom = [bm.verts.new((x, 0, z)) for x, z in zip(profile_x, profile_z)]
    front_top = [bm.verts.new((x, 0, z + thick)) for x, z in zip(profile_x, profile_z)]
    back_bottom = [bm.verts.new((x, length, z)) for x, z in zip(profile_x, profile_z)]
    back_top = [bm.verts.new((x, length, z + thick)) for x, z in zip(profile_x, profile_z)]

    n = len(profile_x)
    for i in range(n - 1):
        bm.faces.new([front_bottom[i], front_bottom[i+1], front_top[i+1], front_top[i]])
        bm.faces.new([back_bottom[i+1], back_bottom[i], back_top[i], back_top[i+1]])

    for i in range(n - 1):
        bm.faces.new([front_top[i], front_top[i+1], back_top[i+1], back_top[i]])
        bm.faces.new([front_bottom[i+1], front_bottom[i], back_bottom[i], back_bottom[i+1]])

    bm.faces.new([front_bottom[0], back_bottom[0], back_top[0], front_top[0]])
    bm.faces.new([front_bottom[-1], front_top[-1], back_top[-1], back_bottom[-1]])

    bm.normal_update()

    mesh = bpy.data.meshes.new("RoofPanel")
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new("RoofPanel", mesh)
    bpy.context.collection.objects.link(obj)

    bbox = [v.co.copy() for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.x -= cx
        v.co.y -= cy
        v.co.z -= cz

    mat = create_steel_material("DarkGray", (0.45, 0.45, 0.47))
    obj.data.materials.append(mat)

    export_glb(os.path.join(OUTPUT_DIR, "roof-panel.glb"))


# =============================================================================
# 5. Rollup Door
# =============================================================================
def generate_rollup_door():
    clear_scene()

    door_w = 10.0
    door_h = 10.0
    slat_h = inches_to_feet(6)
    frame_w = inches_to_feet(2)
    frame_d = inches_to_feet(3)
    slat_d = inches_to_feet(1)
    bevel_d = inches_to_feet(0.5)

    mat_frame = create_steel_material("DoorFrame", (0.35, 0.35, 0.37))
    mat_slat = create_steel_material("DoorSlat", (0.85, 0.85, 0.87), roughness=0.3)

    num_slats = int(door_h / slat_h)

    for i in range(num_slats):
        z = i * slat_h
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(0, 0, z + slat_h / 2)
        )
        slat = bpy.context.active_object
        slat.scale = (door_w - 2 * frame_w, slat_d, slat_h - inches_to_feet(0.25))
        slat.name = f"Slat_{i}"
        slat.data.materials.append(mat_slat)

    frame_parts = [
        (-(door_w / 2) + frame_w / 2, 0, door_h / 2, frame_w, frame_d, door_h),
        ((door_w / 2) - frame_w / 2, 0, door_h / 2, frame_w, frame_d, door_h),
        (0, 0, door_h + frame_w / 2, door_w, frame_d, frame_w),
    ]

    for idx, (x, y, z, sx, sy, sz) in enumerate(frame_parts):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
        frame = bpy.context.active_object
        frame.scale = (sx, sy, sz)
        frame.name = f"Frame_{idx}"
        frame.data.materials.append(mat_frame)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = bpy.data.objects["Slat_0"]
    bpy.ops.object.join()

    obj = bpy.context.active_object
    bbox = [v.co.copy() for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.y -= cy

    export_glb(os.path.join(OUTPUT_DIR, "rollup-door.glb"))


# =============================================================================
# 6. Personnel Door
# =============================================================================
def generate_personnel_door():
    clear_scene()

    door_w = 3.0
    door_h = 7.0
    frame_w = inches_to_feet(2)
    frame_d = inches_to_feet(3)
    door_d = inches_to_feet(1.75)
    panel_inset = inches_to_feet(0.5)

    mat_frame = create_steel_material("DoorFrameDark", (0.3, 0.3, 0.32))
    mat_door = create_steel_material("DoorBody", (0.4, 0.4, 0.42))
    mat_handle = create_steel_material("Handle", (0.55, 0.55, 0.55), roughness=0.2)

    frame_parts = [
        (-(door_w / 2) - frame_w / 2, 0, door_h / 2, frame_w, frame_d, door_h + frame_w),
        ((door_w / 2) + frame_w / 2, 0, door_h / 2, frame_w, frame_d, door_h + frame_w),
        (0, 0, door_h + frame_w / 2, door_w + 2 * frame_w, frame_d, frame_w),
    ]

    for idx, (x, y, z, sx, sy, sz) in enumerate(frame_parts):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
        f = bpy.context.active_object
        f.scale = (sx, sy, sz)
        f.name = f"DoorFrame_{idx}"
        f.data.materials.append(mat_frame)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, door_h / 2))
    door = bpy.context.active_object
    door.scale = (door_w, door_d, door_h)
    door.name = "DoorPanel"
    door.data.materials.append(mat_door)

    panel_h = (door_h - inches_to_feet(6)) / 2
    for i, z_center in enumerate([door_h * 0.28, door_h * 0.72]):
        bpy.ops.mesh.primitive_cube_add(
            size=1,
            location=(0, -(door_d / 2 + panel_inset / 2), z_center)
        )
        panel = bpy.context.active_object
        panel.scale = (door_w * 0.6, panel_inset, panel_h * 0.8)
        panel.name = f"Panel_{i}"
        panel.data.materials.append(mat_frame)

    handle_x = door_w / 2 - inches_to_feet(3)
    handle_z = door_h * 0.45

    bpy.ops.mesh.primitive_cylinder_add(
        radius=inches_to_feet(0.375),
        depth=inches_to_feet(1.5),
        location=(handle_x, -(door_d / 2 + inches_to_feet(0.75)), handle_z),
        rotation=(math.pi / 2, 0, 0)
    )
    base = bpy.context.active_object
    base.name = "HandleBase"
    base.data.materials.append(mat_handle)

    bpy.ops.mesh.primitive_cylinder_add(
        radius=inches_to_feet(0.25),
        depth=inches_to_feet(4),
        location=(handle_x, -(door_d / 2 + inches_to_feet(1.5)), handle_z),
        rotation=(0, 0, 0)
    )
    lever = bpy.context.active_object
    lever.name = "HandleLever"
    lever.data.materials.append(mat_handle)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = door
    bpy.ops.object.join()

    obj = bpy.context.active_object
    bbox = [v.co.copy() for v in obj.data.vertices]
    cy = sum(v.y for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.y -= cy

    export_glb(os.path.join(OUTPUT_DIR, "personnel-door.glb"))


# =============================================================================
# 7. Window
# =============================================================================
def generate_window():
    clear_scene()

    win_w = 3.0
    win_h = 4.0
    frame_w = inches_to_feet(2)
    frame_d = inches_to_feet(2)
    glass_d = inches_to_feet(0.25)
    mullion_w = inches_to_feet(1.5)

    mat_frame = create_steel_material("AluminumFrame", (0.75, 0.75, 0.78), roughness=0.3)
    mat_glass = create_steel_material("Glass", (0.7, 0.8, 0.95), metallic=0.0, roughness=0.05, alpha=0.3)

    frame_parts = [
        (-(win_w / 2) - frame_w / 2, 0, win_h / 2, frame_w, frame_d, win_h + 2 * frame_w),
        ((win_w / 2) + frame_w / 2, 0, win_h / 2, frame_w, frame_d, win_h + 2 * frame_w),
        (0, 0, win_h + frame_w / 2, win_w, frame_d, frame_w),
        (0, 0, -frame_w / 2, win_w, frame_d, frame_w),
    ]

    for idx, (x, y, z, sx, sy, sz) in enumerate(frame_parts):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
        f = bpy.context.active_object
        f.scale = (sx, sy, sz)
        f.name = f"WinFrame_{idx}"
        f.data.materials.append(mat_frame)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, win_h / 2))
    hmull = bpy.context.active_object
    hmull.scale = (win_w, frame_d * 0.6, mullion_w)
    hmull.name = "HMullion"
    hmull.data.materials.append(mat_frame)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, win_h / 2))
    vmull = bpy.context.active_object
    vmull.scale = (mullion_w, frame_d * 0.6, win_h)
    vmull.name = "VMullion"
    vmull.data.materials.append(mat_frame)

    pane_w = (win_w - mullion_w) / 2
    pane_h = (win_h - mullion_w) / 2

    for col in range(2):
        for row in range(2):
            px = -pane_w / 2 - mullion_w / 4 + col * (pane_w + mullion_w / 2)
            pz = pane_h / 2 + mullion_w / 4 + row * (pane_h + mullion_w / 2) - mullion_w / 4
            bpy.ops.mesh.primitive_cube_add(size=1, location=(px, 0, pz))
            glass = bpy.context.active_object
            glass.scale = (pane_w * 0.95, glass_d, pane_h * 0.95)
            glass.name = f"Glass_{col}_{row}"
            glass.data.materials.append(mat_glass)

    bpy.ops.object.select_all(action='SELECT')
    bpy.context.view_layer.objects.active = bpy.data.objects["WinFrame_0"]
    bpy.ops.object.join()

    obj = bpy.context.active_object
    bbox = [v.co.copy() for v in obj.data.vertices]
    cx = sum(v.x for v in bbox) / len(bbox)
    cy = sum(v.y for v in bbox) / len(bbox)
    cz = sum(v.z for v in bbox) / len(bbox)
    for v in obj.data.vertices:
        v.co.y -= cy

    export_glb(os.path.join(OUTPUT_DIR, "window.glb"))


# =============================================================================
# Run all generators
# =============================================================================
print("=" * 60)
print("Generating steel building component models...")
print("=" * 60)

generators = [
    ("C-Channel", generate_c_channel),
    ("I-Beam", generate_i_beam),
    ("Wall Panel", generate_wall_panel),
    ("Roof Panel", generate_roof_panel),
    ("Rollup Door", generate_rollup_door),
    ("Personnel Door", generate_personnel_door),
    ("Window", generate_window),
]

for name, func in generators:
    print(f"\nGenerating {name}...")
    try:
        func()
        print(f"  {name} complete.")
    except Exception as e:
        print(f"  ERROR generating {name}: {e}")
        import traceback
        traceback.print_exc()

print("\n" + "=" * 60)
print("All models generated!")
print("=" * 60)

for f in sorted(os.listdir(OUTPUT_DIR)):
    if f.endswith('.glb'):
        size = os.path.getsize(os.path.join(OUTPUT_DIR, f))
        print(f"  {f}: {size:,} bytes ({size/1024:.1f} KB)")
