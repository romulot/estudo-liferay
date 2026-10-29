const LANGS = ['pt-BR', 'en'];
const CHAVE_STORAGE = 'estudo-liferay:idioma';

let lang = 'pt-BR';
let dicionario = {};
const ouvintes = new Set();

function salvo() {
  try {
    return localStorage.getItem(CHAVE_STORAGE);
  } catch {
    return null;
  }
}

export function idiomaInicial() {
  const s = salvo();
  if (LANGS.includes(s)) return s;
  return navigator.language?.toLowerCase().startsWith('pt') ? 'pt-BR' : 'en';
}

export async function definirIdioma(novo) {
  if (!LANGS.includes(novo)) return;
  const res = await fetch(`/api/i18n/${novo}`);
  if (!res.ok) throw new Error(`i18n ${novo}: HTTP ${res.status}`);
  dicionario = await res.json();
  lang = novo;
  document.documentElement.lang = novo;
  try {
    localStorage.setItem(CHAVE_STORAGE, novo);
  } catch {
    // Sem storage (aba privada etc.): o idioma vale só nesta visita.
  }
  for (const fn of ouvintes) fn(novo);
}

export const idiomaAtual = () => lang;
export const outroIdioma = () => LANGS.find((l) => l !== lang);
export const aoTrocarIdioma = (fn) => ouvintes.add(fn);

// Texto da interface: t('sessao.passo', { atual: 1, total: 4 }).
export function t(chave, vars = {}) {
  const base = dicionario[chave] ?? chave;
  return base.replace(/\{(\w+)\}/g, (_, nome) => String(vars[nome] ?? `{${nome}}`));
}

// Texto com plural simples: usa as chaves `<base>_um` (n = 1) e `<base>_outros`.
export function tn(base, n, vars = {}) {
  return t(`${base}_${n === 1 ? 'um' : 'outros'}`, { n, ...vars });
}

// Texto do conteúdo das lições, que vem como { pt, en }.
export function tx(obj) {
  return obj?.[lang === 'pt-BR' ? 'pt' : 'en'] ?? '';
}
