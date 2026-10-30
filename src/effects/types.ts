export type EffectSettings = Record<string, number | string | boolean>

export type RenderFrameArgs = {
  ctx: CanvasRenderingContext2D
  frame: number
  fps: number
  duration: number
  images: HTMLImageElement[]
  media?: RenderMedia[]
  settings: EffectSettings
  width: number
  height: number
}

export type RenderMedia = {
  id: string
  type: 'image' | 'video'
  source: HTMLImageElement | HTMLVideoElement
  largeTitle?: string
  smallTitle?: string
  year?: string
}

export interface VideoEffect {
  id: string
  name: string
  fileName: string
  defaultSettings: EffectSettings
  renderFrame: (args: RenderFrameArgs) => void
}
