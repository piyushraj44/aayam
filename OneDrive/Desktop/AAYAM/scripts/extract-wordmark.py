"""Extract the molten AAYAM wordmark from the reference JPG onto a transparent background."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

src, out_dir = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGB")
a = np.asarray(img).astype(np.float32)

# crop to the wordmark band (reference is 1536x1078)
y0, y1, x0, x1 = 655, 985, 250, 1135
a = a[y0:y1, x0:x1]
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mx = a.max(-1)
mn = a.min(-1)
chroma = mx - mn

# warm pixels: red dominant over blue/green; grey ascii dots have low chroma
warm = (r - np.maximum(g, b) * 0.55)
score = np.clip((chroma - 18) / 45, 0, 1) * np.clip((warm - 10) / 40, 0, 1)

# keep only big connected blobs (letters), drop scattered dots
mask = score > 0.15
mask = ndimage.binary_closing(mask, iterations=2)
lab, n = ndimage.label(mask)
sizes = ndimage.sum(mask, lab, range(1, n + 1))
keep = np.isin(lab, 1 + np.where(sizes > 1500)[0])
keep = ndimage.binary_fill_holes(ndimage.binary_dilation(keep, iterations=2))

alpha = np.clip(score * 1.6, 0, 1)
alpha = np.where(keep, np.maximum(alpha, ndimage.binary_erosion(keep, iterations=4) * 1.0), 0)
alpha_img = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))

# un-premultiply against black so edges don't go dark when composited
al = np.asarray(alpha_img).astype(np.float32) / 255
rgb = np.clip(a / np.maximum(al[..., None], 0.35), 0, 255)
rgba = np.dstack([rgb, al * 255]).astype(np.uint8)
im = Image.fromarray(rgba, "RGBA")
bbox = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
im = im.crop((max(bbox[0] - 6, 0), max(bbox[1] - 6, 0), bbox[2] + 6, bbox[3] + 6))
w, h = im.size
big = im.resize((w * 2, h * 2), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
big.save(f"{out_dir}/aayam-wordmark@2x.png", optimize=True)
big.save(f"{out_dir}/aayam-wordmark@2x.webp", quality=90, method=6)
im.save(f"{out_dir}/aayam-wordmark.webp", quality=90, method=6)
print("size", im.size, "2x", big.size)
