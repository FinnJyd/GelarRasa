// =====================================================================
// PRANA DASHBOARD - LOGIC & INTERACTION ENGINE (REVISI #2)
// Dataset Context: DA Gelar Rasa 2026 (27 AQMS Stations & 27 Hospitals)
// =====================================================================

// Master Stations Data from dataset/raw/master/sites.csv
const STATIONS_DATA = [
  { code: 'AQMS-JKT-01', city: 'Kota Administrasi Jakarta Pusat', province: 'DKI Jakarta', region: 'Jakarta', type: 'Urban Background', lat: -6.175392, lon: 106.827153, baseline: 37.5, ispu: 'Sedang', violations: 64, hospital: 'RSUP Dr. Cipto Mangunkusumo' },
  { code: 'AQMS-JKT-02', city: 'Kota Administrasi Jakarta Utara', province: 'DKI Jakarta', region: 'Jakarta', type: 'Industrial Perimeter', lat: -6.11182, lon: 106.96441, baseline: 55.0, ispu: 'Tidak Sehat', violations: 132, hospital: 'RSUD Koja' },
  { code: 'AQMS-JKT-03', city: 'Kota Administrasi Jakarta Barat', province: 'DKI Jakarta', region: 'Jakarta', type: 'Traffic / Roadside', lat: -6.152814, lon: 106.73289, baseline: 39.0, ispu: 'Sedang', violations: 78, hospital: 'RSUD Cengkareng' },
  { code: 'AQMS-KTG-01', city: 'Kota Palangka Raya', province: 'Kalimantan Tengah', region: 'Kalimantan', type: 'Urban Background', lat: -2.2136, lon: 113.9108, baseline: 22.0, ispu: 'Sangat Tidak Sehat', violations: 115, hospital: 'RSUD dr. Doris Sylvanus' },
  { code: 'AQMS-KTG-02', city: 'Kabupaten Kotawaringin Timur', province: 'Kalimantan Tengah', region: 'Kalimantan', type: 'Peatland Boundary', lat: -2.5358, lon: 112.9554, baseline: 35.0, ispu: 'Sangat Tidak Sehat', violations: 142, hospital: 'RSUD dr. Murjani Sampit' },
  { code: 'AQMS-BGR-01', city: 'Kabupaten Bogor', province: 'Jawa Barat', region: 'Jawa', type: 'Regional / Clean Background', lat: -6.69784, lon: 106.94212, baseline: 13.5, ispu: 'Baik', violations: 12, hospital: 'RSUD Ciawi' },
  { code: 'AQMS-BGR-02', city: 'Kota Bogor', province: 'Jawa Barat', region: 'Jawa', type: 'Traffic / Roadside', lat: -6.6022, lon: 106.8089, baseline: 26.0, ispu: 'Sedang', violations: 45, hospital: 'RSUD Kota Bogor' },
  { code: 'AQMS-YKY-01', city: 'Kabupaten Sleman', province: 'D.I. Yogyakarta', region: 'Jawa', type: 'Urban Background', lat: -7.731, lon: 110.354, baseline: 38.6, ispu: 'Sedang', violations: 72, hospital: 'RSUP Dr. Sardjito' },
  { code: 'AQMS-IDP-01', city: 'Kabupaten Aceh Besar', province: 'Aceh', region: 'Sumatera', type: 'Regional / Clean Background', lat: 5.404, lon: 95.475, baseline: 9.7, ispu: 'Baik', violations: 4, hospital: 'RSUD Jantho' },
  { code: 'AQMS-KTB-01', city: 'Kabupaten Agam', province: 'Sumatera Barat', region: 'Sumatera', type: 'Regional / Clean Background', lat: -0.251, lon: 100.382, baseline: 12.0, ispu: 'Baik', violations: 6, hospital: 'RSUD Lubuk Basung' },
  { code: 'AQMS-PKU-01', city: 'Kota Pekanbaru', province: 'Riau', region: 'Sumatera', type: 'Peatland Buffer / Urban', lat: 0.46667, lon: 101.4666, baseline: 35.0, ispu: 'Tidak Sehat', violations: 98, hospital: 'RSUD Arifin Achmad' },
  { code: 'AQMS-JMB-01', city: 'Kota Jambi', province: 'Jambi', region: 'Sumatera', type: 'Peatland Buffer / Urban', lat: -1.63, lon: 103.64, baseline: 32.0, ispu: 'Tidak Sehat', violations: 92, hospital: 'RSUD Raden Mattaher' },
  { code: 'AQMS-BTM-01', city: 'Kota Batam', province: 'Kepulauan Riau', region: 'Sumatera', type: 'Industrial Perimeter / Maritime', lat: 1.124, lon: 104.126, baseline: 38.0, ispu: 'Sedang', violations: 61, hospital: 'RSUD Embung Fatimah' },
  { code: 'AQMS-BGL-01', city: 'Kota Bengkulu', province: 'Bengkulu', region: 'Sumatera', type: 'Urban Coastal Background', lat: -3.865, lon: 102.312, baseline: 25.0, ispu: 'Sedang', violations: 32, hospital: 'RSUD Dr. M. Yunus Bengkulu' },
  { code: 'AQMS-SRG-01', city: 'Kota Sorong', province: 'Papua Barat Daya', region: 'Papua', type: 'Coastal / Regional Background', lat: -0.883, lon: 131.298, baseline: 18.0, ispu: 'Baik', violations: 18, hospital: 'RSUD Sele Be Solu' },
  { code: 'AQMS-MLG-01', city: 'Kabupaten Malang', province: 'Jawa Timur', region: 'Jawa', type: 'Urban Background / Valley', lat: -7.901, lon: 112.598, baseline: 30.0, ispu: 'Sedang', violations: 58, hospital: 'RSUD Dr. Saiful Anwar' },
  { code: 'AQMS-MRS-01', city: 'Kabupaten Maros', province: 'Sulawesi Selatan', region: 'Sulawesi', type: 'Industrial / Karst Perimeter', lat: -4.997, lon: 119.57, baseline: 36.0, ispu: 'Sedang', violations: 74, hospital: 'RSUD Dr. La Palaloi' },
  { code: 'AQMS-PLU-01', city: 'Kabupaten Poso', province: 'Sulawesi Tengah', region: 'Sulawesi', type: 'Regional / Clean Background', lat: -1.65, lon: 120.183, baseline: 11.0, ispu: 'Baik', violations: 5, hospital: 'RSUD Poso' },
  { code: 'AQMS-STG-01', city: 'Kabupaten Sintang', province: 'Kalimantan Barat', region: 'Kalimantan', type: 'Peatland Boundary / Inland', lat: 0.066, lon: 111.477, baseline: 22.0, ispu: 'Sedang', violations: 54, hospital: 'RSUD Ade M. Djoen' },
  { code: 'AQMS-PKN-01', city: 'Kabupaten Kotawaringin Barat', province: 'Kalimantan Tengah', region: 'Kalimantan', type: 'Peatland Boundary / Airport', lat: -2.704, lon: 111.676, baseline: 24.0, ispu: 'Tidak Sehat', violations: 89, hospital: 'RSUD Sultan Imanuddin' },
  { code: 'AQMS-PLB-01', city: 'Kota Palembang', province: 'Sumatera Selatan', region: 'Sumatera', type: 'Peatland Buffer / Urban Artery', lat: -2.94, lon: 104.7, baseline: 42.0, ispu: 'Tidak Sehat', violations: 108, hospital: 'RSUP Dr. Mohammad Hoesin' },
  { code: 'AQMS-PSW-01', city: 'Kabupaten Pesawaran', province: 'Lampung', region: 'Sumatera', type: 'Urban Background / Highway Corridor', lat: -5.17, lon: 105.178, baseline: 54.3, ispu: 'Tidak Sehat', violations: 124, hospital: 'RSUD Pesawaran' },
  { code: 'AQMS-MER-01', city: 'Kabupaten Merauke', province: 'Papua Selatan', region: 'Papua', type: 'Coastal / Remote Savanna', lat: -8.5211, lon: 140.4072, baseline: 16.5, ispu: 'Baik', violations: 14, hospital: 'RSUD Merauke' },
  { code: 'AQMS-MDN-01', city: 'Kota Medan', province: 'Sumatera Utara', region: 'Sumatera', type: 'Urban Background', lat: 3.59, lon: 98.85, baseline: 42.8, ispu: 'Tidak Sehat', violations: 112, hospital: 'RSUP H. Adam Malik' },
  { code: 'AQMS-SM2-01', city: 'Kota Samarinda', province: 'Kalimantan Timur', region: 'Kalimantan', type: 'Industrial & Deforestation Buffer', lat: -0.4825, lon: 117.1563, baseline: 32.5, ispu: 'Sedang', violations: 66, hospital: 'RSUD AW Sjahranie' },
  { code: 'AQMS-BJB-01', city: 'Kota Banjarbaru', province: 'Kalimantan Selatan', region: 'Kalimantan', type: 'Airport & Peatland Buffer', lat: -3.475, lon: 114.856, baseline: 35.0, ispu: 'Sedang', violations: 76, hospital: 'RSUD Idaman Banjarbaru' },
  { code: 'AQMS-JMB-02', city: 'Kabupaten Muaro Jambi', province: 'Jambi', region: 'Sumatera', type: 'Peatland & Plantation Hinterland', lat: -1.635, lon: 103.646, baseline: 68.9, ispu: 'Sangat Tidak Sehat', violations: 168, hospital: 'RSUD Ahmad Ripin' }
];

