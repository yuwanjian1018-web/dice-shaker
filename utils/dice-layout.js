// All geometry uses the original 800 × 480 tray image, shared by every layer.
// y is the ground-contact center, NOT the center of the floating image rectangle.
const TRAY = { width: 800, height: 480, floorX: 400, floorY: 231, floorRX: 343, floorRY: 141 }
const GROUND_ANCHOR = 0.72
const BASE_SIZE = 150
const CLEARANCE = 12
// Conservative cup cross-section at dice height, smaller than its outer base.
const CUP = { x: 400, y: 223, rx: 322, ry: 139 }

function sample(random) {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random() must return a number from 0 up to, but not including, 1')
  }
  return value
}

function round(value) { return Math.round(value * 100) / 100 }

function makePose(x, y) {
  // Subtle size change with depth; vertical edges stay vertical (no bitmap roll).
  return { x: round(x), y: round(y), size: round(BASE_SIZE * (1 + (y - TRAY.floorY) / 2200)) }
}

function footprintFits(pose) {
  // A conservative rectangle encloses every orientation's whole bottom face.
  // Clearance is applied to all four corners, not just to the center or radius.
  const halfWidth = pose.size * 0.5 + CLEARANCE
  const halfDepth = pose.size * 0.26 + CLEARANCE
  return [-1, 1].every(sx => [-1, 1].every(sy => {
    const x = (pose.x + sx * halfWidth - TRAY.floorX) / TRAY.floorRX
    const y = (pose.y + sy * halfDepth - TRAY.floorY) / TRAY.floorRY
    const cupX = (pose.x + sx * (pose.size * 0.5 + 3) - CUP.x) / CUP.rx
    const cupY = (pose.y + sy * (pose.size * 0.26 + 3) - CUP.y) / CUP.ry
    return x * x + y * y <= 1 && cupX * cupX + cupY * cupY <= 1
  }))
}

function separated(a, b) {
  // Keep top results readable while allowing natural overlap of lower side faces.
  const size = (a.size + b.size) / 2
  return ((a.x - b.x) / (size * 0.96)) ** 2 + ((a.y - b.y) / (size * 0.63)) ** 2 >= 1
}

function createDiceLayout(count, random = Math.random) {
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('dice count must be an integer between 1 and 6')
  let poses = []
  for (let attempt = 0; attempt < 8; attempt++) {
    poses = []
    for (let candidate = 0; candidate < 220 && poses.length < count; candidate++) {
      const angle = sample(random) * Math.PI * 2
      const radius = Math.sqrt(sample(random))
      const pose = makePose(400 + Math.cos(angle) * radius * 250, 218 + Math.sin(angle) * radius * 105)
      if (footprintFits(pose) && poses.every(other => separated(pose, other))) poses.push(pose)
    }
    if (poses.length === count) return poses
  }
  // Dense six-die rolls can run out of room when placed one at a time. Start
  // from a safe packing, then move individual dice without crossing a boundary
  // or covering another result. This avoids returning the same fixed layout.
  const fallback = [[255, 180], [400, 158], [545, 180], [249, 275], [400, 285], [551, 275]]
  poses = fallback.slice(0, count).map(([x, y]) => makePose(x, y))
  for (let move = 0; move < 512; move++) {
    const index = Math.floor(sample(random) * count)
    const globalMove = sample(random) < 0.25
    const u = sample(random), v = sample(random)
    // Finish with smaller moves so even the tightly packed edge dice can vary.
    const step = 4 + 36 * (1 - move / 512) ** 2
    const pose = globalMove
      ? makePose(400 + Math.cos(u * Math.PI * 2) * Math.sqrt(v) * 250, 218 + Math.sin(u * Math.PI * 2) * Math.sqrt(v) * 105)
      : makePose(poses[index].x + (u - 0.5) * step * 2, poses[index].y + (v - 0.5) * step * 1.25)
    if (footprintFits(pose) && poses.every((other, otherIndex) => otherIndex === index || separated(pose, other))) poses[index] = pose
  }
  // Do not tie a particular result to a particular region of the safe packing.
  for (let index = poses.length - 1; index > 0; index--) {
    const other = Math.floor(sample(random) * (index + 1))
    ;[poses[index], poses[other]] = [poses[other], poses[index]]
  }
  return poses
}

function dicePositionStyle(pose) {
  return `left:${pose.x / TRAY.width * 100}%;top:${pose.y / TRAY.height * 100}%;width:${pose.size / TRAY.width * 100}%;height:${pose.size / TRAY.height * 100}%;z-index:${Math.round(pose.y)};transform:translate(-50%,-${GROUND_ANCHOR * 100}%);`
}

module.exports = { createDiceLayout, dicePositionStyle, footprintFits, TRAY, GROUND_ANCHOR }
