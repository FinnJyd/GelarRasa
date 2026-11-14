import type { ChatMessage, Conversation } from './types';

const DB_NAME = 'prana-chat';
const STORE = 'conversations';
const ACTIVE_KEY = 'prana-chat-active';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB tidak tersedia.'));
  });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(database => new Promise<T>((resolve, reject) => {
    const tx = database.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Gagal mengakses penyimpanan percakapan.'));
    tx.oncomplete = () => database.close();
  }));
}

export function autoTitle(conversation: Conversation): string {
  const first = conversation.messages.find(message => message.role === 'user');
  if (!first) return 'Percakapan baru';
  return first.content.length > 48 ? `${first.content.slice(0, 48)}…` : first.content;
}

function validConversation(value: unknown): Conversation | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as { id?: unknown; title?: unknown; messages?: unknown; updatedAt?: unknown };
  if (typeof row.id !== 'string' || !row.id || !Array.isArray(row.messages)) return null;
  const messages = row.messages.filter((message): message is ChatMessage => Boolean(message)
    && typeof (message as ChatMessage).id === 'string'
    && ((message as ChatMessage).role === 'user' || (message as ChatMessage).role === 'assistant')
    && typeof (message as ChatMessage).content === 'string'
    && typeof (message as ChatMessage).createdAt === 'number');
  // Legacy records created before history existed have no title field.
  return { id: row.id, title: typeof row.title === 'string' ? row.title : '', messages, updatedAt: typeof row.updatedAt === 'number' ? row.updatedAt : 0 };
}

export async function listConversations(): Promise<Conversation[]> {
  const rows = await run<unknown[]>('readonly', store => store.getAll());
  const valid = rows.map(validConversation).filter((row): row is Conversation => row !== null);
  const legacy = valid.find(row => row.id === 'active');
  if (legacy) {
    const migrated: Conversation = { ...legacy, id: crypto.randomUUID(), title: legacy.title || autoTitle(legacy) };
    await run('readwrite', store => store.put(migrated));
    await run('readwrite', store => store.delete('active'));
    valid[valid.indexOf(legacy)] = migrated;
  }
  return valid.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function putConversation(conversation: Conversation): Promise<void> {
  await run('readwrite', store => store.put(conversation));
}

export async function deleteConversation(id: string): Promise<void> {
  await run('readwrite', store => store.delete(id));
}

export function loadActiveId(): string | null {
  try { return window.localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function saveActiveId(id: string): void {
  try { window.localStorage.setItem(ACTIVE_KEY, id); } catch { /* storage may be unavailable */ }
}