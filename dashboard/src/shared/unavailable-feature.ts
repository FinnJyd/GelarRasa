import { element } from './dom';
import { panel } from './panel';

export function mountUnavailable(host: HTMLElement, title: string, description: string): () => void {
  const content = panel(title, 'Analisis belum tersedia pada versi ini', 'unavailable-panel');
  const badge = element('span', 'badge badge-neutral', 'Belum tersedia');
  content.body.append(badge, element('p', '', description), element('p', 'muted', 'Buka Ikhtisar Nasional untuk menelusuri ringkasan stasiun yang sudah tersedia. Hasil tidak ditampilkan sebelum perhitungan dan sumber datanya diverifikasi.'));
  host.replaceChildren(content.root);
  return () => content.root.remove();
}