// Color mapping per ISPU category
const ISPU_COLORS = {
  'Baik': '#10b981',
  'Sedang': '#0284c7',
  'Tidak Sehat': '#f59e0b',
  'Sangat Tidak Sehat': '#ef4444',
  'Berbahaya': '#1e1b4b'
};

// Global State
let mapInstance = null;
let tileLayerInstance = null;
let mapMarkers = [];
let currentMapMode = 'daily'; // 'daily' (ISPU 24-Jam) | 'annual' (PP 22/2021 15 µg/m³)
let donutChartInstance = null;
let top10ChartInstance = null;
let bottom10ChartInstance = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  initSidebarToggle();
  initNavigation();
  initFilterPanel();
  initMethodologyModal();
  initFunFactTicker();
  initTab1Charts();
  initNationalMap();
  initFilters();
});

// =====================================================================
// FUNFACT TICKER STRIP
// =====================================================================
function initFunFactTicker() {
  const FUNFACTS = [
    { text: 'PM2.5 di Palangka Raya tembus <strong>870 µg/m³</strong> pada Oktober 2026 — 15× di atas batas aman WHO 24 jam.' },
    { text: 'Setiap kenaikan <strong>10 µg/m³ PM2.5</strong> meningkatkan risiko admisi ISPA balita sebesar 12–18%.' },
    { text: 'Karhutla 2026 membakar lebih dari <strong>400.000 ha</strong> lahan gambut Kalimantan Tengah dalam 90 hari.' },
    { text: 'Hanya <strong>27 stasiun AQMS</strong> resmi untuk 270 juta penduduk Indonesia — rasio 1:10 juta, terendah di Asia Tenggara.' },
    { text: '<strong>22 dari 27 stasiun</strong> AQMS melebihi ambang batas PM2.5 tahunan PP 22/2021 (15 µg/m³) selama 2024–2026.' },
    { text: 'WHO 2021 merekomendasikan batas PM2.5 tahunan <strong>5 µg/m³</strong> — 3× lebih ketat dari regulasi Indonesia saat ini.' },
    { text: 'Pemantauan kualitas udara real-time dapat mengurangi kematian dini terkait polusi hingga <strong>25%</strong> (WHO, 2023).' },
    { text: 'Jakarta mencatat kategori ISPU "Tidak Sehat" selama <strong>143 hari</strong> dalam rentang data 2024–2026.' },
    { text: 'Lahan gambut Sumatera dan Kalimantan menyimpan karbon setara <strong>50 tahun emisi CO₂</strong> seluruh Eropa.' },
    { text: 'ISPA adalah penyebab <strong>kematian balita ke-2 terbanyak</strong> di Indonesia, berkorelasi kuat dengan paparan PM2.5 jangka panjang.' },
  ];

  const ticker = document.getElementById('funfact-ticker');
  if (!ticker) return;

  // Build HTML for all items (duplicated for seamless infinite loop)
  function buildItems() {
    return FUNFACTS.map(f =>
      `<span class="funfact-item"><span class="funfact-dot"></span>${f.text}</span>`
    ).join('');
  }

  // Inject double the content for seamless looping
  ticker.innerHTML = buildItems() + buildItems();

  // Calculate duration based on content width for consistent px/s speed
  // Use double-rAF to ensure layout is fully painted before reading scrollWidth
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const halfWidth = ticker.scrollWidth / 2; // width of one copy
    const pxPerSecond = 100; // comfortable reading speed
    const duration = Math.max(15, halfWidth / pxPerSecond);
    ticker.style.setProperty('--ticker-duration', duration + 's');
    ticker.style.animationDuration = duration + 's';
  }));
}

