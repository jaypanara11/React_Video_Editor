import type { VideoEffect } from './types'
import { drawCover } from '../utils/canvasUtils'

export const fastImageChangeEffect: VideoEffect = {
  id: 'fast-image-change',
  name: 'Fast Image Change',
  fileName: 'fast-image-change.webm',
  defaultSettings: { imagesPerSecond: 5, zoom: 'small', loop: true, redDocumentaryEffect: false },
  renderFrame: ({ ctx, frame, fps, images, settings, width, height }) => {
    if (!images.length) return
    const imagesPerSecond = Math.max(1, Number(settings.imagesPerSecond) || 5)
    const zoom = settings.zoom === 'large' ? 0.1 : settings.zoom === 'medium' ? 0.075 : 0.05
    const elapsed = frame / fps
    const sequenceIndex = Math.floor(elapsed * imagesPerSecond)
    const image = images[sequenceIndex % images.length]
    const withinCut = (elapsed * imagesPerSecond) % 1
    const scale = 1 + zoom * Math.min(withinCut / 0.8, 1)
    const drift = Math.sin(withinCut * Math.PI) * 0.008
    ctx.save()
    ctx.filter = `brightness(${0.98 + Math.min(withinCut, 0.5) * 0.04})`
    drawCover(ctx, image, 0, 0, width, height, scale, drift, 0)
    ctx.restore()
  },
}
