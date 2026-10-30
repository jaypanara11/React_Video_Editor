import type { EffectSettings } from '../effects/types'
import { documentaryPresets } from '../effects'

type Props = { settings: EffectSettings; update: (key: string, value: string | number | boolean) => void }

export function DocumentaryControls({ settings, update }: Props) {
  const preset = String(settings.preset ?? 'documentary-red')
  return <div className="effect-settings documentary-controls">
    <div className="block-heading"><span>FX</span><strong>Documentary finish</strong></div>
    {settings.imageDirection && <label>Image Direction <select value={String(settings.imageDirection)} onChange={(event) => update('imageDirection', event.target.value)}><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select></label>}
    <label>Visual preset <select value={preset} onChange={(event) => { const next = documentaryPresets[event.target.value]?.settings; if (next) Object.entries(next).forEach(([key, value]) => update(key, value)) }}><option value="none">No Effect</option>{Object.entries(documentaryPresets).filter(([key]) => key !== 'none').map(([key, item]) => <option value={key} key={key}>{item.label}</option>)}</select></label>
    <label>Motion intensity <b>{Number(settings.motionIntensity ?? 1).toFixed(1)}×</b></label><input type="range" min="0.5" max="1.5" step="0.1" value={Number(settings.motionIntensity ?? 1)} onChange={(event) => update('motionIntensity', Number(event.target.value))} />
    <label>Transition <select value={String(settings.transitions ?? 'cinematic')} onChange={(event) => update('transitions', event.target.value)}><option value="crossfade">Crossfade</option><option value="dissolve">Cinematic dissolve</option><option value="film-burn">Film burn</option><option value="zoom">Zoom</option><option value="cut">Clean cut</option></select></label>
    <label className="check-row"><input type="checkbox" checked={Boolean(settings.lightLeaks)} onChange={(event) => update('lightLeaks', event.target.checked)} /> Light leaks</label>
    <label className="check-row"><input type="checkbox" checked={Boolean(settings.dust)} onChange={(event) => update('dust', event.target.checked)} /> Dust and specks</label>
    <label>Grain <b>{Math.round(Number(settings.grain ?? 0) * 100)}%</b></label><input type="range" min="0" max="0.35" step="0.01" value={Number(settings.grain ?? 0)} onChange={(event) => update('grain', Number(event.target.value))} />
    <label>Vignette <b>{Math.round(Number(settings.vignette ?? 0) * 100)}%</b></label><input type="range" min="0" max="0.7" step="0.01" value={Number(settings.vignette ?? 0)} onChange={(event) => update('vignette', Number(event.target.value))} />
  </div>
}
