"""Rudolph Clicker Core - Fusion 360 script.

Builds the mechanical part of the Rudolph fidget clicker as editable,
parametric bodies:

  1. "Switch Core"  - a puck that holds one MX-style mechanical switch
                      (14 mm plate cutout, clip groove, pin holes) with a
                      recess on top for the nose keycap.
  2. "Nose Keycap"  - the round red-nose keycap with an MX cross stem.
  3. "Switch Cut Tool" (optional) - the negative of the switch pocket, for
                      cutting the pocket into any other head body.

All dimensions come from the original Rudolph Clicker and the Mechanical
Switch Keycap Fidget Clicker Template, and every value is exposed as a
Fusion user parameter (Modify > Change Parameters), so you can tune the
print fit without editing this file.

Run it from Utilities > Add-Ins > Scripts and Add-Ins > + (My Scripts),
pointing at this folder, then select RudolphClickerCore and Run.
"""

import math
import traceback

import adsk.core
import adsk.fusion

# name: (value in mm, comment). Angles are not used.
PARAMS = {
    "core_d": (36.0, "Outer diameter of the switch core puck"),
    "core_h": (15.0, "Height of the switch core puck"),
    "floor_t": (0.4, "Floor under the switch"),
    "center_hole_d": (4.2, "Hole for the switch centre post"),
    "pin_hole_d": (1.9, "Holes for the two metal switch pins"),
    "post_hole_d": (1.9, "Holes for the two plastic PCB posts (5-pin switches)"),
    "bottom_w": (14.0, "Square pocket for the switch bottom housing"),
    "clip_z": (5.0, "Height where the clip groove starts"),
    "clip_w": (15.6, "Square clip groove the switch latches snap into"),
    "plate_z": (6.6, "Underside of the switch plate"),
    "plate_t": (1.4, "Switch plate thickness (MX clips want 1.2-1.5)"),
    "cutout_w": (14.0, "MX plate cutout"),
    "recess_d": (28.5, "Recess on top for the nose keycap"),
    "nose_d": (28.0, "Nose keycap diameter"),
    "nose_h": (14.0, "Nose keycap height"),
    "skirt_w0": (13.6, "Keycap inner cavity width at the bottom"),
    "skirt_w1": (10.7, "Keycap inner cavity width at the top"),
    "skirt_h": (6.7, "Keycap inner cavity height"),
    "stem_d": (5.8, "Keycap stem outer diameter"),
    "cross_l": (4.2, "MX cross arm length"),
    "cross_w": (1.35, "MX cross arm width"),
    "cross_depth": (6.0, "MX cross depth"),
}

BUILD_CUT_TOOL = True


def mm(v):
    """Fusion's internal length unit is cm."""
    return v / 10.0


def run(_context):
    ui = None
    try:
        app = adsk.core.Application.get()
        ui = app.userInterface
        design = adsk.fusion.Design.cast(app.activeProduct)
        if not design:
            ui.messageBox("Open or create a design first.")
            return
        design.designType = adsk.fusion.DesignTypes.ParametricDesignType

        p = _ensure_params(design)
        root = design.rootComponent

        core = _new_component(root, "Switch Core")
        _build_core(core, p)

        nose = _new_component(root, "Nose Keycap", offset_z=p["core_h"] + 5.0)
        _build_nose(nose, p)

        if BUILD_CUT_TOOL:
            tool = _new_component(root, "Switch Cut Tool", offset_x=p["core_d"] + 15.0)
            _build_cut_tool(tool, p)

        app.activeViewport.fit()
        ui.messageBox(
            "Rudolph clicker core built.\n\n"
            "Tune the fit under Modify > Change Parameters.\n"
            "Export each body with right-click > Save As Mesh (STL/3MF)."
        )
    except Exception:  # noqa: BLE001 - report everything to the Fusion UI
        if ui:
            ui.messageBox("Failed:\n{}".format(traceback.format_exc()))


