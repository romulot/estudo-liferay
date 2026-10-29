import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { validarModulo, validarLicao, compararI18n } from './schema.js';

const MODULO_JSON = '_modulo.json';
export const LANGS = ['pt-BR', 'en'];

async function lerJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

// Lê todo o conteúdo uma vez, no boot. Os ids viram chaves de Map: nada vindo
// do cliente é usado para montar caminho de arquivo.
// Conteúdo inválido é ignorado com aviso; rode `npm run check` para ver os detalhes.
export async function carregarConteudo(contentDir) {
  const i18n = {};
  for (const lang of LANGS) i18n[lang] = await lerJson(path.join(contentDir, 'i18n', `${lang}.json`));
  const errosI18n = compararI18n(i18n['pt-BR'], i18n.en, 'pt-BR', 'en');
  if (errosI18n.length) console.warn(`i18n incompleto: ${errosI18n.join('; ')}`);

  const base = path.join(contentDir, 'modulos');
  const modulos = [];
  const licoes = new Map();
  const pastas = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory());

  for (const pasta of pastas) {
    const dir = path.join(base, pasta.name);
    let modulo;
    try {
      modulo = await lerJson(path.join(dir, MODULO_JSON));
    } catch (err) {
      console.warn(`Módulo ${pasta.name} ignorado: ${err.message}`);
      continue;
    }
    if (validarModulo(modulo, pasta.name).length) {
      console.warn(`Módulo ${pasta.name} ignorado: inválido (rode npm run check)`);
      continue;
    }

    const doModulo = [];
    for (const nome of await readdir(dir)) {
      if (!nome.endsWith('.json') || nome === MODULO_JSON) continue;
      const arquivoId = path.basename(nome, '.json');
      try {
        const licao = await lerJson(path.join(dir, nome));
        if (validarLicao(licao, { arquivoId, moduloId: pasta.name }).erros.length) throw new Error('inválida');
        if (licoes.has(licao.id)) throw new Error('id repetido');
        licoes.set(licao.id, licao);
        doModulo.push(licao);
      } catch (err) {
        console.warn(`Lição ${pasta.name}/${nome} ignorada: ${err.message} (rode npm run check)`);
      }
    }
    doModulo.sort((a, b) => a.ordem - b.ordem);
    modulos.push({ ...modulo, licoes: doModulo });
  }
  modulos.sort((a, b) => a.ordem - b.ordem);

  return {
    i18n: (lang) => (LANGS.includes(lang) ? i18n[lang] : null),
    licao: (id) => licoes.get(id) ?? null,
    // Lista leve para a tela inicial: sem o conteúdo das atividades.
    modulos: () =>
      modulos.map(({ licoes: ls, ...m }) => ({
        ...m,
        licoes: ls.map((l) => ({ id: l.id, ordem: l.ordem, titulo: l.titulo, atividades: l.atividades.length })),
      })),
    // Para o resumo de progresso: quais atividades cada lição tem.
    catalogo: () =>
      modulos.map((m) => ({
        id: m.id,
        titulo: m.titulo,
        licoes: m.licoes.map((l) => ({ id: l.id, atividades: l.atividades.map((a) => a.id) })),
      })),
  };
}
