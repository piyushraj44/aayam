"""Build the 3D AAYAM wordmark (two LODs) from the transparent 2D cut-out.

Usage (from the repo root):
    C:/Users/piyus/anaconda3/python.exe -I scripts/build-wordmark-3d.py \
        docs/reference/legacy/aayam-wordmark-2d@2x.png public/models [--work <dir>] [--voxel 2.0]

Writes
    <out_dir>/aayam-wordmark.glb          desktop LOD (meshopt, via `npx gltfpack`)
    <out_dir>/aayam-wordmark-mobile.glb   mobile LOD
    <work>/aayam-wordmark-raw.glb         uncompressed float master (all detail; also a Blender-importable source)

Pipeline (docs/PROMPT-the-touch.md section 4.2)
    1. Alpha > 0.5, connected components, small detached bits merged into the nearest letter, ordered
       left to right: exactly five letters L1_Lambda, L2_A, L3_Y, L4_A, L5_M.
    2. Per letter: the alpha is super-sampled x2 (cubic) and blurred; a sub-pixel signed distance to the
       outline is built and the outline is then faired as a curve (strong arc-length smoothing along the
       sweeps, almost none at the hooked tips) and turned back into an exact signed distance. This removes
       the pixel staircase and the JPEG wobble of the cut-out while the tips keep their points.
    3. Balloon inflation: u solves -lap(u) = 1 inside with u = 0 on the faired outline (Shortley-Weller
       stencil, so the boundary sits at its sub-pixel position). The half-depth is zscale * sqrt(2u): for a
       stroke of half-width R this is an exactly round tube (zscale = 1) with depth R at the centreline, so
       fat sweeps stay fat and round and thin sweeps taper to sharp points. This is the brief's distance-field
       sqrt profile with the local stroke width built in. A low-frequency noise field (+-6 % thickness) and a
       flatter back (x0.86) give the hand-made asymmetry.
    4. Marching cubes on f = q(x, y) - z^2 (q = squared half-depth, nearly a true distance field at the rim),
       closed and manifold by construction; Taubin smoothing; Newton projection of every vertex back onto
       f = 0; normals from the analytic field gradient (exact, smooth, tessellation independent).
    5. Attributes: TEXCOORD_0 = planar XY normalised per letter (aspect kept, longest side 0..1);
       TEXCOORD_1.x = fillHeight (0 at the letter's lowest point, 1 at its highest);
       TEXCOORD_1.y = normalised distance from the stroke centreline (0 centre .. 1 outline).
    6. Units: whole wordmark exactly 2.0 wide, x/y centred at the origin, +Y up, +Z towards the viewer,
       silhouette plane at z = 0.
    7. gltfpack simplifies to the two triangle budgets and meshopt-compresses: -cc -ce ext (EXT_meshopt_compression),
       -kn (named nodes kept), -kv (keep both UV sets although no material uses them), -vpf / -vtf (float
       positions and UVs: no dequantisation transform on the nodes, so each named node is the Mesh itself with
       an identity transform, and uv / uv1 arrive as plain floats), -vn 10 (10-bit normals).
    Check the output with `node scripts/verify-glb.mjs <glb> [--dump <bin>]` and preview it with
    scripts/preview-wordmark.py.
"""
import argparse
import json
import os
import struct
import subprocess
import sys
import tempfile

import numpy as np
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve
from PIL import Image
from skimage import measure

NAMES = ["L1_Lambda", "L2_A", "L3_Y", "L4_A", "L5_M"]
WIDTH_UNITS = 2.0


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("out_dir")
    p.add_argument("--work", default=None, help="folder for the raw master GLB and debug files")
    p.add_argument("--voxel", type=float, default=2.0, help="marching-cubes voxel size in source px")
    p.add_argument("--zscale", type=float, default=1.5, help="depth / round-tube depth (1 = circular section)")
    p.add_argument("--back", type=float, default=0.86, help="back side depth relative to the front")
    p.add_argument("--noise", type=float, default=0.06, help="hand-made thickness variation")
    p.add_argument("--desktop-tris", type=int, default=45000)
    p.add_argument("--mobile-tris", type=int, default=16000)
    p.add_argument("--taubin", type=int, default=20, help="Taubin smoothing iterations")
    p.add_argument("--mask-blur", type=float, default=4.0, help="blur of the x2 alpha before thresholding (2x px)")
    p.add_argument("--sdf-blur", type=float, default=8.0, help="blur of the outline distance field (2x px)")
    p.add_argument("--fair", type=float, default=22.0, help="outline fairing along the sweeps (2x px of arc length)")
    p.add_argument("--fair-tip-radius", type=float, default=30.0, help="curvature radius (2x px) below which the outline keeps its point")
    p.add_argument("--no-pack", action="store_true")
    return p.parse_args()


