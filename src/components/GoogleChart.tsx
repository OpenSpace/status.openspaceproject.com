import { useEffect, useRef } from 'react';

type ChartType = 'ColumnChart' | 'GeoChart' | 'LineChart' | 'PieChart';

interface Chart {
  draw(data: google.visualization.DataTable, options: object): void;
  clearChart(): void;
}

const TextColor = '#e0e0e0';
const GridColor = '#333333';

/**
 * Options that make the charts fit onto the dark page. They can be overwritten by the
 * options passed to each chart
 */
const DarkTheme = {
  backgroundColor: 'transparent',
  titleTextStyle: { color: TextColor },
  legend: { textStyle: { color: TextColor } },
  hAxis: { textStyle: { color: TextColor }, gridlines: { color: GridColor } },
  vAxis: { textStyle: { color: TextColor }, gridlines: { color: GridColor } },
  pieSliceBorderColor: 'transparent',
  datalessRegionColor: '#2a2a2a'
};

let loader: Promise<void> | null = null;

/**
 * Loads the Google Charts library. The library is only available from Google's servers,
 * so it is loaded the first time a chart is drawn rather than bundled with the page.
 */
function loadGoogleCharts(): Promise<void> {
  loader ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/charts/loader.js';
    script.onload = () => {
      google.charts.load('current', {
        packages: ['geochart', 'corechart'],
        mapsApiKey: 'AIzaSyBBn5PBZQvKaBwBE7tFATmq28dsu-tp43o'
      });
      google.charts.setOnLoadCallback(() => resolve());
    };
    script.onerror = () => reject(new Error('Could not load Google Charts'));
    document.head.append(script);
  });
  return loader;
}

interface Props {
  type: ChartType;

  /**
   * The data in the format accepted by `google.visualization.arrayToDataTable`: a header
   * row with the column descriptions followed by the data rows. The value has to be
   * memoized, as the chart is redrawn whenever it changes
   */
  data: unknown[][];

  /**
   * The chart options. The value has to be memoized, as the chart is redrawn whenever it
   * changes
   */
  options?: object;

  className?: string;
}

export function GoogleChart({ type, data, options, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let chart: Chart | null = null;

    loadGoogleCharts()
      .then(() => {
        if (cancelled || ref.current === null) return;
        const ChartClass = google.visualization[type] as unknown as new (
          element: Element
        ) => Chart;
        chart = new ChartClass(ref.current);
        chart.draw(google.visualization.arrayToDataTable(data), {
          ...DarkTheme,
          ...options
        });
      })
      .catch((e: unknown) => {
        if (ref.current !== null) ref.current.textContent = String(e);
      });

    return () => {
      cancelled = true;
      chart?.clearChart();
    };
  }, [type, data, options]);

  return <div ref={ref} className={className} />;
}
