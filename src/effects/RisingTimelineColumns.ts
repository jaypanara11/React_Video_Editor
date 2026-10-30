import type { EffectSettings, RenderFrameArgs, RenderMedia, VideoEffect } from './types'

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n))
const ease = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t) }
const COLUMN_WIDTH = .32
const COLUMN_DEPTH = .22
type ColumnPalette = { front: string; side: string; top: string }
type BackgroundTheme = { skyTop: string; skyMid: string; skyBottom: string; mountain: string; ground: string; hazeTop: string; hazeBottom: string }
const COLUMN_PALETTES: Record<string, ColumnPalette> = {
  'golden-amber': { front: '#b87716', side: '#80500f', top: '#e8ae3e' },
  burgundy: { front: '#7d2635', side: '#4f1421', top: '#b24a57' },
  'royal-blue': { front: '#245b9a', side: '#14345f', top: '#5797d7' },
  'forest-green': { front: '#2d6947', side: '#17432c', top: '#65a879' },
  silver: { front: '#8995a2', side: '#59636d', top: '#d5dbe0' },
  charcoal: { front: '#3f464d', side: '#252a2f', top: '#69737b' },
  copper: { front: '#9b542d', side: '#5f2d1b', top: '#d18a5b' },
  purple: { front: '#653d87', side: '#3d2455', top: '#9a6ac0' },
}
const BACKGROUND_THEMES: Record<string, BackgroundTheme> = {
  'default-landscape': { skyTop: '#4c9ed0', skyMid: '#b5c8bc', skyBottom: '#5c5b43', mountain: '#526b62', ground: '#5c5b43', hazeTop: 'rgba(210,221,205,.4)', hazeBottom: 'rgba(45,42,27,.45)' },
  'garden-green': { skyTop: '#76b8d4', skyMid: '#c1d6b0', skyBottom: '#315a38', mountain: '#47784b', ground: '#315a38', hazeTop: 'rgba(201,230,185,.38)', hazeBottom: 'rgba(21,58,31,.5)' },
  'cloudy-sky': { skyTop: '#60758a', skyMid: '#aeb9c0', skyBottom: '#52616a', mountain: '#47545b', ground: '#3d484d', hazeTop: 'rgba(225,231,230,.34)', hazeBottom: 'rgba(29,38,42,.5)' },
  himalayas: { skyTop: '#4e9dcc', skyMid: '#c7d5d2', skyBottom: '#66726c', mountain: '#687875', ground: '#4d5a50', hazeTop: 'rgba(238,242,235,.48)', hazeBottom: 'rgba(40,51,44,.45)' },
  mountains: { skyTop: '#527fa9', skyMid: '#b9c8c2', skyBottom: '#485244', mountain: '#526357', ground: '#41493c', hazeTop: 'rgba(207,220,210,.38)', hazeBottom: 'rgba(28,35,26,.5)' },
  desert: { skyTop: '#d28c62', skyMid: '#f0c28d', skyBottom: '#9b5c36', mountain: '#8a5736', ground: '#9b5c36', hazeTop: 'rgba(255,226,176,.32)', hazeBottom: 'rgba(74,37,20,.48)' },
  ocean: { skyTop: '#3d8fbe', skyMid: '#acd1d8', skyBottom: '#236078', mountain: '#34738a', ground: '#236078', hazeTop: 'rgba(216,241,240,.42)', hazeBottom: 'rgba(14,55,69,.44)' },
  forest: { skyTop: '#4b8e9a', skyMid: '#9ebca4', skyBottom: '#243d2d', mountain: '#294f39', ground: '#243d2d', hazeTop: 'rgba(190,219,191,.3)', hazeBottom: 'rgba(11,31,20,.58)' },
  sunset: { skyTop: '#8d496c', skyMid: '#ec9c60', skyBottom: '#5d3c34', mountain: '#654337', ground: '#5d3c34', hazeTop: 'rgba(255,194,132,.42)', hazeBottom: 'rgba(38,23,24,.5)' },
}
const cover = (ctx: CanvasRenderingContext2D, source: HTMLImageElement | HTMLVideoElement, x: number, y: number, w: number, h: number) => {
  const sw = source instanceof HTMLVideoElement ? source.videoWidth : source.naturalWidth
  const sh = source instanceof HTMLVideoElement ? source.videoHeight : source.naturalHeight
  if (!sw || !sh) return
  const scale = Math.max(w / sw, h / sh); const cw = w / scale; const ch = h / scale
  ctx.drawImage(source, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h)
}
const text = (ctx: CanvasRenderingContext2D, value: string | undefined, x: number, y: number, size: number, color: string, align: CanvasTextAlign = 'center') => {
  if (!value?.trim()) return
  ctx.font = `700 ${size}px Arial, sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(value, x, y)
}
function drawGrid(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, scale: number) {
  ctx.save(); ctx.globalAlpha = .18; ctx.strokeStyle = '#fff0a6'; ctx.lineWidth = Math.max(1, scale * .7)
  const step = Math.max(12, 28 * scale)
  for (let xx = x; xx < x + w; xx += step) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke() }
  for (let yy = y; yy < y + h; yy += step) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke() }
  ctx.restore()
}
function drawLandscape(ctx: CanvasRenderingContext2D, width: number, height: number, verticalOffset = 0, themeName = 'default-landscape') {
  const theme = BACKGROUND_THEMES[themeName] ?? BACKGROUND_THEMES['default-landscape']
  const sky = ctx.createLinearGradient(0, 0, 0, height); sky.addColorStop(0, theme.skyTop); sky.addColorStop(.52, theme.skyMid); sky.addColorStop(1, theme.skyBottom); ctx.fillStyle = sky; ctx.fillRect(0, 0, width, height)
  ctx.save(); ctx.translate(0, verticalOffset)
  ctx.globalAlpha = .3; ctx.fillStyle = theme.mountain; ctx.beginPath(); ctx.moveTo(0, height * .48); for (let x = 0; x <= width; x += width / 8) ctx.lineTo(x, height * (.4 + ((x * 19) % 70) / 500)); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill()
  if (themeName === 'himalayas' || themeName === 'mountains') { ctx.globalAlpha = .42; ctx.fillStyle = theme.mountain; ctx.beginPath(); ctx.moveTo(0, height * .5); for (let x = 0; x <= width; x += width / 7) { const peak = height * (.28 + ((x * 13) % 90) / 700); ctx.lineTo(x, peak); ctx.lineTo(x + width / 14, height * .5) } ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill() }
  if (themeName === 'cloudy-sky') { ctx.globalAlpha = .2; ctx.fillStyle = '#f3f5f1'; for (let x = -width * .1; x < width; x += width * .22) { ctx.beginPath(); ctx.ellipse(x + width * .08, height * .2, width * .16, height * .055, 0, 0, Math.PI * 2); ctx.fill() } }
  if (themeName === 'ocean') { ctx.globalAlpha = .28; ctx.strokeStyle = '#b8e5e3'; ctx.lineWidth = Math.max(2, width * .002); for (let y = height * .6; y < height; y += height * .065) { ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(width * .25, y - 8, width * .5, y); ctx.quadraticCurveTo(width * .75, y + 8, width, y); ctx.stroke() } }
  if (themeName === 'forest' || themeName === 'garden-green') { ctx.globalAlpha = .5; ctx.fillStyle = theme.mountain; for (let x = 0; x < width; x += Math.max(20, width * .025)) { const treeHeight = height * (.08 + ((x * 17) % 40) / 500); ctx.beginPath(); ctx.moveTo(x, height * .65); ctx.lineTo(x + width * .012, height * (.65 - treeHeight)); ctx.lineTo(x + width * .024, height * .65); ctx.fill() } }
  const haze = ctx.createLinearGradient(0, height * .38, 0, height); haze.addColorStop(0, theme.hazeTop); haze.addColorStop(1, theme.hazeBottom); ctx.fillStyle = haze; ctx.fillRect(0, height * .35, width, height * .65); ctx.restore()
  if (verticalOffset < 0) { ctx.fillStyle = theme.ground; ctx.fillRect(0, Math.max(0, height + verticalOffset), width, -verticalOffset) }
}

function drawColumn(ctx: CanvasRenderingContext2D, item: RenderMedia, x: number, base: number, height: number, width: number, sideBias: number, texture: boolean, palette: ColumnPalette) {
  const top = base - height; const side = width * COLUMN_DEPTH; const sideAmount = clamp(Math.abs(sideBias)); const visibleSide = side * sideAmount; const sideDirection = sideBias < 0 ? -1 : 1; const topDepth = side * (.15 + .85 * sideAmount); const topOffset = sideDirection * topDepth; const mediaH = width * .78; const titleBoxH = width * .26; const panelY = top + height * .1; const titleBoxY = panelY + mediaH + width * .045
  ctx.save(); ctx.shadowColor = 'rgba(25,19,4,.45)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 14
  ctx.fillStyle = palette.front; ctx.fillRect(x, top, width, height); ctx.shadowColor = 'transparent'
  if (visibleSide > .5) {
    const sideX = sideDirection < 0 ? x : x + width; const backX = sideDirection < 0 ? x - visibleSide : x + width + visibleSide
    ctx.fillStyle = palette.side; ctx.beginPath(); ctx.moveTo(sideX, top); ctx.lineTo(backX, top - visibleSide * .38); ctx.lineTo(backX, base - visibleSide * .38); ctx.lineTo(sideX, base); ctx.fill()
  }
  ctx.fillStyle = palette.top; ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x + topOffset, top - topDepth * .38); ctx.lineTo(x + width + topOffset, top - topDepth * .38); ctx.lineTo(x + width, top); ctx.fill()
  if (texture) drawGrid(ctx, x, top, width, height, 1)
  ctx.fillStyle = '#161717'; ctx.fillRect(x + width * .08, titleBoxY, width * .84, titleBoxH)
  ctx.fillStyle = '#e9d6a2'; ctx.fillRect(x + width * .07, panelY, width * .86, mediaH)
  ctx.save(); ctx.beginPath(); ctx.rect(x + width * .1, panelY + mediaH * .06, width * .8, mediaH * .88); ctx.clip(); cover(ctx, item.source, x + width * .1, panelY + mediaH * .06, width * .8, mediaH * .88); ctx.restore()
  text(ctx, item.largeTitle || item.year, x + width / 2, titleBoxY + titleBoxH * .36, Math.max(13, width * .14), '#f6e9bc'); text(ctx, item.smallTitle, x + width / 2, titleBoxY + titleBoxH * .72, Math.max(9, width * .06), '#d7bd79')
  ctx.restore()
}

export const risingTimelineColumnsDefaults: EffectSettings = { heightProgression: 1, cameraIntensity: 1, landscape: 'cinematic', grid: true, columnColor: 'golden-amber', backgroundTheme: 'default-landscape' }

export const risingTimelineColumns: VideoEffect = {
  id: 'rising_timeline_columns', name: '3D Rising Timeline Columns', fileName: '3d-rising-timeline-columns.webm', defaultSettings: risingTimelineColumnsDefaults,
  renderFrame: ({ ctx, frame, fps, duration, images, media, settings, width, height }: RenderFrameArgs) => {
    const entries = (media?.length ? media : images.map((source, index) => ({ id: String(index), type: 'image' as const, source })))
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'
    if (!entries.length) { ctx.restore(); return }
    const total = Math.max(1, Math.round(duration * fps)); const progress = clamp(frame / Math.max(1, total - 1)); const cycle = 5; const position = progress * duration / cycle; const current = Math.min(entries.length - 1, Math.floor(position)); const local = position - current; const hasNext = current < entries.length - 1; const transition = hasNext ? ease(clamp((local - .6) / .4)) : 0; const intensity = Number(settings.cameraIntensity ?? 1); const backgroundTravel = -(current + transition) * height * .055; const palette = COLUMN_PALETTES[String(settings.columnColor ?? 'golden-amber')] ?? COLUMN_PALETTES['golden-amber']
    drawLandscape(ctx, width, height, backgroundTravel, String(settings.backgroundTheme ?? 'default-landscape'))
    const horizon = height; const center = width * .5; const fixedWidth = Math.max(150, width * COLUMN_WIDTH); const sideExtent = fixedWidth * COLUMN_DEPTH; const gapWidth = fixedWidth * .45; const spacing = fixedWidth + sideExtent + gapWidth; const cameraX = (current + transition) * spacing
    entries.forEach((item, index) => {
      const inFocusSet = local < .6 && index >= current - 1 && index <= current + 1
      const inTransitionSet = local >= .6 && hasNext && index >= current && index <= current + 2
      if (!inFocusSet && !inTransitionSet) return
      const worldX = index * spacing; const columnWidth = fixedWidth
      const previousHeight = height * .2; const focalHeight = height * .7; const upcomingHeight = height
      let visibleHeight = focalHeight
      if (local < .6) {
        if (index === current - 1) visibleHeight = previousHeight
        else if (index === current + 1) visibleHeight = upcomingHeight
        else if (index !== current) return
      } else if (hasNext) {
        const handoff = ease((local - .6) / .4)
        if (index === current) visibleHeight = focalHeight + (previousHeight - focalHeight) * handoff
        else if (index === current + 1) visibleHeight = upcomingHeight + (focalHeight - upcomingHeight) * handoff
        else if (index === current + 2) visibleHeight = upcomingHeight
        else return
      }
      const columnHeight = Math.max(1, visibleHeight); const x = center + (worldX - cameraX) * (1 + intensity * .025) - columnWidth / 2; const base = horizon
      if (x + columnWidth < -columnWidth * .4 || x > width + columnWidth * .4) return
      const video = item.type === 'video' && item.source instanceof HTMLVideoElement ? item.source : null; const isCenterVideo = Boolean(video && ((index === current && local < .6) || (hasNext && index === current + 1 && local >= .6)))
      if (video && isCenterVideo && Number.isFinite(video.duration) && video.duration > 0) { const playbackProgress = index === current ? local / .6 : (local - .6) / .4; video.currentTime = (Math.max(0, playbackProgress) * 3) % video.duration }
      const handoff = hasNext && local >= .6 ? ease((local - .6) / .4) : 0; const sideBias = local < .6 ? (index === current - 1 ? 1 : index === current + 1 ? -1 : 0) : index === current ? handoff : index === current + 1 ? -(1 - handoff) : -1
      drawColumn(ctx, item, x, base, columnHeight, columnWidth, sideBias, settings.grid !== false, palette)
    })
    const vignette = ctx.createRadialGradient(width / 2, height * .48, height * .15, width / 2, height * .48, width * .72); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(9,16,18,.45)'); ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height); ctx.restore()
  },
}
