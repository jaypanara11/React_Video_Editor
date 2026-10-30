import type { EffectSettings, RenderMedia, VideoEffect } from '../effects/types'
import { applyRedDocumentaryEffect } from '../effects/RedDocumentaryEffect'

export type VideoResolution = { width: number; height: number }
export type VideoSettings = { resolution: VideoResolution; duration: number; fps: number }
export type ExportMetadata = { container: string; codec: string; width: number; height: number; fps: number; duration: number; actualDuration?: number | null }
export const DEFAULT_VIDEO_SETTINGS: VideoSettings = { resolution: { width: 1920, height: 1080 }, duration: 8, fps: 24 }

export function paintGradient(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const gradient = ctx.createRadialGradient(width * .73, height * .18, Math.min(width, height) * .04, width / 2, height / 2, Math.max(width, height) * .63)
  gradient.addColorStop(0, '#173f6a'); gradient.addColorStop(.42, '#17123c'); gradient.addColorStop(1, '#080711')
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = 'rgba(104,40,198,.18)'; ctx.beginPath(); ctx.arc(300, 180, 260, 0, Math.PI * 2); ctx.fill()
}

export function paintBackground(ctx: CanvasRenderingContext2D, background: HTMLImageElement | null, width: number, height: number) {
  paintGradient(ctx, width, height)
  if (!background) return
  const sourceWidth = background.naturalWidth
  const sourceHeight = background.naturalHeight
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const cropWidth = width / scale
  const cropHeight = height / scale
  ctx.drawImage(background, (sourceWidth - cropWidth) / 2, (sourceHeight - cropHeight) / 2, cropWidth, cropHeight, 0, 0, width, height)
}

function waitForImageDecode(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0 && image.naturalHeight > 0) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error('Timed out while decoding an image required for export.')), 15000)
    image.addEventListener('load', () => { window.clearTimeout(timeout); resolve() }, { once: true })
    image.addEventListener('error', () => { window.clearTimeout(timeout); reject(new Error('Could not decode an image required for export.')) }, { once: true })
  })
}

function waitUntil(targetTime: number) {
  const delay = targetTime - performance.now()
  return delay > 0 ? new Promise<void>((resolve) => window.setTimeout(resolve, delay)) : Promise.resolve()
}

function readVideoDuration(blob: Blob) {
  return new Promise<number>((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(blob)
    const timeout = window.setTimeout(() => { cleanup(); resolve(Number.NaN) }, 10000)
    const cleanup = () => { window.clearTimeout(timeout); URL.revokeObjectURL(url); video.removeAttribute('src'); video.load() }
    video.onloadedmetadata = () => { const value = video.duration; cleanup(); resolve(value) }
    video.onerror = () => { cleanup(); resolve(Number.NaN) }
    video.src = url
  })
}

export async function renderVideo(effect: VideoEffect, images: HTMLImageElement[], background: HTMLImageElement | null, videoSettings: VideoSettings, settings: EffectSettings, onProgress: (value: number, stage: string) => void, media?: RenderMedia[]) {
  const { resolution, duration, fps } = videoSettings
  if (resolution.width <= 0 || resolution.height <= 0 || duration <= 0 || fps <= 0) throw new Error('Video settings must contain positive resolution, duration, and FPS values.')
  const totalFrames = duration * fps
  if (!Number.isInteger(totalFrames)) throw new Error('Duration multiplied by FPS must produce a whole number of frames.')
  if (effect.id === 'circular-3d' || effect.id === 'flip-card' || effect.id === 'cinematic_noir_3d_parallax' || effect.id === 'map_person_animation') {
    // The carousel must never begin recording until every source is decoded.
    // drawImage() can otherwise block the first capture while the browser
    // lazily decodes an uploaded image.
    await Promise.all([...images, ...(background ? [background] : [])].map(waitForImageDecode))
  }
  const canvas = document.createElement('canvas'); canvas.width = resolution.width; canvas.height = resolution.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not create the video rendering canvas.')
  // The carousel and flip card use manual capture. Their real-time capture
  // path could record the canvas before frame 0 was painted and could let the
  // capture clock drift away from the render loop. Other effects retain their
  // existing export path.
  const manualCapture = effect.id === 'circular-3d' || effect.id === 'flip-card' || effect.id === 'documentary-image-motion' || effect.id === 'cinematic_noir_3d_parallax' || effect.id === 'map_person_animation'
  const stream = canvas.captureStream(manualCapture ? 0 : fps)
  const captureTrack = stream.getVideoTracks()[0] as CanvasCaptureMediaStreamTrack | undefined
  if (manualCapture && !captureTrack?.requestFrame) throw new Error('This browser cannot capture deterministic video frames.')
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) throw new Error('This browser cannot record the generated video.')
  const chunks: Blob[] = []
  const recorder = new MediaRecorder(stream, { mimeType })
  recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data) }
  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Could not record the generated video.'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))
  })
  if (manualCapture) {
    // Paint frame 0 before starting the recorder. The first requestFrame() is
    // then the actual first animation frame, never the empty canvas.
    paintBackground(ctx, background, resolution.width, resolution.height)
    effect.renderFrame({ ctx, frame: 0, fps, duration, images, media, settings, width: resolution.width, height: resolution.height })
    applyRedDocumentaryEffect({ ctx, frame: 0, fps, duration, width: resolution.width, height: resolution.height, settings })
  }
  recorder.start()
  const exportStartTime = performance.now()

  for (let frame = 0; frame < totalFrames; frame += 1) {
    if (!manualCapture || frame > 0) {
      paintBackground(ctx, background, resolution.width, resolution.height)
      effect.renderFrame({ ctx, frame, fps, duration, images, media, settings, width: resolution.width, height: resolution.height })
      applyRedDocumentaryEffect({ ctx, frame, fps, duration, width: resolution.width, height: resolution.height, settings })
    }
    if (manualCapture) captureTrack!.requestFrame()
    onProgress(Math.round((frame + 1) / totalFrames * 90), 'Rendering animation')
    if (manualCapture) {
      // Use absolute frame deadlines rather than one timeout per frame. This
      // prevents small render/encode delays from accumulating into a visible
      // pause while still giving MediaRecorder time to drain its queue.
      await waitUntil(exportStartTime + (frame + 1) * 1000 / fps)
    } else {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 1000 / fps))
    }
  }

  recorder.stop()
  const blob = await recording
  if (blob.size <= 0) throw new Error('The renderer produced an empty video file.')
  let actualDuration: number | null = null
  if (effect.id === 'map_person_animation') {
    const encodedDuration = await readVideoDuration(blob)
    actualDuration = Number.isFinite(encodedDuration) ? encodedDuration : null
    if (actualDuration !== null && Math.abs(actualDuration - duration) > 2) throw new Error(`Generated video duration was ${actualDuration.toFixed(3)} seconds; expected approximately ${duration.toFixed(3)} seconds.`)
  }
  onProgress(100, 'Encoding video')
  return { blob, canvas, metadata: { container: 'WebM', codec: mimeType.includes('vp9') ? 'vp9' : 'vp8', width: resolution.width, height: resolution.height, fps, duration: actualDuration ?? duration, actualDuration } }
}
