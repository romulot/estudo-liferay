import { diaParaNumero, hoje } from './datas.js';

export const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
export const IDIOMAS = ['pt', 'en'];
const URL_OFICIAL = 'https://learn.liferay.com/';
const DIAS_ATE_REVISAR = 180;

// Cada validador recebe o valor e o caminho dele (ex.: "atividades[0].pergunta") e acumula em `erros`.
function texto(valor, caminho, erros) {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    erros.push(`${caminho}: deve ser um objeto { pt, en }`);
    return;
  }
  for (const lang of IDIOMAS) {
    if (typeof valor[lang] !== 'string' || valor[lang].trim() === '') erros.push(`${caminho}.${lang}: texto ausente ou vazio`);
  }
  for (const extra of Object.keys(valor)) {
    if (!IDIOMAS.includes(extra)) erros.push(`${caminho}.${extra}: idioma desconhecido`);
  }
}

function id(valor, caminho, erros) {
  if (typeof valor !== 'string' || !ID_RE.test(valor)) erros.push(`${caminho}: id inválido (use a-z, 0-9 e hífen)`);
}

function inteiro(valor, caminho, erros, min = 1) {
  if (!Number.isInteger(valor) || valor < min) erros.push(`${caminho}: deve ser inteiro >= ${min}`);
}

function lista(valor, caminho, erros, min, max) {
  if (!Array.isArray(valor) || valor.length < min || valor.length > max) {
    erros.push(`${caminho}: deve ser uma lista com ${min} a ${max} itens`);
    return false;
  }
  return true;
}

const ATIVIDADES = {
  quiz(a, c, erros) {
    texto(a.pergunta, `${c}.pergunta`, erros);
    if (lista(a.opcoes, `${c}.opcoes`, erros, 2, 5)) a.opcoes.forEach((o, i) => texto(o, `${c}.opcoes[${i}]`, erros));
    if (!Number.isInteger(a.correta) || a.correta < 0 || a.correta >= (a.opcoes?.length ?? 0)) {
      erros.push(`${c}.correta: deve ser o índice de uma das opções`);
    }
  },
  // Os passos ficam na ordem correta; o app embaralha na hora de mostrar.
  ordenar(a, c, erros) {
    texto(a.enunciado, `${c}.enunciado`, erros);
    if (lista(a.passos, `${c}.passos`, erros, 3, 7)) a.passos.forEach((p, i) => texto(p, `${c}.passos[${i}]`, erros));
  },
};

export function validarModulo(m, pastaId) {
  const erros = [];
  id(m.id, 'id', erros);
  if (m.id !== pastaId) erros.push(`id: "${m.id}" deve ser igual ao nome da pasta "${pastaId}"`);
  inteiro(m.ordem, 'ordem', erros);
  texto(m.titulo, 'titulo', erros);
  texto(m.descricao, 'descricao', erros);
  return erros;
}

// Retorna { erros, avisos }. Avisos não reprovam o check.
export function validarLicao(l, { arquivoId, moduloId }) {
  const erros = [];
  const avisos = [];
  id(l.id, 'id', erros);
  if (l.id !== arquivoId) erros.push(`id: "${l.id}" deve ser igual ao nome do arquivo "${arquivoId}"`);
  if (l.modulo !== moduloId) erros.push(`modulo: "${l.modulo}" deve ser igual à pasta "${moduloId}"`);
  inteiro(l.ordem, 'ordem', erros);
  if (typeof l.url !== 'string' || !l.url.startsWith(URL_OFICIAL)) erros.push(`url: deve começar com ${URL_OFICIAL}`);
  if (typeof l.versao !== 'string' || l.versao.trim() === '') erros.push('versao: obrigatória');

  const verificado = diaParaNumero(l.verificado_em);
  if (!Number.isFinite(verificado)) {
    erros.push('verificado_em: data YYYY-MM-DD obrigatória');
  } else if (diaParaNumero(hoje()) - verificado > DIAS_ATE_REVISAR) {
    avisos.push(`verificado_em: conferido há mais de ${DIAS_ATE_REVISAR} dias, revise com a página oficial`);
  }

  texto(l.titulo, 'titulo', erros);
  texto(l.resumo, 'resumo', erros);

  if (lista(l.atividades, 'atividades', erros, 1, 10)) {
    const ids = new Set();
    l.atividades.forEach((a, i) => {
      const c = `atividades[${i}]`;
      id(a?.id, `${c}.id`, erros);
      if (ids.has(a?.id)) erros.push(`${c}.id: "${a.id}" repetido na lição`);
      ids.add(a?.id);
      const validar = ATIVIDADES[a?.tipo];
      if (!validar) {
        erros.push(`${c}.tipo: use ${Object.keys(ATIVIDADES).join(' ou ')}`);
        return;
      }
      validar(a, c, erros);
      texto(a.explicacao, `${c}.explicacao`, erros);
    });
  }
  return { erros, avisos };
}

// Compara as chaves de dois dicionários de UI (planos: chave -> texto).
export function compararI18n(a, b, nomeA, nomeB) {
  const erros = [];
  for (const [x, y, nx, ny] of [[a, b, nomeA, nomeB], [b, a, nomeB, nomeA]]) {
    for (const [chave, valor] of Object.entries(x)) {
      if (!(chave in y)) erros.push(`${ny}: falta a chave "${chave}" (existe em ${nx})`);
      if (typeof valor !== 'string' || valor.trim() === '') erros.push(`${nx}: "${chave}" vazio ou não é texto`);
    }
  }
  return erros;
}
