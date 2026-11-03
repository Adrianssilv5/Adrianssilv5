"""Build the Rudolph clicker switch core, nose keycap and cut tool as STLs.

Mirrors fusion360/RudolphClickerCore/RudolphClickerCore.py (same parameter
names and values) so the meshes can be printed or checked without Fusion.

    python3 tools/build_core.py [out_dir]
"""
import math
import sys
from pathlib import Path

import manifold3d as mf
import numpy as np
import trimesh

P = dict(core_d=36.0, core_h=15.0, floor_t=0.4, center_hole_d=4.2, pin_hole_d=1.9,
         post_hole_d=1.9, bottom_w=14.0, clip_z=5.0, clip_w=15.6, plate_z=6.6, plate_t=1.4,
         cutout_w=14.0, recess_d=28.5, nose_d=28.0, nose_h=14.0, skirt_w0=13.6, skirt_w1=10.7,
         skirt_h=6.7, stem_d=5.8, cross_l=4.2, cross_w=1.35, cross_depth=6.0)
MX_PINS = [(-3.81, 2.54), (2.54, 5.08)]
MX_POSTS = [(-5.08, 0.0), (5.08, 0.0)]
SEG = 128
EPS = 0.01


def box(w, d, h, z=0.0, x=0.0, y=0.0):
    return mf.Manifold.cube([w, d, h], center=False).translate([x - w / 2, y - d / 2, z])


def cyl(d, h, z=0.0, x=0.0, y=0.0):
    return mf.Manifold.cylinder(h, d / 2, d / 2, SEG).translate([x, y, z])


def pocket(p):
    """Solid negative of the switch pocket, in core coordinates."""
    plate_top = p["plate_z"] + p["plate_t"]
    parts = [cyl(p["center_hole_d"], p["floor_t"] + 2 * EPS, -EPS)]
    parts += [cyl(p["pin_hole_d"], p["floor_t"] + 2 * EPS, -EPS, x, y) for x, y in MX_PINS]
    parts += [cyl(p["post_hole_d"], p["floor_t"] + 2 * EPS, -EPS, x, y) for x, y in MX_POSTS]
    parts.append(box(p["bottom_w"], p["bottom_w"], p["clip_z"] - p["floor_t"] + EPS, p["floor_t"]))
    parts.append(box(p["clip_w"], p["clip_w"], p["plate_z"] - p["clip_z"] + EPS, p["clip_z"]))
    parts.append(box(p["cutout_w"], p["cutout_w"], p["plate_t"] + EPS, p["plate_z"]))
    parts.append(cyl(p["recess_d"], p["core_h"] - plate_top + 1.0, plate_top))
    out = parts[0]
    for part in parts[1:]:
        out = out + part
    return out


def core(p):
    return cyl(p["core_d"], p["core_h"]) - pocket(p)


def nose(p):
    r, h = p["nose_d"] / 2, p["nose_h"]
    prof = [[0.0, 0.0], [r, 0.0]]
    prof += [[r * math.cos(a), h * math.sin(a)] for a in np.linspace(0, math.pi / 2, 48)[1:]]
    dome = mf.Manifold.revolve(mf.CrossSection([prof]), SEG)
    w0, w1, sh = p["skirt_w0"], p["skirt_w1"], p["skirt_h"]
    cavity = mf.Manifold.extrude(mf.CrossSection.square([w0, w0], True), sh, 0, 0.0,
                                 [w1 / w0, w1 / w0]).translate([0, 0, -EPS])
    cavity = cavity + box(w0, w0, EPS * 2, -EPS * 2)
    body = dome - cavity + cyl(p["stem_d"], sh + 0.2)
    cl, cw, cd = p["cross_l"], p["cross_w"], p["cross_depth"]
    body = body - box(cl, cw, cd + EPS, -EPS) - box(cw, cl, cd + EPS, -EPS)
    return body


def to_trimesh(m):
    mesh = m.to_mesh()
    return trimesh.Trimesh(np.asarray(mesh.vert_properties)[:, :3], np.asarray(mesh.tri_verts))


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "stl")
    out.mkdir(parents=True, exist_ok=True)
    for name, solid in [("switch_core", core(P)), ("nose_keycap", nose(P)),
                        ("switch_cut_tool", pocket(P))]:
        tm = to_trimesh(solid)
        tm.export(out / f"{name}.stl")
        print(f"{name}: watertight={tm.is_watertight} volume={tm.volume:.0f} mm^3 "
              f"size={np.round(tm.extents, 2).tolist()}")


if __name__ == "__main__":
    main()
