// Coordinates on the real circular tray: Y is up, +Z faces the viewer.
const FACE_NORMALS = [null, [0, 1, 0], [0, 0, 1], [1, 0, 0], [-1, 0, 0], [0, 0, -1], [0, -1, 0]]
const HALF = 0.47
const FLOOR_RADIUS = 2.58

function corners(pose) {
  const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw)
  return [-1, 1].flatMap(x => [-1, 1].map(z => ({
    x: pose.x + (x * c + z * s) * HALF,
    z: pose.z + (-x * s + z * c) * HALF
  })))
}
function fits(pose) { return corners(pose).every(p => Math.hypot(p.x, p.z) < FLOOR_RADIUS) }
function separated(a, b) {
  const ca = corners(a), cb = corners(b)
  return [a.yaw, a.yaw + Math.PI / 2, b.yaw, b.yaw + Math.PI / 2].some(angle => {
    const project = points => points.map(p => p.x * Math.cos(angle) + p.z * Math.sin(angle))
    const pa = project(ca), pb = project(cb)
    return Math.max(...pa) + 0.12 < Math.min(...pb) || Math.max(...pb) + 0.12 < Math.min(...pa)
  })
}
function createLayout(count, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('dice count must be between 1 and 6')
  const slots = count === 1 ? [[0, 0]] : count <= 3 ? [[-1.05, .3], [1.05, .3], [0, -1.25]] :
    count === 4 ? [[-1, -1], [1, -1], [-1, 1], [1, 1]] :
    count === 5 ? [[-1.3, -1.05], [1.3, -1.05], [0, 0], [-1.3, 1.05], [1.3, 1.05]] :
    [[-1.25, -.85], [0, -.85], [1.25, -.85], [-1.25, .85], [0, .85], [1.25, .85]]
  const poses = slots.slice(0, count).map(([x, z]) => ({ x, z, yaw: 0 }))
  for (let step = 0; step < 90; step++) {
    const i = Math.floor(random() * count)
    const p = { x: poses[i].x + (random() - .5) * .22, z: poses[i].z + (random() - .5) * .22, yaw: poses[i].yaw + (random() - .5) * .3 }
    if (fits(p) && poses.every((other, j) => i === j || separated(p, other))) poses[i] = p
  }
  return poses
}
module.exports = { FACE_NORMALS, createLayout, corners, fits, separated }
