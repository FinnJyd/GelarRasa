import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
} from 'chart.js';
import { chartTheme } from '../../shared/chart-lifecycle';
import { element } from '../../shared/dom';
import { number } from '../../shared/format';
import type { CorrelationMatrix, DirectionSector, ExtremeVsNormal, WindBin } from './types';
import type { TrafficPoint } from './model';

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  PolarAreaController,
  RadialLinearScale,
  ScatterController,
  Tooltip,
);

const SECTORS_ORDER = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export function createPollutionRose(host: HTMLElement, stationTitle: string): {
  update: (sectors: readonly DirectionSector[]) => void;
  destroy: () => void;
} {
  const card = element('div', 'rose-card');
  card.style.flex = '1 1 260px';
  card.style.minWidth = '240px';
  card.style.maxWidth = '360px';
  card.style.background = 'var(--surface)';
  card.style.border = '1px solid var(--border)';
  card.style.borderRadius = '10px';
  card.style.padding = '12px';

  const heading = element('h4', 'rose-title', stationTitle);
  heading.style.fontSize = '13.5px';
  heading.style.fontWeight = '600';
  heading.style.marginBottom = '6px';
  heading.style.textAlign = 'center';

  const frame = element('div', 'rose-plot');
  frame.style.height = '240px';
  frame.style.position = 'relative';

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'pollution-rose';

  frame.append(canvas);
  card.append(heading, frame);
  host.append(card);

  let currentSectors: readonly DirectionSector[] = [];

  const chart = new Chart<'polarArea', number[], string>(canvas, {
    type: 'polarArea',
    data: {
      labels: SECTORS_ORDER,
      datasets: [{
        data: SECTORS_ORDER.map(() => 0),
        backgroundColor: 'rgba(13, 148, 136, 0.6)',
        borderColor: '#0f766e',
        borderWidth: 1,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => `Arah Angin: ${items[0]?.label ?? ''}`,
            label: item => {
              const sec = currentSectors.find(s => s.direction_label === item.label);
              if (!sec || sec.mean_pm25 === null) return 'Tidak cukup angin signifikan (<0.5 m/s)';
              return `Rerata PM2.5: ${number(sec.mean_pm25)} µg/m³ (n=${number(sec.count)})`;
            },
          },
        },
      },
      scales: {
        r: {
          beginAtZero: true,
          ticks: {
            display: true,
            backdropColor: 'transparent',
            font: { size: 9 },
            maxTicksLimit: 4,
          },
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          angleLines: { color: 'rgba(148, 163, 184, 0.2)' },
          pointLabels: {
            display: true,
            centerPointLabels: true,
            font: { size: 10, weight: 600 },
          },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['r']?.ticks) chart.options.scales['r'].ticks.color = theme.text;
    if (chart.options.scales?.['r']?.pointLabels) chart.options.scales['r'].pointLabels.color = theme.text;
  };

  const observer = new MutationObserver(() => {
    applyColors();
    chart.update('none');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyColors();

  return {
    update: sectors => {
      currentSectors = sectors;
      const sectorMap = new Map<string, DirectionSector>();
      sectors.forEach(s => sectorMap.set(s.direction_label, s));

      const values = SECTORS_ORDER.map(dir => {
        const sec = sectorMap.get(dir);
        return sec && sec.mean_pm25 !== null ? sec.mean_pm25 : 0;
      });

      const dataset = chart.data.datasets[0];
      if (dataset) {
        dataset.data = values;
        dataset.backgroundColor = values.map(v =>
          v > 55 ? 'rgba(239, 68, 68, 0.65)' : v > 35 ? 'rgba(245, 158, 11, 0.65)' : 'rgba(13, 148, 136, 0.65)',
        );
      }
      applyColors();
      chart.update();
    },
    destroy: () => {
      observer.disconnect();
      chart.destroy();
      card.remove();
    },
  };
}

export function createCorrelationHeatmap(host: HTMLElement): {
  update: (matrix: CorrelationMatrix, stationName: string, modeName: string) => void;
  destroy: () => void;
} {
  const container = element('div', 'correlation-heatmap-container');
  container.style.position = 'relative';
  container.style.padding = '8px 0';
  container.style.overflowX = 'auto';

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Matriks Korelasi Spearman Polutan vs Cuaca');

  const tooltip = element('div', 'corr-tooltip');
  tooltip.style.position = 'absolute';
  tooltip.style.display = 'none';
  tooltip.style.pointerEvents = 'none';
  tooltip.style.background = 'rgba(15, 23, 42, 0.9)';
  tooltip.style.color = '#fff';
  tooltip.style.padding = '6px 10px';
  tooltip.style.borderRadius = '6px';
  tooltip.style.fontSize = '12px';
  tooltip.style.zIndex = '10';
  tooltip.style.whiteSpace = 'nowrap';
  tooltip.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.2)';

  const legend = element('div', 'corr-legend');
  legend.style.display = 'flex';
  legend.style.alignItems = 'center';
  legend.style.gap = '12px';
  legend.style.marginTop = '10px';
  legend.style.fontSize = '11.5px';
  legend.innerHTML = `
    <span style="color:var(--secondary)">Korelasi Spearman (r):</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#1e40af;border-radius:2px;"></span> -1.0 (Negatif Kuat)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#cbd5e1;border-radius:2px;"></span> 0.0 (Netral)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#dc2626;border-radius:2px;"></span> +1.0 (Positif Kuat)</span>
  `;

  container.append(canvas, tooltip, legend);
  host.append(container);

  const pollutants = ['pm25', 'pm10', 'so2', 'co', 'o3', 'no2'];
  const pollutantLabels = ['PM2.5', 'PM10', 'SO2', 'CO', 'O3', 'NO2'];
  const weatherVars: Array<'temperature_c' | 'humidity_pct' | 'wind_speed_ms'> = [
    'temperature_c',
    'humidity_pct',
    'wind_speed_ms',
  ];
  const weatherLabels = ['Suhu (°C)', 'Kelembapan (%)', 'Kecepatan Angin (m/s)'];

  const cellWidth = 120;
  const cellHeight = 36;
  const labelMarginLeft = 70;
  const labelMarginTop = 32;

  canvas.width = labelMarginLeft + weatherVars.length * cellWidth + 20;
  canvas.height = labelMarginTop + pollutants.length * cellHeight + 10;

  let currentMatrix: CorrelationMatrix = {};
  let currentStation = '';
  let currentMode = '';

  function getCorrColor(r: number | null): string {
    if (r === null) return '#e2e8f0';
    if (r < 0) {
      // Diverging scale towards blue
      const intensity = Math.min(1, Math.abs(r));
      const red = Math.round(255 - intensity * (255 - 30));
      const green = Math.round(255 - intensity * (255 - 64));
      const blue = Math.round(255 - intensity * (255 - 175));
      return `rgb(${red}, ${green}, ${blue})`;
    } else {
      // Diverging scale towards red
      const intensity = Math.min(1, r);
      const red = Math.round(255 - intensity * (255 - 220));
      const green = Math.round(255 - intensity * (255 - 38));
      const blue = Math.round(255 - intensity * (255 - 38));
      return `rgb(${red}, ${green}, ${blue})`;
    }
  }

  function render(): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const theme = chartTheme();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '12px Inter, sans-serif';
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Draw Column Headers (Weather Vars)
    weatherLabels.forEach((label, col) => {
      const x = labelMarginLeft + col * cellWidth + cellWidth / 2;
      ctx.fillText(label, x, labelMarginTop - 8);
    });

    // Draw Rows and Cells
    pollutants.forEach((pKey, row) => {
      const y = labelMarginTop + row * cellHeight;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.fillText(pollutantLabels[row] ?? pKey, labelMarginLeft - 10, y + cellHeight / 2);

      const pData = currentMatrix[pKey];
      weatherVars.forEach((wKey, col) => {
        const x = labelMarginLeft + col * cellWidth;
        const rVal = pData ? pData[wKey] : null;

        // Cell rect
        ctx.fillStyle = getCorrColor(rVal);
        ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

        // Cell text (r value)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (rVal !== null) {
          ctx.fillStyle = Math.abs(rVal) > 0.35 ? '#ffffff' : '#0f172a';
          const sign = rVal > 0 ? '+' : '';
          ctx.fillText(`${sign}${rVal.toFixed(2)}`, x + cellWidth / 2, y + cellHeight / 2);
        } else {
          ctx.fillStyle = '#94a3b8';
          ctx.fillText('—', x + cellWidth / 2, y + cellHeight / 2);
        }
      });
    });
  }

  const handleMouseMove = (evt: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    if (x < labelMarginLeft || y < labelMarginTop) {
      tooltip.style.display = 'none';
      return;
    }

    const col = Math.floor((x - labelMarginLeft) / cellWidth);
    const row = Math.floor((y - labelMarginTop) / cellHeight);

    if (col >= 0 && col < weatherVars.length && row >= 0 && row < pollutants.length) {
      const pKey = pollutants[row] ?? '';
      const pLabel = pollutantLabels[row] ?? pKey;
      const wKey = weatherVars[col] ?? 'temperature_c';
      const wLabel = weatherLabels[col] ?? wKey;
      const rVal = currentMatrix[pKey]?.[wKey] ?? null;

      tooltip.innerHTML = `
        <strong>${pLabel} &times; ${wLabel}</strong><br>
        Stasiun: ${currentStation} (${currentMode})<br>
        Korelasi Spearman (r): <strong>${rVal !== null ? (rVal > 0 ? '+' : '') + rVal.toFixed(3) : 'Kurang observasi (n<30)'}</strong>
      `;
      tooltip.style.display = 'block';
      tooltip.style.left = `${Math.min(evt.clientX - rect.left + 14, rect.width - 160)}px`;
      tooltip.style.top = `${evt.clientY - rect.top + 14}px`;
    } else {
      tooltip.style.display = 'none';
    }
  };

  const handleMouseLeave = (): void => {
    tooltip.style.display = 'none';
  };

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);

  const observer = new MutationObserver(render);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return {
    update: (matrix, stationName, modeName) => {
      currentMatrix = matrix;
      currentStation = stationName;
      currentMode = modeName;
      render();
    },
    destroy: () => {
      observer.disconnect();
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      container.remove();
    },
  };
}

