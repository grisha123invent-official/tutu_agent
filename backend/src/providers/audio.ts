/**
 * Утилиты для локального голосового конвейера (STT → LLM → TTS).
 * Работают с сырым PCM16 (signed 16-bit little-endian, моно).
 */

/** Средняя громкость (RMS 0..1) буфера PCM16. */
export function rms16(buf: Buffer): number {
  if (buf.length < 2) return 0
  let sum = 0
  const n = Math.floor(buf.length / 2)
  for (let i = 0; i < n; i++) {
    const s = buf.readInt16LE(i * 2) / 32768
    sum += s * s
  }
  return Math.sqrt(sum / n)
}

/** Длительность буфера PCM16 в миллисекундах при заданной частоте. */
export function durationMs(buf: Buffer, sampleRate: number): number {
  return (buf.length / 2 / sampleRate) * 1000
}

/** Обернуть сырой PCM16 моно в WAV-контейнер (для отправки в STT как файл). */
export function pcm16ToWav(pcm: Buffer, sampleRate: number): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const header = Buffer.alloc(44)
  header.write('RIFF', 0)
  header.writeUInt32LE(36 + pcm.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16) // PCM chunk size
  header.writeUInt16LE(1, 20) // audio format = PCM
  header.writeUInt16LE(numChannels, 22)
  header.writeUInt32LE(sampleRate, 24)
  header.writeUInt32LE(byteRate, 28)
  header.writeUInt16LE(blockAlign, 32)
  header.writeUInt16LE(bitsPerSample, 34)
  header.write('data', 36)
  header.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([header, pcm])
}

/** Линейный ресемпл PCM16 моно между частотами. */
export function resamplePcm16(pcm: Buffer, srcRate: number, dstRate: number): Buffer {
  if (srcRate === dstRate) return pcm
  const srcN = Math.floor(pcm.length / 2)
  const ratio = dstRate / srcRate
  const dstN = Math.round(srcN * ratio)
  const out = Buffer.alloc(dstN * 2)
  for (let i = 0; i < dstN; i++) {
    const pos = i / ratio
    const i0 = Math.floor(pos)
    const i1 = Math.min(i0 + 1, srcN - 1)
    const frac = pos - i0
    const s0 = pcm.readInt16LE(i0 * 2)
    const s1 = pcm.readInt16LE(i1 * 2)
    out.writeInt16LE(Math.round(s0 * (1 - frac) + s1 * frac), i * 2)
  }
  return out
}