// =====================================================================
// 1. SIDEBAR TOGGLE (INTERACTIVE OPEN & CLOSE)
// =====================================================================
function initSidebarToggle() {
  const sidebar = document.getElementById('app-sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');

  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar-collapsed');

      // Refresh map size when sidebar expands or collapses
      if (mapInstance) {
        setTimeout(() => {
          mapInstance.invalidateSize();
        }, 320);
      }
    });
  }
}

// =====================================================================
// 2. THEME ENGINE (DUAL THEME: LIGHT & DARK)
// =====================================================================
function initThemeEngine() {
  const toggleBtn = document.getElementById('theme-toggle-btn');
  const lightIcon = document.getElementById('theme-icon-light');
  const darkIcon = document.getElementById('theme-icon-dark');

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('prana_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && systemPrefersDark);

  applyTheme(isDark ? 'dark' : 'light');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const currentIsDark = document.documentElement.classList.contains('dark');
      applyTheme(currentIsDark ? 'light' : 'dark');
    });
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      if (lightIcon) lightIcon.classList.remove('hidden');
      if (darkIcon) darkIcon.classList.add('hidden');
      localStorage.setItem('prana_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (lightIcon) lightIcon.classList.add('hidden');
      if (darkIcon) darkIcon.classList.remove('hidden');
      localStorage.setItem('prana_theme', 'light');
    }

    // Update Map Basemap Layer
    updateMapTheme(theme);

    // Update Charts colors
    updateChartsTheme(theme);
  }
}

function updateMapTheme(theme) {
  if (!mapInstance) return;

  // Esri World Gray Canvas (100% Free, No Watermark, No API Key Required)
  const lightTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const darkTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const targetUrl = theme === 'dark' ? darkTiles : lightTiles;

  if (tileLayerInstance) {
    mapInstance.removeLayer(tileLayerInstance);
  }

  tileLayerInstance = L.tileLayer(targetUrl, {
    attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ | DA Gelar Rasa 2026',
    maxZoom: 16
  }).addTo(mapInstance);
}

function updateChartsTheme(theme) {
  const isDark = theme === 'dark';
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

  if (top10ChartInstance) {
    top10ChartInstance.options.scales.x.ticks.color = textColor;
    top10ChartInstance.options.scales.x.grid.color = gridColor;
    top10ChartInstance.options.scales.y.ticks.color = textColor;
    top10ChartInstance.options.scales.x.title.color = textColor;
    top10ChartInstance.update();
  }

  if (bottom10ChartInstance) {
    bottom10ChartInstance.options.scales.x.ticks.color = textColor;
    bottom10ChartInstance.options.scales.x.grid.color = gridColor;
    bottom10ChartInstance.options.scales.y.ticks.color = textColor;
    bottom10ChartInstance.options.scales.x.title.color = textColor;
    bottom10ChartInstance.update();
  }

  if (donutChartInstance) {
    donutChartInstance.options.plugins.legend.labels.color = textColor;
    donutChartInstance.data.datasets[0].borderColor = isDark ? '#0f2430' : '#ffffff';
    donutChartInstance.update();
  }
}

