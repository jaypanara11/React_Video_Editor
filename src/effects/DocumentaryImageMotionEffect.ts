import type { EffectSettings, RenderFrameArgs, VideoEffect } from './types'

type Preset = 'documentary-red' | 'archival' | 'vintage' | 'gold' | 'mystery' | 'natural' | 'none'
type Movement = 'push-in' | 'pull-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down' | 'diagonal' | 'drift'

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const seeded = (index: number, salt: number) => { const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5; return value - Math.floor(value) }

export const documentaryPresets: Record<string, { label: string; settings: EffectSettings }> = {
  'documentary-red': { label: 'Documentary Red', settings: { preset: 'documentary-red', contrast: 1.12, brightness: 0, saturation: 0.05, temperature: 0, vignette: 0.42, grain: 0.16, redAccent: 0.55, glow: 0.04, lightLeaks: true, dust: true, transitions: 'cinematic' } },
  archival: { label: 'Archival Monochrome', settings: { preset: 'archival', contrast: 1.08, brightness: 0, saturation: 0, temperature: 0, vignette: 0.34, grain: 0.2, redAccent: 0, glow: 0, lightLeaks: false, dust: true, transitions: 'dissolve' } },
  vintage: { label: 'Vintage Historical', settings: { preset: 'vintage', contrast: 0.98, brightness: 0.02, saturation: 0.55, temperature: 0.35, vignette: 0.3, grain: 0.18, redAccent: 0, glow: 0.03, lightLeaks: true, dust: true, transitions: 'film-burn' } },
  gold: { label: 'Cinematic Gold', settings: { preset: 'gold', contrast: 1.04, brightness: 0.02, saturation: 0.75, temperature: 0.28, vignette: 0.2, grain: 0.1, redAccent: 0, glow: 0.08, lightLeaks: true, dust: false, transitions: 'zoom' } },
  mystery: { label: 'Dark Mystery', settings: { preset: 'mystery', contrast: 1.16, brightness: -0.04, saturation: 0.35, temperature: -0.18, vignette: 0.5, grain: 0.13, redAccent: 0.08, glow: 0, lightLeaks: false, dust: true, transitions: 'dissolve' } },
  natural: { label: 'Natural Documentary', settings: { preset: 'natural', contrast: 1, brightness: 0, saturation: 1, temperature: 0, vignette: 0.12, grain: 0.04, redAccent: 0, glow: 0, lightLeaks: false, dust: false, transitions: 'crossfade' } },
  none: { label: 'No Effect', settings: { preset: 'none', contrast: 1, brightness: 0, saturation: 1, temperature: 0, vignette: 0, grain: 0, redAccent: 0, glow: 0, lightLeaks: false, dust: false, transitions: 'cut' } },
}

export const documentaryDefaultSettings: EffectSettings = { ...documentaryPresets['documentary-red'].settings, motion: 'cinematic', depth: false }

function settingNumber(settings: EffectSettings, key: string, fallback: number) { const value = Number(settings[key]); return Number.isFinite(value) ? value : fallback }
function drawCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number, progress: number, index: number, movement: Movement, intensity: number) {
  const zoom = movement === 'pull-out' ? 1.18 - progress * 0.15 : movement === 'push-in' ? 1.02 + progress * 0.15 : 1.08 + progress * 0.04
  const drift = 0.025 * intensity
  let x = 0; let y = 0
  if (movement === 'pan-left') x = drift * (1 - progress)
  if (movement === 'pan-right') x = -drift * (1 - progress)
  if (movement === 'pan-up') y = drift * (1 - progress)
  if (movement === 'pan-down') y = -drift * (1 - progress)
  if (movement === 'diagonal') { x = drift * (1 - progress); y = -drift * (1 - progress) }
  if (movement === 'drift') { x = Math.sin(index * 2.3 + progress * Math.PI) * drift; y = Math.cos(index + progress * Math.PI) * drift }
  ctx.save(); ctx.translate(width / 2, height / 2); ctx.rotate((seeded(index, 4) - 0.5) * 0.012 * intensity)
  ctx.translate(x * width, y * height); ctx.scale(zoom, zoom)
  ctx.drawImage(image, -width / 2, -height / 2, width, height)
  ctx.restore()
}

