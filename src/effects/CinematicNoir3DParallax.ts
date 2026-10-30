import type { EffectSettings, RenderFrameArgs, VideoEffect } from './types'

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const noise = (index: number, salt: number) => { const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453; return value - Math.floor(value) }
const numberSetting = (settings: EffectSettings, key: string, fallback: number) => Number.isFinite(Number(settings[key])) ? Number(settings[key]) : fallback
const objectUrls = new WeakMap<object, string>()
type Drawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap

export const cinematicNoir3DParallaxDefaults: EffectSettings = { totalDuration: 4.5, overlap: .8, contrast: 1.38, brightness: -.08, grain: .05, parallax: true, atmosphericLeaks: true }

export function getDrawable(item: unknown): Drawable | null {
  if (!item) return null
  if (typeof HTMLImageElement !== 'undefined' && item instanceof HTMLImageElement) return item
  if (typeof HTMLCanvasElement !== 'undefined' && item instanceof HTMLCanvasElement) return item
  if (typeof ImageBitmap !== 'undefined' && item instanceof ImageBitmap) return item
  if (typeof item === 'object') {
    const value = item as { image?: unknown; img?: unknown; bitmap?: unknown; element?: unknown; source?: unknown; canvas?: unknown }
    return getDrawable(value.image ?? value.img ?? value.bitmap ?? value.element ?? value.source ?? value.canvas)
  }
  return null
}

export function getImageUrl(item: unknown): string {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof Blob !== 'undefined' && item instanceof Blob) { const cached = objectUrls.get(item); if (cached) return cached; const url = URL.createObjectURL(item); objectUrls.set(item, url); return url }
  if (typeof item === 'object') { const value = item as { url?: unknown; preview?: unknown; src?: unknown; dataUrl?: unknown }; return [value.url, value.preview, value.src, value.dataUrl].find((candidate): candidate is string => typeof candidate === 'string') ?? '' }
  return ''
}

function drawableSize(image: Drawable) { return { width: 'naturalWidth' in image ? image.naturalWidth : image.width, height: 'naturalHeight' in image ? image.naturalHeight : image.height } }

function readyImages(items: unknown[]): Drawable[] {
  if (typeof HTMLImageElement === 'undefined') return []
  return items.filter(Boolean).flatMap((item) => {
    const drawable = getDrawable(item)
    if (drawable) { const size = drawableSize(drawable); return size.width > 0 && size.height > 0 && (!('complete' in drawable) || drawable.complete) ? [drawable] : [] }
    const url = getImageUrl(item); if (!url) return []
    const image = new Image(); image.src = url
    return image.complete && image.naturalWidth > 0 ? [image] : []
  })
}

type Plane = { image: Drawable; x: number; y: number; z: number; width: number; height: number; rotation: number; index: number }
type Camera = { x: number; y: number; z: number; rotation: number }

function buildPlanes(images: Drawable[], width: number, height: number): Plane[] {
  const baseWidth = width * .54
  return images.map((image, index) => {
    const size = drawableSize(image); const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 10
    const planeWidth = baseWidth * (.9 + noise(index, 4) * .16)
    const planeHeight = Math.min(height * .6, planeWidth / aspect)
    const row = index % 4
    return { image, index, x: (row === 1 ? -width * .27 : row === 2 ? width * .28 : row === 3 ? width * .42 : 0) + (noise(index, 5) - .5) * width * .08, y: (row === 2 ? -height * .18 : row === 3 ? height * .14 : 0) + (noise(index, 6) - .5) * height * .1, z: index * 420, width: planeWidth, height: planeHeight, rotation: (noise(index, 7) - .5) * .08 }
  })
}

function focusCamera(planes: Plane[], index: number, progress: number, direction: number): Camera {
  const current = planes[index]; const next = planes[Math.min(index + 1, planes.length - 1)] ?? current; const travel = ease(progress); const target = progress > .8 ? next : current; const blend = progress > .8 ? ease((progress - .8) / .2) : 0
  return { x: current.x + (next.x - current.x) * blend + Math.sin(progress * Math.PI) * direction * 35, y: current.y + (next.y - current.y) * blend + Math.sin(progress * Math.PI) * 20, z: current.z + (next.z - current.z) * blend + (index % 2 === 0 ? travel : 1 - travel) * 110, rotation: current.rotation + (target.rotation - current.rotation) * blend + Math.sin(progress * Math.PI) * direction * .018 }
}

function project(plane: Plane, camera: Camera, width: number, height: number) {
  const focalLength = Math.max(width, height) * 1.15; const depth = focalLength / Math.max(focalLength * .35, focalLength + plane.z - camera.z); const x = width / 2 + (plane.x - camera.x) * depth; const y = height / 2 + (plane.y - camera.y) * depth
  return { x, y, width: plane.width * depth, height: plane.height * depth, depth }
}