# --------------------------------------------------------------------------- #
# Parameters
# --------------------------------------------------------------------------- #
def _ensure_params(design):
    """Create missing user parameters and return current values in mm."""
    ups = design.userParameters
    values = {}
    for name, (default, comment) in PARAMS.items():
        param = ups.itemByName(name)
        if param is None:
            param = ups.add(
                name, adsk.core.ValueInput.createByString("{} mm".format(default)), "mm", comment
            )
        values[name] = param.value * 10.0  # cm -> mm
    return values


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def _new_component(root, name, offset_x=0.0, offset_z=0.0):
    m = adsk.core.Matrix3D.create()
    m.translation = adsk.core.Vector3D.create(mm(offset_x), 0, mm(offset_z))
    occ = root.occurrences.addNewComponent(m)
    occ.component.name = name
    return occ.component


def _plane_at(comp, z):
    if abs(z) < 1e-9:
        return comp.xYConstructionPlane
    planes = comp.constructionPlanes
    inp = planes.createInput()
    inp.setByOffset(comp.xYConstructionPlane, adsk.core.ValueInput.createByReal(mm(z)))
    return planes.add(inp)


def _pt(x, y):
    return adsk.core.Point3D.create(mm(x), mm(y), 0)


def _square(sketch, w):
    sketch.sketchCurves.sketchLines.addCenterPointRectangle(_pt(0, 0), _pt(w / 2.0, w / 2.0))


def _rect(sketch, lx, ly):
    sketch.sketchCurves.sketchLines.addCenterPointRectangle(_pt(0, 0), _pt(lx / 2.0, ly / 2.0))


def _circle(sketch, d, x=0.0, y=0.0):
    sketch.sketchCurves.sketchCircles.addByCenterRadius(_pt(x, y), mm(d / 2.0))


def _all_profiles(sketch):
    coll = adsk.core.ObjectCollection.create()
    for prof in sketch.profiles:
        coll.add(prof)
    return coll


def _outer_profile(sketch):
    """Largest-area profile: the region inside the outermost loop only."""
    best, best_area = None, -1.0
    for prof in sketch.profiles:
        area = prof.areaProperties().area
        if area > best_area:
            best, best_area = prof, area
    return best


def _extrude(comp, sketch_fn, z, height, op, body=None, profiles="all", name=None):
    sketch = comp.sketches.add(_plane_at(comp, z))
    if name:
        sketch.name = name
    sketch_fn(sketch)
    prof = _all_profiles(sketch) if profiles == "all" else _outer_profile(sketch)
    ext = comp.features.extrudeFeatures
    inp = ext.createInput(prof, op)
    inp.setDistanceExtent(False, adsk.core.ValueInput.createByReal(mm(height)))
    if body is not None and op != adsk.fusion.FeatureOperations.NewBodyFeatureOperation:
        inp.participantBodies = [body]
    feat = ext.add(inp)
    return feat.bodies.item(0) if feat.bodies.count else body


NEW = adsk.fusion.FeatureOperations.NewBodyFeatureOperation
CUT = adsk.fusion.FeatureOperations.CutFeatureOperation
JOIN = adsk.fusion.FeatureOperations.JoinFeatureOperation

# MX switch footprint, top view, switch centred at origin (mm).
MX_PINS = [(-3.81, 2.54), (2.54, 5.08)]
MX_POSTS = [(-5.08, 0.0), (5.08, 0.0)]


def _floor_holes(p):
    def draw(s):
        _circle(s, p["center_hole_d"])
        for x, y in MX_PINS:
            _circle(s, p["pin_hole_d"], x, y)
        for x, y in MX_POSTS:
            _circle(s, p["post_hole_d"], x, y)

    return draw


