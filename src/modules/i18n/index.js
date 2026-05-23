// @ts-check
import es from './es.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };
import { localStore } from '../storage/local-store.js';

const TABLES = { es, en };
const LANG_KEY = 'lang';

export function getLang() {
  return /** @type {'es'|'en'} */ (localStore.get(LANG_KEY, 'es'));
}

export function setLang(lang) {
  if (lang !== 'es' && lang !== 'en') return;
  localStore.set(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

export function t(key) {
  const lang = getLang();
  const table = TABLES[lang];
  if (table[key]) return table[key];
  if (TABLES.es[key]) {
    console.warn(`[i18n] missing key for ${lang}: ${key} (falling back to es)`);
    return TABLES.es[key];
  }
  console.warn(`[i18n] missing key in all tables: ${key}`);
  return key;
}

export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) el.textContent = t(key);
  });
}
