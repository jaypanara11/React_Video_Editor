import type { RenderFrameArgs, VideoEffect } from './types'

type Drawable = HTMLImageElement | HTMLCanvasElement | ImageBitmap
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const cubic = (value: number) => { const t = clamp(value); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

function getDrawable(item: unknown): Drawable | null {
  if (!item) return null
  if (typeof HTMLImageElement !== 'undefined' && item instanceof HTMLImageElement) return item
  if (typeof HTMLCanvasElement !== 'undefined' && item instanceof HTMLCanvasElement) return item
  if (typeof ImageBitmap !== 'undefined' && item instanceof ImageBitmap) return item
  if (typeof item === 'object') { const value = item as { image?: unknown; img?: unknown; bitmap?: unknown; element?: unknown; source?: unknown; canvas?: unknown }; return getDrawable(value.image ?? value.img ?? value.bitmap ?? value.element ?? value.source ?? value.canvas) }
  return null
}

function imageReady(image: Drawable) { return 'complete' in image ? image.complete && image.naturalWidth > 0 : image.width > 0 && image.height > 0 }
function sizeOf(image: Drawable) { return { width: 'naturalWidth' in image ? image.naturalWidth : image.width, height: 'naturalHeight' in image ? image.naturalHeight : image.height } }

function drawCover(ctx: CanvasRenderingContext2D, image: Drawable, x: number, y: number, width: number, height: number, zoom = 1, filter = 'none', alpha = 1) {
  if (!imageReady(image)) return
  const size = sizeOf(image); const scale = Math.max(width / size.width, height / size.height) * zoom; const sourceWidth = width / scale; const sourceHeight = height / scale
  ctx.save(); ctx.globalAlpha = alpha; ctx.filter = filter; ctx.drawImage(image, (size.width - sourceWidth) / 2, (size.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height); ctx.restore()
}

function drawCorridor(ctx: CanvasRenderingContext2D, width: number, height: number, vpX: number, vpY: number) {
  ctx.fillStyle = '#131c26'; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#1a2634'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(width, 0); ctx.lineTo(vpX, vpY); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(0, height); ctx.lineTo(width, height); ctx.lineTo(vpX, vpY); ctx.closePath(); ctx.fill()
  ctx.fillStyle = '#16222f'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(vpX, vpY); ctx.lineTo(0, height); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(width, 0); ctx.lineTo(width, height); ctx.lineTo(vpX, vpY); ctx.closePath(); ctx.fill()
  ctx.save(); ctx.strokeStyle = 'rgba(119,145,166,.16)'; ctx.lineWidth = 1; for (let i = 0; i <= 12; i += 1) { const x = width * i / 12; ctx.beginPath(); ctx.moveTo(vpX, vpY); ctx.lineTo(x, 0); ctx.moveTo(vpX, vpY); ctx.lineTo(x, height); ctx.stroke() } ctx.restore()
}

function drawPortal(ctx: CanvasRenderingContext2D, image: Drawable, width: number, height: number, vpX: number, vpY: number, ease: number, slide: number) {
  const glow = ctx.createRadialGradient(vpX, vpY, 10, vpX, vpY, width * .28); glow.addColorStop(0, 'rgba(255,252,245,.95)'); glow.addColorStop(.25, 'rgba(225,65,95,.42)'); glow.addColorStop(1, 'rgba(20,30,45,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height)
  const px = vpX + (slide % 2 === 0 ? width * .08 : -width * .24); const py = vpY - height * .04; const pw = width * .16 * (1 + ease * .6); const ph = height * .18 * (1 + ease * .6); ctx.save(); ctx.globalAlpha = .85; ctx.shadowColor = '#ff2a6d'; ctx.shadowBlur = 22; ctx.strokeStyle = 'rgba(235,55,95,.9)'; ctx.lineWidth = 3.5; ctx.strokeRect(px, py, pw, ph); ctx.shadowBlur = 0; drawCover(ctx, image, px, py, pw, ph, 1, 'contrast(112%) saturate(85%) blur(2px)', .85); ctx.restore()
}

function drawTunnelPanels(ctx: CanvasRenderingContext2D, images: Drawable[], current: number, slideProgress: number, width: number, height: number, vpX: number, vpY: number) {
  const visible = Math.min(images.length, 8)
  for (let offset = -3; offset <= 4; offset += 1) {
    if (offset === 0) continue
    const index = (current + offset + images.length * 4) % images.length; const distance = offset + slideProgress * .7; const perspective = 1 / (1 + Math.abs(distance) * .72); const layout = index % 4; const side = (layout === 0 ? -.72 : layout === 1 ? .64 : layout === 2 ? -.42 : .46) * width; const vertical = (layout === 2 ? -.34 : layout === 3 ? .28 : (index % 2 ? -.12 : .12)) * height; const panelW = width * .24 * perspective; const panelH = Math.min(height * .32, panelW / Math.max(.65, sizeOf(images[index]).width / Math.max(1, sizeOf(images[index]).height))); const x = vpX + side * perspective - Math.sign(distance) * width * .06 * perspective; const y = vpY + vertical * perspective; const alpha = Math.max(.18, Math.min(.72, .72 - Math.abs(distance) * .09)); const glow = index % 3 === 0
    ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = glow ? 'rgba(235,55,125,.72)' : 'rgba(0,0,0,.72)'; ctx.shadowBlur = glow ? 20 : 18; ctx.shadowOffsetY = 12; ctx.fillStyle = glow ? '#f8edf0' : '#d9dde0'; ctx.fillRect(x - panelW / 2 - 10, y - panelH / 2 - 10, panelW + 20, panelH + 20); ctx.shadowBlur = 0; drawCover(ctx, images[index], x - panelW / 2, y - panelH / 2, panelW, panelH, 1 + Math.max(0, .15 - Math.abs(distance) * .02), 'contrast(112%) saturate(90%) brightness(106%)', 1); if (glow) { ctx.strokeStyle = 'rgba(255,55,145,.78)'; ctx.lineWidth = 3; ctx.strokeRect(x - panelW / 2 - 10, y - panelH / 2 - 10, panelW + 20, panelH + 20) } ctx.restore()
    if (offset >= visible) break
  }
}

function drawForegroundCard(ctx: CanvasRenderingContext2D, image: Drawable, slide: number, width: number, height: number, drift: number, fly: number, alpha: number, red: boolean) {
  const layout = slide % 5; const centers = [[.66, .51, -.18, -.06, .03], [.62, .50, -.22, -.05, -.03], [.67, .52, -.16, -.06, .02], [.60, .49, -.20, -.05, -.02], [.50, .50, -.10, -.03, .02]][layout]; const cardW = width * .36; const cardH = height * .44; const scale = (.94 + drift * .12) * (1 + fly * 1.35); const cx = width * centers[0] + fly * width * (slide % 2 === 0 ? 1 : -1); const cy = height * centers[1]; const border = 18
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(centers[2] + Math.sin(drift * Math.PI) * .03); ctx.transform(scale, centers[4] * scale, centers[3] * scale, scale, 0, 0); ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 45; ctx.shadowOffsetX = 16; ctx.shadowOffsetY = 24; ctx.fillStyle = '#f4f1ea'; ctx.fillRect(-cardW / 2 - border, -cardH / 2 - border, cardW + border * 2, cardH + border * 2); ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.save(); ctx.beginPath(); ctx.rect(-cardW / 2, -cardH / 2, cardW, cardH); ctx.clip(); drawCover(ctx, image, -cardW / 2, -cardH / 2, cardW, cardH, 1 + drift * .08, red ? 'grayscale(100%) contrast(120%) brightness(110%)' : 'contrast(115%) saturate(88%) brightness(108%)'); ctx.restore(); ctx.strokeStyle = 'rgba(20,30,40,.25)'; ctx.lineWidth = 1.5; ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH); ctx.restore()
  ctx.save(); ctx.globalAlpha = alpha * .68; const points = [[cx - cardW * .55, cy + cardH * .62, '#239be1'], [cx + cardW * .55, cy + cardH * .6, '#239be1'], [cx - cardW * .52, cy - cardH * .62, '#e1265a'], [cx + cardW * .52, cy - cardH * .62, '#e1265a']]; points.forEach(([x, y, color], index) => { const px = Number(x) + Math.sin(drift * Math.PI + index) * 18; const py = Number(y) + Math.cos(drift * Math.PI + index) * 12; ctx.fillStyle = String(color); ctx.beginPath(); ctx.moveTo(px, py - 22); ctx.lineTo(px + 18, py + 14); ctx.lineTo(px - 20, py + 12); ctx.closePath(); ctx.fill() }); ctx.restore()
}

function drawMotionStreaks(ctx: CanvasRenderingContext2D, width: number, height: number, vpX: number, vpY: number, amount: number) {
  if (amount <= 0) return
  ctx.save(); ctx.globalAlpha = amount * .18; ctx.strokeStyle = 'rgba(188,218,238,.7)'; ctx.lineWidth = Math.max(1, width / 900); for (let i = 0; i < 12; i += 1) { const edgeX = i % 2 === 0 ? 0 : width; const edgeY = (i / 12) * height; ctx.beginPath(); ctx.moveTo(vpX, vpY); ctx.lineTo(edgeX, edgeY); ctx.stroke() } ctx.restore()
}

export const doc3DHallTunnel: VideoEffect = {
  id: 'doc_3d_hall_tunnel', name: '3D Documentary Hall Tunnel', fileName: '3d-documentary-hall-tunnel.webm', defaultSettings: { redDocumentaryEffect: false },
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }: RenderFrameArgs) => {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'
    try {
      const validImages = (Array.isArray(images) ? images : []).map(getDrawable).filter((image): image is Drawable => Boolean(image && imageReady(image))); ctx.fillStyle = '#0e141b'; ctx.fillRect(0, 0, width, height); if (!validImages.length) return
      const totalFrames = Math.max(1, Math.round(duration * fps)); const overall = clamp(Math.min(.999999, frame / totalFrames)); const count = validImages.length; const scaled = overall * count; const currentSlide = Math.min(count - 1, Math.floor(scaled)); const slideProgress = clamp(scaled - currentSlide); const drift = clamp(slideProgress / .75); const transT = currentSlide < count - 1 ? clamp((slideProgress - .75) / .25) : 0; const whip = cubic(transT); const vpX = width * .5 + Math.sin(overall * Math.PI * 2 * count) * width * .025; const vpY = height * .5 + Math.cos(overall * Math.PI * 2 * count) * height * .015; const roll = Math.sin(transT * Math.PI) * .14
      ctx.translate(vpX, vpY); ctx.rotate(roll); ctx.translate(-vpX, -vpY); drawCorridor(ctx, width, height, vpX, vpY); drawMotionStreaks(ctx, width, height, vpX, vpY, whip); drawTunnelPanels(ctx, validImages, currentSlide, slideProgress, width, height, vpX, vpY); drawPortal(ctx, validImages[(currentSlide + 1) % count], width, height, vpX, vpY, whip, currentSlide)
      drawForegroundCard(ctx, validImages[currentSlide], currentSlide, width, height, drift, whip, 1 - whip, settings.redDocumentaryEffect === true); if (whip > 0 && currentSlide < count - 1) drawForegroundCard(ctx, validImages[currentSlide + 1], currentSlide + 1, width, height, 0, 1 - whip, whip, settings.redDocumentaryEffect === true)
      const edge = ctx.createRadialGradient(width / 2, height / 2, width * .35, width / 2, height / 2, Math.max(width, height) * .75); edge.addColorStop(0, 'rgba(5,9,14,0)'); edge.addColorStop(1, 'rgba(5,9,14,.5)'); ctx.fillStyle = edge; ctx.fillRect(0, 0, width, height)
    } catch (error) { console.error('[doc_3d_hall_tunnel] frame render failed', error); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.fillStyle = '#0e141b'; ctx.fillRect(0, 0, width, height) } finally { ctx.restore() }
  },
}
