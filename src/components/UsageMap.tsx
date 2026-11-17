import { useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

import { heatPoints } from '../heat.ts';
import type { PlaceUsage } from '../types.ts';
import { countInRange, type MonthRange } from '../util.ts';

import { HeatLayerView } from './HeatLayerView.tsx';

const Accent = '#a2e7fb';
const MarkerStyle = {
  color: Accent,
  fillColor: Accent,
  fillOpacity: 0.45,
  weight: 1,
  opacity: 0.75
};

/**
 * The display mode of the usage map: a marker for each place, or a heatmap in which
 * the intensity shows the number of starts
 */
type Mode = 'markers' | 'heat';

interface Props {
  places: PlaceUsage[];
  range: MonthRange;
}

/**
 * A map that shows the places from which OpenSpace has been started, either as markers
 * or as a heatmap
 */
export function UsageMap({ places, range }: Props) {
  const [mode, setMode] = useState<Mode>('markers');

  const markers = useMemo(
    () =>
      places
        .map((place) => ({
          place,
          count: countInRange(place.byMonth, place.total, range)
        }))
        .filter(({ count }) => count > 0),
    [places, range]
  );
  const points = useMemo(() => heatPoints(places, range), [places, range]);

  return (
    <div
      role={'region'}
      aria-label={
        mode === 'markers'
          ? `Map with markers at ${markers.length.toLocaleString('en')} places from where OpenSpace has been started. The table below lists the launches per country`
          : 'Heatmap of the places from where OpenSpace has been started, in which the intensity shows the number of launches. The table below lists the launches per country'
      }
    >
      <div className={'map-mode'} role={'group'} aria-label={'Display mode'}>
        <button
          type={'button'}
          aria-pressed={mode === 'markers'}
          onClick={() => setMode('markers')}
        >
          Markers
        </button>
        <button
          type={'button'}
          aria-pressed={mode === 'heat'}
          onClick={() => setMode('heat')}
        >
          Heatmap
        </button>
      </div>
      {/* The map is not recreated when the mode changes, so the view is preserved */}
      <MapContainer center={[20, 0]} zoom={2} preferCanvas className={'usage-map'}>
        {/* Same dark basemap as the impact map on www.openspaceproject.com */}
        <TileLayer
          url={
            'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          }
          attribution={
            '&copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }
          maxZoom={16}
        />
        {mode === 'markers' ? (
          // Render all markers into a single canvas instead of one DOM element per
          // marker. With thousands of places this is much faster than individual icon
          // markers
          markers.map(({ place, count }) => (
            <CircleMarker
              key={`${place.lat},${place.lng}`}
              center={[place.lat, place.lng]}
              // Circle size scales logarithmically with the number of launches
              radius={Math.max(4, Math.min(14, Math.log2(count + 1) * 1.8))}
              pathOptions={MarkerStyle}
            >
              <Popup>
                <strong>{count.toLocaleString('en')}</strong> launch
                {count !== 1 ? 'es' : ''}
              </Popup>
            </CircleMarker>
          ))
        ) : (
          <HeatLayerView points={points} />
        )}
      </MapContainer>
    </div>
  );
}
