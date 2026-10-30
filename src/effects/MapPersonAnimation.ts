import geoJsonText from '../data/countries.simplified.geojson?raw'
import type { EffectSettings, RenderFrameArgs, VideoEffect } from './types'

type Point = [number, number]
type Ring = Point[]
type Geometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: Ring[] | Ring[][] }
type Feature = { type: 'Feature'; properties: { name?: string; 'ISO3166-1-Alpha-2'?: string; 'ISO3166-1-Alpha-3'?: string }; geometry: Geometry }
type FeatureCollection = { type: 'FeatureCollection'; features: Feature[] }
type ProjectedPoint = { x: number; y: number; visible: boolean }

const geo = JSON.parse(geoJsonText) as FeatureCollection
const aliases: Record<string, string> = { 'United States': 'United States of America', 'United Kingdom': 'United Kingdom' }
const displayName = (name: string) => name === 'United States of America' ? 'United States' : name
const features = geo.features.filter((feature) => feature.geometry && feature.properties.name)

export const mapPersonCountryOptions = features
  .map((feature) => ({ name: displayName(feature.properties.name!), code: feature.properties['ISO3166-1-Alpha-2'] ?? feature.properties['ISO3166-1-Alpha-3'] ?? '' }))
  .filter((item, index, list) => list.findIndex((other) => other.code === item.code) === index)
  .sort((a, b) => a.name.localeCompare(b.name))
export const mapPersonCountries = mapPersonCountryOptions.map((item) => item.name)

export const mapPersonDefaults: EffectSettings = {
  mapPersonAnimation: true, country: 'India', countryCode: 'IN', highlightColor: '#f5a623', personScale: 1, personX: 0, personY: 0,
  mapZoom: 1, personEntrance: .34,
}

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const degrees = (value: number) => value * Math.PI / 180

function featureFor(settings: EffectSettings) {
  const code = String(settings.countryCode ?? '').toUpperCase()
  const requested = aliases[String(settings.country)] ?? String(settings.country)
  return features.find((feature) => feature.properties['ISO3166-1-Alpha-2'] === code || feature.properties['ISO3166-1-Alpha-3'] === code || feature.properties.name === requested)
}

function eachRing(feature: Feature, callback: (ring: Ring) => void) {
  if (feature.geometry.type === 'Polygon') (feature.geometry.coordinates as Ring[]).forEach(callback)
  else (feature.geometry.coordinates as Ring[][]).forEach((polygon) => polygon.forEach(callback))
}

function bounds(feature: Feature) {
  const points: Point[] = []
  eachRing(feature, (ring) => points.push(...ring))
  return { minLon: Math.min(...points.map(([lon]) => lon)), maxLon: Math.max(...points.map(([lon]) => lon)), minLat: Math.min(...points.map(([, lat]) => lat)), maxLat: Math.max(...points.map(([, lat]) => lat)) }
}

function centerOf(feature: Feature): Point { const box = bounds(feature); return [(box.minLon + box.maxLon) / 2, (box.minLat + box.maxLat) / 2] }
function centroidOf(feature: Feature): Point {
  const points: Point[] = []; eachRing(feature, (ring) => points.push(...ring));
  return [points.reduce((sum, [longitude]) => sum + longitude, 0) / points.length, points.reduce((sum, [, latitude]) => sum + latitude, 0) / points.length]
}

function globeProject(point: Point, center: Point, radius: number, width: number, height: number): ProjectedPoint {
  const longitude = degrees(point[0] - center[0])
  const latitude = degrees(point[1])
  const centerLatitude = degrees(center[1])
  const z = Math.sin(centerLatitude) * Math.sin(latitude) + Math.cos(centerLatitude) * Math.cos(latitude) * Math.cos(longitude)
  return { x: width / 2 + radius * Math.cos(latitude) * Math.sin(longitude), y: height / 2 - radius * (Math.cos(centerLatitude) * Math.sin(latitude) - Math.sin(centerLatitude) * Math.cos(latitude) * Math.cos(longitude)), visible: z >= 0 }
}

function drawFeature(ctx: CanvasRenderingContext2D, feature: Feature, project: (point: Point) => ProjectedPoint) {
  ctx.beginPath()
  eachRing(feature, (ring) => {
    ring.forEach((point, index) => { const projected = project(point); if (index === 0 || !project(ring[index - 1]).visible) ctx.moveTo(projected.x, projected.y); else ctx.lineTo(projected.x, projected.y) })
    ctx.closePath()
  })
}

function drawGlobe(ctx: CanvasRenderingContext2D, width: number, height: number, selected: Feature, progress: number, zoom: number, highlightColor: string) {
  const target = centerOf(selected)
  const cameraProgress = smooth(progress / .72)
  const camera: Point = [target[0] * cameraProgress, target[1] * cameraProgress]
  const baseRadius = Math.min(width, height) * .38
  const radius = baseRadius * (1 + cameraProgress * (Number(zoom || 1) * 2.2))
  const project = (point: Point) => globeProject(point, camera, radius, width, height)

  ctx.fillStyle = '#050b13'; ctx.fillRect(0, 0, width, height)
  ctx.save()
  ctx.beginPath(); ctx.arc(width / 2, height / 2, Math.min(baseRadius, Math.min(width, height) * .47), 0, Math.PI * 2); ctx.clip()
  const ocean = ctx.createRadialGradient(width * .38, height * .32, 2, width / 2, height / 2, baseRadius * 1.2)
  ocean.addColorStop(0, '#315f73'); ocean.addColorStop(.55, '#123b53'); ocean.addColorStop(1, '#061b2b'); ctx.fillStyle = ocean; ctx.fillRect(0, 0, width, height)
  features.forEach((feature) => {
    drawFeature(ctx, feature, project)
    const isSelected = feature === selected
    ctx.fillStyle = isSelected ? 'rgba(245, 166, 35, .42)' : 'rgba(89, 127, 103, .82)'
    ctx.strokeStyle = isSelected ? highlightColor : 'rgba(177, 201, 166, .42)'
    ctx.lineWidth = isSelected ? 1.5 : .55
    ctx.fill(); ctx.stroke()
  })
  if (progress > .18) {
    drawFeature(ctx, selected, project)
    ctx.save(); ctx.globalAlpha = smooth((progress - .18) / .35); ctx.shadowColor = highlightColor; ctx.shadowBlur = 20; ctx.strokeStyle = highlightColor; ctx.lineWidth = 3; ctx.stroke(); ctx.restore()
  }
  ctx.restore()
  ctx.strokeStyle = 'rgba(135, 205, 215, .22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(width / 2, height / 2, Math.min(baseRadius, Math.min(width, height) * .47), 0, Math.PI * 2); ctx.stroke()
}

