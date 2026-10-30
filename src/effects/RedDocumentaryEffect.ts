import type { RenderFrameArgs } from './types'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const easeOut = (value: number) => 1 - Math.pow(1 - clamp(value, 0, 1), 3)

// Stable pseudo-random values keep every splat identical for the same canvas/frame.
const seeded = (index: number, salt: number) => {
  const value = Math.sin(index * 127.17 + salt * 311.71) * 43758.5453
  return value - Math.floor(value)
}

type InkShape = { index: number; x: number; y: number; radius: number; rotation: number; points: number; alpha: number; delay: number; spread: number }

function createInkShapes(width: number, height: number): InkShape[] {
  const diagonal = Math.hypot(width, height)
  const anchors = [
    [0.16, 0.28], [0.39, 0.2], [0.64, 0.34], [0.83, 0.25],
    [0.26, 0.59], [0.52, 0.52], [0.75, 0.63], [0.43, 0.82],
  ]
  return anchors.map(([anchorX, anchorY], index) => ({
    index,
    x: width * (anchorX + (seeded(index, 2) - 0.5) * 0.12),
    y: height * (anchorY + (seeded(index, 3) - 0.5) * 0.12),
    radius: diagonal * (0.045 + seeded(index, 4) * 0.035),
    rotation: seeded(index, 5) * Math.PI * 2,
    points: 10 + Math.floor(seeded(index, 6) * 6),
    alpha: 0.28 + seeded(index, 7) * 0.25,
    delay: 0.12 + seeded(index, 8) * 0.5,
    spread: diagonal * (0.025 + seeded(index, 9) * 0.045),
  }))
}

