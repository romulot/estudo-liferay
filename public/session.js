import { el, getJson, anunciar } from './dom.js';
import { t, tx } from './i18n.js';
import quiz from './activities/quiz.js';
import ordenar from './activities/ordenar.js';

// Tipos de atividade que a tela sabe mostrar. Conteúdo de outros tipos fica fora da sessão.
const TIPOS = { quiz, ordenar };
const MAX_ATIVIDADES = 5;
const MIN_ATIVIDADES = 3;

// Dia local YYYY-MM-DD (não UTC): é ele que conta para a sequência.
function hoje() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Escolhe as próximas atividades não respondidas, na ordem dos módulos e lições.
// Se faltarem, completa com revisão (primeiro as que você errou por último).
async function montarPassos() {
  const [modulos, progresso] = await Promise.all([getJson('/api/modulos'), getJson('/api/progress')]);
  const ultimo = new Map();
  for (const e of progresso.eventos) if (e.tipo === 'atividade') ultimo.set(`${e.licaoId}/${e.atividadeId}`, e.acerto);

  const novas = [];
  const revisao = [];
  for (const m of modulos) {
    for (const ref of m.licoes) {
      if (novas.length >= MAX_ATIVIDADES && revisao.length >= MIN_ATIVIDADES) break;
      const licao = await getJson(`/api/licoes/${encodeURIComponent(ref.id)}`);
      for (const atividade of licao.atividades) {
        if (!TIPOS[atividade.tipo]) continue;
        const chave = `${licao.id}/${atividade.id}`;
        (ultimo.has(chave) ? revisao : novas).push({ licao, atividade, errouPorUltimo: ultimo.get(chave) === false });
      }
    }
  }
  revisao.sort((a, b) => b.errouPorUltimo - a.errouPorUltimo);
  const escolhidas = novas.slice(0, MAX_ATIVIDADES);
  while (escolhidas.length < MIN_ATIVIDADES && revisao.length) escolhidas.push(revisao.shift());

  // Antes da primeira atividade de uma lição nova, um passo de leitura com o resumo.
  const passos = [];
  for (const item of escolhidas) {
    const anterior = passos.at(-1);
    const licaoNova = !progresso.eventos.some((e) => e.licaoId === item.licao.id);
    if (licaoNova && anterior?.licao.id !== item.licao.id) passos.push({ tipo: 'leitura', licao: item.licao });
    const modulo = TIPOS[item.atividade.tipo];
    passos.push({ tipo: 'atividade', ...item, est: modulo.preparar(item.atividade), resultado: null, salvamento: null });
  }
  return passos;
}

// Estado da sessão em memória: sobrevive à troca de idioma e à ida à tela inicial.
let sessao = null;