# ----------------------------------------------------------------------------- letters
def split_letters(alpha):
    m = alpha > 0.5
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    big = [i + 1 for i in np.argsort(-sizes)[:5]]
    if n < 5:
        raise SystemExit(f"expected 5 letters, found {n} components")
    # merge small detached bits (and soft alpha fringe) into the nearest big letter
    seeds = np.where(np.isin(lab, big), lab, 0)
    _, (iy, ix) = ndimage.distance_transform_edt(seeds == 0, return_indices=True)
    nearest = seeds[iy, ix]
    owner = np.where(alpha > 0.02, nearest, 0)
    cents = [ndimage.center_of_mass(m, lab, b)[1] for b in big]
    order = [b for _, b in sorted(zip(cents, big))]
    return [owner == b for b in order]


def poisson_inflate(sdf, inside):
    """Solve -lap(u) = 1 inside, u = 0 on the outline sdf = 0 (unit grid spacing).

    Shortley-Weller: where a stencil arm crosses the outline, the arm is shortened to the sub-pixel
    crossing distance theta = sdf_i / (sdf_i - sdf_j), which removes the pixel staircase a plain 5-point
    Dirichlet boundary would leave in the solution.
    """
    H, W = inside.shape
    idx = -np.ones(inside.shape, np.int64)
    ys, xs = np.nonzero(inside)
    n = len(ys)
    idx[ys, xs] = np.arange(n)
    s_i = sdf[ys, xs]
    diag = np.zeros(n)
    rows, cols, vals = [], [], []
    for axis in ("x", "y"):
        hs, nbs = [], []
        for sign in (-1, 1):
            yy = ys + (sign if axis == "y" else 0)
            xx = xs + (sign if axis == "x" else 0)
            ok = (yy >= 0) & (yy < H) & (xx >= 0) & (xx < W)
            yy, xx = np.clip(yy, 0, H - 1), np.clip(xx, 0, W - 1)
            nb = np.where(ok, idx[yy, xx], -1)
            s_j = sdf[yy, xx]
            theta = np.where(nb >= 0, 1.0, np.clip(s_i / np.maximum(s_i - s_j, 1e-6), 0.05, 1.0))
            hs.append(theta)
            nbs.append(nb)
        hl, hr = hs
        al = 2.0 / (hl * (hl + hr))
        ar = 2.0 / (hr * (hl + hr))
        diag += al + ar
        for a_, nb in ((al, nbs[0]), (ar, nbs[1])):
            good = nb >= 0
            rows.append(np.arange(n)[good])
            cols.append(nb[good])
            vals.append(-a_[good])
    rows.append(np.arange(n))
    cols.append(np.arange(n))
    vals.append(diag)
    A = sparse.csr_matrix((np.concatenate(vals), (np.concatenate(rows), np.concatenate(cols))), shape=(n, n))
    u = spsolve(A.tocsc(), np.ones(n))
    out = np.zeros(inside.shape)
    out[ys, xs] = u
    return out


