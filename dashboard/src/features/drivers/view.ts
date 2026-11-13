import { element, emptyState } from '../../shared/dom';
import { analysisDetails, choiceButton, choiceGroup, setSelected } from '../../shared/analysis-controls';
import { metric, panel } from '../../shared/panel';
import { number, period } from '../../shared/format';
import { createCorrelationHeatmap, createExtremeComparisonChart, createPollutionRose, createTrafficScatter, createWindBinsChart } from './charts';
import { getTrafficScatterPoints } from './model';
import type { CorrelationMode, DriversData } from './types';

export function mountDriversView(host:HTMLElement, initial:DriversData):{update:(data:DriversData)=>void;destroy:()=>void} {
  let data=initial, mode:CorrelationMode='all';
  const controller=new AbortController(),root=element('div','drivers-dashboard analysis-dashboard');
  const summary=panel('Ringkasan Faktor Pemicu','','analysis-summary'),metrics=element('div','metrics-grid analysis-metrics');summary.body.append(metrics);
  const empty=emptyState('Data belum mencukupi','Tidak ada jam pengukuran untuk cakupan pilihan.');
  const rosePanel=panel('Arah Angin & Polusi','Maksimum tiga contoh stasiun dalam filter · angin ≥0,5 m/s'),roseHost=element('div','rose-small-multiples');
  rosePanel.body.append(roseHost,analysisDetails(element('p','panel-footnote','Setiap sektor adalah rata-rata konsentrasi per arah datangnya angin, minimum 3 pasangan jam. Stasiun contoh mengikuti pilihan global; pilih satu stasiun untuk memeriksanya secara langsung.')));
  const corrPanel=panel('Korelasi Polutan & Cuaca','Spearman · polutan pilihan · tiga parameter cuaca');
  const all=choiceButton('Semua',true),haze=choiceButton('Agu–Okt'),other=choiceButton('Nov–Jul'),corrHost=element('div');
  corrPanel.body.append(choiceGroup('Musim pada korelasi',[all,haze,other]),corrHost,analysisDetails(element('p','panel-footnote','Pasangan rata-rata per jam dari seluruh stasiun pilihan digabung, minimum 30 pasangan per parameter. Korelasi gabungan dapat mencerminkan perbedaan antarstasiun; pilih satu stasiun untuk hubungan dalam lokasi. Bukan bukti sebab-akibat dan belum disesuaikan musim/cuaca lain.')));
  const windPanel=panel('Angin & Konsentrasi Polutan','Median menurut kelompok kecepatan angin dan tipe lokasi pilihan'),windHost=element('div');
  windPanel.body.append(windHost,analysisDetails(element('p','panel-footnote','Minimum 5 pasangan jam per kelompok. Seluruh tipe lokasi yang lolos filter global ditampilkan. Hari tidak lengkap boleh menyumbang pasangan per jam; grafik ini tidak memakai acuan harian.')));
  const trafficPanel=panel('Lalu Lintas & Konsentrasi','Polutan pilihan · intensitas lalu lintas dari master stasiun'),trafficHost=element('div');
  trafficPanel.body.append(trafficHost,analysisDetails(element('p','panel-footnote','Satu titik per stasiun: rata-rata konsentrasi per jam dalam periode/QC pilihan dan intensitas kendaraan/jam pada master. Intensitas adalah atribut lokasi, bukan deret pengamatan lalu lintas per hari.')));
  const extremePanel=panel('Kondisi saat Polusi Ekstrem','Jam di atas P95 pilihan dibanding jam lainnya'),extremeHost=element('div');
  extremePanel.body.append(extremeHost,analysisDetails(element('p','panel-footnote','P95 dihitung ulang dari seluruh jam-stasiun polutan pilihan. Bandingkan median cuaca pada pasangan jam yang tersedia, proporsi Agu–Okt, dan jumlah jam ekstrem. Cuaca hilang tidak menjadi nol. P95 adalah ambang deskriptif, bukan baku mutu.')));
  root.append(summary.root,empty,rosePanel.root,corrPanel.root,windPanel.root,trafficPanel.root,extremePanel.root);host.replaceChildren(root);
  const pollutant=()=>data.meta.pollutant;
  const correlation=createCorrelationHeatmap(corrHost),wind=createWindBinsChart(windHost,pollutant),traffic=createTrafficScatter(trafficHost),extreme=createExtremeComparisonChart(extremeHost);
  let roses:{code:string;chart:ReturnType<typeof createPollutionRose>}[]=[];
  const updateCorrelation=():void=>correlation.update(data.correlation['Pilihan']?.[mode]??{},'Seluruh stasiun pilihan',mode==='all'?'Periode pilihan':mode==='haze'?'Musim Karhutla':'Non-Karhutla');
  for(const [button,value] of [[all,'all'],[haze,'haze'],[other,'nonhaze']] satisfies [HTMLButtonElement,CorrelationMode][]) button.addEventListener('click',()=>{mode=value;setSelected(all,mode==='all');setSelected(haze,mode==='haze');setSelected(other,mode==='nonhaze');updateCorrelation();},{signal:controller.signal});
  const format=(value:number|null):string=>value===null?'—':number(value);
  const update=(next:DriversData):void=>{
    data=next;const stats=data.extreme_vs_normal,pol=pollutant(),codes=Object.keys(data.pollution_rose);
    const title=summary.root.querySelector('.panel-header p');if(title)title.textContent=`${pol} · ${data.meta.date_range.start?period(data.meta.date_range.start,data.meta.date_range.end):'Tidak ada tanggal pilihan'}`;
    metrics.replaceChildren(metric('Jam Ekstrem Karhutla',stats.extreme.haze_season_share===null?'—':`${number(stats.extreme.haze_season_share*100)}%`,'Agu–Okt','Dari jam di atas P95 dalam pilihan'),metric('Angin saat Ekstrem',format(stats.extreme.median_wind_speed),'m/s',`Jam lainnya: ${format(stats.normal.median_wind_speed)} m/s`),metric('Ambang Ekstrem P95',format(stats.threshold),'µg/m³',`Persentil 95 ${pol} pada cakupan pilihan`),metric('Stasiun Pilihan',number(codes.length),'stasiun AQMS','Mengikuti wilayah, tipe lokasi, dan stasiun'));
    const available=stats.threshold!==null;empty.hidden=available;
    for(const panel of [rosePanel.root,corrPanel.root,windPanel.root,trafficPanel.root,extremePanel.root])panel.hidden=!available;
    const selected=[...new Set([...['AQMS-KTG-01','AQMS-JKT-01','AQMS-KTB-01'].filter(code=>codes.includes(code)),...codes])].slice(0,3);
    if(selected.join()!==roses.map(item=>item.code).join()) {for(const item of roses)item.chart.destroy();roses=selected.map(code=>({code,chart:createPollutionRose(roseHost,code,pollutant)}));}
    for(const item of roses)item.chart.update(data.pollution_rose[item.code]??[]);
    updateCorrelation();wind.update(data.wind_bins,Object.keys(data.wind_bins));traffic.update(getTrafficScatterPoints(data),pol);extreme.update(stats);
    root.dataset['pollutant']=pol;
  };
  update(initial);
  return {update,destroy:()=>{controller.abort();for(const item of roses)item.chart.destroy();correlation.destroy();wind.destroy();traffic.destroy();extreme.destroy();root.remove();}};
}