function drawOrganicBlob(ctx: CanvasRenderingContext2D, shape: InkShape, progress: number, scale: number, alphaScale: number, maskOnly = false) {
  const radius = shape.radius * scale * (0.48 + progress * 0.8)
  const points = shape.points
  ctx.beginPath()
  for (let point = 0; point <= points; point += 1) {
    const angle = shape.rotation + point / points * Math.PI * 2
    const roughness = 0.74 + seeded(shape.index * 23 + point, 19) * 0.42
    const x = shape.x + Math.cos(angle) * radius * roughness
    const y = shape.y + Math.sin(angle) * radius * roughness
    if (point === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = maskOnly ? `rgba(255, 255, 255, ${shape.alpha * alphaScale})` : `rgba(166, 0, 12, ${shape.alpha * alphaScale})`
  ctx.fill()

  // A second low-alpha silhouette softens the organic edge without becoming a tint.
  ctx.beginPath()
  for (let point = 0; point <= points; point += 1) {
    const angle = shape.rotation + point / points * Math.PI * 2
    const roughness = 0.84 + seeded(shape.index * 29 + point, 23) * 0.28
    const x = shape.x + Math.cos(angle) * radius * 1.13 * roughness
    const y = shape.y + Math.sin(angle) * radius * 1.13 * roughness
    if (point === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = maskOnly ? `rgba(255, 255, 255, ${shape.alpha * alphaScale * 0.18})` : `rgba(208, 8, 20, ${shape.alpha * alphaScale * 0.18})`
  ctx.fill()
}

function drawDroplets(ctx: CanvasRenderingContext2D, shape: InkShape, progress: number, spreadScale: number, width: number, height: number, maskOnly = false) {
  const count = 5 + Math.floor(seeded(shape.index, 41) * 7)
  const maxDistance = shape.radius * spreadScale * (2.3 + progress * 2.5)
  for (let droplet = 0; droplet < count; droplet += 1) {
    const direction = seeded(shape.index * 17 + droplet, 43) * Math.PI * 2
    const distance = maxDistance * (0.42 + seeded(shape.index * 17 + droplet, 47) * 0.58)
    const size = Math.max(2, Math.min(width, height) * (0.002 + seeded(shape.index * 17 + droplet, 53) * 0.007))
    const x = clamp(shape.x + Math.cos(direction) * distance, size, width - size)
    const y = clamp(shape.y + Math.sin(direction) * distance, size, height - size)
    const dropletProgress = clamp((progress - 0.18) / 0.7, 0, 1)
    ctx.beginPath()
    ctx.ellipse(x, y, size * (0.7 + seeded(droplet, 59) * 0.9), size * (0.55 + seeded(droplet, 61) * 0.7), direction, 0, Math.PI * 2)
    ctx.fillStyle = maskOnly ? `rgba(255, 255, 255, ${0.2 + dropletProgress * 0.25})` : `rgba(190, 0, 14, ${0.2 + dropletProgress * 0.25})`
    ctx.fill()
  }
}

function unionMaxAlpha(source: ImageData, target: ImageData) {
  for (let index = 3; index < source.data.length; index += 4) {
    if (source.data[index] > target.data[index]) target.data[index] = source.data[index]
  }
}

/** Reusable deterministic red ink animation applied after each component frame. */
export function applyRedDocumentaryEffect({ ctx, frame, fps, duration, width, height, settings }: Pick<RenderFrameArgs, 'ctx' | 'frame' | 'fps' | 'duration' | 'width' | 'height' | 'settings'>) {
  if (settings.redDocumentaryEffect !== true) return

  const totalFrames = duration * fps
  const progress = totalFrames <= 1 ? 1 : clamp(frame / (totalFrames - 1), 0, 1)
  if (progress <= 0) return

  const shapes = createInkShapes(width, height)
  // Normalized phases keep the same small-to-large rhythm for every duration/FPS.
  const growth = progress < 0.2 ? 0.28 + progress / 0.2 * 0.22 : progress < 0.5 ? 0.5 + (progress - 0.2) / 0.3 * 0.55 : progress < 0.75 ? 1.05 + (progress - 0.5) / 0.25 * 0.85 : 1.9 + (progress - 0.75) / 0.25 * 0.8
  const spread = progress < 0.2 ? 0.35 + progress / 0.2 * 0.25 : progress < 0.5 ? 0.6 + (progress - 0.2) / 0.3 * 0.8 : progress < 0.75 ? 1.4 + (progress - 0.5) / 0.25 * 1.4 : 2.8 + (progress - 0.75) / 0.25 * 2.4
  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = width
  maskCanvas.height = height
  const maskCtx = maskCanvas.getContext('2d')
  if (!maskCtx) return
  const shapeCanvas = document.createElement('canvas')
  shapeCanvas.width = width
  shapeCanvas.height = height
  const shapeCtx = shapeCanvas.getContext('2d')
  if (!shapeCtx) return
  const combinedMask = maskCtx.createImageData(width, height)

  // Render each splatter separately, then keep the maximum alpha per pixel.
  const addShapeToUnion = (draw: () => void) => {
    shapeCtx.clearRect(0, 0, width, height)
    shapeCtx.globalCompositeOperation = 'source-over'
    draw()
    unionMaxAlpha(shapeCtx.getImageData(0, 0, width, height), combinedMask)
  }

  shapes.forEach((shape) => {
    const shapeProgress = easeOut((progress - shape.delay * 0.55) / (1 - shape.delay * 0.55))
    if (shapeProgress <= 0) return
    addShapeToUnion(() => {
      drawOrganicBlob(shapeCtx, shape, shapeProgress, growth, 0.42 + shapeProgress * 0.58, true)
      drawDroplets(shapeCtx, shape, shapeProgress, spread, width, height, true)
    })
  })

  // Late connecting pools create the final merged-ink stage and heavy overlap.
  const mergeProgress = easeOut((progress - 0.52) / 0.48)
  if (mergeProgress > 0) {
    const diagonal = Math.hypot(width, height)
    const mergeScale = 0.8 + mergeProgress * 0.8
    const mergePools: InkShape[] = [
      { index: 91, x: width * 0.34, y: height * 0.43, radius: diagonal * 0.18, rotation: 0.2, points: 15, alpha: 0.2, delay: 0, spread: 0 },
      { index: 92, x: width * 0.58, y: height * 0.5, radius: diagonal * 0.2, rotation: 1.1, points: 14, alpha: 0.19, delay: 0, spread: 0 },
      { index: 93, x: width * 0.72, y: height * 0.68, radius: diagonal * 0.16, rotation: 2.4, points: 13, alpha: 0.18, delay: 0, spread: 0 },
      { index: 94, x: width * 0.42, y: height * 0.76, radius: diagonal * 0.17, rotation: 3.2, points: 14, alpha: 0.18, delay: 0, spread: 0 },
    ]
    mergePools.forEach((merge) => addShapeToUnion(() => drawOrganicBlob(shapeCtx, merge, mergeProgress, mergeScale, 0.42 * mergeProgress, true)))
  }

  maskCtx.putImageData(combinedMask, 0, 0)

  // Apply one red layer through the union mask so overlaps cannot become darker.
  const inkCanvas = document.createElement('canvas')
  inkCanvas.width = width
  inkCanvas.height = height
  const inkCtx = inkCanvas.getContext('2d')
  if (!inkCtx) return
  inkCtx.fillStyle = 'rgba(166, 0, 12, 1)'
  inkCtx.fillRect(0, 0, width, height)
  inkCtx.globalCompositeOperation = 'destination-in'
  inkCtx.drawImage(maskCanvas, 0, 0)
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(inkCanvas, 0, 0)
  ctx.restore()
}
