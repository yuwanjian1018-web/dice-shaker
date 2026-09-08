// 原创合成的骰子碰撞声，无外部录音、版权素材或网络依赖。
// 固定种子合成 PCM，再用 FFmpeg 编码为 44.1 kHz / 单声道 / 48 kbps MP3。
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const rate = 44100
const duration = 1.2
const samples = new Float64Array(Math.round(rate * duration))
let seed = 20260831
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
// 不规则双碰撞群模拟骰子撞击杯壁；短衰减宽频声，避免电子提示音。
for (let impact = .015; impact < 1.17; impact += .023 + random() * .035) {
  const strength = (.25 + random() * .65) * (.65 + .35 * Math.sin(impact * 34) ** 2)
  const frequency = 550 + random() * 1000
  let low = 0
  for (let i = 0; i < rate * .075; i++) {
    const index = Math.floor(impact * rate) + i
    if (index >= samples.length) break
    const t = i / rate
    const noise = random() * 2 - 1
    low += .33 * (noise - low)
    const click = (noise - low) * Math.exp(-t * 240)
    const body = (Math.sin(2 * Math.PI * frequency * t) + .4 * Math.sin(2 * Math.PI * frequency * 2.71 * t)) * Math.exp(-t * 115)
    samples[index] += strength * (.62 * click + .23 * body + .17 * low * Math.exp(-t * 90))
  }
}
let peak = 0
for (const value of samples) peak = Math.max(peak, Math.abs(value))
const wav = Buffer.alloc(44 + samples.length * 2)
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34)
wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40)
for (let i = 0; i < samples.length; i++) {
  const fade = Math.min(1, i / 220, (samples.length - i - 1) / 400)
  wav.writeInt16LE(Math.round(samples[i] / peak * .88 * fade * 32767), 44 + i * 2)
}
const dir = path.resolve(__dirname, '../assets/audio')
fs.mkdirSync(dir, { recursive: true })
const output = path.join(dir, 'dice-shake.mp3')
const temporary = path.join(dir, 'dice-shake.build.mp3')
try {
  const encoded = spawnSync(process.env.DICE_FFMPEG || 'ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-y', '-i', 'pipe:0',
    '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-b:a', '48k',
    '-ar', String(rate), '-ac', '1', '-id3v2_version', '0', temporary
  ], { input: wav, windowsHide: true })
  if (encoded.error || encoded.status !== 0) {
    throw new Error(`音效编码失败；请安装 FFmpeg 或设置 DICE_FFMPEG：${encoded.error?.message || encoded.stderr.toString()}`)
  }
  fs.renameSync(temporary, output)
  console.log(`dice-shake.mp3: ${duration}s source, ${rate}Hz, mono 48 kbps, ${fs.statSync(output).size} bytes`)
} finally {
  if (fs.existsSync(temporary)) fs.unlinkSync(temporary)
}
