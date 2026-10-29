import { el, embaralhar } from '../dom.js';
import { t, tx } from '../i18n.js';

// As opções são embaralhadas para a resposta certa não ficar sempre na mesma posição.
export default {
  preparar: (a) => ({ ordem: embaralhar(a.opcoes.length), escolhida: null }),
  podeVerificar: (est) => est.escolhida !== null,
  verificar: (a, est) => est.escolhida === a.correta,

  // `verificada`: depois de verificar, as opções travam e ganham marca com ícone e texto.
  render(a, est, { mudar, verificada, passoId }) {
    const nome = `quiz-${passoId}`;
    return el('fieldset', { class: 'quiz' },
      el('legend', {}, tx(a.pergunta)),
      est.ordem.map((i) => {
        const certa = i === a.correta;
        const escolhida = i === est.escolhida;
        const marca = !verificada ? null
          : certa ? el('span', { class: 'marca marca-certa' }, `✓ ${t('quiz.correta')}`)
          : escolhida ? el('span', { class: 'marca marca-errada' }, `✗ ${t('quiz.sua_resposta')}`)
          : null;
        const classe = ['opcao', verificada && certa && 'opcao-certa', verificada && escolhida && !certa && 'opcao-errada']
          .filter(Boolean).join(' ');
        return el('label', { class: classe },
          el('input', {
            type: 'radio',
            name: nome,
            value: String(i),
            checked: escolhida,
            disabled: verificada,
            onchange: () => mudar({ escolhida: i }, `input[name="${nome}"][value="${i}"]`),
          }),
          el('span', { class: 'opcao-texto' }, tx(a.opcoes[i])),
          marca,
        );
      }),
    );
  },
};
