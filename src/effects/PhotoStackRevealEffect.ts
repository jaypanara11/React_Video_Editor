import type { VideoEffect } from './types'
import { drawCover, roundedRect } from '../utils/canvasUtils'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
const easeInOut = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }
const seeded = (index: number, salt: number) => { const value = Math.sin(index * 91.17 + salt * 17.31) * 43758.5453; return value - Math.floor(value) }

type ResponsiveLayoutOptions = { imageCount: number; canvasWidth: number; canvasHeight: number; safeMargin?: number; desiredOverlap?: number }
type PhotoCard = { x: number; y: number; width: number; height: number; rotation: number; depth: number }

/** Finds the largest balanced grid that fits inside the safe canvas area. */
export function calculateResponsiveLayout({ imageCount, canvasWidth, canvasHeight, safeMargin = .06, desiredOverlap = .08 }: ResponsiveLayoutOptions): PhotoCard[] {
  const count = Math.max(1, imageCount)
  const marginX = canvasWidth * clamp(safeMargin, .05, .08)
  const marginY = canvasHeight * clamp(safeMargin, .05, .08)
  const availableWidth = Math.max(1, canvasWidth - marginX * 2)
  const availableHeight = Math.max(1, canvasHeight - marginY * 2)
  const overlap = clamp(desiredOverlap, .03, .12)
  const fitFactor = 1 - overlap - .045 // leaves room for rotation inside each cell
  let best: { columns: number; rows: number; cardWidth: number; cardHeight: number; score: number } | null = null

  for (let columns = 1; columns <= count; columns += 1) {
    const rows = Math.ceil(count / columns)
    const cellWidth = availableWidth / columns
    const cellHeight = availableHeight / rows
    // Adapt the photo ratio to the available grid cell while keeping it readable.
    const aspectRatio = clamp(cellWidth / cellHeight, .9, 1.45)
    const cardWidth = Math.min(cellWidth * fitFactor, cellHeight * fitFactor * aspectRatio)
    const cardHeight = cardWidth / aspectRatio
    const score = cardWidth * cardHeight * count
    if (!best || score > best.score) best = { columns, rows, cardWidth, cardHeight, score }
  }

  const columns = best?.columns ?? 1
  const rows = best?.rows ?? 1
  const cardWidth = best?.cardWidth ?? availableWidth * .8
  const cardHeight = best?.cardHeight ?? availableHeight * .8
  const cellWidth = availableWidth / columns
  const cellHeight = availableHeight / rows
  const cards: PhotoCard[] = []

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns)
    const column = index % columns
    const itemsInRow = Math.min(columns, count - row * columns)
    const rowOffset = (columns - itemsInRow) * cellWidth / 2
    const rotation = (seeded(index, 15) - .5) * 8
    const radians = Math.abs(rotation) * Math.PI / 180
    const rotatedWidth = cardWidth * Math.cos(radians) + cardHeight * Math.sin(radians)
    const rotatedHeight = cardWidth * Math.sin(radians) + cardHeight * Math.cos(radians)
    const centerX = marginX + rowOffset + (column + .5) * cellWidth
    const centerY = marginY + (row + .5) * cellHeight
    const x = clamp(centerX, marginX + rotatedWidth / 2, canvasWidth - marginX - rotatedWidth / 2)
    const y = clamp(centerY, marginY + rotatedHeight / 2, canvasHeight - marginY - rotatedHeight / 2)
    cards.push({ x, y, width: cardWidth, height: cardHeight, rotation, depth: index + seeded(index, 18) })
  }
  return cards
}

export const photoStackRevealEffect: VideoEffect = {
  id: 'photo-stack-reveal',
  name: '3D Photo Stack Reveal',
  fileName: '3d-photo-stack-reveal.webm',
  defaultSettings: { revealStyle: 'random-depth', heroDuration: 1, finalHoldDuration: 1, borderThickness: 14, shadow: 'medium', rotation: 'dynamic', overlap: 'medium', depth: 'medium', cameraMotion: 'subtle', redDocumentaryEffect: false },
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }) => {
    if (!images.length) return
    const count = images.length
    const desiredOverlap = settings.overlap === 'high' ? .12 : settings.overlap === 'low' ? .04 : .08
    const cards = calculateResponsiveLayout({ imageCount: count, canvasWidth: width, canvasHeight: height, desiredOverlap })
    const durationPerImage = duration / count
    const transitionDuration = Math.max(.08, Math.min(durationPerImage * .42, .45))
    const time = frame / fps
    const depthAmount = settings.depth === 'high' ? 1 : settings.depth === 'low' ? .35 : .65
    const shadowBlur = settings.shadow === 'strong' ? 45 : settings.shadow === 'soft' ? 18 : 30
    const border = Math.max(6, Number(settings.borderThickness) || 14) * (width / 1920)
    const rotationEnabled = settings.rotation !== 'none'
    const ordered = cards.map((card, index) => ({ card, index })).sort((a, b) => a.card.depth - b.card.depth)

    // Every image receives the same time slot, easing, and transition length.
    // The first image is ready at t=0; it has no special slow hero phase.
    ordered.forEach(({ card, index }) => {
      const start = index * durationPerImage
      const progress = index === 0 ? 1 : easeInOut((time - start) / transitionDuration)
      if (progress <= 0) return
      const settle = index === 0 ? 1 : progress
      const x = width / 2 + (card.x - width / 2) * settle
      const y = height / 2 + (card.y - height / 2) * settle
      const rotation = rotationEnabled ? card.rotation * settle : 0
      const opacity = index === 0 ? 1 : progress
      const depth = card.depth * depthAmount
      // Layout dimensions already include the safe boundary and rotation margin.
      // Keep the rendered card at that validated size so depth never causes clipping.
      const cardWidth = card.width
      const cardHeight = card.height

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rotation * Math.PI / 180)
      ctx.globalAlpha = opacity
      ctx.shadowColor = `rgba(0,0,0,${.24 + Math.min(depth / Math.max(1, count), .22)})`
      ctx.shadowBlur = shadowBlur * (width / 1920)
      ctx.shadowOffsetY = 10 * (width / 1920)
      ctx.fillStyle = '#fff'
      roundedRect(ctx, -cardWidth / 2, -cardHeight / 2, cardWidth, cardHeight, 5 * (width / 1920))
      ctx.fill()
      ctx.shadowColor = 'transparent'
      ctx.clip()
      drawCover(ctx, images[index], -cardWidth / 2 + border, -cardHeight / 2 + border, cardWidth - border * 2, cardHeight - border * 2)
      ctx.restore()
    })
  },
}
