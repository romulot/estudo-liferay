import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ordenarPassos } from '../public/passos.js';

const licao = (id) => ({ id });
const item = (licaoId, atividadeId, revisao = false) => ({ licao: licao(licaoId), atividade: { id: atividadeId }, revisao });
const resumo = (passos) => passos.map((p) => (p.tipo === 'leitura' ? `ler:${p.licao.id}` : `${p.rotulo}:${p.licao.id}/${p.atividade.id}`));

test('lição nova: leitura antes da primeira atividade', () => {
  const passos = ordenarPassos([item('w1', 'q1'), item('w1', 'q2')], new Set());
  assert.deepEqual(resumo(passos), ['ler:w1', 'nova:w1/q1', 'nova:w1/q2']);
});

test('lição pela metade: leitura volta e atividade sai como continuação', () => {
  const passos = ordenarPassos([item('w3', 'q2'), item('w3', 'o1'), item('w4', 'q1')], new Set(['w3']));
  assert.deepEqual(resumo(passos), ['ler:w3', 'continuacao:w3/q2', 'continuacao:w3/o1', 'ler:w4', 'nova:w4/q1']);
});

test('revisão nunca recebe leitura', () => {
  const passos = ordenarPassos([item('w1', 'q1', true), item('w2', 'q1', true)], new Set(['w1', 'w2']));
  assert.deepEqual(resumo(passos), ['revisao:w1/q1', 'revisao:w2/q1']);
});

test('no máximo uma leitura por lição na sessão', () => {
  const passos = ordenarPassos([item('w5', 'q1'), item('w1', 'q1', true), item('w5', 'q2')], new Set());
  assert.deepEqual(resumo(passos), ['ler:w5', 'nova:w5/q1', 'revisao:w1/q1', 'nova:w5/q2']);
});
