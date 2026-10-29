import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resumir } from '../lib/resumo.js';

const ev = (dia, licaoId, atividadeId, acerto) => ({ tipo: 'atividade', licaoId, atividadeId, acerto, dia });
const catalogo = [{ id: 'ws', titulo: { pt: 'Workspace', en: 'Workspace' }, licoes: [{ id: 'w1', atividades: ['q1', 'o1'] }] }];

test('resumo vazio', () => {
  const r = resumir({ versao: 1, eventos: [] }, '2026-10-29', catalogo);
  assert.deepEqual(r.streak, { atual: 0, melhor: 0 });
  assert.equal(r.estudouHoje, false);
  assert.deepEqual(r.dias, []);
  assert.deepEqual(r.modulos, [{ id: 'ws', titulo: catalogo[0].titulo, concluidas: 0, total: 1, atividades: 0, acertos: 0 }]);
});

test('resumo agrupa por dia (mais recente primeiro) e conclui lição', () => {
  const r = resumir({
    versao: 1,
    eventos: [ev('2026-10-28', 'w1', 'q1', false), ev('2026-10-29', 'w1', 'o1', true), { tipo: 'sessao', dia: '2026-10-29' }],
  }, '2026-10-29', catalogo);
  assert.equal(r.estudouHoje, true);
  assert.deepEqual(r.dias, [
    { dia: '2026-10-29', atividades: 1, acertos: 1, sessoes: 1 },
    { dia: '2026-10-28', atividades: 1, acertos: 0, sessoes: 0 },
  ]);
  assert.equal(r.modulos[0].concluidas, 1);
  assert.equal(r.modulos[0].acertos, 1);
  assert.equal(r.streak.atual, 2);
});
