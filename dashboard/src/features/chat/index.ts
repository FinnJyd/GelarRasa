import { button, element } from '../../shared/dom';
import { icon } from '../../shared/icons';
import { cancelLayoutFollow, followLayout } from '../../shared/layout-follow';
import type { ChatApplyActions } from './actions';
import { createChatView } from './view';

export function createChat(options: { applyActions?: ChatApplyActions | undefined } = {}): { destroy: () => void } {
  const launcher = button('', 'chat-launcher');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Buka percakapan asisten data');
  launcher.setAttribute('aria-expanded', 'false');
  launcher.append(icon('chat'));
  const teaser = button('Punya pertanyaan tentang data? Tanya Asisten AI.', 'chat-teaser');
  teaser.type = 'button';
  teaser.tabIndex = -1;
  teaser.setAttribute('aria-hidden', 'true');
  teaser.hidden = true;
  const drawer = element('aside', 'chat-drawer');
  drawer.setAttribute('aria-label', 'Percakapan asisten data');
  drawer.setAttribute('aria-hidden', 'true');
  const controls = { requestClose: () => undefined as void, applyActions: options.applyActions };
  const view = createChatView(drawer, controls);
  let hasOpened = false;
  let hideTimer = 0;
  let firstTimer = 0;
  let repeatTimer = 0;
  const hideTeaser = (): void => { window.clearTimeout(hideTimer); teaser.hidden = true; };
  const showTeaser = (): void => {
    if (hasOpened || drawer.classList.contains('is-open')) return;
    teaser.hidden = false;
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideTeaser, 6000);
  };
  controls.requestClose = () => setOpen(false);
  const setOpen = (open: boolean): void => {
    drawer.classList.toggle('is-open', open);
    drawer.setAttribute('aria-hidden', String(!open));
    launcher.setAttribute('aria-expanded', String(open));
    // Pause chart/map resizes while the margin animates in sync with the drawer, then resize once.
    followLayout(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320);
    document.body.classList.toggle('chat-open', open);
    if (open) {
      hasOpened = true;
      hideTeaser();
      window.clearInterval(repeatTimer);
      requestAnimationFrame(() => requestAnimationFrame(() => drawer.querySelector<HTMLTextAreaElement>('textarea')?.focus()));
    } else launcher.focus();
  };
  launcher.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')));
  teaser.addEventListener('click', () => { hideTeaser(); setOpen(true); });
  firstTimer = window.setTimeout(showTeaser, 8000);
  repeatTimer = window.setInterval(showTeaser, 60000);
  document.body.append(launcher, teaser, drawer);
  return {
    destroy: () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(firstTimer);
      window.clearInterval(repeatTimer);
      cancelLayoutFollow();
      view.destroy();
      drawer.remove();
      teaser.remove();
      launcher.remove();
      document.body.classList.remove('chat-open');
    },
  };
}