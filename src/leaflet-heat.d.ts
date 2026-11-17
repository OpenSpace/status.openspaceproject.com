/**
 * The type declarations of `leaflet.heat` target Leaflet 2.0, in which `L.Layer` is
 * generic. This declaration replaces them for Leaflet 1.9, in which `L.Layer` is not
 * generic, and covers the parts of the API that the page uses
 */
declare module 'leaflet.heat' {
  import * as L from 'leaflet';

  /**
   * Color stops in the 0..1 range, e.g. `{0.4: 'blue', 1: 'red'}`
   */
  export type HeatGradient = Record<number, string>;

  export interface HeatLayerProps {
    /**
     * Radius of each point, in pixels
     */
    radius: number;

    /**
     * Blur around each point, in pixels
     */
    blur: number;

    /**
     * Opacity the heatmap starts at
     */
    minOpacity: number;

    /**
     * Cell intensity that maps to the end of the gradient
     */
    max: number;

    /**
     * Zoom at which points reach full intensity; the map's `maxZoom` if not set
     */
    maxZoom?: number;

    gradient?: HeatGradient;
  }

  export type HeatLayerOptions = L.LayerOptions & Partial<HeatLayerProps>;

  /**
   * A point, with its intensity (1 if not set) in `alt` or the third array element
   */
  export type HeatLatLng = L.LatLng | L.LatLngLiteral | L.LatLngTuple;

  /**
   * A heatmap layer drawn on a single canvas that covers the map view
   */
  export class HeatLayer extends L.Layer {
    constructor(latlngs: HeatLatLng[], options?: HeatLayerOptions);

    /**
     * Replaces the points and redraws
     */
    setLatLngs(latlngs: HeatLatLng[]): this;

    /**
     * Adds a point and redraws
     */
    addLatLng(latlng: HeatLatLng): this;

    /**
     * Updates options and redraws
     */
    setOptions(options: HeatLayerOptions): this;

    /**
     * Bounds of all points
     */
    getBounds(): L.LatLngBounds;

    /**
     * Redraws on the next animation frame
     */
    redraw(): this;
  }
}
