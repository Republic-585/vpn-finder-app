import os
import cadquery as cq
import trimesh
import numpy as np
from cadquery import exporters

OUT = "assets/models"
os.makedirs(OUT, exist_ok=True)
W, D, H = 100.0, 80.0, 62.0
R, WALL, FLOOR = 9.0, 3.2, 4.0
BLUE, GOLD = (15, 92, 205, 255), (239, 181, 48, 255)

def rounded_box(w, d, h, r, z0=0):
    return cq.Workplane("XY").box(w, d, h, centered=(True, True, False)).edges("|Z").fillet(r).translate((0, 0, z0))

outer = rounded_box(W, D, H, R, 0)
inner = rounded_box(W-2*WALL, D-2*WALL, H-FLOOR+1, max(1, R-WALL), FLOOR)
parts = {"Body_Blue": outer.cut(inner)}
band_w = 7.0
for y in (-D/2-.8, D/2+.8):
    parts["Body_Ribbon_FB_"+str(y)] = cq.Workplane("XY").box(band_w, 1.6, H, centered=(True, True, False)).translate((0, y, 0))
for x in (-W/2-.8, W/2+.8):
    parts["Body_Ribbon_LR_"+str(x)] = cq.Workplane("XY").box(1.6, band_w, H, centered=(True, True, False)).translate((x, 0, 0))
lid_top = rounded_box(W+1, D+1, 6, R+.5, H)
skirt_outer = rounded_box(W-1, D-1, 8, R, H-8)
skirt_inner = rounded_box(W-1-2*WALL, D-1-2*WALL, 8.2, max(1, R-WALL), H-8.1)
parts["Lid_Blue"] = lid_top.union(skirt_outer.cut(skirt_inner))
parts["Lid_Ribbon_X"] = cq.Workplane("XY").box(band_w, D-5, 1.5, centered=(True, True, False)).translate((0, 0, H+6))
parts["Lid_Ribbon_Y"] = cq.Workplane("XY").box(W-5, band_w, 1.5, centered=(True, True, False)).translate((0, 0, H+6))
for sign in (-1, 1):
    parts["Bow_Loop_"+str(sign)] = cq.Workplane("XZ").center(sign*10, H+13).ellipse(18, 10).ellipse(13.5, 6.2).extrude(3.2, both=True)
parts["Bow_Knot"] = cq.Workplane("XY").box(15, 11, 8, centered=(True, True, True)).edges().fillet(2).translate((0, 0, H+14))
for sign in (-1, 1):
    parts["Bow_Tail_"+str(sign)] = (cq.Workplane("XY").box(10, 20, 2.5, centered=(True, True, False)).rotate((0,0,0), (0,0,1), sign*25).translate((sign*13, -13, H+7.2)))

scene = trimesh.Scene()
for name, shape in parts.items():
    vertices, faces = [], []
    for solid in shape.solids().vals():
        vs, fs = solid.tessellate(0.25, 0.15)
        base = len(vertices)
        vertices.extend([v.toTuple() for v in vs])
        faces.extend([[base+i for i in f] for f in fs])
    if not faces:
        continue
    mesh = trimesh.Trimesh(vertices=np.asarray(vertices), faces=np.asarray(faces), process=True)
    color = GOLD if ("Ribbon" in name or "Bow" in name) else BLUE
    mesh.visual.face_colors = np.tile(np.asarray(color, dtype=np.uint8), (len(mesh.faces), 1))
    scene.add_geometry(mesh, geom_name=name, node_name=name)

scene.export(os.path.join(OUT, "VPN_Finder_Gift_Box.glb"))
print("Built CAD gift model:", os.path.join(OUT, "VPN_Finder_Gift_Box.glb"))
print("Named parts:", list(scene.graph.nodes_geometry))

# Trigger CAD build after workflow installation.

# Bow loops stay close to the center knot so the silhouette matches the approved gift reference.
