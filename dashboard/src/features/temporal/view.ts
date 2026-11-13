import { element, emptyState } from '../../shared/dom';
import { choiceButton, choiceGroup, setSelected } from '../../shared/analysis-controls';
import { number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { REFERENCES } from '../../shared/pollutants';
import { createDiurnalChart, createEpisodesChart, createHeatmapChart, createTimeseriesChart } from './charts';
import { episodeIndicators, getDiurnalSeries, getLongestEpisodePerStation, getTopEpisodes } from './model';
import type { TemporalData } from './types';

export function mountTemporalView(host: HTMLElement, initial: TemporalData): {update:(data:TemporalData)=>void;destroy:()=>void} {
  let data=initial, compare=false, perStation=true, trendMode: 'aggregate' | 'stations' = 'aggregate';
  const controller=new AbortController(), root=element('div','temporal-dashboard analysis-dashboard');
  const summary=panel('Ringkasan Pola Waktu','','analysis-summary'), metrics=element('div','metrics-grid analysis-metrics'); summary.body.append(metrics);
  const empty=emptyState('Data belum mencukupi','Tidak ada pengukuran yang memenuhi syarat pada pilihan ini.');

  const timePanel=panel('Profil Polusi & Tren Harian','Siklus diurnal per jam (00–23 WIB) dan deret waktu harian stasiun pilihan','temporal-combined-panel');
  const pair=element('div','temporal-pair');

  // Subpanel kiri: Profil Polusi per Jam
  const profileSub=element('div','temporal-subpanel');
  const profileHeader=element('div','temporal-subpanel-header');
  profileHeader.append(
    element('h4','temporal-subpanel-title','Profil Polusi per Jam'),
    element('p','temporal-subpanel-subtitle','Median dan rentang P25–P75 · jam 00–23 WIB')
  );
  const normal=choiceButton('Profil per jam',true), comparison=choiceButton('Bandingkan');
  const profileHost=element('div');
  const profileFootnote=element('p','panel-footnote','Seluruh stasiun pilihan digabung per jam lokal (min. 10 jam-stasiun/sel). Perbandingan memisahkan Agu–Okt dan Nov–Jul.');
  profileSub.append(profileHeader,choiceGroup('Tampilan profil per jam',[normal,comparison]),profileHost,profileFootnote);

  // Subpanel kanan: Tren Harian Stasiun
  const trendSub=element('div','temporal-subpanel');
  const trendHeader=element('div','temporal-subpanel-header');
  trendHeader.append(
    element('h4','temporal-subpanel-title','Tren Harian Stasiun'),
    element('p','temporal-subpanel-subtitle','Rata-rata 24 jam · minimum 18 jam berbeda per hari')
  );
  const aggregateTrend=choiceButton('Rata-rata gabungan',true), stationTrend=choiceButton('Per stasiun',false);
  const trendHost=element('div');
  const trendFootnote=element('p','panel-footnote');
  trendSub.append(trendHeader,choiceGroup('Tampilan tren harian',[aggregateTrend,stationTrend]),trendHost,trendFootnote);

  pair.append(profileSub,trendSub);
  timePanel.body.append(pair);

  const heatmap=panel('Polusi menurut Hari & Jam','Median seluruh stasiun pilihan · minimum 5 jam-stasiun per sel'), heatmapHost=element('div');
  heatmap.body.append(heatmapHost,element('p','panel-footnote','Geser untuk melihat 24 jam; arahkan kursor atau ketuk sel untuk membaca konsentrasi. Warna menunjukkan rentang konsentrasi dalam pilihan, bukan kategori ISPU per jam.'));
  const episodes=panel('Durasi Episode Pelampauan',''), episodeHost=element('div');
  const each=choiceButton('Per stasiun',true), all=choiceButton('Semua episode');
  episodes.body.append(choiceGroup('Tampilan episode',[each,all]),episodeHost,element('p','panel-footnote','Peringkat menampilkan maksimum 15 episode dalam rentang pilihan. Bandingkan rata-rata 24 jam (PM2.5/PM10/SO2/NO2) atau maksimum rata-rata 8 jam (CO/O3) dengan acuan PP 22/2021. Hari berlebih beruntun digabung; satu hari terukur di bawah acuan boleh menjadi jeda. Hari hilang memutus episode. Durasi mencakup jeda; nilai puncak/rata-rata memakai hari pelampauan.'));
  root.append(summary.root,empty,timePanel.root,heatmap.root,episodes.root);host.replaceChildren(root);
  const pollutant=()=>data.meta.pollutant;
  const profileChart=createDiurnalChart(profileHost,pollutant), matrix=createHeatmapChart(heatmapHost,pollutant), series=createTimeseriesChart(trendHost,pollutant), episodeChart=createEpisodesChart(episodeHost,pollutant);
  const renderProfile=():void=>{
    const points=(mode:'all'|'haze'|'nonhaze')=>getDiurnalSeries(data,'Pilihan',mode);
    if(compare)profileChart.updateOverlay(points('haze'),points('nonhaze'));else profileChart.updateSingle(points('all'),'Seluruh stasiun pilihan');
  };
  const renderEpisodes=():void=>episodeChart.update(perStation?getLongestEpisodePerStation(data).slice(0,15):getTopEpisodes(data));
  const renderTrend=():void=>{
    trendFootnote.textContent=trendMode==='aggregate'
      ?'Garis biru: median harian stasiun pilihan; area arsir: rentang P25–P75. Garis putus merah menandai acuan 24 jam PP 22/2021.'
      :'Semua stasiun dalam filter ditampilkan; hari tidak mencukupi tetap kosong. Garis putus menandai acuan regulasi PP 22/2021.';
    series.update(data.timeseries.dates,data.timeseries.stations,trendMode,false);
  };
  normal.addEventListener('click',()=>{compare=false;setSelected(normal,true);setSelected(comparison,false);renderProfile();},{signal:controller.signal});
  comparison.addEventListener('click',()=>{compare=true;setSelected(normal,false);setSelected(comparison,true);renderProfile();},{signal:controller.signal});
  aggregateTrend.addEventListener('click',()=>{trendMode='aggregate';setSelected(aggregateTrend,true);setSelected(stationTrend,false);renderTrend();},{signal:controller.signal});
  stationTrend.addEventListener('click',()=>{trendMode='stations';setSelected(aggregateTrend,false);setSelected(stationTrend,true);renderTrend();},{signal:controller.signal});
  each.addEventListener('click',()=>{perStation=true;setSelected(each,true);setSelected(all,false);renderEpisodes();},{signal:controller.signal});
  all.addEventListener('click',()=>{perStation=false;setSelected(each,false);setSelected(all,true);renderEpisodes();},{signal:controller.signal});
  const update=(next:TemporalData):void=>{
    data=next;const pol=pollutant(),reference=REFERENCES[pol],longest=data.episodes_summary.longest_episode,most=data.episodes_summary.most_episodes;
    const subtitle=summary.root.querySelector('.panel-header p');if(subtitle)subtitle.textContent=`${pol} · ${data.meta.date_range.start?period(data.meta.date_range.start,data.meta.date_range.end):'Tidak ada tanggal pilihan'}`;
    const indicators = episodeIndicators(data.episodes_summary);
    metrics.replaceChildren(metric('Episode Terpanjang',indicators.longestDays===null?'—':number(indicators.longestDays),'hari',longest?`${longest.station} · ${period(longest.start,longest.end)}`:indicators.emptyContext),metric('Episode Terbanyak',indicators.mostCount===null?'—':number(indicators.mostCount),'episode',most?.station??indicators.emptyContext),metric('Acuan Harian',number(reference.daily),'µg/m³',reference.hours===8?'Maksimum rata-rata 8 jam':'Rata-rata 24 jam'),metric('Jeda Penggabungan','1','hari','Hanya hari terukur; data hilang memutus episode'));
    const available=Object.values(data.timeseries.stations).some(values=>values.some(value=>value!==null)) || Object.values(data.diurnal['Pilihan']??{}).some(value=>value!==null) || Object.values(data.heatmap['Pilihan']??{}).some(hours=>Object.values(hours).some(value=>value!==null));
    empty.hidden=available;
    for(const item of [timePanel.root,heatmap.root,episodes.root])item.hidden=!available;
    const timeSubtitle=timePanel.root.querySelector('.panel-header p');if(timeSubtitle)timeSubtitle.textContent=`${pol} · siklus diurnal per jam (00–23 WIB) dan deret waktu harian stasiun pilihan`;
    const epSubtitle=episodes.root.querySelector('.panel-header p');if(epSubtitle)epSubtitle.textContent=`${pol} >${number(reference.daily)} µg/m³ · ${reference.hours} jam · periode pilihan`;
    renderProfile();
    const map=data.heatmap['Pilihan']??{};
    matrix.update(Array.from({length:7},(_,day)=>Array.from({length:24},(_,hour)=>map[String(day)]?.[String(hour)]??null)),'Seluruh stasiun pilihan');
    renderTrend();renderEpisodes();
    root.dataset['pollutant']=pol;
  };
  update(initial);
  return {update,destroy:()=>{controller.abort();profileChart.destroy();matrix.destroy();series.destroy();episodeChart.destroy();root.remove();}};
}
