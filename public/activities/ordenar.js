import { el, embaralhar, anunciar } from '../dom.js';
import { t, tx } from '../i18n.js';

// Embaralha garantindo que a lista não comece já na ordem certa.
function ordemInicial(n) {
  let ordem;
  do ordem = embaralhar(n);
  while (ordem.every((v, i) => v === i));
  return ordem;
}

// `est.ordem[pos]` = índice do passo (na ordem correta do conteúdo) que está na posição `pos`.
function mover(a, est, de, para, mudar) {
  if (para < 0 || para >= est.ordem.length || de === para) return;
  const ordem = [...est.ordem];
  const [item] = ordem.splice(de, 1);
  ordem.splice(para, 0, item);
  anunciar(t('ordenar.posicao', { passo: tx(a.passos[item]), pos: para + 1 }));
  // Mantém o foco no botão da mesma direção; se ele ficou desativado (chegou na ponta), usa o outro.
  let botao = para < de ? 'subir' : 'descer';
  if (botao === 'subir' && para === 0) botao = 'descer';
  if (botao === 'descer' && para === ordem.length - 1) botao = 'subir';
  mudar({ ordem, movido: item }, `[data-item="${item}"] .${botao}`);
}

export default {
  preparar: (a) => ({ ordem: ordemInicial(a.passos.length), movido: null }),
  podeVerificar: () => true,
  verificar: (a, est) => est.ordem.every((v, i) => v === i),

  render(a, est, { mudar, verificada, passoId }) {
    const idEnunciado = `ordenar-${passoId}`;
    let arrastando = null;

    const itens = est.ordem.map((item, pos) => {
      const texto = tx(a.passos[item]);
      const noLugar = item === pos;
      const classes = ['passo', item === est.movido && !verificada && 'passo-movido',
        verificada && (noLugar ? 'passo-certo' : 'passo-errado')].filter(Boolean).join(' ');

      return el('li', {
        class: classes,
        'data-item': String(item),
        draggable: verificada ? 'false' : 'true',
        // Atalho: Alt + seta para cima/baixo move o passo focado.
        onkeydown: (e) => {
          if (verificada || !e.altKey || !['ArrowUp', 'ArrowDown'].includes(e.key)) return;
          e.preventDefault();
          mover(a, est, pos, pos + (e.key === 'ArrowUp' ? -1 : 1), mudar);
        },
        ondragstart: (e) => {
          arrastando = pos;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', texto);
          e.currentTarget.classList.add('passo-arrastando');
        },
        ondragend: (e) => {
          arrastando = null;
          e.currentTarget.classList.remove('passo-arrastando');
        },
        ondragover: (e) => {
          if (arrastando === null) return;
          e.preventDefault();
          e.currentTarget.classList.add('passo-alvo');
        },
        ondragleave: (e) => e.currentTarget.classList.remove('passo-alvo'),
        ondrop: (e) => {
          e.preventDefault();
          if (arrastando !== null) mover(a, est, arrastando, pos, mudar);
          arrastando = null;
        },
      },
      el('span', { class: 'passo-numero', 'aria-hidden': 'true' }, String(pos + 1)),
      el('span', { class: 'passo-texto' }, texto),
      verificada
        ? el('span', { class: `marca ${noLugar ? 'marca-certa' : 'marca-errada'}` },
          noLugar ? `✓ ${t('ordenar.no_lugar')}` : `✗ ${t('ordenar.posicao_certa', { pos: item + 1 })}`)
        : el('span', { class: 'passo-botoes' },
          el('button', {
            type: 'button', class: 'mover subir', disabled: pos === 0,
            'aria-label': `${t('ordenar.subir')}: ${texto}`, title: t('ordenar.subir'),
            onclick: () => mover(a, est, pos, pos - 1, mudar),
          }, '↑'),
          el('button', {
            type: 'button', class: 'mover descer', disabled: pos === est.ordem.length - 1,
            'aria-label': `${t('ordenar.descer')}: ${texto}`, title: t('ordenar.descer'),
            onclick: () => mover(a, est, pos, pos + 1, mudar),
          }, '↓'),
        ),
      );
    });

    return el('div', { class: 'ordenar' },
      el('p', { class: 'enunciado', id: idEnunciado }, tx(a.enunciado)),
      !verificada && el('p', { class: 'apoio dica' }, t('ordenar.dica')),
      el('ol', { class: 'passos', 'aria-labelledby': idEnunciado }, itens),
    );
  },
};