def faired_sdf(sdf, sigma, tip_radius):
    """Curvature-adaptive smoothing of the zero contour(s) of sdf, returned as a new exact signed distance."""
    from matplotlib.path import Path
    from scipy.spatial import cKDTree

    H, W = sdf.shape
    loops = [c for c in measure.find_contours(sdf, 0.0) if len(c) > 20]
    dense, inside = [], np.zeros(sdf.shape, bool)
    yy, xx = np.mgrid[0:H, 0:W]
    pix = np.stack([yy.ravel(), xx.ravel()], 1).astype(np.float64)
    for c in loops:
        if np.linalg.norm(c[0] - c[-1]) > 1.5:
            continue  # open contour at the crop border (cannot happen with padding)
        seg = np.linalg.norm(np.diff(c, axis=0), axis=1)
        arc = np.r_[0, np.cumsum(seg)]
        t = np.arange(0, arc[-1], 1.0)
        c = np.stack([np.interp(t, arc, c[:, 0]), np.interp(t, arc, c[:, 1])], 1)
        strong = ndimage.gaussian_filter1d(c, sigma, axis=0, mode="wrap")
        weak = ndimage.gaussian_filter1d(c, 1.5, axis=0, mode="wrap")
        d1 = np.gradient(strong, axis=0)
        d2 = np.gradient(d1, axis=0)
        kappa = np.abs(d1[:, 0] * d2[:, 1] - d1[:, 1] * d2[:, 0]) / np.maximum(np.linalg.norm(d1, axis=1) ** 3, 1e-9)
        # tips (radius below tip_radius on the weak curve as well) keep their point
        d1w = np.gradient(ndimage.gaussian_filter1d(c, 4.0, axis=0, mode="wrap"), axis=0)
        d2w = np.gradient(d1w, axis=0)
        kw = np.abs(d1w[:, 0] * d2w[:, 1] - d1w[:, 1] * d2w[:, 0]) / np.maximum(np.linalg.norm(d1w, axis=1) ** 3, 1e-9)
        tip = np.clip(np.maximum(kappa, kw) * tip_radius - 0.5, 0, 1)
        tip = np.clip(ndimage.maximum_filter1d(tip, int(sigma * 1.5), mode="wrap"), 0, 1)
        tip = ndimage.gaussian_filter1d(tip, sigma * 0.5, mode="wrap")
        cf = tip[:, None] * weak + (1 - tip[:, None]) * strong
        # dense samples for the distance query
        seg = np.linalg.norm(np.diff(np.vstack([cf, cf[:1]]), axis=0), axis=1)
        arc = np.r_[0, np.cumsum(seg)]
        t = np.arange(0, arc[-1], 0.35)
        cl_ = np.vstack([cf, cf[:1]])
        dense.append(np.stack([np.interp(t, arc, cl_[:, 0]), np.interp(t, arc, cl_[:, 1])], 1))
        inside ^= Path(cf[:, ::-1]).contains_points(pix[:, ::-1]).reshape(H, W)
    tree = cKDTree(np.vstack(dense))
    dist, _ = tree.query(pix, k=1)
    return np.where(inside, 1.0, -1.0) * dist.reshape(H, W)


def smooth_noise(shape, sigma, seed):
    rng = np.random.default_rng(seed)
    n = ndimage.gaussian_filter(rng.standard_normal(shape), sigma)
    return n / (np.abs(n).max() + 1e-9)


def letter_field(alpha, own, pad, args, seed):
    """Returns the 2x super-sampled height field H (in 1x px), centreline-distance field and crop info."""
    ys, xs = np.nonzero(own)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, alpha.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, alpha.shape[1])
    a = np.where(ndimage.binary_dilation(own, iterations=3), alpha, 0)[y0:y1, x0:x1]
    # super-sample x2 with cubic interpolation, then smooth away the JPEG/pixel steps
    a2 = np.clip(ndimage.zoom(a, 2, order=3), 0, 1)
    a2 = ndimage.gaussian_filter(a2, args.mask_blur)
    inside = a2 > 0.5
    d_in = ndimage.distance_transform_edt(inside)
    d_out = ndimage.distance_transform_edt(~inside)
    # Sub-pixel signed distance to the outline: EDT far away, the linearised smooth alpha near the edge,
    # then blurred so the outline has no pixel staircase or JPEG wobble left (tips stay sharp: the blur moves
    # the zero line by well under a pixel except at the very point).
    sdf = np.where(inside, d_in - 0.5, -(d_out - 0.5))
    gy_, gx_ = np.gradient(a2)
    lin = (a2 - 0.5) / np.maximum(np.hypot(gx_, gy_), 1e-3)
    near = np.abs(sdf) < 2.0
    sdf = np.where(near, np.clip(lin, -2.0, 2.0), sdf)
    sdf = ndimage.gaussian_filter(sdf, args.sdf_blur)
    # the cut-out's outline still undulates (JPEG-derived alpha); fair it as a curve, strongly along the
    # gentle sweeps and hardly at the hooked tips, then rebuild an exact signed distance from the faired curve
    sdf = faired_sdf(sdf, args.fair, args.fair_tip_radius)
    inside = sdf > 0
    # keep the single main piece (thin fringe islands from the soft alpha would become crumbs)
    lab, n = ndimage.label(inside)
    if n > 1:
        s = ndimage.sum(inside, lab, range(1, n + 1))
        inside = lab == (1 + int(np.argmax(s)))
        sdf = np.where(inside | (sdf <= 0), sdf, -0.5)
    # Balloon inflation with the outline placed at its sub-pixel position (Shortley-Weller stencil), so u
    # carries no staircase from the pixel grid.
    u = poisson_inflate(sdf, inside)  # 2x px^2
    # outside: a constant-slope ramp (a varying slope would tilt the rim normals); C1 enough for meshing
    rim = inside & (sdf < 2.0)
    C = float(np.median(np.hypot(*np.gradient(u))[rim]))
    g = np.where(inside, u, C * sdf)
    g = ndimage.gaussian_filter(g, 0.75)
    d_in = np.maximum(sdf, 0.0)
    if getattr(args, "debug", None) is not None:  # used by tuning scripts only
        args.debug.update(u=u, sdf=sdf, C=C)
    # squared half-depth in 1x px^2: a round tube of half-width R has 2u = R^2 (2x px), i.e. q = R^2 in 1x px.
    # Meshing f = q - z^2 instead of sqrt(q) - |z| keeps the implicit field nearly linear at the rim
    # (f ~ 2R * distance), so marching cubes places the silhouette vertices accurately (no ribbing).
    q = (args.zscale ** 2) * g / 2.0
    noise = smooth_noise(g.shape, 40, seed)
    q = np.where(q > 0, q * (1.0 + args.noise * noise) ** 2, q)
    # normalised distance from the centreline: 1 - d / local half-width (max of d along the ridge)
    ridge = ndimage.grey_dilation(d_in, size=(31, 31))
    ridge = np.maximum(ndimage.gaussian_filter(ridge, 6), 1.0)
    cl = np.clip(1.0 - d_in / ridge, 0, 1)
    # extend cl outward so interpolation at the outline reads 1
    cl = np.where(inside, cl, 1.0)
    return q, cl, (y0, x0)


