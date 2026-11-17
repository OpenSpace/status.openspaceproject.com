import { HeatLayer } from 'leaflet.heat';
import { useEffect, useMemo } from 'react';
import { useMap } from 'react-leaflet';

import type { HeatPoint } from '../heat.ts';

/**
 * The options of the heat layer. The map starts at zoom 2 and the heat should already
 * be at full intensity there, so `maxZoom` is set to 2 instead of the map's maximum
 * zoom (the plugin otherwise attenuates the intensity at low zooms, where the heat
 * would be nearly invisible)
 */
const HeatOptions = {
  radius: 10,
  blur: 10,
  minOpacity: 0,
  max: 1,
  maxZoom: 2,
  // A ramp from the dark blue of the country map to the site's accent colors, which
  // reads well on the dark basemap
  gradient: {
    0.15: '#123544',
    0.5: '#3dbdee',
    0.7: '#a2e7fb',
    1: '#e8fbc2'
  }
};

/**
 * Zoomed out, nearby places merge into one spot and their intensities add up. Zoomed
 * in, the places separate and each is drawn with only its own intensity, so the heat
 * would fade until it disappears. To keep it visible, the intensity that maps to the
 * end of the gradient is halved for each zoom level past `BaseZoom`, down to `MinMax`
 */
const BaseZoom = 2;
const MinMax = 1 / 4;

/**
 * Returns the intensity that maps to the end of the gradient at the given zoom
 */
function maxAt(zoom: number): number {
  return Math.max(MinMax, 2 ** -Math.max(0, zoom - BaseZoom));
}

interface Props {
  points: HeatPoint[];
}

/**
 * A heat layer that is added to the map while this component is mounted and updated
 * when the points change
 */
export function HeatLayerView({ points }: Props) {
  const map = useMap();
  const layer = useMemo(() => new HeatLayer([], HeatOptions), []);

  useEffect(() => {
    // `zoomend` fires before `moveend`, on which the layer redraws, so the redraw
    // already uses the scale of the new zoom
    const updateMax = () => layer.setOptions({ max: maxAt(map.getZoom()) });
    updateMax();
    map.on('zoomend', updateMax);
    layer.addTo(map);
    return () => {
      map.off('zoomend', updateMax);
      map.removeLayer(layer);
    };
  }, [map, layer]);

  useEffect(() => {
    layer.setLatLngs(points);
  }, [layer, points]);

  return null;
}
