import type { EffectSettings, RenderFrameArgs, VideoEffect } from './types'

type Drawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap
type Direction = 'top' | 'bottom' | 'left' | 'right'
type CollageCard = { image: Drawable; x: number; y: number; width: number; height: number; rotation: number; depth: number; index: number }

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const easeInOut = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const seed = (index: number, salt: number) => { const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453; return value - Math.floor(value) }

function getDrawable(item: unknown): Drawable | null {
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

function ready(image: Drawable) { return 'complete' in image ? image.complete && image.naturalWidth > 0 : image.width > 0 && image.height > 0 }
function sizeOf(image: Drawable) { return { width: 'naturalWidth' in image ? image.naturalWidth : image.width, height: 'naturalHeight' in image ? image.naturalHeight : image.height } }

function createLayout(images: Drawable[], width: number, height: number): CollageCard[] {
  const count = images.length
  const columns = count === 1 ? 1 : Math.ceil(Math.sqrt(count * width / height))
  const rows = Math.ceil(count / columns)
  const cellWidth = width / columns
  const cellHeight = height / rows
  const cardWidth = count === 1 ? width * .86 : cellWidth * 1.27
  const cardHeight = count === 1 ? height * .78 : cellHeight * 1.28
  return images.map((image, index) => {
    const column = index % columns
    const row = Math.floor(index / columns)
    return {
      image,
      x: (column + .5) * cellWidth + (seed(index, 1) - .5) * cellWidth * .16,
      y: (row + .5) * cellHeight + (seed(index, 2) - .5) * cellHeight * .16,
      width: cardWidth * (.94 + seed(index, 3) * .12),
      height: cardHeight * (.94 + seed(index, 4) * .12),
      rotation: (seed(index, 5) - .5) * .105,
      depth: seed(index, 6),
      index,
    }
  })
}

function createCompactLayout(images: Drawable[], width: number, height: number, direction: Direction): CollageCard[] {
  const horizontal = direction === 'left' || direction === 'right'
  const regionWidth = horizontal ? width * .6 : width
  const regionHeight = horizontal ? height : height * .6
  const regionX = direction === 'right' ? width * .4 : 0
  const regionY = direction === 'bottom' ? height * .4 : 0
  const insetX = Math.min(width * .025, regionWidth * .08)
  const insetY = Math.min(height * .025, regionHeight * .08)
  const usableWidth = regionWidth - insetX * 2
  const usableHeight = regionHeight - insetY * 2
  const count = images.length
  const density = count === 1 ? 1 : clamp(Math.sqrt(6 / count), .62, 1.12)
  const averageWidth = count === 1 ? usableWidth * .72 : usableWidth * (.21 * density)
  const averageHeight = count === 1 ? usableHeight * .72 : usableHeight * (.39 * density)

  return images.map((image, index) => {
    const widthScale = count === 1 ? 1 : .78 + seed(index, 13) * .42
    const heightScale = count === 1 ? 1 : .8 + seed(index, 14) * .38
    const cardWidth = averageWidth * widthScale
    const cardHeight = averageHeight * heightScale
    const minX = regionX + insetX + cardWidth / 2
    const maxX = regionX + regionWidth - insetX - cardWidth / 2
    const minY = regionY + insetY + cardHeight / 2
    const maxY = regionY + regionHeight - insetY - cardHeight / 2
    return {
      image,
      x: minX + seed(index, 11) * (maxX - minX),
      y: minY + seed(index, 12) * (maxY - minY),
      width: cardWidth,
      height: cardHeight,
      rotation: count === 1 ? 0 : (seed(index, 15) - .5) * .3,
      depth: seed(index, 6),
      index,
    }
  })
}

function drawCover(ctx: CanvasRenderingContext2D, image: Drawable, x: number, y: number, width: number, height: number) {
  const source = sizeOf(image)
  const scale = Math.max(width / source.width, height / source.height)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  ctx.drawImage(image, (source.width - sourceWidth) / 2, (source.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height)
}

function drawCard(ctx: CanvasRenderingContext2D, card: CollageCard, alpha: number, scale: number, red: boolean) {
  const width = card.width * scale
  const height = card.height * scale
  const border = Math.max(7, Math.min(width, height) * .045)
  const frameWidth = width + border * 2
  const frameHeight = height + border * 2
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(card.x, card.y)
  ctx.rotate(card.rotation)
  ctx.shadowColor = 'rgba(0, 0, 0, .72)'
  ctx.shadowBlur = 18
  ctx.shadowOffsetX = 7
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#e8e4d9'
  ctx.fillRect(-frameWidth / 2, -frameHeight / 2, frameWidth, frameHeight)
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.rect(-width / 2, -height / 2, width, height)
  ctx.clip()
  ctx.filter = red ? 'grayscale(100%) contrast(128%) brightness(105%)' : 'grayscale(100%) contrast(124%) brightness(106%)'
  drawCover(ctx, card.image, -width / 2, -height / 2, width, height)
  ctx.restore()
}

function drawAtmosphere(ctx: CanvasRenderingContext2D, width: number, height: number, frame: number) {
  ctx.save()
  ctx.globalAlpha = .04
  for (let index = 0; index < Math.min(1800, width * height / 1100); index += 1) {
    const value = seed(index, frame * .19) > .5 ? 255 : 0
    ctx.fillStyle = `rgb(${value},${value},${value})`
    ctx.fillRect(seed(index, 3) * width, seed(index, frame * .23 + 7) * height, 1.5, 1.5)
  }
  const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * .2, width / 2, height / 2, Math.max(width, height) * .78)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,.62)')
  ctx.globalAlpha = 1
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

export const archivalCollageGridDefaults: EffectSettings = { direction: 'top', imageDirection: 'top', directionalFlow: 'top', collageDirection: 'top', redDocumentaryEffect: false }

export const archivalCollageGrid: VideoEffect = {
  id: 'archival_collage_grid', name: 'Archival Collage Grid', fileName: 'archival-collage-grid.webm', defaultSettings: archivalCollageGridDefaults,
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }: RenderFrameArgs) => {
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.filter = 'none'
    try {
      ctx.fillStyle = '#080d14'
      ctx.fillRect(0, 0, width, height)
      const validImages = (Array.isArray(images) ? images : []).map(getDrawable).filter((image): image is Drawable => Boolean(image && ready(image)))
      if (!validImages.length) { drawAtmosphere(ctx, width, height, frame); return }
      const totalFrames = Math.max(1, Math.round(duration * fps))
      const progress = clamp(frame / Math.max(1, totalFrames - 1))
      const reveal = easeInOut(clamp(progress / .24))
      const scale = 1.04 - easeInOut(progress) * .12
      const direction = String(settings.imageDirection ?? settings.directionalFlow ?? settings.collageDirection ?? settings.direction ?? 'top').toLowerCase() as Direction
      const travel = easeInOut(progress)
      const offsetX = direction === 'left' ? -width * .095 * travel : direction === 'right' ? width * .095 * travel : 0
      const offsetY = direction === 'top' ? -height * .095 * travel : direction === 'bottom' ? height * .095 * travel : 0
      const red = settings.redDocumentaryEffect === true
      const startLayout = createLayout(validImages, width, height)
      const compactLayout = createCompactLayout(validImages, width, height, direction)
      startLayout.sort((a, b) => a.depth - b.depth).forEach((card) => {
        const target = compactLayout[card.index]
        const parallax = (card.depth - .5) * .018 * travel
        const startX = card.x * scale + width * (1 - scale) / 2 + offsetX + offsetX * parallax
        const startY = card.y * scale + height * (1 - scale) / 2 + offsetY + offsetY * parallax
        const x = startX + (target.x - startX) * travel
        const y = startY + (target.y - startY) * travel
        const cardWidth = card.width * scale + (target.width - card.width * scale) * travel
        const cardHeight = card.height * scale + (target.height - card.height * scale) * travel
        const rotation = card.rotation + (target.rotation - card.rotation) * travel
        drawCard(ctx, { ...card, x, y, width: cardWidth, height: cardHeight, rotation }, .12 + reveal * .88, 1, red)
      })
      drawAtmosphere(ctx, width, height, frame)
    } catch (error) {
      console.error('[archival_collage_grid] frame render failed', error)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.globalAlpha = 1
      ctx.fillStyle = '#080d14'
      ctx.fillRect(0, 0, width, height)
    } finally { ctx.restore() }
  },
}
