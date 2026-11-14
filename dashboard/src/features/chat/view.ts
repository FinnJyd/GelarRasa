import { button, element, image } from '../../shared/dom';
import { date } from '../../shared/format';
import { icon } from '../../shared/icons';
import { beginLayoutFollow, endLayoutFollow } from '../../shared/layout-follow';
import { sendChat } from './client';
import { autoTitle, deleteConversation, listConversations, loadActiveId, putConversation, saveActiveId } from './store';
import type { ChatMessage, Conversation } from './types';

const MAX_OUTBOUND = 16;

export function createChatView(drawer: HTMLElement, controls: { requestClose: () => void }): { destroy: () => void } {
  const controller = new AbortController();
  const newConversation = (): Conversation => ({ id: crypto.randomUUID(), title: '', messages: [], updatedAt: Date.now() });
  let conversations: Conversation[] = [];
  let current: Conversation = newConversation();
  let mode: 'chat' | 'history' = 'chat';
  let storageOk = true;
  let busy = false;
  let statusText = '';
  let editingId: string | null = null;
  let draft = '';
  let renameId: string | null = null;
  let renameDraft = '';
  let deleteId: string | null = null;
  let repaintFrame = 0;

  const header = element('header', 'chat-drawer-header');
  const heading = element('div', 'chat-drawer-heading');
  const title = element('h2', '', 'Asisten Data');
  const subtitle = element('p', '', 'Menjawab hanya dari data dashboard PRANA.');
  heading.append(title, subtitle);
  const headerActions = element('div', 'chat-header-actions');
  const fullscreen = button('', 'chat-icon-button chat-fullscreen');
  fullscreen.type = 'button';
  fullscreen.title = 'Layar penuh';
  fullscreen.setAttribute('aria-label', 'Layar penuh');
  fullscreen.setAttribute('aria-pressed', 'false');
  fullscreen.append(icon('expand'));
  const historyToggle = button('', 'chat-icon-button chat-history-toggle');
  historyToggle.type = 'button';
  historyToggle.title = 'Riwayat percakapan';
  historyToggle.setAttribute('aria-label', 'Riwayat percakapan');
  historyToggle.setAttribute('aria-pressed', 'false');
  historyToggle.append(icon('clock'));
  const newChat = button('', 'chat-icon-button chat-new');
  newChat.type = 'button';
  newChat.title = 'Percakapan baru';
  newChat.setAttribute('aria-label', 'Percakapan baru');
  newChat.append(icon('plus'));
  const close = button('', 'chat-icon-button chat-close');
  close.type = 'button';
  close.setAttribute('aria-label', 'Tutup percakapan');
  close.append(icon('close'));
  headerActions.append(historyToggle, newChat, fullscreen, close);
  header.append(heading, headerActions);

  const historyList = element('ul', 'chat-history');
  historyList.hidden = true;

  const list = element('div', 'chat-messages');
  list.setAttribute('role', 'log');
  list.setAttribute('aria-live', 'polite');
  list.tabIndex = 0;
  const empty = element('p', 'chat-empty', 'Tanyakan angka, stasiun, periode, fungsi visualisasi, atau aturan analisis dari dashboard. Jawaban dibuat dari data ekspor, bukan tebakan.');
  // Prana emblem stands in as the assistant's "thinking" avatar while a reply is pending.
  const typing = element('p', 'chat-typing');
  typing.append(image('../assets/Prana Emblem.png', '', 'chat-typing-emblem'), element('span', '', 'Asisten mengetik…'));
  typing.hidden = true;
  list.append(empty, typing);

  const status = element('p', 'chat-status');
  status.hidden = true;
  status.setAttribute('role', 'status');

  const form = element('form', 'chat-composer');
  const field = element('div', 'chat-composer-field');
  const label = element('label', 'sr-only', 'Pesan untuk asisten');
  const textarea = element('textarea', 'chat-input');
  textarea.rows = 2;
  textarea.placeholder = 'Tulis pertanyaan tentang data…';
  label.htmlFor = 'chat-input';
  textarea.id = 'chat-input';
  field.append(label, textarea);
  const send = button('Kirim', 'button button-primary chat-send');
  send.type = 'submit';
  const hint = element('p', 'chat-hint', 'Enter mengirim · Shift+Enter baris baru · pensil pada pesan mengedit di tempat.');
  form.append(field, send, hint);

  const WIDTH_KEY = 'prana-chat-width';
  const setWidth = (width: number): void => {
    const max = Math.max(320, Math.min(900, window.innerWidth - 360));
    const clamped = Math.min(max, Math.max(320, Math.round(width)));
    document.body.style.setProperty('--chat-width', `${clamped}px`);
    try { window.localStorage.setItem(WIDTH_KEY, String(clamped)); } catch { /* storage may be unavailable */ }
  };
  const applyStoredWidth = (): void => {
    try {
      const stored = Number(window.localStorage.getItem(WIDTH_KEY));
      if (Number.isFinite(stored) && stored >= 320) setWidth(stored);
    } catch { /* storage may be unavailable */ }
  };
  applyStoredWidth();

  const resizer = element('div', 'chat-resize');
  resizer.setAttribute('role', 'separator');
  resizer.setAttribute('aria-orientation', 'vertical');
  resizer.setAttribute('aria-label', 'Ubah lebar percakapan');
  resizer.tabIndex = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartWidth = 0;
  let resizeEndTimer = 0;
  const endDrag = (): void => {
    if (!dragging) return;
    dragging = false;
    document.body.classList.remove('chat-resizing');
    window.clearTimeout(resizeEndTimer);
    // Let charts/maps resize once after the drag settles (they were frozen while following).
    resizeEndTimer = window.setTimeout(endLayoutFollow, 320);
  };
  resizer.addEventListener('pointerdown', event => {
    if (drawer.classList.contains('is-fullscreen') || busy) return;
    event.preventDefault();
    resizer.setPointerCapture(event.pointerId);
    dragging = true;
    dragStartX = event.clientX;
    dragStartWidth = drawer.getBoundingClientRect().width;
    document.body.classList.add('chat-resizing');
    window.clearTimeout(resizeEndTimer);
    beginLayoutFollow();
  });
  resizer.addEventListener('pointermove', event => {
    if (!dragging) return;
    setWidth(dragStartWidth + (dragStartX - event.clientX));
  });
  resizer.addEventListener('pointerup', endDrag);
  resizer.addEventListener('pointercancel', endDrag);
  resizer.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const step = event.shiftKey ? 48 : 16;
    const current = drawer.getBoundingClientRect().width;
    followSizedDrag(step * (event.key === 'ArrowLeft' ? 1 : -1), current);
  });
  const followSizedDrag = (delta: number, current: number): void => {
    window.clearTimeout(resizeEndTimer);
    beginLayoutFollow();
    setWidth(current + delta);
    document.body.classList.add('chat-resizing');
    resizeEndTimer = window.setTimeout(() => {
      document.body.classList.remove('chat-resizing');
      endLayoutFollow();
    }, 320);
  };

  drawer.append(resizer, header, historyList, list, status, form);

  const persist = (): Promise<void> => {
    current.updatedAt = Date.now();
    if (current.messages.length && !current.title) current.title = autoTitle(current);
    const index = conversations.findIndex(row => row.id === current.id);
    if (index >= 0) conversations[index] = current;
    else if (current.messages.length) conversations.unshift(current);
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    saveActiveId(current.id);
    if (!storageOk) return Promise.resolve();
    return putConversation(current).catch(() => {
      storageOk = false;
      statusText = 'Percakapan tidak dapat disimpan di peramban ini; riwayat hanya bertahan selama halaman terbuka.';
      render();
    });
  };
  const setStatus = (text: string): void => { statusText = text; };

  function renderHeader(): void {
    const history = mode === 'history';
    title.textContent = history ? 'Riwayat percakapan' : (current.title || 'Asisten Data');
    subtitle.textContent = history
      ? 'Tersimpan di peramban ini. Buka, ganti nama, atau hapus percakapan.'
      : 'Menjawab hanya dari data dashboard PRANA.';
    historyToggle.setAttribute('aria-pressed', String(history));
  }

  function syncView(): void {
    const history = mode === 'history';
    historyList.hidden = !history;
    list.hidden = history;
    form.hidden = history;
    status.hidden = history || !statusText;
    if (!history) status.textContent = statusText;
  }

  function renderHistory(): void {
    historyList.replaceChildren();
    const saved = conversations.filter(row => row.messages.length > 0);
    if (!saved.length) {
      historyList.append(element('li', 'chat-history-empty', 'Belum ada percakapan. Mulai percakapan baru untuk menyimpan riwayat.'));
      return;
    }
    for (const conversation of saved) {
      const item = element('li', 'chat-history-row');
      item.dataset['id'] = conversation.id;
      if (renameId === conversation.id) {
        const input = element('input', 'chat-history-input');
        input.type = 'text';
        input.value = renameDraft;
        input.setAttribute('aria-label', 'Nama percakapan baru');
        input.addEventListener('input', () => { renameDraft = input.value; });
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') { event.preventDefault(); confirmRename(conversation.id); }
          if (event.key === 'Escape') { event.stopPropagation(); cancelRename(); }
        });
        const confirm = button('', 'chat-icon-button chat-history-confirm');
        confirm.type = 'button';
        confirm.setAttribute('aria-label', 'Simpan nama percakapan');
        confirm.append(icon('check'));
        confirm.addEventListener('click', () => confirmRename(conversation.id));
        const cancel = button('', 'chat-icon-button chat-history-cancel');
        cancel.type = 'button';
        cancel.setAttribute('aria-label', 'Batalkan penggantian nama');
        cancel.append(icon('close'));
        cancel.addEventListener('click', () => cancelRename());
        item.append(input, confirm, cancel);
        historyList.append(item);
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
        continue;
      }
      if (deleteId === conversation.id) {
        const question = element('span', 'chat-history-question', 'Hapus percakapan ini?');
        const confirm = button('', 'chat-icon-button chat-history-confirm');
        confirm.type = 'button';
        confirm.setAttribute('aria-label', 'Konfirmasi hapus percakapan');
        confirm.append(icon('check'));
        confirm.addEventListener('click', () => confirmDelete(conversation.id));
        const cancel = button('', 'chat-icon-button chat-history-cancel');
        cancel.type = 'button';
        cancel.setAttribute('aria-label', 'Batalkan hapus');
        cancel.append(icon('close'));
        cancel.addEventListener('click', () => { deleteId = null; renderHistory(); });
        item.append(question, confirm, cancel);
        historyList.append(item);
        continue;
      }
      const open = button('', 'chat-history-open');
      open.type = 'button';
      if (conversation.id === current.id) open.setAttribute('aria-current', 'true');
      open.append(element('strong', '', conversation.title || autoTitle(conversation)),
        element('span', '', `${date(new Date(conversation.updatedAt).toISOString().slice(0, 10))} · ${conversation.messages.length} pesan`));
      open.addEventListener('click', () => openConversation(conversation.id));
      const actions = element('span', 'chat-history-actions');
      const rename = button('', 'chat-icon-button chat-history-rename');
      rename.type = 'button';
      rename.title = 'Ganti nama';
      rename.setAttribute('aria-label', `Ganti nama ${conversation.title || 'percakapan'}`);
      rename.append(icon('pen'));
      rename.addEventListener('click', () => { renameId = conversation.id; renameDraft = conversation.title || autoTitle(conversation); deleteId = null; renderHistory(); });
      const remove = button('', 'chat-icon-button chat-history-delete');
      remove.type = 'button';
      remove.title = 'Hapus';
      remove.setAttribute('aria-label', `Hapus ${conversation.title || 'percakapan'}`);
      remove.append(icon('trash'));
      remove.addEventListener('click', () => { deleteId = conversation.id; renameId = null; renderHistory(); });
      actions.append(rename, remove);
      item.append(open, actions);
      historyList.append(item);
    }
  }

  function confirmRename(id: string): void {
    const conversation = conversations.find(row => row.id === id);
    if (conversation) {
      const title = renameDraft.trim();
      conversation.title = title || autoTitle(conversation);
      conversation.updatedAt = Date.now();
      if (conversation.id === current.id) current.title = conversation.title;
      void putConversation(conversation).catch(() => { storageOk = false; });
    }
    renameId = null;
    renameDraft = '';
    render();
  }

  function cancelRename(): void {
    renameId = null;
    renameDraft = '';
    renderHistory();
  }

  async function confirmDelete(id: string): Promise<void> {
    deleteId = null;
    conversations = conversations.filter(row => row.id !== id);
    if (current.id === id) {
      current = conversations.find(row => row.messages.length > 0) ?? newConversation();
      saveActiveId(current.id);
    }
    if (storageOk) await deleteConversation(id).catch(() => { storageOk = false; });
    render();
  }

  function openConversation(id: string): void {
    const conversation = conversations.find(row => row.id === id);
    if (!conversation) return;
    current = conversation;
    saveActiveId(current.id);
    mode = 'chat';
    editingId = null;
    draft = '';
    setStatus('');
    render();
    textarea.focus();
  }

  const outbound = (): { role: 'user' | 'assistant'; content: string }[] =>
    // Drop the empty streaming placeholder (and any blank message) — the API rejects empty content.
    current.messages.filter(message => message.content.trim().length > 0)
      .slice(-MAX_OUTBOUND)
      .map(message => ({ role: message.role, content: message.content }));

  function render(): void {
    renderHeader();
    if (mode === 'history') { renderHistory(); syncView(); return; }
    empty.hidden = current.messages.length > 0;
    const streaming = busy && current.messages.at(-1)?.role === 'assistant' && current.messages.at(-1)?.content !== '';
    typing.hidden = !busy || streaming;
    send.disabled = busy || editingId !== null;
    status.hidden = !statusText;
    status.textContent = statusText;
    for (const node of [...list.querySelectorAll('.chat-message, .chat-bubble-error')]) node.remove();
    current.messages.forEach(message => {
      const item = element('article', `chat-message ${message.role}`);
      if (message.role === 'user' && message.id === editingId) {
        item.classList.add('editing');
        const editor = element('textarea', 'chat-inline-input');
        editor.rows = 2;
        editor.value = draft;
        editor.setAttribute('aria-label', 'Ubah pesan lalu simpan atau lanjutkan');
        editor.addEventListener('input', () => { draft = editor.value; });
        editor.addEventListener('keydown', event => {
          if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); confirmEdit(true); }
          if (event.key === 'Escape') { event.stopPropagation(); cancelEdit(); }
        });
        const actions = element('div', 'chat-edit-actions');
        const save = button('', 'chat-icon-button chat-edit-save');
        save.type = 'button';
        save.title = 'Simpan perubahan';
        save.setAttribute('aria-label', 'Simpan perubahan tanpa mengirim');
        save.append(icon('check'));
        save.addEventListener('click', () => confirmEdit(false));
        const resume = button('', 'chat-icon-button chat-edit-resume');
        resume.type = 'button';
        resume.title = 'Lanjutkan dari titik ini';
        resume.setAttribute('aria-label', 'Simpan lalu lanjutkan percakapan dari pesan ini');
        resume.append(icon('resume'));
        resume.addEventListener('click', () => confirmEdit(true));
        const cancel = button('', 'chat-icon-button chat-edit-cancel');
        cancel.type = 'button';
        cancel.title = 'Batal';
        cancel.setAttribute('aria-label', 'Batalkan ubahan');
        cancel.append(icon('close'));
        cancel.addEventListener('click', () => cancelEdit());
        actions.append(save, resume, cancel);
        item.append(editor, actions);
      } else {
        const bubble = element('div', 'chat-bubble');
        // Model replies use **bold** markers; render them as elements without touching innerHTML.
        message.content.split(/\*\*(.+?)\*\*/g).forEach((part, index) => {
          if (!part) return;
          if (index % 2 === 1) bubble.append(element('strong', '', part));
          else bubble.append(document.createTextNode(part));
        });
        item.append(bubble);
        if (message.role === 'user') {
          const edit = button('', 'chat-edit');
          edit.type = 'button';
          edit.title = 'Ubah pesan';
          edit.setAttribute('aria-label', 'Ubah dan kirim ulang pesan ini');
          edit.dataset['messageId'] = message.id;
          edit.disabled = busy;
          edit.append(icon('pen'));
          item.append(edit);
        }
      }
      list.insertBefore(item, typing);
    });
    if (editingId) {
      const editor = list.querySelector<HTMLTextAreaElement>('.chat-inline-input');
      editor?.focus();
      editor?.setSelectionRange(editor.value.length, editor.value.length);
    }
    list.scrollTop = list.scrollHeight;
    syncView();
  }

  const scheduleRender = (): void => {
    if (repaintFrame) return;
    repaintFrame = requestAnimationFrame(() => { repaintFrame = 0; render(); });
  };

  function cancelEdit(): void {
    editingId = null;
    draft = '';
    render();
  }

  async function confirmEdit(resume: boolean): Promise<void> {
    if (!editingId || busy) return;
    const content = draft.trim();
    if (!content) { cancelEdit(); return; }
    const index = current.messages.findIndex(message => message.id === editingId);
    if (index < 0) { cancelEdit(); return; }
    const id = editingId;
    current.messages = [...current.messages.slice(0, index), { id, role: 'user', content, createdAt: Date.now() }];
    editingId = null;
    draft = '';
    await persist();
    render();
    if (resume) await request();
  }

  async function request(): Promise<void> {
    if (busy || !current.messages.length) return;
    busy = true;
    setStatus('');
    render();
    const reply: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: '', createdAt: Date.now() };
    current.messages.push(reply);
    scheduleRender();
    try {
      const full = await sendChat(outbound(), controller.signal, delta => {
        reply.content += delta;
        scheduleRender();
      });
      if (!reply.content) reply.content = full;
      await persist();
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (!reply.content) current.messages = current.messages.filter(message => message.id !== reply.id);
      setStatus(error instanceof Error && error.message ? error.message : 'Permintaan chat gagal.');
    } finally {
      busy = false;
      if (repaintFrame) { cancelAnimationFrame(repaintFrame); repaintFrame = 0; }
      render();
    }
  }

  async function submit(): Promise<void> {
    const content = textarea.value.trim();
    if (!content || busy || editingId) return;
    current.messages.push({ id: crypto.randomUUID(), role: 'user', content, createdAt: Date.now() });
    textarea.value = '';
    await persist();
    render();
    await request();
  }

  form.addEventListener('submit', event => { event.preventDefault(); void submit(); }, { signal: controller.signal });
  textarea.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void submit(); }
  }, { signal: controller.signal });
  list.addEventListener('click', event => {
    if (!(event.target instanceof Element)) return;
    const edit = event.target.closest<HTMLButtonElement>('.chat-edit');
    const id = edit?.dataset['messageId'];
    const message = id ? current.messages.find(item => item.id === id) : undefined;
    if (!edit || !message || busy) return;
    editingId = message.id;
    draft = message.content;
    render();
  }, { signal: controller.signal });
  historyToggle.addEventListener('click', () => {
    mode = mode === 'history' ? 'chat' : 'history';
    renameId = null;
    deleteId = null;
    render();
  }, { signal: controller.signal });
  newChat.addEventListener('click', () => {
    if (busy) return;
    void persist();
    current = newConversation();
    mode = 'chat';
    editingId = null;
    draft = '';
    renameId = null;
    deleteId = null;
    setStatus('');
    render();
    textarea.focus();
  }, { signal: controller.signal });
  const setFullscreen = (on: boolean): void => {
    drawer.classList.toggle('is-fullscreen', on);
    fullscreen.setAttribute('aria-pressed', String(on));
    fullscreen.setAttribute('aria-label', on ? 'Keluar layar penuh' : 'Layar penuh');
    fullscreen.title = on ? 'Keluar layar penuh' : 'Layar penuh';
    fullscreen.replaceChildren(icon(on ? 'compress' : 'expand'));
  };
  fullscreen.addEventListener('click', () => setFullscreen(!drawer.classList.contains('is-fullscreen')), { signal: controller.signal });
  close.addEventListener('click', () => controls.requestClose(), { signal: controller.signal });
  drawer.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    // Escape first leaves fullscreen, only then closes the drawer.
    if (drawer.classList.contains('is-fullscreen')) { setFullscreen(false); return; }
    controls.requestClose();
  }, { signal: controller.signal });

  void (async () => {
    try {
      const [rows, active] = await Promise.all([listConversations(), Promise.resolve(loadActiveId())]);
      conversations = rows;
      const found = active ? rows.find(row => row.id === active) : undefined;
      current = found ?? rows.find(row => row.messages.length > 0) ?? newConversation();
      saveActiveId(current.id);
    } catch {
      storageOk = false;
      setStatus('Percakapan tidak dapat disimpan di peramban ini; riwayat hanya bertahan selama halaman terbuka.');
    }
    render();
  })();

  render();
  return {
    destroy: () => {
      controller.abort();
      if (repaintFrame) cancelAnimationFrame(repaintFrame);
      window.clearTimeout(resizeEndTimer);
      drawer.replaceChildren();
    },
  };
}