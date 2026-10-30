import type { VideoEffect } from './types'
import { circular3DEffect } from './Circular3DEffect'
import { fastImageChangeEffect } from './FastImageChangeEffect'
import { photoStackRevealEffect } from './PhotoStackRevealEffect'
import { flipCardAnimationEffect } from './FlipCardAnimation'
import { documentaryImageMotionEffect } from './DocumentaryImageMotionEffect'
import { cinematicNoir3DParallax } from './CinematicNoir3DParallax'
import { doc3DHallTunnel } from './Doc3DHallTunnel'
import { archivalCollageGrid } from './ArchivalCollageGrid'
import { mapPersonAnimation } from './MapPersonAnimation'
import { risingTimelineColumns } from './RisingTimelineColumns'
export { applyRedDocumentaryEffect } from './RedDocumentaryEffect'
export { documentaryPresets, documentaryDefaultSettings } from './DocumentaryImageMotionEffect'

export const effects: VideoEffect[] = [circular3DEffect, fastImageChangeEffect, photoStackRevealEffect, flipCardAnimationEffect, documentaryImageMotionEffect, cinematicNoir3DParallax, doc3DHallTunnel, archivalCollageGrid, mapPersonAnimation, risingTimelineColumns]
export const effectMap = Object.fromEntries(effects.map((effect) => [effect.id, effect])) as Record<string, VideoEffect>
