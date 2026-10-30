import type { VideoEffect } from './types'
import { drawCover, roundedRect } from '../utils/canvasUtils'

export const circular3DEffect: VideoEffect = {
  id: 'circular-3d',
  name: '3D Circular Animation',
  fileName: '3d-circular-carousel.webm',
  defaultSettings: { redDocumentaryEffect: false },
  renderFrame: ({ ctx, frame, fps, duration, images, width, height }) => {
    if (!images.length) return
    const count = Math.max(images.length, 1)
    const cardWidth = Math.max(180, Math.min(390, 920 / Math.sqrt(count)))
    const cardHeight = cardWidth * 1.28
    const radius = Math.max(230, Math.min(540, cardWidth * count / (Math.PI * 1.65)))
    const step = 360 / count
    const scale = width / 960
    const centerX = width / 2
    const centerY = height / 2 + 18 * scale
    const rotation = frame / fps / duration * Math.PI * 2
    const cards = images.map((image, index) => { const angle = index * step * Math.PI / 180 + rotation; return { image, x: centerX + Math.sin(angle) * radius * scale, y: centerY + Math.sin(angle * 2) * 22 * scale, z: Math.cos(angle) } }).sort((a, b) => a.z - b.z)
    cards.forEach(({ image, x, y, z }) => {
      const depth = (z + 1) / 2
      const cardW = cardWidth * scale * (.72 + depth * .28)
      const cardH = cardHeight * scale * (.72 + depth * .28)
      const left = x - cardW / 2
      const top = y - cardH / 2
      ctx.save(); ctx.globalAlpha = .5 + depth * .5; ctx.shadowColor = `rgba(24,205,255,${.12 + depth * .3})`; ctx.shadowBlur = (30 + depth * 42) * scale; ctx.fillStyle = '#141d36'; roundedRect(ctx, left, top, cardW, cardH, 22 * scale); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip(); drawCover(ctx, image, left, top, cardW, cardH); const shine = ctx.createLinearGradient(left, top, left + cardW, top + cardH); shine.addColorStop(0, `rgba(255,255,255,${.22 * depth})`); shine.addColorStop(.38, 'transparent'); shine.addColorStop(1, `rgba(30,5,85,${.35 - depth * .2})`); ctx.fillStyle = shine; ctx.fillRect(left, top, cardW, cardH); ctx.restore(); ctx.save(); ctx.strokeStyle = `rgba(196,246,255,${.25 + depth * .55})`; ctx.lineWidth = 2 * scale; roundedRect(ctx, left, top, cardW, cardH, 22 * scale); ctx.stroke(); ctx.restore()
    })
  },
}