function drawGrade(ctx: CanvasRenderingContext2D, width: number, height: number, settings: EffectSettings, frame: number) {
  const preset = String(settings.preset ?? 'documentary-red') as Preset
  const contrast = settingNumber(settings, 'contrast', 1)
  const brightness = settingNumber(settings, 'brightness', 0)
  const saturation = settingNumber(settings, 'saturation', preset === 'natural' ? 1 : 0.05)
  // The image layers carry the CSS canvas filter; the rest of this function is
  // intentionally made from composited overlays so it remains deterministic.
  void contrast; void brightness; void saturation; void frame
  if (preset === 'vintage') { ctx.fillStyle = `rgba(128, 78, 28, ${0.18 + settingNumber(settings, 'temperature', 0.3) * 0.16})`; ctx.fillRect(0, 0, width, height) }
  if (preset === 'gold') { ctx.fillStyle = 'rgba(190, 125, 35, .12)'; ctx.fillRect(0, 0, width, height) }
  if (preset === 'mystery') { ctx.fillStyle = 'rgba(16, 26, 42, .2)'; ctx.fillRect(0, 0, width, height) }
  const red = settingNumber(settings, 'redAccent', 0)
  if (red > 0) { const gradient = ctx.createRadialGradient(width * .82, height * .68, 0, width * .82, height * .68, width * .42); gradient.addColorStop(0, `rgba(146, 13, 24, ${red * .34})`); gradient.addColorStop(1, 'rgba(146,13,24,0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height) }
  const vignette = settingNumber(settings, 'vignette', 0)
  if (vignette > 0) { const gradient = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .18, width / 2, height / 2, Math.max(width, height) * .72); gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, `rgba(0,0,0,${vignette * .78})`); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height) }
  const grain = settingNumber(settings, 'grain', 0)
  if (grain > 0) { ctx.save(); ctx.globalAlpha = grain; for (let i = 0; i < Math.min(1900, width * height / 1200); i += 1) { const x = seeded(i, frame * .17 + 3) * width; const y = seeded(i, frame * .23 + 7) * height; const light = seeded(i, frame * .31 + 11) > .5 ? 255 : 0; ctx.fillStyle = `rgb(${light},${light},${light})`; ctx.fillRect(x, y, 1 + seeded(i, 13) * 2, 1 + seeded(i, 17) * 2) } ctx.restore() }
  if (settings.dust === true) { ctx.save(); ctx.globalAlpha = .12; for (let i = 0; i < 18; i += 1) { ctx.fillStyle = '#e5d7bd'; ctx.beginPath(); ctx.arc(seeded(i, 91) * width, (seeded(i, 93) + frame * .0008) % 1 * height, 1 + seeded(i, 95) * 3, 0, Math.PI * 2); ctx.fill() } ctx.restore() }
  if (Boolean(settings.lightLeaks) && frame % 97 < 42) { const p = (frame % 97) / 42; const gradient = ctx.createLinearGradient(0, height * (p - .2), width, height * (p + .5)); gradient.addColorStop(0, 'rgba(255, 92, 35, 0)'); gradient.addColorStop(.5, `rgba(255, 92, 35, ${.1 * (1 - Math.abs(p - .5))})`); gradient.addColorStop(1, 'rgba(255, 92, 35, 0)'); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height) }
}

function movementFor(index: number, count: number): Movement { const movements: Movement[] = ['push-in', 'pan-right', 'pull-out', 'diagonal', 'pan-left', 'drift', 'pan-down', 'push-in']; return movements[(index + count) % movements.length] }

export const documentaryImageMotionEffect: VideoEffect = {
  id: 'documentary-image-motion', name: 'Documentary Image Motion Studio', fileName: 'documentary-image-motion.webm', defaultSettings: documentaryDefaultSettings,
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }: RenderFrameArgs) => {
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#080808'; ctx.fillRect(0, 0, width, height)
    if (!images.length) return
    const totalFrames = Math.max(1, Math.round(duration * fps)); const time = frame / fps; const clip = duration / images.length
    const transition = Math.min(0.72, clip * .24); let index = Math.min(images.length - 1, Math.floor(time / clip)); const local = clamp((time - index * clip) / clip)
    const drawImage = (imageIndex: number, alpha: number, localProgress: number) => { if (!images[imageIndex]) return; ctx.save(); ctx.globalAlpha = alpha; const preset = String(settings.preset ?? 'documentary-red'); const grayscale = preset === 'archival' || preset === 'documentary-red'; const contrast = settingNumber(settings, 'contrast', 1); const brightness = settingNumber(settings, 'brightness', 0); const saturation = settingNumber(settings, 'saturation', preset === 'natural' ? 1 : 0.05); ctx.filter = `brightness(${Math.max(0.05, 1 + brightness)}) contrast(${contrast}) saturate(${saturation})${grayscale ? ' grayscale(1)' : ''}`; drawCover(ctx, images[imageIndex], width, height, localProgress, imageIndex, movementFor(imageIndex, images.length), settingNumber(settings, 'motionIntensity', 1)); ctx.restore() }
    drawImage(index, 1, smooth(local))
    if (index < images.length - 1 && local > 1 - transition / clip) { const blend = smooth((local - (1 - transition / clip)) / (transition / clip)); index += 1; drawImage(index, blend, 0) }
    drawGrade(ctx, width, height, settings, frame)
    // Keep the final frame painted and fully opaque; this avoids recorder-dependent tail gaps.
    if (frame >= totalFrames - 1) { ctx.save(); ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,0.001)'; ctx.fillRect(0, 0, width, height); ctx.restore() }
  },
}
