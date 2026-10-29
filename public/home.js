import { el, getJson } from './dom.js';
import { t, tn, tx } from './i18n.js';
import { heatmap } from './charts.js';

// Uma única ação principal, que muda conforme o estado do dia.
function chamada(r) {
  if (r.dias.length === 0) {
    return [
      el('p', {}, t('home.vazio')),
      el('p', {}, el('a', { class: 'botao botao-primario', href: '#/sessao' }, t('home.comecar'))),
    ];
  }
  if (r.estudouHoje) {
    return [
      el('p', { class: 'feito' }, `✓ ${t('home.sessao_feita')}`),
      el('p', {}, el('a', { class: 'botao', href: '#/sessao' }, t('home.revisar'))),
    ];
  }
  return [el('p', {}, el('a', { class: 'botao botao-primario', href: '#/sessao' }, t('home.continuar')))];
}

function sequencia({ atual, melhor }) {
  return el('p', { class: 'sequencia' },
    el('strong', {}, tn('home.sequencia', atual)),
    el('span', { class: 'apoio' }, tn('home.melhor', melhor)),
  );
}

function modulo(m) {
  const pct = m.total ? Math.round((m.concluidas / m.total) * 100) : 0;
  const detalhe = m.atividades
    ? t('home.modulo_acerto', { feitas: m.concluidas, total: m.total, pct: Math.round((m.acertos / m.atividades) * 100) })
    : t('home.modulo_licoes', { feitas: m.concluidas, total: m.total });
  return el('li', {},
    el('div', { class: 'modulo-linha' },
      el('h3', {}, tx(m.titulo)),
      el('span', { class: 'apoio' }, detalhe),
    ),
    el('progress', { max: '100', value: String(pct), 'aria-label': `${tx(m.titulo)}: ${pct}%` }),
  );
}

export async function telaInicio() {
  const r = await getJson('/api/resumo');
  return [
    el('h1', { tabindex: '-1' }, t('app.titulo')),
    r.dias.length > 0 && sequencia(r.streak),
    ...chamada(r),
    el('section', { 'aria-labelledby': 'titulo-dias' },
      el('h2', { id: 'titulo-dias' }, t('home.dias_estudados')),
      heatmap(r.dias, r.hoje),
    ),
    el('section', { 'aria-labelledby': 'titulo-modulos' },
      el('h2', { id: 'titulo-modulos' }, t('home.modulos')),
      el('ul', { class: 'modulos' }, r.modulos.map(modulo)),
    ),
  ];
}
