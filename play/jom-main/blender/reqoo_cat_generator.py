import bpy, math
from mathutils import Vector

# REQOO CAT - Blender 4.x prototype
# Run the whole script from Scripting > Run Script.
# This version keeps the cat meshes visible in Object/Pose mode and creates a clean preview.

bpy.ops.object.mode_set(mode='OBJECT') if bpy.context.object and bpy.context.object.mode != 'OBJECT' else None
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.armatures):
    pass

# ---------- materials ----------
def mat(name, color, metallic=0.0, rough=0.55):
    m=bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.diffuse_color=(*color,1)
    m.metallic=metallic
    m.roughness=rough
    return m
fur=mat('Reqoo Orange Fur',(0.95,0.43,0.12))
cream=mat('Face Cream',(1.0,0.76,0.48))
blue=mat('Reqoo Blue Collar',(0.08,0.34,0.72),0.05,0.35)
gold=mat('Gold Bell',(1.0,0.62,0.05),0.55,0.22)
dark=mat('Eyes',(0.025,0.015,0.01),0,0.3)
white=mat('Eye White',(1,1,1))
pink=mat('Nose',(0.95,0.22,0.30))
groundmat=mat('Ground',(0.22,0.62,0.24))

parts=[]
def uv(name, loc, scale, material, seg=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.data.materials.append(material); o.hide_set(False); o.hide_viewport=False; o.hide_render=False
    parts.append(o); return o

def cone(name, loc, r1, r2, depth, material, rot=(0,0,0)):
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=r1, radius2=r2, depth=depth, location=loc, rotation=rot)
    o=bpy.context.object; o.name=name; o.data.materials.append(material); o.hide_set(False); o.hide_viewport=False; o.hide_render=False
    parts.append(o); return o

# ---------- cat ----------
body=uv('CAT_Body',(0,0,2.45),(1.25,.72,1.55),fur)
chest=uv('CAT_Chest',(0,-.56,2.35),(.72,.20,.95),cream)
head=uv('CAT_Head',(0,0,4.25),(1.45,.88,1.25),fur)
muzzle=uv('CAT_Muzzle',(0,-.78,3.95),(.72,.18,.48),cream)

# ears point upward
cone('CAT_Ear_L',(-.86,0,5.18),.62,0,1.35,fur,rot=(0,math.radians(-18),0))
cone('CAT_Ear_R',(.86,0,5.18),.62,0,1.35,fur,rot=(0,math.radians(18),0))

# eyes, nose
for x in (-.52,.52):
    uv('CAT_EyeWhite',(x,-.82,4.45),(.34,.12,.43),white,24,12)
    uv('CAT_Eye',(x,-.94,4.45),(.12,.06,.22),dark,20,10)
uv('CAT_Nose',(0,-1.00,4.03),(.13,.06,.10),pink,20,10)

# collar
bpy.ops.mesh.primitive_torus_add(major_radius=1.12,minor_radius=.13,major_segments=48,minor_segments=12,location=(0,0,3.35),rotation=(math.radians(90),0,0))
collar=bpy.context.object; collar.name='CAT_Collar'; collar.data.materials.append(blue); collar.hide_set(False); collar.hide_viewport=False; parts.append(collar)
uv('CAT_Bell',(0,-1.18,3.20),(.18,.12,.20),gold,24,12)

# four legs
for name,x,y in [('FL',-.68,-.08),('FR',.68,-.08),('BL',-.62,.30),('BR',.62,.30)]:
    uv('CAT_Leg_'+name,(x,y,1.15),(.38,.42,1.05),fur)
    uv('CAT_Paw_'+name,(x,y-.20,.42),(.44,.50,.25),cream)

# segmented tail
for i,(x,z,s) in enumerate([(1.15,2.55,.55),(1.55,2.75,.48),(1.85,3.05,.40),(2.02,3.42,.30)]):
    uv('CAT_Tail_%02d'%i,(x,.10,z),(s,.34,s),fur)

# ---------- armature ----------
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0))
arm=bpy.context.object; arm.name='ReqooCat_Rig'; arm.data.name='ReqooCat_Rig'; arm.show_in_front=True; arm.hide_set(False)
eb=arm.data.edit_bones
root=eb[0]; root.name='root'; root.head=(0,0,0); root.tail=(0,0,1)