# ----------------------------------------------------------------------------- mesh helpers
def taubin(v, f, iters=12, lam=0.5, mu=-0.53):
    n = len(v)
    e = np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]])
    e = np.concatenate([e, e[:, ::-1]])
    A = sparse.csr_matrix((np.ones(len(e)), (e[:, 0], e[:, 1])), shape=(n, n))
    A.data[:] = 1.0
    deg = np.asarray(A.sum(1)).ravel()
    Dinv = sparse.diags(1.0 / np.maximum(deg, 1))
    Wm = Dinv @ A
    for _ in range(iters):
        v = v + lam * (Wm @ v - v)
        v = v + mu * (Wm @ v - v)
    return v


def vertex_normals(v, f):
    fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])  # area weighted
    vn = np.zeros_like(v)
    for k in range(3):
        np.add.at(vn, f[:, k], fn)
    return vn / np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)


def project_to_surface(v, q, oy, ox, back, steps=3):
    """Newton steps onto f = q(x, y) - zz^2 = 0 (zz = z, or z / back behind). v in source px (x, y, z)."""
    gq_y, gq_x = np.gradient(q)
    gq_y *= 2.0  # per 2x px -> per 1x px
    gq_x *= 2.0
    v = v.copy()
    for _ in range(steps + 1):
        coords = [(v[:, 1] - oy) * 2 + 0.5, (v[:, 0] - ox) * 2 + 0.5]
        qv = ndimage.map_coordinates(q, coords, order=3, mode="nearest")
        fx = ndimage.map_coordinates(gq_x, coords, order=3, mode="nearest")
        fy = ndimage.map_coordinates(gq_y, coords, order=3, mode="nearest")
        k = np.where(v[:, 2] >= 0, 1.0, 1.0 / back)
        zz = v[:, 2] * k
        f = qv - zz * zz
        fz = -2.0 * zz * k
        grad = np.stack([fx, fy, fz], 1)
        if _ == steps:
            break
        g2 = np.maximum((grad * grad).sum(1), 1e-9)
        step = np.clip(f / g2, -2.0, 2.0)[:, None] * grad
        step = np.clip(step, -1.5, 1.5)  # never move more than ~a voxel
        v -= step
    return v, grad


def check_manifold(f):
    e = np.sort(np.concatenate([f[:, [0, 1]], f[:, [1, 2]], f[:, [2, 0]]]), axis=1)
    _, cnt = np.unique(e, axis=0, return_counts=True)
    return int((cnt != 2).sum())


