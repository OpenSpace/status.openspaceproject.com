import {
  BarChart,
  type BarSeriesOption,
  LineChart,
  type LineSeriesOption,
  MapChart,
  type MapSeriesOption,
  PieChart,
  type PieSeriesOption
} from 'echarts/charts';
import {
  AriaComponent,
  type AriaComponentOption,
  DataZoomComponent,
  type DataZoomComponentOption,
  GridComponent,
  type GridComponentOption,
  LegendComponent,
  type LegendComponentOption,
  MarkLineComponent,
  type MarkLineComponentOption,
  TitleComponent,
  type TitleComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
  type VisualMapComponentOption,
  VisualMapContinuousComponent
} from 'echarts/components';
import {
  type ComposeOption,
  type ECharts,
  init,
  registerTheme,
  use as registerComponents
} from 'echarts/core';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';
import { useEffect, useRef, useState } from 'react';

import { Colors } from '../util.ts';

// Only register the parts of ECharts that are actually used to keep the bundle small
registerComponents([
  BarChart,
  LineChart,
  MapChart,
  PieChart,
  AriaComponent,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapContinuousComponent,
  LabelLayout,
  CanvasRenderer
]);

export type ChartOption = ComposeOption<
  | BarSeriesOption
  | LineSeriesOption
  | MapSeriesOption
  | PieSeriesOption
  | AriaComponentOption
  | DataZoomComponentOption
  | GridComponentOption
  | LegendComponentOption
  | MarkLineComponentOption
  | TitleComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;

// The colors and fonts follow the design tokens of www.openspaceproject.com
const TextColor = '#b8c8ca';
const HighlightColor = '#f4f7f7';
const AccentColor = '#3dbdee';
const GridColor = 'rgba(184, 200, 202, 0.1)';
const AxisColor = 'rgba(184, 200, 202, 0.35)';
const BodyFont = "'IBM Plex Sans', sans-serif";
const HeadingFont = "'Roboto', sans-serif";

const axisTheme = {
  axisLine: { lineStyle: { color: AxisColor } },
  axisTick: { lineStyle: { color: AxisColor } },
  axisLabel: { color: TextColor },
  splitLine: { lineStyle: { color: GridColor } }
};

/**
 * A theme that makes the charts fit onto the dark page
 */
registerTheme('openspace-dark', {
  color: Colors,
  backgroundColor: 'transparent',
  textStyle: { color: TextColor, fontFamily: BodyFont },
  title: {
    textStyle: {
      color: HighlightColor,
      fontFamily: HeadingFont,
      fontWeight: 500,
      fontSize: 16
    }
  },
  legend: {
    textStyle: { color: TextColor },
    pageTextStyle: { color: TextColor },
    pageIconColor: AccentColor,
    pageIconInactiveColor: AxisColor,
    inactiveColor: 'rgba(184, 200, 202, 0.3)'
  },
  tooltip: {
    backgroundColor: 'rgba(13, 16, 20, 0.95)',
    borderColor: 'rgba(61, 189, 238, 0.25)',
    textStyle: { color: TextColor, fontFamily: BodyFont }
  },
  timeAxis: axisTheme,
  valueAxis: axisTheme,
  categoryAxis: axisTheme,
  dataZoom: {
    textStyle: { color: TextColor },
    borderColor: 'rgba(61, 189, 238, 0.25)',
    fillerColor: 'rgba(61, 189, 238, 0.12)',
    handleStyle: { color: AccentColor, borderColor: AccentColor },
    moveHandleStyle: { color: AccentColor },
    dataBackground: {
      lineStyle: { color: AxisColor },
      areaStyle: { color: 'rgba(184, 200, 202, 0.1)' }
    },
    selectedDataBackground: {
      lineStyle: { color: AccentColor },
      areaStyle: { color: 'rgba(61, 189, 238, 0.2)' }
    }
  }
});

interface Props {
  /**
   * The chart definition. The value has to be memoized, as the chart is updated whenever
   * it changes
   */
  option: ChartOption;

  className?: string;
}

/**
 * Charts are created once they are this close to the visible part of the page, so that
 * they are ready when they are scrolled into view
 */
const VisibilityMargin = '400px 0px';

export function EChart({ option, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [chart, setChart] = useState<ECharts | null>(null);

  // Creating a chart is expensive and the page contains many of them, so each chart is
  // only created once it comes close to the visible part of the page
  useEffect(() => {
    const element = ref.current;
    if (element === null) return;

    let instance: ECharts | null = null;
    const resizeObserver = new ResizeObserver(() => instance?.resize());
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        visibilityObserver.disconnect();
        instance = init(element, 'openspace-dark');
        resizeObserver.observe(element);
        setChart(instance);
      },
      { rootMargin: VisibilityMargin }
    );
    visibilityObserver.observe(element);

    return () => {
      visibilityObserver.disconnect();
      resizeObserver.disconnect();
      instance?.dispose();
      setChart(null);
    };
  }, []);

  useEffect(() => {
    if (chart === null) return;

    // Let ECharts generate a description of the chart for screen readers
    const fullOption: ChartOption = { aria: { enabled: true }, ...option };
    chart.setOption(fullOption, { notMerge: true });

    // The text is drawn onto a canvas, which does not update by itself once the web fonts
    // have finished loading, so the chart has to be redrawn at that point
    let cancelled = false;
    if (document.fonts.status !== 'loaded') {
      void document.fonts.ready.then(() => {
        if (!cancelled) chart.setOption(fullOption, { notMerge: true });
      });
    }
    return () => {
      cancelled = true;
    };
  }, [chart, option]);

  return (
    <div className={'chart-card'}>
      <div ref={ref} className={className} />
    </div>
  );
}
