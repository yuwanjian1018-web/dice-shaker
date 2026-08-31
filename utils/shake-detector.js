// 比較相邻采样，静止重力/普通转屏不会触发；需两次连续冲击。
function createShakeDetector(options = {}) {
  const now = options.now || Date.now
  let previous = null
  let lastImpact = null
  let cooldownUntil = 0
  return {
    reset() { previous = null; lastImpact = null },
    push(sample) {
      if (!sample || ![sample.x, sample.y, sample.z].every(Number.isFinite)) return false
      const time = now()
      const last = previous
      previous = { x: sample.x, y: sample.y, z: sample.z }
      if (!last || time < cooldownUntil) return false
      const delta = Math.hypot(sample.x - last.x, sample.y - last.y, sample.z - last.z)
      if (delta < 1.1) return false
      if (lastImpact !== null && time - lastImpact >= 60 && time - lastImpact <= 550) {
        cooldownUntil = time + 1800
        lastImpact = null
        return true
      }
      if (lastImpact === null || time - lastImpact > 550) lastImpact = time
      return false
    }
  }
}
module.exports = { createShakeDetector }
