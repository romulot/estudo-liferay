import { el } from './dom.js';
import { t, tn, idiomaAtual } from './i18n.js';

const SEMANAS = 12;
const CELULA = 14;
const ESPACO = 3;
const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs = {}, ...filhos) {
  const n = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  n.append(...filhos);
  return n;
}

const chaveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// 0 = nada, 1 = 1-2 atividades, 2 = 3-4, 3 = 5 ou mais.
const nivel = (n) => (n === 0 ? 0 : n <= 2 ? 1 : n <= 4 ? 2 : 3);

// Mapa de calor das últimas semanas: colunas = semanas, linhas = dias (domingo em cima).
// `dias`: [{ dia: 'YYYY-MM-DD', atividades }]; `hoje`: 'YYYY-MM-DD' (dia local do servidor).
export function heatmap(dias, hoje) {
  const porDia = new Map(dias.map((d) => [d.dia, d.atividades]));
  const [a, m, d] = hoje.split('-').map(Number);
  const fim = new Date(a, m - 1, d);
  const inicio = new Date(a, m - 1, d - fim.getDay() - (SEMANAS - 1) * 7);
  const formato = new Intl.DateTimeFormat(idiomaAtual(), { weekday: 'short', day: 'numeric', month: 'short' });

  const celulas = [];
  const estudados = [];
  for (let i = 0, dia = new Date(inicio); dia <= fim; i++, dia.setDate(dia.getDate() + 1)) {
    const chave = chaveDia(dia);
    const n = porDia.get(chave) ?? 0;
    const data = formato.format(dia);
    const rotulo = n ? tn('home.dia_atividades', n, { data }) : t('home.dia_sem', { data });
    if (n) estudados.push(rotulo);
    celulas.push(svg('rect', {
      x: Math.floor(i / 7) * (CELULA + ESPACO),
      y: (i % 7) * (CELULA + ESPACO),
      width: CELULA,
      height: CELULA,
      rx: 3,
      class: `celula nivel-${nivel(n)}${chave === hoje ? ' celula-hoje' : ''}`,
    }, svg('title', {}, rotulo)));
  }

  const largura = SEMANAS * (CELULA + ESPACO) - ESPACO;
  const altura = 7 * (CELULA + ESPACO) - ESPACO;
  const legenda = el('div', { class: 'legenda', 'aria-hidden': 'true' },
    el('span', {}, t('home.menos')),
    [0, 1, 2, 3].map((nv) => el('span', { class: `amostra nivel-${nv}` })),
    el('span', {}, t('home.mais')),
  );

  return el('figure', { class: 'heatmap' },
    // O desenho é decorativo para leitores de tela: a lista oculta abaixo traz os mesmos dados em texto.
    svg('svg', { viewBox: `0 0 ${largura} ${altura}`, width: largura, height: altura, 'aria-hidden': 'true', focusable: 'false' }, ...celulas),
    el('figcaption', {},
      el('span', { class: 'apoio' }, tn('home.heatmap_resumo', estudados.length, { semanas: SEMANAS })),
      legenda,
    ),
    el('ul', { class: 'visualmente-oculto' }, estudados.map((r) => el('li', {}, r))),
  );
}
