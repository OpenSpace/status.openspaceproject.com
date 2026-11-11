import { useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet';

import type { PlaceUsage } from '../types.ts';
import { countInRange, type MonthRange } from '../util.ts';

const Accent = '#a2e7fb';
const MarkerStyle = {
  color: Accent,
  fillColor: Accent,
  fillOpacity: 0.45,
  weight: 1,
  opacity: 0.75
};

interface Props {
  places: PlaceUsage[];
  range: MonthRange;
}

/**
 * A map that shows a marker for each place from which OpenSpace has been started
 */
export function UsageMap({ places, range }: Props) {
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

  return (
    <div
      role={'region'}
      aria-label={`Map with markers at ${markers.length.toLocaleString('en')} places from where OpenSpace has been started. The table below lists the launches per country`}
    >
      {/* Render all markers into a single canvas instead of one DOM element per marker.
          With thousands of places this is much faster than individual icon markers */}
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
        {markers.map(({ place, count }) => (
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
        ))}
      </MapContainer>
    </div>
  );
}
