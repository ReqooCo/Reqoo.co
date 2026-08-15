import bpy, math
from mathutils import Vector

# Reqoo Cat Blender prototype
# Blender 4.x. Run in Scripting > Run Script.
# Creates a stylized 2.5D cat with a simple armature and IDLE/WALK/JUMP/HAPPY actions.

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

# Materials
def mat(name, color, metallic=0.0, rough=0.55):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.metallic=metallic; m.roughness=rough; return m
fur=mat('Reqoo Orange Fur',(0.92,0.43,0.13)); cream=mat('Face Cream',(1.0,0.78,0.53)); blue=mat('Reqoo Blue Collar',(0.10,0.42,0.72),0.05); gold=mat('Gold Bell',(1.0,0.68,0.08),0.65,0.25); dark=mat('Eyes',(0.035,0.02,0.015)); white=mat('Eye White',(1,1,1)); pink=mat('Nose',(0.95,0.30,0.35)); groundmat=mat('Ground',(0.22,0.62,0.24))

parts={}
def uv(name, loc, scale, material, seg=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, location=loc)
    o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material); parts[name]=o; return o

def cube(name, loc, scale, material, bevel=0.15):
    bpy.ops.mesh.primitive_cube_add(location=loc); o=bpy.context.object; o.name=name; o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(material)
    b=o.modifiers.new('Soft edges','BEVEL'); b.width=bevel; b.segments=3; parts[name]=o; return o

def cone(name, loc, r1, r2, depth, material):
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=r1, radius2=r2, depth=depth, location=loc); o=bpy.context.object; o.name=name; o.data.materials.append(material); parts[name]=o; return o

# Body / head
uv('Body',(0,0,2.45),(1.25,0.72,1.55),fur)
uv('Chest',(0,-0.55,2.35),(0.72,0.20,0.95),cream)
uv('Head',(0,0,4.25),(1.45,0.88,1.25),fur)
uv('Muzzle',(0,-0.78,3.95),(0.72,0.18,0.48),cream)
# ears
cone('Ear.L',(-0.85,0,5.25),0.62,0,1.25,fur).rotation_euler[1]=math.radians(-18)
cone('Ear.R',(0.85,0,5.25),0.62,0,1.25,fur).rotation_euler[1]=math.radians(18)
# eyes
for x in (-0.52,0.52):
    uv('EyeWhite'+str(x),(x,-0.82,4.45),(0.34,0.12,0.43),white,24,12)
    uv('Eye'+str(x),(x,-0.94,4.45),(0.12,0.06,0.22),dark,20,10)
uv('Nose',(0,-1.00,4.03),(0.13,0.06,0.10),pink,20,10)
# collar + bell
bpy.ops.mesh.primitive_torus_add(major_radius=1.12, minor_radius=0.13, major_segments=48, minor_segments=12, location=(0,0,3.35), rotation=(math.radians(90),0,0)); collar=bpy.context.object; collar.name='Blue Collar'; collar.data.materials.append(blue)
uv('Bell',(0,-1.18,3.20),(0.18,0.12,0.20),gold,24,12)
# legs
for name,x in [('Leg.FL',-0.68),('Leg.FR',0.68),('Leg.BL',-0.62),('Leg.BR',0.62)]: uv(name,(x,-0.05,1.15),(0.38,0.42,1.05),fur); uv(name+'.Paw',(x,-0.25,0.42),(0.44,0.50,0.25),cream)
# tail chain of segments
for i,(x,z,s) in enumerate([(1.15,2.55,0.55),(1.55,2.75,0.48),(1.85,3.05,0.40),(2.02,3.42,0.30)]): uv('Tail.%02d'%i,(x,0,z),(s,0.34,s),fur)

# Armature
bpy.ops.object.armature_add(enter_editmode=True, location=(0,0,0)); arm=bpy.context.object; arm.name='ReqooCat_Rig'; arm.data.name='ReqooCat_Rig'; arm.data.display_type='OCTAHEDRAL'; eb=arm.data.edit_bones; root=eb[0]; root.name='root'; root.head=(0,0,0); root.tail=(0,0,1)

def bone(name, head, tail, parent=root):
    b=eb.new(name); b.head=head; b.tail=tail; b.parent=parent; return b