// Navigation & Tab Switching
function initNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav-item');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const tabNameDisplay = document.getElementById('tab-name-display');
  const tabQuestionDisplay = document.getElementById('tab-header-question');
  const tabTitle = document.getElementById('current-tab-title');
  const tabSub = document.getElementById('current-tab-sub');

  const tabQuestions = {
    'tab-1': 'Bagaimana status kualitas udara nasional dan seberapa parah krisis polusi terhadap beban kesehatan masyarakat di 27 stasiun pemantau Indonesia?',
    'tab-2': 'Sejauh mana stasiun AQMS mematuhi ambang batas baku mutu PP 22/2021 dan standar WHO 2021, serta provinsi mana yang paling rentan gagal patuh?',
    'tab-3': 'Kapan jam dan periode puncak lonjakan polutan terjadi dalam siklus diurnal 24 jam, dan bagaimana anomali musiman karhutla mengubah drastis profil polusi?',
    'tab-4': 'Faktor meteorologi, arah angin (mawar polusi), dan aktivitas antropogenik apa yang menjadi pemicu utama konsentrasi ekstrem polutan di berbagai zonasi?',
    'tab-5': 'Berapa jeda waktu (lag 0–7 hari) paparan PM2.5 terhadap lonjakan ISPA, dan kelompok usia mana yang paling rentan menanggung beban admisi faskes?',
    'tab-6': 'Intervensi kebijakan apa yang paling efektif secara biaya-manfaat untuk menurunkan risiko kematian dini dan beban faskes masa depan?'
  };

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');
      if (!targetTab) return;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      tabPanels.forEach(panel => {
        panel.classList.add('hidden');
      });

      const activePanel = document.getElementById(targetTab);
      if (activePanel) {
        activePanel.classList.remove('hidden');
      }

      // Update Header Component (layout/Header.png: Nama Tab + Pertanyaan Riset)
      const tabName = item.querySelector('span').textContent;
      if (tabNameDisplay) tabNameDisplay.textContent = tabName.toUpperCase();
      if (tabQuestionDisplay) tabQuestionDisplay.textContent = tabQuestions[targetTab] || '';
      if (tabTitle) tabTitle.textContent = tabName;
      if (tabSub) tabSub.textContent = tabQuestions[targetTab] || '';

      // Redraw map if switching to Tab 1
      if (targetTab === 'tab-1' && mapInstance) {
        setTimeout(() => {
          mapInstance.invalidateSize();
        }, 200);
      }
    });
  });
}

// =====================================================================
// 3. POPUP MODAL 80% (METODOLOGI)
// =====================================================================
function initMethodologyModal() {
  const modal = document.getElementById('methodology-modal');
  const backdrop = document.getElementById('methodology-backdrop');
  const openButtons = document.querySelectorAll('.trigger-methodology');
  const closeButtons = document.querySelectorAll('.close-methodology');

  function openModal() {
    if (!modal || !backdrop) return;
    backdrop.classList.remove('hidden');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal || !backdrop) return;
    backdrop.classList.add('hidden');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  openButtons.forEach(btn => btn.addEventListener('click', openModal));
  closeButtons.forEach(btn => btn.addEventListener('click', closeModal));
  if (backdrop) backdrop.addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}

// =====================================================================
// DATA RETRIEVAL & HYDRATION: TAB 1 (IKHTISAR NASIONAL)
// =====================================================================
function getTab1Data() {
  if (typeof window !== 'undefined' && window.TAB1_DATA) {
    return window.TAB1_DATA;
  }
  return null;
}

// Populate 4 KPI Executive Cockpit Cards
function populateTab1KPIs(data) {
  if (!data || !data.kpi) return;
  const kpi = data.kpi;

  const elAvg = document.getElementById('kpi-avg-pm25');
  const elExceed = document.getElementById('kpi-pct-exceed');
  const elCritStation = document.getElementById('kpi-critical-station');
  const elCritVal = document.getElementById('kpi-critical-val');
  const elCritCity = document.getElementById('kpi-critical-city');
  const elHospital = document.getElementById('kpi-hospital-burden');

  if (elAvg && kpi.avg_pm25_national !== undefined) {
    elAvg.textContent = kpi.avg_pm25_national.toFixed(2);
  }
  if (elExceed && kpi.pct_days_exceed_24h !== undefined) {
    elExceed.textContent = kpi.pct_days_exceed_24h.toFixed(1);
  }
  if (kpi.station_most_critical) {
    if (elCritStation) elCritStation.textContent = kpi.station_most_critical.station_code || 'AQMS-BJB-01';
    if (elCritVal) elCritVal.textContent = (kpi.station_most_critical.avg_pm25 ? kpi.station_most_critical.avg_pm25.toFixed(2) : '102.14') + ' µg/m³';
    if (elCritCity) elCritCity.textContent = kpi.station_most_critical.kota || 'Kota Banjarbaru';
  }
  if (elHospital && kpi.hospital_burden_index !== undefined) {
    elHospital.textContent = kpi.hospital_burden_index.toFixed(2);
  }
}

