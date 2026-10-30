import type { VideoEffect } from './types'
import { drawCover, roundedRect } from '../utils/canvasUtils'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function easeInOut(value: number) {
  const t = clamp(value, 0, 1)
  return t * t * (3 - 2 * t)
}

function drawSlabFaces(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, depth: number, angle: number) {
  const bottom = top + height
  const turn = Math.sin(angle)
  const direction = Math.cos(angle) >= 0 ? -1 : 1
  // Project the near spine more prominently than the far edge. This is the
  // canvas equivalent of a perspective camera looking obliquely across one
  // solid book body; the physical depth remains constant on both sides.
  const nearDepth = depth * (1.05 + Math.abs(turn) * 0.5)
  const farDepth = depth * (0.38 + Math.abs(turn) * 0.16)
  const leftBackX = direction < 0 ? -nearDepth : farDepth
  const rightBackX = direction < 0 ? -farDepth : nearDepth
  const backY = -depth * (0.62 + Math.abs(turn) * 0.2)
  const right = left + width

  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineWidth = Math.max(2, depth * 0.06)

  // The top and side surfaces are drawn behind the front face so their shared
  // edges remain joined throughout the flip instead of becoming detached.
  ctx.fillStyle = '#4a1728'
  ctx.strokeStyle = 'rgba(149, 57, 82, .72)'
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(right, top); ctx.lineTo(right + rightBackX, top + backY); ctx.lineTo(left + leftBackX, top + backY); ctx.closePath(); ctx.fill(); ctx.stroke()

  ctx.fillStyle = '#240d19'
  ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, bottom); ctx.lineTo(left + leftBackX, bottom + backY); ctx.lineTo(left + leftBackX, top + backY); ctx.closePath(); ctx.fill(); ctx.stroke()

  ctx.fillStyle = '#351020'
  ctx.beginPath(); ctx.moveTo(right, top); ctx.lineTo(right, bottom); ctx.lineTo(right + rightBackX, bottom + backY); ctx.lineTo(right + rightBackX, top + backY); ctx.closePath(); ctx.fill(); ctx.stroke()

  ctx.fillStyle = '#1d0a15'
  ctx.beginPath(); ctx.moveTo(left, bottom); ctx.lineTo(right, bottom); ctx.lineTo(right + rightBackX, bottom + backY); ctx.lineTo(left + leftBackX, bottom + backY); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.restore()
}