# ----------------------------------------------------------------------------- GLB writer
def write_glb(path, letters):
    """Minimal glTF 2.0 binary writer: one node + mesh per letter, float32 attributes, uint32 indices."""
    blob = bytearray()
    views, accs, meshes, nodes = [], [], [], []

    def add(arr, target, comp, typ, minmax=False):
        arr = np.ascontiguousarray(arr)
        while len(blob) % 4:
            blob.append(0)
        off = len(blob)
        blob.extend(arr.tobytes())
        views.append({"buffer": 0, "byteOffset": off, "byteLength": arr.nbytes, "target": target})
        acc = {"bufferView": len(views) - 1, "componentType": comp, "count": int(arr.shape[0]), "type": typ}
        if minmax:
            acc["min"] = arr.min(0).astype(float).tolist()
            acc["max"] = arr.max(0).astype(float).tolist()
        accs.append(acc)
        return len(accs) - 1

    for L in letters:
        attrs = {
            "POSITION": add(L["pos"].astype(np.float32), 34962, 5126, "VEC3", True),
            "NORMAL": add(L["nrm"].astype(np.float32), 34962, 5126, "VEC3"),
            "TEXCOORD_0": add(L["uv0"].astype(np.float32), 34962, 5126, "VEC2"),
            "TEXCOORD_1": add(L["uv1"].astype(np.float32), 34962, 5126, "VEC2"),
        }
        ind = add(L["idx"].astype(np.uint32).ravel(), 34963, 5125, "SCALAR")
        meshes.append({"name": L["name"], "primitives": [{"attributes": attrs, "indices": ind, "mode": 4}]})
        nodes.append({"name": L["name"], "mesh": len(meshes) - 1})
    while len(blob) % 4:
        blob.append(0)
    gltf = {
        "asset": {"version": "2.0", "generator": "AAYAM scripts/build-wordmark-3d.py"},
        "scene": 0,
        "scenes": [{"name": "AAYAM", "nodes": list(range(len(nodes)))}],
        "nodes": nodes,
        "meshes": meshes,
        "accessors": accs,
        "bufferViews": views,
        "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(gltf, separators=(",", ":")).encode()
    js += b" " * ((4 - len(js) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<III", 0x46546C67, 2, total))
        fh.write(struct.pack("<II", len(js), 0x4E4F534A))
        fh.write(js)
        fh.write(struct.pack("<II", len(blob), 0x004E4942))
        fh.write(bytes(blob))


def read_glb_json(path):
    with open(path, "rb") as fh:
        data = fh.read()
    n = struct.unpack_from("<I", data, 12)[0]
    return json.loads(data[20:20 + n])


# ----------------------------------------------------------------------------- main
def main():
    args = parse_args()
    work = args.work or os.path.join(tempfile.gettempdir(), "aayam-wordmark-build")
    os.makedirs(work, exist_ok=True)
    os.makedirs(args.out_dir, exist_ok=True)

    alpha = np.asarray(Image.open(args.src).convert("RGBA"))[..., 3].astype(np.float64) / 255.0
    owners = split_letters(alpha)
    full = alpha > 0.5
    ys, xs = np.nonzero(full)
    bx0, bx1, by0, by1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    px_per_unit = (bx1 - bx0) / WIDTH_UNITS
    cx, cy = (bx0 + bx1) / 2.0, (by0 + by1) / 2.0

    letters = []
    vox = args.voxel
    for li, (name, own) in enumerate(zip(NAMES, owners)):
        q, cl, (oy, ox) = letter_field(alpha, own, 10, args, seed=11 + li * 7)
        H2, W2 = q.shape
        zmax = np.sqrt(q.max()) + 3 * vox
        # sample grid (1x px coords relative to the crop), z symmetric
        gy = np.arange(0, H2 / 2.0, vox)
        gx = np.arange(0, W2 / 2.0, vox)
        gz = np.arange(-zmax, zmax + vox, vox)
        YY, XX = np.meshgrid(gy, gx, indexing="ij")
        qs = ndimage.map_coordinates(q, [YY.ravel() * 2 + 0.5, XX.ravel() * 2 + 0.5], order=3, mode="nearest").reshape(YY.shape)
        Z = gz[None, None, :]
        zz = np.where(Z >= 0, Z, Z / args.back)  # flatter back
        vol = qs[..., None] - zz * zz
        vol = vol / (2.0 * np.sqrt(max(q.max(), 1.0)))  # ~ px units, for a sane padding value
        vol = np.pad(vol, 1, constant_values=-vox * 4)
        verts, faces, _, _ = measure.marching_cubes(vol.astype(np.float32), 0.0, spacing=(vox, vox, vox))
        verts -= vox  # padding
        # (row, col, z) -> source px
        py_ = verts[:, 0] + oy
        px_ = verts[:, 1] + ox
        pz = verts[:, 2] - zmax
        v = np.stack([px_, py_, pz], 1)
        faces = faces[:, ::-1]  # outward winding after the axis swap below
        v = taubin(v, faces, iters=args.taubin)
        # project the smoothed vertices back onto the implicit surface and take the normals from the field
        # gradient: exact, tessellation-independent smooth normals
        v, grad = project_to_surface(v, q, oy, ox, args.back)
        # to units: x right, y up, z towards viewer
        P = np.stack([(v[:, 0] - cx) / px_per_unit, -(v[:, 1] - cy) / px_per_unit, v[:, 2] / px_per_unit], 1)
        Nn = np.stack([-grad[:, 0], grad[:, 1], -grad[:, 2]], 1)
        Nn /= np.maximum(np.linalg.norm(Nn, axis=1, keepdims=True), 1e-12)
        # winding must agree with the outward normals
        fn = np.cross(P[faces[:, 1]] - P[faces[:, 0]], P[faces[:, 2]] - P[faces[:, 0]])
        if np.sum(fn * Nn[faces[:, 0]]) < 0:
            faces = faces[:, ::-1]
        # attributes
        ymin, ymax = P[:, 1].min(), P[:, 1].max()
        xmin, xmax = P[:, 0].min(), P[:, 0].max()
        span = max(xmax - xmin, ymax - ymin)
        uv0 = np.stack([(P[:, 0] - xmin) / span, (P[:, 1] - ymin) / span], 1)
        fill = (P[:, 1] - ymin) / (ymax - ymin)
        clv = ndimage.map_coordinates(cl, [(v[:, 1] - oy) * 2 + 0.5, (v[:, 0] - ox) * 2 + 0.5], order=1, mode="nearest")
        uv1 = np.stack([fill, np.clip(clv, 0, 1)], 1)
        bad = check_manifold(faces)
        letters.append({"name": name, "pos": P, "nrm": Nn, "uv0": uv0, "uv1": uv1, "idx": faces})
        print(f"{name}: verts {len(P)} tris {len(faces)} non-manifold edges {bad} depth {np.ptp(P[:, 2]):.3f}")

    # exact framing: 2.0 units wide, x/y centred on the origin (fairing moves the outline by a fraction of
    # a pixel); z keeps the silhouette plane at 0. Per-letter UVs and fillHeight are invariant to this.
    allP = np.concatenate([L["pos"] for L in letters])
    lo, hi = allP.min(0), allP.max(0)
    k = WIDTH_UNITS / (hi[0] - lo[0])
    shift = np.array([(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, 0.0])
    for L in letters:
        L["pos"] = (L["pos"] - shift) * k
    allP = np.concatenate([L["pos"] for L in letters])
    print("bbox", allP.min(0).round(4).tolist(), allP.max(0).round(4).tolist())
    raw = os.path.join(work, "aayam-wordmark-raw.glb")
    write_glb(raw, letters)
    total = sum(len(L["idx"]) for L in letters)
    print("raw", raw, os.path.getsize(raw), "tris", total)
    np.savez_compressed(os.path.join(work, "raw-mesh.npz"), **{f"{L['name']}_{k}": L[k] for L in letters for k in ("pos", "nrm", "idx", "uv1")})

    if args.no_pack:
        return
    npx = "npx.cmd" if os.name == "nt" else "npx"
    for fname, target in (("aayam-wordmark.glb", args.desktop_tris), ("aayam-wordmark-mobile.glb", args.mobile_tris)):
        ratio = min(1.0, target / total)
        out = os.path.join(args.out_dir, fname)
        cmd = [npx, "gltfpack", "-i", raw, "-o", out, "-cc", "-ce", "ext", "-kn", "-kv", "-si", f"{ratio:.5f}", "-sa", "-vpf", "-vtf", "-vn", "10"]
        print(" ".join(cmd))
        subprocess.run(cmd, check=True)
        js = read_glb_json(out)
        meshes = {m["name"] if "name" in m else i: list(m["primitives"][0]["attributes"].keys()) for i, m in enumerate(js["meshes"])}
        tris = sum(js["accessors"][p["indices"]]["count"] // 3 for m in js["meshes"] for p in m["primitives"])
        print(fname, os.path.getsize(out), "bytes", "tris", tris, "nodes", [n.get("name") for n in js["nodes"]], meshes, js.get("extensionsUsed"))


if __name__ == "__main__":
    sys.exit(main())
