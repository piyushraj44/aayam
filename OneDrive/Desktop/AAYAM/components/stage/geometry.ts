import { BufferGeometry, Float32BufferAttribute, Sphere, Uint32BufferAttribute, Vector3 } from "three";

/**
 * Indexed geodesic sphere with the same vertex layout as
 * `new IcosahedronGeometry(1, segments - 1)`, but built straight into typed
 * arrays. The stock generator is non-indexed (6× redundant vertex shading)
 * and at our detail takes ~0.4 s plus ~1.3 s to merge vertices on the main
 * thread; this takes a few milliseconds.
 *
 * Each of the 20 faces gets its own triangular vertex grid. Vertices on shared
 * edges are computed from the same corner constants with exact-zero terms, so
 * duplicates are bit-identical and produce identical displaced positions —
 * no cracks, ~2% duplicate vertices. Normals are computed in the vertex shader.
 */
export function createGeodesicSphere(segments: number): BufferGeometry {
  const n = Math.max(1, Math.floor(segments));
  const t = (1 + Math.sqrt(5)) / 2;
  const corners = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  const perFace = ((n + 1) * (n + 2)) / 2;
  const positions = new Float32Array(faces.length * perFace * 3);
  const indices = new Uint32Array(faces.length * n * n * 3);
  let p = 0;
  let k = 0;

  faces.forEach((face, f) => {
    const [A, B, C] = face.map((i) => corners[i]);
    const base = f * perFace;
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= i; j++) {
        // Barycentric weights (integers): a·A + b·B + c·C
        const a = n - i;
        const b = i - j;
        const c = j;
        const x = A[0] * a + B[0] * b + C[0] * c;
        const y = A[1] * a + B[1] * b + C[1] * c;
        const z = A[2] * a + B[2] * b + C[2] * c;
        const len = Math.sqrt(x * x + y * y + z * z);
        positions[p++] = x / len;
        positions[p++] = y / len;
        positions[p++] = z / len;
      }
    }
    const at = (i: number, j: number) => base + (i * (i + 1)) / 2 + j;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        indices[k++] = at(i, j);
        indices[k++] = at(i + 1, j);
        indices[k++] = at(i + 1, j + 1);
        if (j < i) {
          indices[k++] = at(i, j);
          indices[k++] = at(i + 1, j + 1);
          indices[k++] = at(i, j + 1);
        }
      }
    }
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(new Uint32BufferAttribute(indices, 1));
  // Displacement reaches ~1.5 radii (spikes) and the drips hang below:
  // give culling a generous bound so the shape is never clipped.
  geometry.boundingSphere = new Sphere(new Vector3(0, 0, 0), 2.2);
  return geometry;
}

/** Edge length of the subdivided icosahedron in radians (vertex spacing). */
export function geodesicSpacing(segments: number): number {
  return 1.1071487 / Math.max(1, segments);
}