function drawCardFace(ctx: CanvasRenderingContext2D, image: HTMLImageElement, centerX: number, centerY: number, cardWidth: number, cardHeight: number, radius: number, projection: number, glow: number, depth: number, isBack: boolean) {
  const projectedWidth = Math.max(cardWidth * projection, 2)
  const left = -projectedWidth / 2
  const top = -cardHeight / 2
  const faceRadius = Math.min(radius, projectedWidth / 2)
  const slabDepth = Math.max(24, Math.min(cardWidth, cardHeight) * 0.075)
  const coverMargin = Math.max(16, Math.min(cardWidth, cardHeight) * 0.045)
  const imageLeft = left + coverMargin
  const imageTop = top + coverMargin
  const imageWidth = Math.max(2, projectedWidth - coverMargin * 2)
  const imageHeight = Math.max(2, cardHeight - coverMargin * 2)

  // A canvas frame has no DOM transform tree, so these polygons are the raster
  // equivalent of a perspective scene containing one solid hardcover body.
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.globalAlpha = 0.98
  ctx.shadowColor = `rgba(0, 0, 0, ${0.34 + depth * 0.12})`
  ctx.shadowBlur = 34 + depth * 20
  ctx.shadowOffsetY = 18 + depth * 7
  const angle = isBack ? Math.PI - Math.acos(clamp(projection, 0, 1)) : Math.acos(clamp(projection, 0, 1))
  drawSlabFaces(ctx, left, top, projectedWidth, cardHeight, slabDepth, angle)
  ctx.fillStyle = '#571b2f'
  roundedRect(ctx, left, top, projectedWidth, cardHeight, faceRadius)
  ctx.fill()
  ctx.shadowColor = 'transparent'
  ctx.clip()
  drawCover(ctx, image, imageLeft, imageTop, imageWidth, imageHeight)
  const sheen = ctx.createLinearGradient(imageLeft, imageTop, imageLeft + imageWidth, imageTop + imageHeight)
  sheen.addColorStop(0, `rgba(255,255,255,${isBack ? '.1' : '.15'})`)
  sheen.addColorStop(0.34, 'rgba(255,255,255,0)')
  sheen.addColorStop(1, `rgba(8,12,38,${isBack ? '.3' : '.22'})`)
  ctx.fillStyle = sheen
  ctx.fillRect(imageLeft, imageTop, imageWidth, imageHeight)
  ctx.restore()

  const borderWidth = Math.max(7, Math.min(cardWidth, cardHeight) * 0.012)

  // Two concentric strokes keep the perimeter continuous: a broad cyan halo
  // carries through the rounded corners and a bright inner edge stays visible
  // on both faces, including while the card is almost edge-on.
  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.globalAlpha = 0.96
  ctx.shadowColor = `rgba(77, 226, 255, ${0.7 + glow * 0.2})`
  ctx.shadowBlur = 34 + glow * 18
  ctx.strokeStyle = `rgba(82, 218, 255, ${0.82 + glow * 0.12})`
  ctx.lineWidth = borderWidth * 1.9
  roundedRect(ctx, left, top, projectedWidth, cardHeight, faceRadius)
  ctx.stroke()
  ctx.shadowColor = `rgba(205, 252, 255, ${0.65 + glow * 0.2})`
  ctx.shadowBlur = 12 + glow * 8
  ctx.strokeStyle = `rgba(239, 255, 255, ${0.9 + glow * 0.08})`
  ctx.lineWidth = borderWidth * 0.62
  roundedRect(ctx, left, top, projectedWidth, cardHeight, faceRadius)
  ctx.stroke()
  ctx.restore()
}

export const flipCardAnimationEffect: VideoEffect = {
  id: 'flip-card',
  name: 'Flip Card Animation',
  fileName: 'flip-card-animation.webm',
  defaultSettings: { redDocumentaryEffect: false },
  renderFrame: ({ ctx, frame, fps, duration, images, width, height }) => {
    if (!images.length) return

    const totalFrames = Math.max(1, Math.round(duration * fps))
    const imageCount = images.length
    const baseFrames = Math.floor(totalFrames / imageCount)
    const remainder = totalFrames % imageCount
    // The card occupies the same large, centered safe area in landscape,
    // portrait, and square canvases while drawCover preserves source-image
    // proportions inside it without distortion.
    const cardWidth = width * 0.82
    const cardHeight = height * 0.82
    const centerX = width / 2
    const centerY = height / 2

    // The first remainder intervals get one extra frame. Their sum is exactly
    // totalFrames, so every image receives the fairest possible hold time.
    let intervalStart = 0
    for (let index = 0; index < imageCount; index += 1) {
      const intervalLength = baseFrames + (index < remainder ? 1 : 0)
      if (frame < intervalStart + intervalLength || index === imageCount - 1) {
        const localFrame = frame - intervalStart
        const progress = intervalLength > 1 ? localFrame / (intervalLength - 1) : 1
        const rotationProgress = easeInOut(progress)
        const angle = rotationProgress * Math.PI
        const nextIndex = (index + 1) % imageCount
        const isBack = rotationProgress >= 0.5
        const image = isBack ? images[nextIndex] : images[index]
        const projection = Math.max(Math.abs(Math.cos(angle)), 0.012)
        const glow = 0.5 + 0.5 * Math.sin(frame / fps * Math.PI * 1.4)
        const depth = Math.sin(angle)

        // Back-face culling: exactly one face of this one card is rendered at
        // a time. The back artwork is already oriented for the viewer, just as
        // a DOM back face would be rotated 180 degrees on the card body.
        drawCardFace(ctx, image, centerX, centerY, cardWidth, cardHeight, Math.min(width, height) * 0.045, projection, glow, depth, isBack)
        break
      }
      intervalStart += intervalLength
    }

  },
}