function drawUnsupported(ctx: CanvasRenderingContext2D, width: number, height: number, country: string) {
  ctx.fillStyle = '#07121b'; ctx.fillRect(0, 0, width, height); ctx.fillStyle = '#e8b35d'; ctx.textAlign = 'center'; ctx.font = `${Math.max(18, Math.round(width * .022))}px sans-serif`; ctx.fillText(`No geographic boundary data for “${country}”.`, width / 2, height / 2 - 10); ctx.fillStyle = 'rgba(220,232,232,.72)'; ctx.font = `${Math.max(12, Math.round(width * .012))}px sans-serif`; ctx.fillText('Choose a supported country in the module controls.', width / 2, height / 2 + 22)
}

const cutoutCache = new WeakMap<HTMLImageElement, HTMLCanvasElement>()
function removeSimpleBackground(image: HTMLImageElement) {
  const cached = cutoutCache.get(image); if (cached) return cached
  const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext('2d'); if (!ctx) return canvas
  ctx.drawImage(image, 0, 0); const data = ctx.getImageData(0, 0, canvas.width, canvas.height); const sample = (offset: number) => [data.data[offset], data.data[offset + 1], data.data[offset + 2]]; const corners = [sample(0), sample((canvas.width - 1) * 4), sample((canvas.height - 1) * canvas.width * 4), sample((canvas.width * canvas.height - 1) * 4)]; const background = corners.reduce((sum, value) => sum.map((item, index) => item + value[index] / corners.length), [0, 0, 0])
  for (let index = 0; index < data.data.length; index += 4) if (Math.hypot(data.data[index] - background[0], data.data[index + 1] - background[1], data.data[index + 2] - background[2]) < 42) data.data[index + 3] = 0
  ctx.putImageData(data, 0, 0); cutoutCache.set(image, canvas); return canvas
}

function drawPerson(ctx: CanvasRenderingContext2D, image: HTMLImageElement, selected: Feature, progress: number, width: number, height: number, scaleSetting: number, xOffset: number, yOffset: number) {
  const cutout = removeSimpleBackground(image); const target = centerOf(selected); const personTarget = centroidOf(selected); const cameraProgress = smooth(progress / .72); const camera: Point = [target[0] * cameraProgress, target[1] * cameraProgress]; const baseRadius = Math.min(width, height) * .38; const radius = baseRadius * (1 + cameraProgress * 2.2); const project = (point: Point) => globeProject(point, camera, radius, width, height); const projected = project(personTarget); const box = bounds(selected); const topLeft = project([box.minLon, box.maxLat]); const bottomRight = project([box.maxLon, box.minLat]); const countryWidth = Math.abs(bottomRight.x - topLeft.x); const countryHeight = Math.abs(bottomRight.y - topLeft.y); const entrance = smooth((progress - .42) / .58); if (entrance <= 0) return
  const maxHeight = Math.max(20, Math.min(countryHeight * .62, height * .6)) * Number(scaleSetting || 1); const personScale = Math.min(maxHeight / cutout.height, Math.max(20, countryWidth * .62) / cutout.width); const drawWidth = cutout.width * personScale * (.16 + entrance * .84); const drawHeight = cutout.height * personScale * (.16 + entrance * .84); const x = projected.x - drawWidth / 2 + xOffset * width; const y = projected.y - drawHeight / 2 + yOffset * height
  ctx.save(); ctx.beginPath(); drawFeature(ctx, selected, project); ctx.clip(); ctx.globalAlpha = entrance; ctx.drawImage(cutout, x, y, drawWidth, drawHeight); ctx.restore()
}

export const mapPersonAnimation: VideoEffect = {
  id: 'map_person_animation', name: 'Map Person Animation', fileName: 'map-person-animation.webm', defaultSettings: mapPersonDefaults,
  renderFrame: ({ ctx, frame, fps, duration, images, settings, width, height }: RenderFrameArgs) => {
    const totalFrames = Math.max(1, Math.round(duration * fps)); const progress = clamp(frame / Math.max(1, totalFrames - 1)); const selected = featureFor(settings)
    if (!selected) { drawUnsupported(ctx, width, height, String(settings.country ?? '')); return }
    const highlightColor = String(settings.highlightColor ?? '#f5a623'); drawGlobe(ctx, width, height, selected, progress, Number(settings.mapZoom ?? 1), highlightColor)
    const person = images[0]; if (person?.complete && person.naturalWidth > 0) drawPerson(ctx, person, selected, progress, width, height, Number(settings.personScale ?? 1), Number(settings.personX ?? 0), Number(settings.personY ?? 0))
  },
}
