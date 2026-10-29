// Utilitário mínimo para montar DOM sem innerHTML (o conteúdo vem de JSON).
export function el(tag, attrs = {}, ...filhos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k in n && typeof v === 'boolean') n[k] = v;
    else if (v !== false && v != null) n.setAttribute(k, v === true ? '' : v);
  }
  n.append(...filhos.flat().filter((f) => f != null && f !== false));
  return n;
}

// Índices 0..n-1 em ordem aleatória (Fisher-Yates).
export function embaralhar(n) {
  const ordem = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
  }
  return ordem;
}

// Fala um texto para leitores de tela pela região fixa #anuncio do index.html.
// Ela não é redesenhada junto com a tela, então o anúncio não se perde.
export function anunciar(texto) {
  const regiao = document.getElementById('anuncio');
  regiao.textContent = '';
  setTimeout(() => {
    regiao.textContent = texto;
  }, 50);
}

export async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}
