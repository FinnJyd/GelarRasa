import {
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
  Tooltip,
} from 'chart.js';
import { chartTheme } from '../../shared/chart-lifecycle';
import { element, emptyState } from '../../shared/dom';
import { number } from '../../shared/format';
import type { EpisodeWithStation } from './model';

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

export interface DiurnalPointData {
  hour: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}

export function createDiurnalChart(host: HTMLElement): {
  updateSingle: (points: readonly DiurnalPointData[], label: string) => void;
  updateOverlay: (
    hotspotHaze: readonly DiurnalPointData[],
    hotspotNonHaze: readonly DiurnalPointData[],
    jktHaze: readonly DiurnalPointData[],
    jktNonHaze: readonly DiurnalPointData[],
  ) => void;
  destroy: () => void;
} {
  const frame = element('div', 'diurnal-plot');
  frame.style.height = '340px';
  frame.style.position = 'relative';
  frame.style.width = '100%';

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'diurnal';
  const empty = emptyState('Data belum mencukupi', 'Tidak ada data valid untuk jam ini.');
  empty.hidden = true;
  frame.append(canvas);
  host.append(frame, empty);

  const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: {
      labels: hours,
      datasets: [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 11, family: 'Inter, sans-serif' },
            padding: 12,
          },
        },
        tooltip: {
          displayColors: true,
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          title: { display: true, text: 'Jam (WIB)' },
          ticks: { maxTicksLimit: 12 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'PM2.5 (µg/m³)' },
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
    updateSingle: (points, label) => {
      const medians = points.map(p => p.median);
      const p25s = points.map(p => p.p25);
      const p75s = points.map(p => p.p75);
      const hasData = medians.some(v => v !== null);
      empty.hidden = hasData;
      canvas.hidden = !hasData;
      if (!hasData) return;

      chart.data.datasets = [
        {
          label: `${label} (Median)`,
          data: medians,
          borderColor: '#0284c7',
          backgroundColor: '#0284c7',
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.2,
          order: 1,
        },
        {
          label: 'P75 (Batas Atas Interkuartil)',
          data: p75s,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          borderWidth: 0,
          tension: 0.2,
          order: 2,
        },
        {
          label: 'Rentang Interkuartil (P25–P75)',
          data: p25s,
          borderColor: 'transparent',
          backgroundColor: 'rgba(2, 132, 199, 0.16)',
          pointRadius: 0,
          borderWidth: 0,
          fill: '-1',
          tension: 0.2,
          order: 3,
        },
      ];
      applyColors();
      chart.update();
    },
    updateOverlay: (hotspotHaze, hotspotNonHaze, jktHaze, jktNonHaze) => {
      chart.data.datasets = [
        {
          label: 'Hotspot Karhutla (Musim Karhutla Agu–Okt)',
          data: hotspotHaze.map(p => p.median),
          borderColor: '#dc2626',
          backgroundColor: '#dc2626',
          borderWidth: 2.8,
          pointRadius: 3,
          tension: 0.2,
        },
        {
          label: 'Hotspot Karhutla (Bulan Lainnya Nov–Jul)',
          data: hotspotNonHaze.map(p => p.median),
          borderColor: '#0d9488',
          backgroundColor: '#0d9488',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 2,
          tension: 0.2,
        },
        {
          label: 'DKI Jakarta (Musim Karhutla Agu–Okt)',
          data: jktHaze.map(p => p.median),
          borderColor: '#ea580c',
          backgroundColor: '#ea580c',
          borderWidth: 2.2,
          pointRadius: 3,
          tension: 0.2,
        },
        {
          label: 'DKI Jakarta (Bulan Lainnya Nov–Jul)',
          data: jktNonHaze.map(p => p.median),
          borderColor: '#0284c7',
          backgroundColor: '#0284c7',
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 2,
          tension: 0.2,
        },
      ];
      empty.hidden = true;
      canvas.hidden = false;
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

export function createHeatmapChart(host: HTMLElement): {
  update: (grid: (number | null)[][], stationCode: string) => void;
  destroy: () => void;
} {
  const container = element('div', 'heatmap-container');
  container.style.position = 'relative';
  container.style.overflowX = 'auto';
  container.style.width = '100%';
  container.style.padding = '8px 0';

  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Heatmap PM2.5 per Hari dan Jam');
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';

  const tooltip = element('div', 'heatmap-tooltip');
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

  const legend = element('div', 'heatmap-legend');
  legend.style.display = 'flex';
  legend.style.flexWrap = 'wrap';
  legend.style.alignItems = 'center';
  legend.style.gap = '12px';
  legend.style.marginTop = '10px';
  legend.style.fontSize = '11.5px';
  legend.innerHTML = `
    <span style="color:var(--secondary)">Skala Konsentrasi PM2.5 (µg/m³):</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#059669;border-radius:2px;"></span> &le;15 (Baik)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#0284c7;border-radius:2px;"></span> 16–55 (Sedang)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#bf7b0a;border-radius:2px;"></span> 56–150 (Tidak Sehat)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#ef4444;border-radius:2px;"></span> 151–250 (Sangat Tidak Sehat)</span>
    <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#8875ad;border-radius:2px;"></span> &gt;250 (Berbahaya)</span>
  `;

  container.append(canvas, tooltip, legend);
  host.append(container);

  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  let currentGrid: (number | null)[][] = [];
  let currentStation = '';

  const labelMarginLeft = 70;
  const labelMarginTop = 24;
  const cellHeight = 28;

  function calculateCellWidth(): number {
    const available = container.clientWidth || 900;
    return Math.max(32, Math.floor((available - labelMarginLeft - 20) / 24));
  }

  function getColor(val: number | null): string {
    if (val === null) return '#e2e8f0';
    if (val <= 15) return '#059669';
    if (val <= 55) return '#0284c7';
    if (val <= 150) return '#bf7b0a';
    if (val <= 250) return '#ef4444';
    return '#8875ad';
  }

  function render(): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cellWidth = calculateCellWidth();
    canvas.width = labelMarginLeft + 24 * cellWidth + 10;
    canvas.height = labelMarginTop + 7 * cellHeight + 10;

    const theme = chartTheme();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    for (let h = 0; h < 24; h++) {
      const x = labelMarginLeft + h * cellWidth + cellWidth / 2;
      if (h % 3 === 0 || h === 23) {
        ctx.fillText(`${String(h).padStart(2, '0')}`, x, labelMarginTop - 4);
      }
    }

    for (let dow = 0; dow < 7; dow++) {
      const y = labelMarginTop + dow * cellHeight;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = theme.text;
      ctx.fillText(days[dow] ?? '', labelMarginLeft - 8, y + cellHeight / 2);

      const row = currentGrid[dow] ?? [];
      for (let h = 0; h < 24; h++) {
        const val = row[h] ?? null;
        const x = labelMarginLeft + h * cellWidth;
        ctx.fillStyle = getColor(val);
        ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
      }
    }
  }

  const handleMouseMove = (evt: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const cellWidth = calculateCellWidth();
    const x = evt.clientX - rect.left;
    const y = evt.clientY - rect.top;

    if (x < labelMarginLeft || y < labelMarginTop) {
      tooltip.style.display = 'none';
      return;
    }
    const h = Math.floor((x - labelMarginLeft) / cellWidth);
    const dow = Math.floor((y - labelMarginTop) / cellHeight);

    if (h >= 0 && h < 24 && dow >= 0 && dow < 7) {
      const val = currentGrid[dow]?.[h] ?? null;
      const dayName = days[dow] ?? '';
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      tooltip.innerHTML = `<strong>${dayName}, ${hourStr}</strong><br>Stasiun: ${currentStation}<br>Median PM2.5: ${val !== null ? number(val) + ' µg/m³' : 'Tidak cukup data'}`;
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
  window.addEventListener('resize', render);

  return {
    update: (grid, stationCode) => {
      currentGrid = grid;
      currentStation = stationCode;
      render();
    },
    destroy: () => {
      observer.disconnect();
      window.removeEventListener('resize', render);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      container.remove();
    },
  };
}

export function createTimeseriesChart(host: HTMLElement): {
  update: (dates: readonly string[], stations: Record<string, readonly (number | null)[]>, isCapped: boolean) => void;
  destroy: () => void;
} {
  const frame = element('div', 'timeseries-plot');
  frame.style.height = '360px';
  frame.style.position = 'relative';
  frame.style.width = '100%';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'timeseries';
  frame.append(canvas);
  host.append(frame);

  const palette = ['#dc2626', '#ea580c', '#0284c7', '#0d9488', '#8b5cf6', '#16a34a', '#ec4899'];

  const chart = new Chart<'line', (number | null)[], string>(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 14,
            font: { size: 11, family: 'Inter, sans-serif' },
            padding: 10,
          },
        },
        tooltip: {
          displayColors: true,
          callbacks: {
            label: item => `${item.dataset.label ?? ''}: ${item.raw !== null ? number(Number(item.raw)) + ' µg/m³' : '—'}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 12, maxRotation: 0 },
        },
        y: {
          beginAtZero: true,
          title: { display: true, text: 'Rata-rata Harian PM2.5 (µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
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
    update: (dates, stations, isCapped) => {
      chart.data.labels = dates.map(d => d.slice(5)); // 'MM-DD'

      if (chart.options.scales?.['y']) {
        if (isCapped) {
          chart.options.scales['y'].max = 150;
        } else {
          chart.options.scales['y'].max = undefined;
        }
      }

      const datasets: any[] = Object.entries(stations).map(([code, values], idx) => ({
        label: code,
        data: [...values],
        borderColor: palette[idx % palette.length] ?? '#0284c7',
        backgroundColor: palette[idx % palette.length] ?? '#0284c7',
        borderWidth: 1.8,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
      }));

      // 55 µg/m³ threshold line
      datasets.push({
        label: 'Baku Mutu Harian PP 22/2021 (55 µg/m³)',
        data: dates.map(() => 55),
        borderColor: '#dc2626',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [6, 4] as any,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
      });

      // 15 µg/m³ threshold line
      datasets.push({
        label: 'Baku Mutu Tahunan PP 22/2021 (15 µg/m³)',
        data: dates.map(() => 15),
        borderColor: '#16a34a',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [4, 4] as any,
        pointRadius: 0,
        pointHoverRadius: 0,
        tension: 0,
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

export function createEpisodesChart(host: HTMLElement): {
  update: (episodes: readonly EpisodeWithStation[]) => void;
  destroy: () => void;
} {
  const frame = element('div', 'episodes-plot');
  frame.style.height = '340px';
  frame.style.position = 'relative';
  frame.style.width = '100%';
  const canvas = element('canvas');
  canvas.setAttribute('role', 'img');
  canvas.dataset['chart'] = 'episodes';
  frame.append(canvas);
  host.append(frame);

  let currentEpisodes: readonly EpisodeWithStation[] = [];

  const chart = new Chart<'bar', number[], string>(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 600 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          callbacks: {
            title: items => {
              const ep = currentEpisodes[items[0]?.dataIndex ?? -1];
              return ep ? `${ep.station} · Periode: ${ep.start} s.d. ${ep.end}` : '';
            },
            label: item => {
              const ep = currentEpisodes[item.dataIndex];
              return ep
                ? `Durasi: ${ep.duration_days} hari | Puncak: ${number(ep.peak_pm25)} µg/m³ | Rerata: ${number(ep.mean_pm25)} µg/m³`
                : '';
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          title: { display: true, text: 'Durasi Episode Ekstrem (Hari Beruntun >55 µg/m³)' },
          ticks: { maxTicksLimit: 6 },
        },
        y: {
          grid: { display: false },
          ticks: { autoSkip: false },
        },
      },
    },
  });

  const applyColors = (): void => {
    const theme = chartTheme();
    if (chart.options.scales?.['x']?.ticks) chart.options.scales['x'].ticks.color = theme.text;
    if (chart.options.scales?.['x']?.grid) chart.options.scales['x'].grid.color = theme.grid;
    if (chart.options.scales?.['x']?.title) chart.options.scales['x'].title.color = theme.text;
    if (chart.options.scales?.['y']?.ticks) chart.options.scales['y'].ticks.color = theme.text;
  };

  const observer = new MutationObserver(() => {
    applyColors();
    chart.update('none');
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  applyColors();

  return {
    update: episodes => {
      currentEpisodes = episodes;
      chart.data.labels = episodes.map(ep => `${ep.station} (${ep.start.slice(0, 7)})`);
      chart.data.datasets = [{
        label: 'Durasi (Hari)',
        data: episodes.map(ep => ep.duration_days),
        backgroundColor: episodes.map(ep => ep.duration_days > 100 ? '#ef4444' : ep.duration_days > 30 ? '#ea580c' : '#0284c7'),
        borderRadius: 4,
      }];
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