// Charts for Tab 1 (Executive Cockpit Charts)
function initTab1Charts() {
  const data = getTab1Data();
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9';

  // 0. Update KPI Cards in DOM
  if (data) populateTab1KPIs(data);

  // 1. Donut Chart (Distribusi ISPU Dominan Stasiun)
  const donutCtx = document.getElementById('ispu-donut-chart');
  if (donutCtx) {
    const donutData = (data && data.ispu_donut) ? data.ispu_donut : [
      { category: 'Baik', count: 4, percentage: 14.8, color: '#10b981' },
      { category: 'Sedang', count: 21, percentage: 77.8, color: '#0284c7' },
      { category: 'Tidak Sehat', count: 2, percentage: 7.4, color: '#f59e0b' }
    ];

    if (donutChartInstance) donutChartInstance.destroy();

    donutChartInstance = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: donutData.map(d => `${d.category} (${d.count})`),
        datasets: [{
          data: donutData.map(d => d.count),
          backgroundColor: donutData.map(d => d.color),
          borderWidth: 2,
          borderColor: isDark ? '#0f2430' : '#ffffff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              boxWidth: 12,
              font: { size: 11, family: 'Inter', weight: '600' },
              color: textColor,
              padding: 12
            }
          },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const item = donutData[ctx.dataIndex];
                return ` ${item.category}: ${item.count} Stasiun (${item.percentage}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  // 2. Horizontal Bar Chart: Top 10 Rata-Rata PM per Stasiun (Tertinggi)
  const top10Ctx = document.getElementById('top10-bar-chart');
  if (top10Ctx) {
    const ranking = (data && data.pm25_ranking) ? data.pm25_ranking : [];
    const top10 = ranking.slice(0, 10);

    if (top10ChartInstance) top10ChartInstance.destroy();

    top10ChartInstance = new Chart(top10Ctx, {
      type: 'bar',
      data: {
        labels: top10.map(s => `${s.station_code} (${s.kota.replace('Kota Administrasi ', '').replace('Kabupaten ', '').replace('Kota ', '')})`),
        datasets: [{
          label: 'Rata-Rata PM2.5 (µg/m³)',
          data: top10.map(s => s.avg_pm25),
          backgroundColor: top10.map(s => s.avg_pm25 > 55 ? '#ef4444' : (s.avg_pm25 > 35 ? '#f59e0b' : '#0284c7')),
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function(ctx) {
                const s = top10[ctx.dataIndex];
                return `ISPU Dominan: ${s.dominant_ispu_cat} | Hari > 55 µg/m³: ${s.pct_exceed_24h}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10, family: 'Inter' } },
            title: { display: true, text: 'Konsentrasi PM2.5 Rata-Rata (µg/m³)', color: textColor, font: { size: 10, weight: '600' } }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10, family: 'Inter', weight: '600' } }
          }
        }
      }
    });
  }

  // 3. Horizontal Bar Chart: Bottom 10 Rata-Rata PM per Stasiun (Terendah)
  const bottom10Ctx = document.getElementById('bottom10-bar-chart');
  if (bottom10Ctx) {
    const ranking = (data && data.pm25_ranking) ? data.pm25_ranking : [];
    const bottom10 = ranking.slice(-10).reverse();

    if (bottom10ChartInstance) bottom10ChartInstance.destroy();

    bottom10ChartInstance = new Chart(bottom10Ctx, {
      type: 'bar',
      data: {
        labels: bottom10.map(s => `${s.station_code} (${s.kota.replace('Kabupaten ', '').replace('Kota ', '')})`),
        datasets: [{
          label: 'Rata-Rata PM2.5 (µg/m³)',
          data: bottom10.map(s => s.avg_pm25),
          backgroundColor: '#10b981',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function(ctx) {
                const s = bottom10[ctx.dataIndex];
                return `Kategori: ${s.dominant_ispu_cat} | PP 22/2021 (15 µg/m³): ${s.avg_pm25 <= 15 ? 'MEMENUHI' : 'MELEBIHI'}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: gridColor },
            ticks: { color: textColor, font: { size: 10, family: 'Inter' } },
            title: { display: true, text: 'Konsentrasi PM2.5 Rata-Rata (µg/m³)', color: textColor, font: { size: 10, weight: '600' } }
          },
          y: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 10, family: 'Inter', weight: '600' } }
          }
        }
      }
    });
  }
}

// Leaflet Map Initialization for 27 Indonesian Stations
function initNationalMap() {
  const mapContainer = document.getElementById('national-map');
  if (!mapContainer) return;

  const isDark = document.documentElement.classList.contains('dark');
  const lightTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const darkTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const targetUrl = isDark ? darkTiles : lightTiles;

  if (!mapInstance) {
    mapInstance = L.map('national-map', {
      center: [-1.8, 117.8],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12
    });

    tileLayerInstance = L.tileLayer(targetUrl, {
      attribution: '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ | DA Gelar Rasa 2026',
      maxZoom: 16
    }).addTo(mapInstance);
  }

  initMapModeSwitcher();
  updateMapLegendStrip();

  const data = getTab1Data();
  const stations = (data && data.map_stations) ? data.map_stations : STATIONS_DATA;
  renderMapMarkers(stations);
}

// Map Mode Switcher: Acuan Harian (ISPU 24 Jam) vs Acuan Tahunan (PP 22/2021)
function initMapModeSwitcher() {
  const btnDaily = document.getElementById('btn-mode-daily');
  const btnAnnual = document.getElementById('btn-mode-annual');
  if (!btnDaily || !btnAnnual) return;

  btnDaily.addEventListener('click', () => {
    if (currentMapMode === 'daily') return;
    setMapMode('daily');
  });

  btnAnnual.addEventListener('click', () => {
    if (currentMapMode === 'annual') return;
    setMapMode('annual');
  });
}

function setMapMode(mode) {
  currentMapMode = mode;
  const btnDaily = document.getElementById('btn-mode-daily');
  const btnAnnual = document.getElementById('btn-mode-annual');

  if (mode === 'daily') {
    if (btnDaily) {
      btnDaily.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 bg-white dark:bg-[#0f2430] text-sky-600 dark:text-sky-400 shadow-xs border border-slate-200/80 dark:border-slate-700';
      const dot = btnDaily.querySelector('span');
      if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-sky-500';
    }
    if (btnAnnual) {
      btnAnnual.className = 'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      const dot = btnAnnual.querySelector('span');
      if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    }
  } else {
    if (btnDaily) {
      btnDaily.className = 'px-2.5 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white';
      const dot = btnDaily.querySelector('span');
      if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-slate-400';
    }
    if (btnAnnual) {
      btnAnnual.className = 'px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 bg-white dark:bg-[#0f2430] text-emerald-600 dark:text-emerald-400 shadow-xs border border-slate-200/80 dark:border-slate-700';
      const dot = btnAnnual.querySelector('span');
      if (dot) dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
    }
  }

  updateMapLegendStrip();
  const data = getTab1Data();
  const stations = (data && data.map_stations) ? data.map_stations : STATIONS_DATA;
  renderMapMarkers(stations);
}

function updateMapLegendStrip() {
  const strip = document.getElementById('map-legend-strip');
  if (!strip) return;

  if (currentMapMode === 'daily') {
    strip.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 items-center">
        <!-- Kolom 1: Kategori ISPU Dominan (Permen LHK 14/2020) -->
        <div class="flex flex-col justify-center gap-1">
          <div class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[10.5px]">
            <span class="w-2 h-2 rounded-full bg-sky-500"></span>
            Kategori ISPU Dominan 24 Jam (Permen LHK 14/2020)
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F9F6EE] dark:bg-[#0f2430] border border-slate-200/60 dark:border-slate-800 text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <strong class="text-emerald-600 dark:text-emerald-400">Baik (0–15)</strong>
              <span class="text-slate-400 dark:text-slate-500">4 stn</span>
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F9F6EE] dark:bg-[#0f2430] border border-slate-200/60 dark:border-slate-800 text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
              <strong class="text-sky-600 dark:text-sky-400">Sedang (16–55)</strong>
              <span class="text-slate-400 dark:text-slate-500">21 stn</span>
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F9F6EE] dark:bg-[#0f2430] border border-slate-200/60 dark:border-slate-800 text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              <strong class="text-amber-600 dark:text-amber-400">Tdk Sehat (>55)</strong>
              <span class="text-slate-400 dark:text-slate-500">2 stn</span>
            </span>
          </div>
        </div>

        <!-- Kolom 2: Skala Radius Lingkaran -->
        <div class="flex flex-col justify-center gap-1 min-w-0">
          <div class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[10.5px]">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            Skala Radius Lingkaran (Frekuensi Pelanggaran 24 Jam)
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span class="font-semibold text-slate-700 dark:text-slate-300">Makin besar:</span> makin sering stasiun melanggar baku mutu 24 jam PP 22/2021 (>55 µg/m³).
          </p>
        </div>
      </div>
    `;
  } else {
    strip.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 items-center">
        <!-- Kolom 1: Kepatuhan Baku Mutu Tahunan PP 22/2021 -->
        <div class="flex flex-col justify-center gap-1">
          <div class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[10.5px]">
            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
            Kepatuhan Baku Mutu Tahunan PP 22/2021 (Batas: 15 µg/m³)
          </div>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F9F6EE] dark:bg-[#0f2430] border border-slate-200/60 dark:border-slate-800 text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <strong class="text-emerald-600 dark:text-emerald-400">Memenuhi (≤15 µg/m³)</strong>
              <span class="text-slate-400 dark:text-slate-500">2 stn (7%)</span>
            </span>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F9F6EE] dark:bg-[#0f2430] border border-slate-200/60 dark:border-slate-800 text-[10px]">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              <strong class="text-rose-600 dark:text-rose-400">Melebihi (>15 µg/m³)</strong>
              <span class="text-slate-400 dark:text-slate-500">25 stn (93%)</span>
            </span>
          </div>
        </div>

        <!-- Kolom 2: Skala Radius Lingkaran -->
        <div class="flex flex-col justify-center gap-1 min-w-0">
          <div class="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 text-[10.5px]">
            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
            Skala Radius Lingkaran (Konsentrasi PM2.5 Aktual)
          </div>
          <p class="text-[10px] text-slate-500 dark:text-slate-400 truncate">
            <span class="font-semibold text-slate-700 dark:text-slate-300">Makin besar:</span> makin tinggi rata-rata konsentrasi PM2.5 stasiun di atas batas 15 µg/m³.
          </p>
        </div>
      </div>
    `;
  }
}

function renderMapMarkers(stations) {
  if (!mapInstance) return;
  mapMarkers.forEach(m => mapInstance.removeLayer(m));
  mapMarkers = [];

  stations.forEach(s => {
    const ispuCat = s.dominant_ispu_cat || s.ispu || 'Sedang';
    const avgVal = s.avg_pm25 !== undefined ? s.avg_pm25 : (s.baseline || 30);
    const exceedPct = s.pct_exceed_24h !== undefined ? s.pct_exceed_24h : 0;
    const stationCode = s.station_code || s.code;
    const stationName = s.station_name || s.name || stationCode;
    const stationCity = s.kota || s.city;
    const stationProv = s.provinsi || s.province || '';
    const stationKarakteristik = s.karakteristik || s.type || 'Urban Ambient';
    const rankBadge = s.rank ? `#${s.rank}` : '';

    let color = '#0284c7';
    let radius = 10;
    let tooltipHtml = '';
    let popupContent = '';

    if (currentMapMode === 'daily') {
      // MODE 1: ACUAN HARIAN (ISPU 24-JAM)
      color = s.ispu_color || ISPU_COLORS[ispuCat] || '#0284c7';
      // Radius berdasar frekuensi hari melanggar batas 24 jam (>55 ug/m3): min 7px, max 22px
      radius = Math.max(7, Math.min(22, 7 + (exceedPct / 100) * 15));

      tooltipHtml = `
        <div class="px-1 py-0.5 text-left font-sans">
          <div class="font-bold text-xs text-slate-900 dark:text-white leading-tight">${stationName}</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            ${stationCity} • ISPU Dominan: <span class="font-bold" style="color: ${color};">${ispuCat}</span>
          </div>
        </div>
      `;

      popupContent = `
        <div class="p-1 font-sans text-slate-800 dark:text-slate-100" style="min-width: 240px;">
          <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-sm text-slate-900 dark:text-white">${stationCode}</span>
              ${rankBadge ? `<span class="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Rank ${rankBadge}</span>` : ''}
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-xs" style="background-color: ${color};">
              ISPU: ${ispuCat}
            </span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Lokasi:</strong> ${stationCity}, ${stationProv}</p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Karakteristik:</strong> ${stationKarakteristik}</p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Hari Melanggar 24-Jam:</strong> <span class="text-rose-600 font-bold">${exceedPct}% hari</span></p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Rata-Rata PM2.5:</strong> <span class="font-extrabold text-slate-900 dark:text-white">${avgVal} µg/m³</span></p>
          <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-medium flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400">Baku Mutu 24 Jam (55 µg/m³):</span>
            <span class="font-bold ${exceedPct === 0 ? 'text-emerald-600' : 'text-rose-600'}">
              ${exceedPct === 0 ? '100% PATUH' : 'TERDAPAT PELANGGARAN'}
            </span>
          </div>
        </div>
      `;
    } else {
      // MODE 2: ACUAN TAHUNAN (PP 22/2021)
      const isCompliant = avgVal <= 15.0;
      color = isCompliant ? '#10b981' : '#ef4444';
      // Radius berdasar besaran konsentrasi rata-rata tahunan (skala 9 s.d. 105 ug/m3)
      const norm = Math.max(0, Math.min(1, (avgVal - 9) / (105 - 9)));
      radius = Math.max(7, Math.min(22, 7 + norm * 15));

      tooltipHtml = `
        <div class="px-1 py-0.5 text-left font-sans">
          <div class="font-bold text-xs text-slate-900 dark:text-white leading-tight">${stationName}</div>
          <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
            ${stationCity} • Rata-Rata: <strong>${avgVal} µg/m³</strong> (<span class="font-bold ${isCompliant ? 'text-emerald-600' : 'text-rose-600'}">${isCompliant ? 'Memenuhi' : 'Melebihi'}</span>)
          </div>
        </div>
      `;

      const diffVal = Math.abs(avgVal - 15.0).toFixed(1);
      popupContent = `
        <div class="p-1 font-sans text-slate-800 dark:text-slate-100" style="min-width: 240px;">
          <div class="flex items-center justify-between pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-700">
            <div class="flex items-center gap-1.5">
              <span class="font-black text-sm text-slate-900 dark:text-white">${stationCode}</span>
              ${rankBadge ? `<span class="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">Rank ${rankBadge}</span>` : ''}
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full font-bold text-white shadow-xs" style="background-color: ${color};">
              ${isCompliant ? 'MEMENUHI PP 22' : 'MELEBIHI PP 22'}
            </span>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Lokasi:</strong> ${stationCity}, ${stationProv}</p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Karakteristik:</strong> ${stationKarakteristik}</p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1"><strong>Rata-Rata PM2.5:</strong> <span class="font-extrabold text-slate-900 dark:text-white">${avgVal} µg/m³</span></p>
          <p class="text-xs text-slate-600 dark:text-slate-300 mb-1">
            <strong>Deviasi Batas 15 µg/m³:</strong> 
            <span class="${isCompliant ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-bold'}">
              ${isCompliant ? `-${diffVal} µg/m³ (di bawah ambang)` : `+${diffVal} µg/m³ (di atas ambang)`}
            </span>
          </p>
          <div class="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] font-medium flex items-center justify-between">
            <span class="text-slate-600 dark:text-slate-400">Baku Mutu Tahunan PP 22:</span>
            <span class="font-bold ${isCompliant ? 'text-emerald-600' : 'text-rose-600'}">
              ${isCompliant ? 'MEMENUHI (≤15 µg/m³)' : 'MELEBIHI (>15 µg/m³)'}
            </span>
          </div>
        </div>
      `;
    }

    const marker = L.circleMarker([s.lat, s.lon], {
      radius: radius,
      fillColor: color,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.85
    });

    marker.bindTooltip(tooltipHtml, {
      direction: 'top',
      offset: [0, -radius - 2],
      opacity: 0.96,
      className: 'prana-map-tooltip'
    });

    marker.bindPopup(popupContent);
    marker.addTo(mapInstance);
    mapMarkers.push(marker);
  });
}

// Global Filter Logic
function initFilters() {
  const dateStart = document.getElementById('filter-date-start');
  const dateEnd = document.getElementById('filter-date-end');
  const datePreset = document.getElementById('filter-date-preset');
  const regionSelect = document.getElementById('filter-region');
  const stationSelect = document.getElementById('filter-station');
  const typeSelect = document.getElementById('filter-type');
  const suspectToggle = document.getElementById('filter-suspect');
  const resetBtn = document.getElementById('filter-reset');

  if (datePreset) {
    datePreset.addEventListener('change', () => {
      const p = datePreset.value;
      if (p === 'all') {
        if (dateStart) dateStart.value = '2024-01-01';
        if (dateEnd) dateEnd.value = '2026-10-14';
      } else if (p === 'comparable') {
        if (dateStart) dateStart.value = '2026-01-01';
        if (dateEnd) dateEnd.value = '2026-10-14';
      } else if (p === '2024') {
        if (dateStart) dateStart.value = '2024-01-01';
        if (dateEnd) dateEnd.value = '2024-12-31';
      } else if (p === '2025') {
        if (dateStart) dateStart.value = '2025-01-01';
        if (dateEnd) dateEnd.value = '2025-12-31';
      } else if (p === '2026') {
        if (dateStart) dateStart.value = '2026-01-01';
        if (dateEnd) dateEnd.value = '2026-10-14';
      } else if (p === 'karhutla') {
        if (dateStart) dateStart.value = '2025-08-01';
        if (dateEnd) dateEnd.value = '2025-10-31';
      }
      applyFilters();
    });
  }

  function applyFilters() {
    const selectedRegion = regionSelect ? regionSelect.value : 'all';
    const selectedStation = stationSelect ? stationSelect.value : 'all';
    const selectedType = typeSelect ? typeSelect.value : 'all';

    const data = getTab1Data();
    const sourceStations = (data && data.map_stations) ? data.map_stations : STATIONS_DATA;

    let filtered = sourceStations.filter(s => {
      const region = s.region_group || s.region || '';
      const province = s.provinsi || s.province || '';
      const code = s.station_code || s.code || '';
      const type = (s.site_type || s.type || '').toLowerCase();

      const matchRegion = selectedRegion === 'all' || region.toLowerCase().includes(selectedRegion.toLowerCase()) || province.toLowerCase().includes(selectedRegion.toLowerCase());
      const matchStation = selectedStation === 'all' || code === selectedStation;
      const matchType = selectedType === 'all' || type.includes(selectedType.toLowerCase());

      return matchRegion && matchStation && matchType;
    });

    renderMapMarkers(filtered);
  }

  if (dateStart) dateStart.addEventListener('change', applyFilters);
  if (dateEnd) dateEnd.addEventListener('change', applyFilters);
  if (regionSelect) regionSelect.addEventListener('change', applyFilters);
  if (stationSelect) stationSelect.addEventListener('change', applyFilters);
  if (typeSelect) typeSelect.addEventListener('change', applyFilters);
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (dateStart) dateStart.value = '2024-01-01';
      if (dateEnd) dateEnd.value = '2026-10-14';
      if (datePreset) datePreset.value = 'all';
      if (regionSelect) regionSelect.value = 'all';
      if (stationSelect) stationSelect.value = 'all';
      if (typeSelect) typeSelect.value = 'all';
      if (suspectToggle) suspectToggle.checked = false;
      const data = getTab1Data();
      const sourceStations = (data && data.map_stations) ? data.map_stations : STATIONS_DATA;
      renderMapMarkers(sourceStations);
    });
  }
}


// Keep the selection summary available while the filter controls are collapsed.
function initFilterPanel() {
  const panel = document.getElementById('dashboard-filters');
  const summary = document.getElementById('filter-summary');
  if (!panel || !summary) return;

  panel.open = false;
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
  const selectedText = (id, fallback) => {
    const select = document.getElementById(id);
    return select.value === 'all' ? fallback : select.selectedOptions[0].textContent;
  };
  const formatDate = (id) => {
    const value = document.getElementById(id).value;
    return value ? dateFormatter.format(new Date(value + 'T00:00:00')) : 'Pilih tanggal';
  };
  const updateSummary = () => {
    const selections = [
      `${formatDate('filter-date-start')} – ${formatDate('filter-date-end')}`,
      selectedText('filter-region', 'Semua wilayah'),
      selectedText('filter-station', 'Semua stasiun')
    ];
    const type = document.getElementById('filter-type');
    if (type.value !== 'all') selections.push(type.selectedOptions[0].textContent);
    selections.push(panel.querySelector('.pollutant-btn.active').dataset.pollutant);
    if (document.getElementById('filter-suspect').checked) selections.push('Termasuk SUSPECT');
    summary.textContent = selections.join(' · ');
  };
  const selectPollutant = (selected) => {
    panel.querySelectorAll('.pollutant-btn').forEach(button => {
      const active = button === selected;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  };

  panel.addEventListener('change', updateSummary);
  panel.addEventListener('click', event => {
    const pollutant = event.target.closest('.pollutant-btn');
    if (pollutant) {
      selectPollutant(pollutant);
      updateSummary();
    }
    if (event.target.closest('#filter-reset')) {
      selectPollutant(panel.querySelector('[data-pollutant="PM2.5"]'));
      updateSummary();
    }
  });
  updateSummary();
}