bones=[bone('body',(0,0,1.2),(0,0,3.2)),bone('head',(0,0,3.2),(0,0,4.5)),bone('leg_fl',(-.68,0,1.7),(-.68,0,.4)),bone('leg_fr',(.68,0,1.7),(.68,0,.4)),bone('leg_bl',(-.62,0,1.7),(-.62,0,.4)),bone('leg_br',(.62,0,1.7),(.62,0,.4)),bone('tail',(1.0,0,2.6),(2.0,0,3.3))]
bpy.ops.object.mode_set(mode='POSE')
for b in arm.pose.bones: b.rotation_mode='XYZ'
bpy.ops.object.mode_set(mode='OBJECT')
# Parent rigid parts to nearest bones
for o in parts.values():
    o.parent=arm
    o.matrix_parent_inverse=arm.matrix_world.inverted()
# Ground for preview
bpy.ops.mesh.primitive_plane_add(size=30, location=(0,0,0)); g=bpy.context.object; g.name='Preview Ground'; g.data.materials.append(groundmat)

# Camera / lighting for 2.5D preview
bpy.ops.object.camera_add(location=(0,-15,5.0), rotation=(math.radians(80),0,0)); cam=bpy.context.object; cam.name='Reqoo_2.5D_Camera'; cam.data.type='ORTHO'; cam.data.ortho_scale=8.0; bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA', location=(-4,-6,9)); key=bpy.context.object; key.data.energy=900; key.data.shape='DISK'; key.data.size=5
bpy.ops.object.light_add(type='AREA', location=(5,-3,5)); fill=bpy.context.object; fill.data.energy=500; fill.data.size=4

# Animation helpers

def action(name, frames):
    arm.animation_data_create(); act=bpy.data.actions.new(name); arm.animation_data.action=act
    pb=arm.pose.bones
    for frame, poses in frames.items():
        for bn,rot in poses.get('r',{}).items(): pb[bn].rotation_euler=rot; pb[bn].keyframe_insert('rotation_euler',frame=frame)
        if 'loc' in poses:
            pb['root'].location=poses['loc']; pb['root'].keyframe_insert('location',frame=frame)
    for fc in act.fcurves:
        for kp in fc.keyframe_points: kp.interpolation='BEZIER'
    act.frame_range=(min(frames),max(frames)); return act

Z=math.radians
idle=action('IDLE',{1:{},20:{'r':{'head':(0,Z(2),0)}},40:{'r':{'head':(0,Z(-2),0)}},60:{}})
walk=action('WALK',{1:{'r':{'leg_fl':(Z(16),0,0),'leg_br':(Z(16),0,0),'leg_fr':(Z(-16),0,0),'leg_bl':(Z(-16),0,0),'body':(0,0,Z(2))}},10:{'r':{'leg_fl':(Z(-16),0,0),'leg_br':(Z(-16),0,0),'leg_fr':(Z(16),0,0),'leg_bl':(Z(16),0,0),'body':(0,0,Z(-2))}},20:{'r':{'leg_fl':(Z(16),0,0),'leg_br':(Z(16),0,0),'leg_fr':(Z(-16),0,0),'leg_bl':(Z(-16),0,0),'body':(0,0,Z(2))}}})
jump=action('JUMP',{1:{'loc':(0,0,0)},8:{'loc':(0,0,.8),'r':{'body':(Z(-6),0,0)}},16:{'loc':(0,0,1.5),'r':{'body':(Z(4),0,0)}},26:{'loc':(0,0,0)}})
happy=action('HAPPY',{1:{},10:{'r':{'head':(0,Z(8),Z(-4))}},20:{'r':{'head':(0,Z(-8),Z(4))}},30:{}})
# Set idle as default
arm.animation_data.action=idle

# Scene settings
sc=bpy.context.scene; sc.render.engine='BLENDER_EEVEE_NEXT'; sc.render.resolution_x=1280; sc.render.resolution_y=720; sc.render.resolution_percentage=50; sc.render.image_settings.file_format='PNG'; sc.world.color=(0.08,0.45,0.70)
print('REQOO CAT READY: actions = IDLE, WALK, JUMP, HAPPY. Select armature and play timeline.')