def bone(name,head,tail,parent=root):
    b=eb.new(name); b.head=head; b.tail=tail; b.parent=parent; return b
bone('body',(0,0,1.2),(0,0,3.2))
bone('head',(0,0,3.2),(0,0,4.5))
bone('leg_fl',(-.68,0,1.7),(-.68,0,.4))
bone('leg_fr',(.68,0,1.7),(.68,0,.4))
bone('leg_bl',(-.62,.3,1.7),(-.62,.3,.4))
bone('leg_br',(.62,.3,1.7),(.62,.3,.4))
bone('tail',(1.0,.1,2.6),(2.0,.1,3.3))
bpy.ops.object.mode_set(mode='POSE')
for b in arm.pose.bones: b.rotation_mode='XYZ'
bpy.ops.object.mode_set(mode='OBJECT')

# Keep meshes visible; parent each mesh to armature object without changing its world transform.
for o in parts:
    mw=o.matrix_world.copy()
    o.parent=arm
    o.matrix_world=mw
    o.hide_set(False); o.hide_viewport=False; o.hide_render=False

# ---------- ground ----------
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,0))
g=bpy.context.object; g.name='Preview_Ground'; g.data.materials.append(groundmat)

# ---------- camera + lights ----------
bpy.ops.object.camera_add(location=(0,-16,4.0))
cam=bpy.context.object; cam.name='Reqoo_2.5D_Camera'; cam.data.type='ORTHO'; cam.data.ortho_scale=8.0
# camera looks along +Y toward the cat
cam.rotation_euler=(math.radians(90),0,0)
bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-4,-6,9)); key=bpy.context.object; key.data.energy=900; key.data.size=5
bpy.ops.object.light_add(type='AREA',location=(5,-4,6)); fill=bpy.context.object; fill.data.energy=450; fill.data.size=4

# ---------- simple animation actions ----------
def make_action(name, frames):
    arm.animation_data_create()
    act=bpy.data.actions.get(name) or bpy.data.actions.new(name)
    arm.animation_data.action=act
    pb=arm.pose.bones
    for frame, poses in frames.items():
        for bn,rot in poses.get('r',{}).items():
            pb[bn].rotation_euler=rot
            pb[bn].keyframe_insert('rotation_euler',frame=frame)
        if 'loc' in poses:
            pb['root'].location=poses['loc']
            pb['root'].keyframe_insert('location',frame=frame)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'
    act.frame_range=(min(frames),max(frames))
    return act
Z=math.radians
idle=make_action('IDLE',{1:{},20:{'r':{'head':(0,Z(2),0)}},40:{'r':{'head':(0,Z(-2),0)}},60:{}})
walk=make_action('WALK',{1:{'r':{'leg_fl':(Z(16),0,0),'leg_br':(Z(16),0,0),'leg_fr':(Z(-16),0,0),'leg_bl':(Z(-16),0,0)}},10:{'r':{'leg_fl':(Z(-16),0,0),'leg_br':(Z(-16),0,0),'leg_fr':(Z(16),0,0),'leg_bl':(Z(16),0,0)}},20:{'r':{'leg_fl':(Z(16),0,0),'leg_br':(Z(16),0,0),'leg_fr':(Z(-16),0,0),'leg_bl':(Z(-16),0,0)}}})
jump=make_action('JUMP',{1:{'loc':(0,0,0)},8:{'loc':(0,0,.8)},16:{'loc':(0,0,1.4)},26:{'loc':(0,0,0)}})
happy=make_action('HAPPY',{1:{},10:{'r':{'head':(0,Z(8),Z(-4))}},20:{'r':{'head':(0,Z(-8),Z(4))}},30:{}})
arm.animation_data.action=idle

# ---------- scene ----------
sc=bpy.context.scene
sc.render.engine='BLENDER_EEVEE_NEXT'
sc.render.resolution_x=1280; sc.render.resolution_y=720; sc.render.resolution_percentage=60
sc.render.image_settings.file_format='PNG'
sc.world.color=(0.08,0.45,0.70)

# Select rig and frame all objects so the cat is immediately visible.
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
arm.select_set(True); bpy.context.view_layer.objects.active=arm
print('REQOO CAT READY - CAT MESHES + RIG + IDLE/WALK/JUMP/HAPPY CREATED')
print('If viewport looks empty, press Home. For camera preview press Numpad 0. Press Space to preview animation.')
