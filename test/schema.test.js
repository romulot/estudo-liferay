import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validarLicao, compararI18n } from '../lib/schema.js';

const EXEMPLO = new URL('../content/modulos/workspace/workspace-01-o-que-e.json', import.meta.url);
const ctx = { arquivoId: 'workspace-01-o-que-e', moduloId: 'workspace' };
const carregar = async () => JSON.parse(await readFile(EXEMPLO, 'utf8'));

test('lição de exemplo é válida', async () => {
  assert.deepEqual((await carregar()).atividades.length > 0, true);
  assert.deepEqual(validarLicao(await carregar(), ctx).erros, []);
});

test('texto sem en aponta o caminho exato', async () => {
  const l = await carregar();
  delete l.atividades[0].opcoes[2].en;
  assert.deepEqual(validarLicao(l, ctx).erros, ['atividades[0].opcoes[2].en: texto ausente ou vazio']);
});

test('pt vazio também reprova', async () => {
  const l = await carregar();
  l.resumo.pt = '   ';
  assert.deepEqual(validarLicao(l, ctx).erros, ['resumo.pt: texto ausente ou vazio']);
});

test('url fora do learn.liferay.com reprova', async () => {
  const l = await carregar();
  l.url = 'https://exemplo.com/x';
  assert.match(validarLicao(l, ctx).erros[0], /^url:/);
});

test('quiz com índice correto fora das opções reprova', async () => {
  const l = await carregar();
  l.atividades[0].correta = 9;
  assert.deepEqual(validarLicao(l, ctx).erros, ['atividades[0].correta: deve ser o índice de uma das opções']);
});

test('ordenar com poucos passos e tipo desconhecido reprovam', async () => {
  const l = await carregar();
  l.atividades[2].passos = l.atividades[2].passos.slice(0, 2);
  l.atividades[1].tipo = 'flashcard';
  const { erros } = validarLicao(l, ctx);
  assert.ok(erros.includes('atividades[2].passos: deve ser uma lista com 3 a 7 itens'));
  assert.ok(erros.some((e) => e.startsWith('atividades[1].tipo:')));
});

test('id de atividade repetido e id diferente do arquivo reprovam', async () => {
  const l = await carregar();
  l.atividades[1].id = 'q1';
  const { erros } = validarLicao(l, { ...ctx, arquivoId: 'outro' });
  assert.ok(erros.includes('atividades[1].id: "q1" repetido na lição'));
  assert.ok(erros.some((e) => e.startsWith('id:')));
});

test('verificado_em antigo gera aviso, não erro', async () => {
  const l = await carregar();
  l.verificado_em = '2020-01-01';
  const r = validarLicao(l, ctx);
  assert.deepEqual(r.erros, []);
  assert.equal(r.avisos.length, 1);
});

test('i18n com chave faltando dos dois lados', () => {
  const erros = compararI18n({ a: 'A', b: 'B' }, { a: 'A', c: '' }, 'pt-BR', 'en');
  assert.deepEqual(erros.sort(), [
    'en: "c" vazio ou não é texto',
    'en: falta a chave "b" (existe em pt-BR)',
    'pt-BR: falta a chave "c" (existe em en)',
  ]);
});
