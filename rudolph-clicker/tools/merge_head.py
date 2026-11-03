"""Merge a hi3d-generated Rudolph head with the switch core.

Takes the GLB (or STL/OBJ) that hi3d returns, lays it face-up, scales it to
the target width, flattens the back so it prints without supports, fuses the
switch core puck under the nose position and cuts the switch pocket.

    python3 tools/merge_head.py head.glb --width 80 --nose-x 0 --nose-y -18 \
        --out stl/cute_rudolph_body.stl

--nose-x / --nose-y are in mm relative to the centre of the scaled head,
seen from the front (+y is towards the antlers). Run with --preview to write
a PNG next to the output so you can check the nose position first.
"""
import argparse
from pathlib import Path

import manifold3d as mf
import numpy as np
import trimesh

from build_core import P, cyl, pocket, to_trimesh


def load_head(path, width, rotate_x):
    scene = trimesh.load(path, force="scene")
    mesh = scene.to_geometry() if hasattr(scene, "to_geometry") else scene.dump(concatenate=True)
    mesh.merge_vertices()
    # A GLB is Y-up with the front facing +Z, which in print coordinates (Z-up)
    # already means "lying face-up, antlers towards +Y". --rotate-x fixes
    # models that come out facing another way.
    if rotate_x:
        mesh.apply_transform(trimesh.transformations.rotation_matrix(np.radians(rotate_x), [1, 0, 0]))
    mesh.apply_scale(width / mesh.extents[0])
    lo, hi = mesh.bounds
    mesh.apply_translation([-(lo[0] + hi[0]) / 2, -(lo[1] + hi[1]) / 2, -lo[2]])
    return mesh


def to_manifold(mesh):
    if not mesh.is_watertight:
        trimesh.repair.fill_holes(mesh)
    m = mf.Manifold(mf.Mesh(vert_properties=np.asarray(mesh.vertices, np.float32),
                            tri_verts=np.asarray(mesh.faces, np.uint32)))
    if m.is_empty():
        raise SystemExit("Head mesh is not a closed solid; repair it (e.g. in Fusion or "
                         "Meshmixer) and try again.")
    return m


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("head")
    ap.add_argument("--width", type=float, default=80.0, help="final head width in mm")
    ap.add_argument("--nose-x", type=float, default=0.0)
    ap.add_argument("--nose-y", type=float, default=-18.0)
    ap.add_argument("--flatten", type=float, default=1.5,
                    help="mm shaved off the back so it sits flat")
    ap.add_argument("--rotate-x", type=float, default=0.0,
                    help="degrees to tip the head if it does not come out face-up")
    ap.add_argument("--out", default="stl/cute_rudolph_body.stl")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()

    head = load_head(a.head, a.width, a.rotate_x)
    solid = to_manifold(head)
    big = 1000.0
    solid = solid - mf.Manifold.cube([big, big, a.flatten]).translate([-big / 2, -big / 2, 0])
    solid = solid.translate([0, 0, -a.flatten])

    puck = cyl(P["core_d"], P["core_h"], 0, a.nose_x, a.nose_y)
    # Keep the nose recess open all the way to the surface of a thick snout.
    plate_top = P["plate_z"] + P["plate_t"]
    well = cyl(P["recess_d"], 200.0, plate_top, a.nose_x, a.nose_y)
    body = (solid + puck) - pocket(P).translate([a.nose_x, a.nose_y, 0]) - well
    out = to_trimesh(body)
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    out.export(a.out)
    print(f"wrote {a.out}: watertight={out.is_watertight} size={np.round(out.extents, 1).tolist()}")

    if a.preview:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        from mpl_toolkits.mplot3d.art3d import Poly3DCollection
        fig = plt.figure(figsize=(6, 6))
        ax = fig.add_subplot(projection="3d")
        shade = np.clip(0.35 + 0.65 * np.abs(out.face_normals @ [0.3, -0.5, 0.8]), 0, 1)
        ax.add_collection3d(Poly3DCollection(out.vertices[out.faces], linewidths=0,
                                             facecolors=plt.cm.copper(shade)))
        c, r = out.bounds.mean(0), out.extents.max() / 2
        ax.set_xlim(c[0] - r, c[0] + r); ax.set_ylim(c[1] - r, c[1] + r); ax.set_zlim(c[2] - r, c[2] + r)
        ax.view_init(70, -90); ax.set_axis_off()
        plt.savefig(Path(a.out).with_suffix(".png"), dpi=90)


if __name__ == "__main__":
    main()