export function createWindBinsChart(host: HTMLElement): {
  update: (allSiteBins: Record<string, readonly WindBin[]>, activeSiteTypes: readonly string[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'wind-bins-plot');
  frame.style.height = '340px';
  frame.style.position = 'relative';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'wind-bins';
  frame.append(canvas);
  host.append(frame);

  const palette = ['#0284c7', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'];
  const binLabels = ['0–0.5', '0.5–1', '1–2', '2–3', '3–5', '5+'];

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: { labels: binLabels, datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 12, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Kecepatan Angin (m/s)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Median PM2.5 (µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
  };

  const observer = new MutationObserver(() => {
    applyColors();
    chart.update('none');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyColors();

  return {
    update: (allSiteBins, activeSiteTypes) => {
      const datasets = activeSiteTypes.map((st, idx) => {
        const bins = allSiteBins[st] ?? [];
        const medians = binLabels.map(lbl => {
          const b = bins.find(item => item.label === lbl);
          return b && b.median_pm25 !== null ? b.median_pm25 : null;
        });
        const color = palette[idx % palette.length] ?? '#0284c7';
        return {
          label: st,
          data: medians,
          borderColor: color,
          backgroundColor: color,
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.15,
        };
      });

      chart.data.datasets = datasets;
      applyColors();
      chart.update();
    },
    destroy: () => {
      observer.disconnect();
      chart.destroy();
      frame.remove();
    },
  };
}

export function createTrafficScatter(host: HTMLElement): {
  update: (points: readonly TrafficPoint[], pollutant: 'no2' | 'co') => void;
  destroy: () => void;
} {
  const frame = element('div', 'traffic-scatter-plot');
  frame.style.height = '340px';
  frame.style.position = 'relative';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'traffic-scatter';
  frame.append(canvas);
  host.append(frame);

  const siteTypeColors: Record<string, string> = {
    'Traffic / Roadside': '#ef4444',
    'Urban Background': '#0284c7',
    'Urban Coastal Background': '#0d9488',
    'Regional / Clean Background': '#16a34a',
    'Peatland Boundary': '#ea580c',
    'Industrial Perimeter': '#8b5cf6',
  };

  let currentPoints: readonly TrafficPoint[] = [];

  const chart = new Chart<'scatter', Array<{ x: number; y: number }>, string>(canvas, {
    type: 'scatter',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { boxWidth: 10, font: { size: 10 } },
        },
        tooltip: {
          callbacks: {
            label: item => {
              const pt = currentPoints[item.dataIndex];
              if (!pt) return '';
              const xVal = item.parsed.x !== null ? number(item.parsed.x) : '—';
              const yVal = item.parsed.y !== null ? number(item.parsed.y) : '—';
              return `${pt.station} (${pt.siteType}): ${xVal} kend/jam → ${yVal} µg/m³`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Intensitas Lalu Lintas Rata-rata (kendaraan / jam)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rerata Konsentrasi NO2 (µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['x']?.grid) chart.options.scales['x'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
    if (chart.options.scales?.['y']?.grid) chart.options.scales['y'].grid.color = theme.grid;
    if (chart.options.scales?.['y']?.title) chart.options.scales['y'].title.color = theme.text;
    if (chart.options.plugins?.legend?.labels) chart.options.plugins.legend.labels.color = theme.text;
  };

  const observer = new MutationObserver(() => {
    applyColors();
    chart.update('none');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyColors();

  return {
    update: (points, pollutant) => {
      currentPoints = points;
      const unit = pollutant === 'no2' ? 'NO2' : 'CO';
      if (chart.options.scales?.['y']?.title) {
        chart.options.scales['y'].title.text = `Rerata Konsentrasi ${unit} (µg/m³)`;
      }

      // Group points by siteType
      const groups = new Map<string, TrafficPoint[]>();
      points.forEach(pt => {
        const list = groups.get(pt.siteType) ?? [];
        list.push(pt);
        groups.set(pt.siteType, list);
      });

      const datasets = Array.from(groups.entries()).map(([st, pts]) => {
        const color = siteTypeColors[st] ?? '#64748b';
        const validPts = pts.filter(p => (pollutant === 'no2' ? p.no2 !== null : p.co !== null));
        return {
          label: st,
          data: validPts.map(p => ({
            x: p.traffic,
            y: (pollutant === 'no2' ? p.no2 : p.co) as number,
          })),
          backgroundColor: color,
          borderColor: color,
          pointRadius: 6,
          pointHoverRadius: 8,
        };
      });

      chart.data.datasets = datasets;
      applyColors();
      chart.update();
    },
    destroy: () => {
      observer.disconnect();
      chart.destroy();
      frame.remove();
    },
  };
}

export function createExtremeComparisonChart(host: HTMLElement): {
  update: (data: ExtremeVsNormal) => void;
  destroy: () => void;
} {
  const container = element('div', 'extreme-comparison-container');
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
  container.style.gap = '16px';

  // Left: Grouped Bar Chart (Meteorology & Season Share)
  const leftBox = element('div', 'extreme-bar-box');
  const leftTitle = element('h4', '', 'Perbandingan Indikator Meteorologi: Ekstrem vs Normal');
  leftTitle.style.fontSize = '13.5px';
  leftTitle.style.fontWeight = '600';
  leftTitle.style.marginBottom = '6px';
  const leftFrame = element('div');
  leftFrame.style.height = '260px';
  leftFrame.style.position = 'relative';
  const leftCanvas = element('canvas');
  leftFrame.append(leftCanvas);
  leftBox.append(leftTitle, leftFrame);

  // Right: 24-hour Distribution Histogram
  const rightBox = element('div', 'extreme-hour-box');
  const rightTitle = element('h4', '', 'Distribusi Jam Terjadinya Jam Ekstrem (>P95) 00–23');
  rightTitle.style.fontSize = '13.5px';
  rightTitle.style.fontWeight = '600';
  rightTitle.style.marginBottom = '6px';
  const rightFrame = element('div');
  rightFrame.style.height = '260px';
  rightFrame.style.position = 'relative';
  const rightCanvas = element('canvas');
  rightFrame.append(rightCanvas);
  rightBox.append(rightTitle, rightFrame);

  container.append(leftBox, rightBox);
  host.append(container);

  // Chart 1: Bar chart
  const barMetrics = ['Kecepatan Angin (m/s)', 'Kelembapan (%)', 'Suhu (°C)', 'Proporsi Karhutla (%)'];
  const barChart = new Chart<'bar', number[], string>(leftCanvas, {
    type: 'bar',
    data: {
      labels: barMetrics,
      datasets: [
        { label: 'Jam Ekstrem (>P95)', data: [], backgroundColor: '#ef4444', borderRadius: 4 },
        { label: 'Jam Normal (≤P95)', data: [], backgroundColor: '#0284c7', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      scales: {
        x: { grid: { display: false } },
        y: { beginAtZero: true, ticks: { maxTicksLimit: 5 } },
      },
    },
  });

  // Chart 2: 24-hour distribution line/bar chart
  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}`);
  const hourChart = new Chart<'bar', number[], string>(rightCanvas, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Jumlah Jam Ekstrem',
          data: [],
          backgroundColor: 'rgba(239, 68, 68, 0.75)',
          borderRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: items => `Jam ${items[0]?.label ?? ''}:00 WIB`,
            label: item => `Frekuensi Ekstrem: ${number(Number(item.raw))} observasi`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Jam Hari (WIB)' },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Jumlah Kejadian' },
          ticks: { maxTicksLimit: 5 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    [barChart, hourChart].forEach(c => {
      if (c.options.scales?.['x']?.ticks) c.options.scales['x'].ticks.color = theme.text;
      if (c.options.scales?.['y']?.ticks) c.options.scales['y'].ticks.color = theme.text;
      if (c.options.scales?.['y']?.grid) c.options.scales['y'].grid.color = theme.grid;
    });
  };

  const observer = new MutationObserver(() => {
    applyColors();
    barChart.update('none');
    hourChart.update('none');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyColors();

  return {
    update: data => {
      const ext = data.extreme;
      const norm = data.normal;

      barChart.data.datasets[0]!.data = [
        ext.median_wind_speed,
        ext.median_humidity,
        ext.median_temperature,
        Math.round(ext.haze_season_share * 100),
      ];
      barChart.data.datasets[1]!.data = [
        norm.median_wind_speed,
        norm.median_humidity,
        norm.median_temperature,
        Math.round(norm.haze_season_share * 100),
      ];
      barChart.update();

      hourChart.data.datasets[0]!.data = [...ext.hour_distribution];
      hourChart.update();
    },
    destroy: () => {
      observer.disconnect();
      barChart.destroy();
      hourChart.destroy();
      container.remove();
    },
  };
}