function drawPlane(ctx: CanvasRenderingContext2D, plane: Plane, camera: Camera, width: number, height: number, opacity: number, blur: number, foreground: boolean, progress: number) {
  const rect = project(plane, camera, width, height); if (rect.width < 2 || rect.height < 2 || rect.depth <= 0) return
  ctx.save(); ctx.globalAlpha = opacity; ctx.translate(rect.x, rect.y); ctx.rotate(plane.rotation - camera.rotation * .35); ctx.shadowColor = foreground ? 'rgba(0,0,0,.72)' : 'rgba(0,0,0,.3)'; ctx.shadowBlur = foreground ? 42 : 14; ctx.shadowOffsetY = foreground ? 18 : 6
  // Keep the actual photographs bright and legible. The atmospheric grade is
  // applied separately, so it never needs a black fill over the image plane.
  ctx.filter = blur ? 'grayscale(100%) contrast(118%) brightness(96%) blur(6px)' : 'grayscale(100%) contrast(122%) brightness(112%)'
  ctx.drawImage(plane.image, -rect.width / 2, -rect.height / 2, rect.width, rect.height); ctx.restore()
  if (!foreground) return
  ctx.save(); ctx.globalAlpha = opacity * .86; ctx.strokeStyle = 'rgba(255,255,255,.82)'; ctx.lineWidth = Math.max(1, width / 1280); const reveal = ease(clamp(progress / .14)); const gap = Math.max(12, width * .008); const length = Math.min(rect.width, rect.height) * .15 * reveal; const left = rect.x - rect.width / 2 - gap; const right = rect.x + rect.width / 2 + gap; const top = rect.y - rect.height / 2 - gap; const bottom = rect.y + rect.height / 2 + gap; ctx.beginPath(); ctx.moveTo(left, top + length); ctx.lineTo(left, top); ctx.lineTo(left + length, top); ctx.moveTo(right - length, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right, bottom - length); ctx.stroke(); ctx.restore()
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, slide: number, settings: EffectSettings) {
  ctx.save(); ctx.fillStyle = 'rgba(8,19,23,.07)'; ctx.globalCompositeOperation = 'multiply'; ctx.fillRect(0, 0, width, height); ctx.globalCompositeOperation = 'source-over'
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .24, width / 2, height / 2, Math.max(width, height) * .78); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.42)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height)
  if (settings.atmosphericLeaks !== false) { const pulse = .12 + Math.sin(frame * .035) * .05; for (const side of [-1, 1]) { const x = side < 0 ? width * .08 : width * .92; const y = side < 0 ? height * .72 : height * .3; const leak = ctx.createRadialGradient(x, y, 0, x, y, Math.max(width, height) * .46); leak.addColorStop(0, `rgba(190,15,20,${pulse})`); leak.addColorStop(.45, `rgba(120,5,10,${pulse * .4})`); leak.addColorStop(1, 'rgba(120,5,10,0)'); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = leak; ctx.fillRect(0, 0, width, height) } }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = numberSetting(settings, 'grain', .05); for (let i = 0; i < Math.min(2400, width * height / 900); i += 1) { const value = noise(i, frame * .21 + 10) > .5 ? 255 : 0; ctx.fillStyle = `rgb(${value},${value},${value})`; ctx.fillRect(noise(i, 12) * width, noise(i, frame * .17 + 14) * height, 1.5, 1.5) }
  ctx.restore(); ctx.save(); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, width, height * .07); ctx.fillRect(0, height * .93, width, height * .07); ctx.restore(); void slide
}

function drawDust(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number, camera: Camera) {
  ctx.save(); for (let i = 0; i < 52; i += 1) { const z = -200 + noise(i, 2) * 450; const parallax = (camera.z - z) * .00045; const x = (noise(i, 4) * width + camera.x * parallax + frame * (.08 + noise(i, 6) * .2)) % width; const y = (noise(i, 8) * height + camera.y * parallax + frame * (.03 + noise(i, 10) * .1)) % height; ctx.globalAlpha = .2 + noise(i, 12) * .5; ctx.fillStyle = '#eee9df'; ctx.beginPath(); ctx.arc((x + width) % width, (y + height) % height, 1 + noise(i, 14) * 2, 0, Math.PI * 2); ctx.fill() } ctx.restore()
}

export const cinematicNoir3DParallax: VideoEffect = {
  id: 'cinematic_noir_3d_parallax', name: 'Cinematic Noir 3D Parallax', fileName: 'cinematic-noir-3d-parallax.webm', defaultSettings: cinematicNoir3DParallaxDefaults,
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }: RenderFrameArgs) => {
    try {
      const safeImages = readyImages(Array.isArray(images) ? images : []); ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#050708'; ctx.fillRect(0, 0, width, height); if (!safeImages.length) { drawAtmosphere(ctx, width, height, frame, 0, settings); return }
      const planes = buildPlanes(safeImages, width, height); const totalFrames = Math.max(1, Math.round(duration * fps)); const time = Math.min(duration, Math.max(0, frame / fps)); const slideDuration = duration / planes.length; const index = Math.min(planes.length - 1, Math.floor(time / slideDuration)); const local = clamp((time - index * slideDuration) / slideDuration); const camera = focusCamera(planes, index, local, index % 2 === 0 ? 1 : -1)
      planes.slice().sort((a, b) => b.z - a.z).forEach((plane) => { const isFocus = plane.index === index; const distance = Math.abs(plane.z - camera.z); drawPlane(ctx, plane, camera, width, height, isFocus ? 1 : Math.max(.2, 1 - distance / 1700), isFocus ? 0 : Math.min(6, distance / 160), isFocus, local) })
      drawDust(ctx, width, height, frame, camera); drawAtmosphere(ctx, width, height, frame, index, settings); if (frame >= totalFrames - 1) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(0,0,0,.001)'; ctx.fillRect(0, 0, width, height) }
    } catch (error) { console.error('[cinematic_noir_3d_parallax] frame render failed', error); try { ctx.clearRect(0, 0, width, height); ctx.fillStyle = '#050708'; ctx.fillRect(0, 0, width, height) } catch (fallbackError) { console.error('[cinematic_noir_3d_parallax] fallback failed', fallbackError) } }
  },
}
