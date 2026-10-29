import { t, idiomaInicial, definirIdioma, outroIdioma, aoTrocarIdioma } from './i18n.js';
import { el } from './dom.js';
import { telaInicio } from './home.js';
import { telaSessao } from './session.js';

const main = document.getElementById('app');
const botaoIdioma = document.getElementById('trocar-idioma');

const ROTAS = {
  '#/': telaInicio,
  '#/sessao': telaSessao,
};

let rotaAnterior = null;

// `foco`: seletor do elemento que recebe o foco depois de desenhar (ex.: botão "Próximo").
export async function render(foco) {
  const hash = ROTAS[location.hash] ? location.hash : '#/';
  try {
    // Telas devolvem listas que podem ter itens condicionais (false/null): só os nós entram.
    main.replaceChildren(...(await ROTAS[hash]({ atualizar: render })).filter(Boolean));
  } catch (err) {
    console.error(err);
    main.replaceChildren(el('h1', { tabindex: '-1' }, t('erro.carregar')), el('p', {}, String(err.message)));
  }
  botaoIdioma.textContent = t('idioma.trocar');
  botaoIdioma.lang = outroIdioma();
  document.title = t('app.titulo');
  // Ao trocar de tela, leva o foco ao título para leitores de tela anunciarem a mudança.
  if (typeof foco === 'string') main.querySelector(foco)?.focus();
  else if (rotaAnterior !== null && rotaAnterior !== hash) main.querySelector('h1')?.focus();
  rotaAnterior = hash;
}

botaoIdioma.addEventListener('click', () => definirIdioma(outroIdioma()).catch(console.error));
aoTrocarIdioma(() => render());
addEventListener('hashchange', () => render());

definirIdioma(idiomaInicial()).catch((err) => {
  console.error(err);
  main.textContent = 'Não foi possível carregar os textos. / Could not load texts.';
});