async function salvar(evento, alvo, atualizar) {
  alvo.salvamento = 'salvando';
  atualizar('#acao');
  try {
    const res = await fetch('/api/progress', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(evento),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    alvo.salvamento = 'ok';
  } catch (err) {
    console.error(err);
    alvo.salvamento = 'erro';
  }
  atualizar('#acao');
}

function eventoDoPasso(p) {
  return { tipo: 'atividade', licaoId: p.licao.id, atividadeId: p.atividade.id, acerto: p.resultado, dia: p.dia };
}

function barraProgresso(atual, total) {
  const texto = t('sessao.passo', { atual, total });
  return el('div', { class: 'progresso-sessao' },
    el('span', { class: 'apoio' }, texto),
    el('progress', { max: String(total), value: String(atual), 'aria-label': texto }),
  );
}

// Aviso de erro ao salvar + botão de tentar de novo. A resposta continua guardada no estado.
function avisoErro(onRetry) {
  return el('div', { class: 'aviso-erro', role: 'alert' },
    el('p', {}, t('erro.rede')),
    el('button', { type: 'button', id: 'acao', class: 'botao-primario', onclick: onRetry }, t('erro.tentar_novamente')),
  );
}

function telaLeitura(p, avancar) {
  return [
    el('h2', { tabindex: '-1', class: 'titulo-passo' }, tx(p.licao.titulo)),
    el('p', {}, tx(p.licao.resumo)),
    el('p', {}, el('a', { href: p.licao.url, target: '_blank', rel: 'noopener' }, `${t('licao.leia_mais')} ↗`)),
    el('div', { class: 'acoes' }, el('button', { type: 'button', id: 'acao', class: 'botao-primario', onclick: avancar }, t('atividade.proximo'))),
  ];
}

function telaAtividade(p, idx, ultimo, avancar, atualizar) {
  const modulo = TIPOS[p.atividade.tipo];
  const verificada = p.resultado !== null;
  const mudar = (patch, foco) => {
    Object.assign(p.est, patch);
    atualizar(foco);
  };
  const verificar = () => {
    p.resultado = modulo.verificar(p.atividade, p.est);
    p.dia = hoje();
    anunciar(`${t(p.resultado ? 'feedback.certo' : 'feedback.errado')} ${tx(p.atividade.explicacao)}`);
    salvar(eventoDoPasso(p), p, atualizar);
  };

  let acao;
  if (!verificada) {
    acao = el('button', { type: 'button', id: 'acao', class: 'botao-primario', disabled: !modulo.podeVerificar(p.est), onclick: verificar }, t('atividade.verificar'));
  } else if (p.salvamento === 'erro') {
    acao = avisoErro(() => salvar(eventoDoPasso(p), p, atualizar));
  } else {
    acao = el('button', { type: 'button', id: 'acao', class: 'botao-primario', disabled: p.salvamento !== 'ok', onclick: avancar },
      p.salvamento === 'ok' ? t(ultimo ? 'sessao.concluir' : 'atividade.proximo') : t('atividade.salvando'));
  }

  return [
    el('p', { class: 'contexto apoio' }, tx(p.licao.titulo)),
    el('div', { class: 'titulo-passo', tabindex: '-1' }, modulo.render(p.atividade, p.est, { mudar, verificada, passoId: idx })),
    // O resultado é falado por anunciar() ao verificar; aqui fica só a versão visual.
    verificada && el('div', { class: `feedback ${p.resultado ? 'feedback-certo' : 'feedback-errado'}` },
      el('p', { class: 'feedback-titulo' }, p.resultado ? `✓ ${t('feedback.certo')}` : `✗ ${t('feedback.errado')}`),
      el('p', {}, tx(p.atividade.explicacao)),
    ),
    el('div', { class: 'acoes' }, acao),
  ];
}

function telaFim(atualizar) {
  const atividades = sessao.passos.filter((p) => p.tipo === 'atividade');
  const acertos = atividades.filter((p) => p.resultado).length;
  const fim = sessao.fim;
  return [
    el('h1', { tabindex: '-1' }, t('sessao.fim')),
    el('p', {}, t('sessao.resultado', { acertos, total: atividades.length })),
    fim.salvamento === 'erro' ? avisoErro(() => salvar({ tipo: 'sessao', dia: fim.dia }, fim, atualizar))
    : fim.salvamento !== 'ok' ? el('p', { class: 'apoio' }, t('atividade.salvando'))
    : el('div', { class: 'acoes' },
      el('a', { class: 'botao botao-primario', id: 'acao', href: '#/', onclick: () => { sessao = null; } }, t('sessao.voltar'))),
  ];
}

export async function telaSessao({ atualizar }) {
  sessao ??= { passos: await montarPassos(), indice: 0, fim: null };
  const { passos } = sessao;

  if (passos.length === 0) {
    sessao = null;
    return [el('h1', { tabindex: '-1' }, t('sessao.vazia')), el('p', {}, el('a', { href: '#/' }, t('sessao.voltar')))];
  }
  if (sessao.fim) return telaFim(atualizar);

  const avancar = () => {
    if (sessao.indice < passos.length - 1) {
      sessao.indice++;
      atualizar('.titulo-passo');
      return;
    }
    sessao.fim = { dia: hoje(), salvamento: null };
    salvar({ tipo: 'sessao', dia: sessao.fim.dia }, sessao.fim, () => atualizar('h1'));
  };

  const p = passos[sessao.indice];
  const ultimo = sessao.indice === passos.length - 1;
  return [
    el('h1', { class: 'visualmente-oculto', tabindex: '-1' }, t('sessao.titulo')),
    barraProgresso(sessao.indice + 1, passos.length),
    ...(p.tipo === 'leitura' ? telaLeitura(p, avancar) : telaAtividade(p, sessao.indice, ultimo, avancar, atualizar)),
  ];
}