def _pocket_steps(p):
    """(sketch function, start z, height) for each layer of the switch pocket."""
    plate_top = p["plate_z"] + p["plate_t"]
    return [
        ("Floor holes", _floor_holes(p), 0.0, p["floor_t"]),
        ("Bottom housing", lambda s: _square(s, p["bottom_w"]), p["floor_t"],
         p["clip_z"] - p["floor_t"]),
        ("Clip groove", lambda s: _square(s, p["clip_w"]), p["clip_z"], p["plate_z"] - p["clip_z"]),
        ("Plate cutout", lambda s: _square(s, p["cutout_w"]), p["plate_z"], p["plate_t"]),
        ("Nose recess", lambda s: _circle(s, p["recess_d"]), plate_top, p["core_h"] - plate_top),
    ]


# --------------------------------------------------------------------------- #
# Bodies
# --------------------------------------------------------------------------- #
def _build_core(comp, p):
    body = _extrude(comp, lambda s: _circle(s, p["core_d"]), 0, p["core_h"], NEW, name="Core puck")
    body.name = "Switch Core"
    for name, fn, z, h in _pocket_steps(p):
        _extrude(comp, fn, z, h, CUT, body, name=name)


def _build_cut_tool(comp, p):
    """Solid negative of the pocket. Use Modify > Combine > Cut against a head body."""
    steps = _pocket_steps(p)
    # Start from the bottom-housing block, then join every other layer onto it
    # (the floor-hole pins touch its underside, so they merge into one body).
    name, fn, z, h = steps[1]
    body = _extrude(comp, fn, z, h, NEW, name=name)
    for name, fn, z, h in [steps[0]] + steps[2:]:
        _extrude(comp, fn, z, h, JOIN, body, name=name)
    body.name = "Switch Cut Tool"


def _build_nose(comp, p):
    r, h = p["nose_d"] / 2.0, p["nose_h"]

    # Dome: revolve a quarter ellipse (a hemisphere when nose_h == nose_d / 2).
    sketch = comp.sketches.add(comp.xZConstructionPlane)
    sketch.name = "Nose profile"

    def sp(x, z):  # model (x, 0, z) -> sketch space; xZ sketches flip an axis
        return sketch.modelToSketchSpace(adsk.core.Point3D.create(mm(x), 0, mm(z)))

    lines = sketch.sketchCurves.sketchLines
    axis = lines.addByTwoPoints(sp(0, h), sp(0, 0))
    lines.addByTwoPoints(sp(0, 0), sp(r, 0))
    pts = adsk.core.ObjectCollection.create()
    steps = 16
    for i in range(steps + 1):
        a = math.pi / 2.0 * i / steps
        pts.add(sp(r * math.cos(a), h * math.sin(a)))
    sketch.sketchCurves.sketchFittedSplines.add(pts)
    prof = sketch.profiles.item(0)

    rev = comp.features.revolveFeatures
    rinp = rev.createInput(prof, axis, NEW)
    rinp.setAngleExtent(False, adsk.core.ValueInput.createByString("360 deg"))
    body = rev.add(rinp).bodies.item(0)
    body.name = "Nose Keycap"

    # Tapered square cavity that sits over the switch top housing.
    s0 = comp.sketches.add(comp.xYConstructionPlane)
    _square(s0, p["skirt_w0"])
    s1 = comp.sketches.add(_plane_at(comp, p["skirt_h"]))
    _square(s1, p["skirt_w1"])
    lofts = comp.features.loftFeatures
    linp = lofts.createInput(CUT)
    linp.loftSections.add(s0.profiles.item(0))
    linp.loftSections.add(s1.profiles.item(0))
    linp.participantBodies = [body]
    lofts.add(linp)

    # Round stem with the MX cross socket.
    _extrude(comp, lambda s: _circle(s, p["stem_d"]), 0, p["skirt_h"] + 0.2, JOIN, body,
             profiles="outer", name="Stem")
    _extrude(comp, lambda s: _rect(s, p["cross_l"], p["cross_w"]), 0, p["cross_depth"], CUT, body,
             name="Cross X")
    _extrude(comp, lambda s: _rect(s, p["cross_w"], p["cross_l"]), 0, p["cross_depth"], CUT, body,
             name="Cross Y")
