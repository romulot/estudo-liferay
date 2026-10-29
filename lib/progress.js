import { readFile, writeFile, rename, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { hoje, diaParaNumero } from './datas.js';
import { gerarMarkdown } from './markdown.js';
import { ID_RE } from './schema.js';

const TIPOS = new Set(['atividade', 'sessao']);

function vazio() {
  return { versao: 1, eventos: [] };
}

function isProgress(obj) {
  return obj && obj.versao === 1 && Array.isArray(obj.eventos);
}

function diaValido(dia) {
  // O navegador pode estar em outro fuso, mas nunca a mais de 1 dia do servidor.
  return Math.abs(diaParaNumero(dia) - diaParaNumero(hoje())) <= 1;
}

// Retorna o evento normalizado ou uma string com o motivo da recusa.
export function validarEvento(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'evento deve ser um objeto';
  const { tipo, licaoId, atividadeId, acerto, dia } = body;
  if (!TIPOS.has(tipo)) return 'tipo inválido';
  if (typeof dia !== 'string' || !diaValido(dia)) return 'dia inválido';
  if (tipo === 'sessao') return { tipo, dia };
  if (typeof licaoId !== 'string' || !ID_RE.test(licaoId)) return 'licaoId inválido';
  if (typeof atividadeId !== 'string' || !ID_RE.test(atividadeId)) return 'atividadeId inválido';
  if (typeof acerto !== 'boolean') return 'acerto deve ser booleano';
  return { tipo, licaoId, atividadeId, acerto, dia };
}

async function lerJson(file) {
  const obj = JSON.parse(await readFile(file, 'utf8'));
  if (!isProgress(obj)) throw new Error(`formato inesperado em ${file}`);
  return obj;
}

async function renomear(de, para) {
  // No Windows o rename pode falhar por instantes se outro processo (antivírus, editor) segurar o arquivo.
  for (let tentativa = 0; ; tentativa++) {
    try {
      return await rename(de, para);
    } catch (err) {
      if (tentativa >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(err.code)) throw err;
      await new Promise((r) => setTimeout(r, 50 * (tentativa + 1)));
    }
  }
}

async function gravarAtomico(file, conteudo) {
  const tmp = file + '.tmp';
  await writeFile(tmp, conteudo, 'utf8');
  await renomear(tmp, file);
}

export function createProgressStore(dataDir, mdFile, catalogo = []) {
  const file = path.join(dataDir, 'progress.json');
  const bak = file + '.bak';
  let estado = null;
  let fila = Promise.resolve();

  async function carregar() {
    try {
      return await lerJson(file);
    } catch (err) {
      if (err.code === 'ENOENT') return vazio();
      console.warn(`progress.json ilegível (${err.message}); tentando o .bak`);
    }
    try {
      return await lerJson(bak);
    } catch {
      // Sem .bak válido: preserva o arquivo ruim para inspeção e recomeça.
      const corrompido = `${file}.corrompido-${Date.now()}`;
      await copyFile(file, corrompido).catch(() => {});
      console.warn(`Sem backup válido; arquivo original copiado para ${corrompido}`);
      return vazio();
    }
  }

  async function gravar(obj) {
    await mkdir(dataDir, { recursive: true });
    await copyFile(file, bak).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
    await gravarAtomico(file, JSON.stringify(obj, null, 2) + '\n');
  }

  // O .md é só para leitura humana: se falhar, o progresso já está salvo no JSON.
  async function atualizarMarkdown(obj) {
    if (!mdFile) return;
    try {
      await gravarAtomico(mdFile, gerarMarkdown(obj, hoje(), catalogo));
    } catch (err) {
      console.warn(`Não foi possível atualizar ${mdFile}: ${err.message}`);
    }
  }

  // Todas as operações passam pela fila: uma de cada vez, na ordem de chegada.
  function enfileirar(op) {
    const resultado = fila.then(async () => {
      estado ??= await carregar();
      return op();
    });
    fila = resultado.catch(() => {});
    return resultado;
  }

  return {
    ler: () => enfileirar(() => structuredClone(estado)),
    registrar: (evento) =>
      enfileirar(async () => {
        const proximo = structuredClone(estado);
        proximo.eventos.push({ ...evento, registradoEm: new Date().toISOString() });
        await gravar(proximo);
        estado = proximo;
        await atualizarMarkdown(proximo);
        return proximo;
      }),
  };
}
