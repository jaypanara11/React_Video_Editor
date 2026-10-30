import type { EffectSettings } from '../effects/types'
import { mapPersonCountryOptions } from '../effects/MapPersonAnimation'

type Props = { settings: EffectSettings; update: (key: string, value: string | number | boolean) => void }

export function MapPersonControls({ settings, update }: Props) {
  return <div className="effect-settings map-person-controls">
    <div className="block-heading"><span>MAP</span><strong>Map Person Animation</strong></div>
    <label>Country <input list="map-person-country-list" value={String(settings.country ?? 'India')} onChange={(event) => { const value = event.target.value; const option = mapPersonCountryOptions.find((item) => item.name === value); update('country', value); if (option) update('countryCode', option.code) }} placeholder="Search country" /></label>
    <datalist id="map-person-country-list">{mapPersonCountryOptions.map((country) => <option value={country.name} key={country.code} />)}</datalist>
    {!mapPersonCountryOptions.some((item) => item.name === String(settings.country ?? 'India')) && <p className="hint">Country boundary is not supported. Choose a listed country.</p>}
    <label>Highlight color <input type="color" value={String(settings.highlightColor ?? '#f5a623')} onChange={(event) => update('highlightColor', event.target.value)} /></label>
    <label>Map zoom <b>{Number(settings.mapZoom ?? 1).toFixed(1)}×</b></label><input type="range" min="0.7" max="1.8" step="0.1" value={Number(settings.mapZoom ?? 1)} onChange={(event) => update('mapZoom', Number(event.target.value))} />
    <label>Person scale <b>{Number(settings.personScale ?? 1).toFixed(1)}×</b></label><input type="range" min="0.6" max="1.4" step="0.1" value={Number(settings.personScale ?? 1)} onChange={(event) => update('personScale', Number(event.target.value))} />
    <label>Person X offset <b>{Number(settings.personX ?? 0).toFixed(2)}</b></label><input type="range" min="-0.3" max="0.3" step="0.01" value={Number(settings.personX ?? 0)} onChange={(event) => update('personX', Number(event.target.value))} />
    <label>Person Y offset <b>{Number(settings.personY ?? 0).toFixed(2)}</b></label><input type="range" min="-0.3" max="0.3" step="0.01" value={Number(settings.personY ?? 0)} onChange={(event) => update('personY', Number(event.target.value))} />
    <label>Person entrance <b>{Math.round(Number(settings.personEntrance ?? .34) * 100)}%</b></label><input type="range" min="0.1" max="0.75" step="0.01" value={Number(settings.personEntrance ?? .34)} onChange={(event) => update('personEntrance', Number(event.target.value))} />
    <p className="hint">Upload one person image below. The first uploaded image is used as the foreground subject.</p>
  </div>
}
