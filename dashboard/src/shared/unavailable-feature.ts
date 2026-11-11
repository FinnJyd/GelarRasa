import { element } from './dom';
import { panel } from './panel';

export function mountUnavailable(host: HTMLElement, title: string, description: string, plan: string, moduleTitle: string): () => void {
  const content = panel(title, description, 'unavailable-panel');
  const badge = element('span', 'badge badge-neutral', 'Belum tersedia');
  content.body.append(badge, element('h4', '', moduleTitle), element('p', '', plan), element('p', 'muted', 'Rencana analisis; hasil belum tersedia. Buka Ikhtisar Nasional untuk menelusuri ringkasan stasiun. Perhitungan dan sumber data harus diverifikasi sebelum hasil ditampilkan.'));
  host.replaceChildren(content.root);
  return () => content.root.remove();
}
