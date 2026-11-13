import { element, emptyState } from '../../shared/dom';
import { analysisDetails, choiceButton, choiceGroup, setSelected } from '../../shared/analysis-controls';
import { number, period } from '../../shared/format';
import { metric, panel } from '../../shared/panel';
import { REFERENCES } from '../../shared/pollutants';
import { createDiurnalChart, createEpisodesChart, createHeatmapChart, createTimeseriesChart } from './charts';
import { getDiurnalSeries, getLongestEpisodePerStation, getTopEpisodes } from './model';
import type { TemporalData } from './types';

export function mountTemporalView(host: HTMLElement, initial: TemporalData): {update:(data:TemporalData)=>void;destroy:()=>void} {
  let data=initial, compare=false, perStation=true;
  const controller=new AbortController(), root=element('div','temporal-dashboard analysis-dashboard');
  const summary=panel('Ringkasan Pola Waktu','','analysis-summary'), metrics=element('div','metrics-grid analysis-metrics'); summary.body.append(metrics);
  const empty=emptyState('Data belum mencukupi','Tidak ada pengukuran yang memenuhi syarat pada pilihan ini.');
  const profile=panel('Profil Polusi per Jam','Median dan rentang P25–P75 · jam 00–23 WIB');
  const normal=choiceButton('Profil per jam',true), comparison=choiceButton('Bandingkan');
  const profileHost=element('div');
  profile.body.append(choiceGroup('Tampilan profil per jam',[normal,comparison]),profileHost,analysisDetails(element('p','panel-footnote','Seluruh stasiun pilihan digabung per jam lokal. Perbandingan memisahkan Agu–Okt dan Nov–Jul dalam rentang tanggal pilihan. Minimum 10 jam-stasiun per sel; bulan yang tidak dipilih tetap kosong.')));
  const heatmap=panel('Polusi menurut Hari & Jam','Median seluruh stasiun pilihan · minimum 5 jam-stasiun per sel'), heatmapHost=element('div');
  heatmap.body.append(heatmapHost,analysisDetails(element('p','panel-footnote','Geser untuk melihat 24 jam; arahkan kursor atau ketuk sel untuk membaca konsentrasi. Warna menunjukkan rentang konsentrasi dalam pilihan, bukan kategori ISPU per jam.')));
  const trend=panel('Tren Harian Stasiun','Rata-rata 24 jam · minimum 18 jam berbeda per hari'), trendHost=element('div');
  trend.body.append(trendHost,analysisDetails(element('p','panel-footnote','Semua stasiun yang lolos filter global ditampilkan. Hari tidak mencukupi tetap kosong. Garis acuan memakai periode pengukuran yang tersedia; rata-rata 24 jam CO/O3 tidak dibandingkan dengan acuan 8 jam.')));
  const episodes=panel('Durasi Episode Pelampauan',''), episodeHost=element('div');
  const each=choiceButton('Per stasiun',true), all=choiceButton('Semua episode');
  episodes.body.append(choiceGroup('Tampilan episode',[each,all]),episodeHost,analysisDetails(element('p','panel-footnote','Bandingkan rata-rata 24 jam (PM2.5/PM10/SO2/NO2) atau maksimum rata-rata 8 jam (CO/O3) dengan acuan PP 22/2021. Hari berlebih beruntun digabung; satu hari terukur di bawah acuan boleh menjadi jeda. Hari hilang memutus episode. Durasi mencakup jeda; nilai puncak/rata-rata memakai hari pelampauan. Peringkat menampilkan maksimum 15 episode dalam rentang pilihan.'),'Metodologi episode'));
  root.append(summary.root,empty,profile.root,heatmap.root,trend.root,episodes.root);host.replaceChildren(root);
  const pollutant=()=>data.meta.pollutant;
  const profileChart=createDiurnalChart(profileHost,pollutant), matrix=createHeatmapChart(heatmapHost,pollutant), series=createTimeseriesChart(trendHost,pollutant), episodeChart=createEpisodesChart(episodeHost,pollutant);
  const renderProfile=():void=>{
    const points=(mode:'all'|'haze'|'nonhaze')=>getDiurnalSeries(data,'Pilihan',mode);
    if(compare)profileChart.updateOverlay(points('haze'),points('nonhaze'));else profileChart.updateSingle(points('all'),'Seluruh stasiun pilihan');
  };
  const renderEpisodes=():void=>episodeChart.update(perStation?getLongestEpisodePerStation(data).slice(0,15):getTopEpisodes(data));
  normal.addEventListener('click',()=>{compare=false;setSelected(normal,true);setSelected(comparison,false);renderProfile();},{signal:controller.signal});
  comparison.addEventListener('click',()=>{compare=true;setSelected(normal,false);setSelected(comparison,true);renderProfile();},{signal:controller.signal});
  each.addEventListener('click',()=>{perStation=true;setSelected(each,true);setSelected(all,false);renderEpisodes();},{signal:controller.signal});
  all.addEventListener('click',()=>{perStation=false;setSelected(each,false);setSelected(all,true);renderEpisodes();},{signal:controller.signal});
  const update=(next:TemporalData):void=>{
    data=next;const pol=pollutant(),reference=REFERENCES[pol],longest=data.episodes_summary.longest_episode,most=data.episodes_summary.most_episodes;
    const subtitle=summary.root.querySelector('.panel-header p');if(subtitle)subtitle.textContent=`${pol} · ${data.meta.date_range.start?period(data.meta.date_range.start,data.meta.date_range.end):'Tidak ada tanggal pilihan'}`;
    metrics.replaceChildren(metric('Episode Terpanjang',longest?number(longest.duration_days):'—','hari',longest?`${longest.station} · ${period(longest.start,longest.end)}`:'Tidak ada episode terukur'),metric('Episode Terbanyak',most?number(most.count):'—','episode',most?.station??'Tidak ada episode terukur'),metric('Acuan Harian',number(reference.daily),'µg/m³',reference.hours===8?'Maksimum rata-rata 8 jam':'Rata-rata 24 jam'),metric('Jeda Penggabungan','1','hari','Hanya hari terukur; data hilang memutus episode'));
    const available=Object.values(data.timeseries.stations).some(values=>values.some(value=>value!==null)) || Object.values(data.diurnal['Pilihan']??{}).some(value=>value!==null) || Object.values(data.heatmap['Pilihan']??{}).some(hours=>Object.values(hours).some(value=>value!==null));
    empty.hidden=available;
    for(const item of [profile.root,heatmap.root,trend.root,episodes.root])item.hidden=!available;
    const epSubtitle=episodes.root.querySelector('.panel-header p');if(epSubtitle)epSubtitle.textContent=`${pol} >${number(reference.daily)} µg/m³ · ${reference.hours} jam · periode pilihan`;
    renderProfile();
    const map=data.heatmap['Pilihan']??{};
    matrix.update(Array.from({length:7},(_,day)=>Array.from({length:24},(_,hour)=>map[String(day)]?.[String(hour)]??null)),'Seluruh stasiun pilihan');
    series.update(data.timeseries.dates,data.timeseries.stations,false);renderEpisodes();
    root.dataset['pollutant']=pol;
  };
  update(initial);
  return {update,destroy:()=>{controller.abort();profileChart.destroy();matrix.destroy();series.destroy();episodeChart.destroy();root.remove();}};
}
