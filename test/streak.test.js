import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calcularStreak } from '../lib/streak.js';
import { gerarMarkdown } from '../lib/markdown.js';
import { diaParaNumero } from '../lib/datas.js';

test('sem dias estudados', () => {
  assert.deepEqual(calcularStreak([], '2026-10-29'), { atual: 0, melhor: 0 });
});

test('dias seguidos até hoje', () => {
  assert.deepEqual(calcularStreak(['2026-10-27', '2026-10-28', '2026-10-29'], '2026-10-29'), { atual: 3, melhor: 3 });
});

test('dia repetido conta uma vez', () => {
  assert.deepEqual(calcularStreak(['2026-10-29', '2026-10-29', '2026-10-28'], '2026-10-29'), { atual: 2, melhor: 2 });
});

test('virada de mês e de ano bissexto', () => {
  assert.deepEqual(calcularStreak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01'), { atual: 3, melhor: 3 });
  assert.deepEqual(calcularStreak(['2026-10-31', '2026-11-01'], '2026-11-01'), { atual: 2, melhor: 2 });
});

test('virada de ano', () => {
  assert.deepEqual(calcularStreak(['2026-12-30', '2026-12-31', '2027-01-01'], '2027-01-01'), { atual: 3, melhor: 3 });
});

test('1 dia de folga não quebra a sequência', () => {
  assert.deepEqual(calcularStreak(['2026-10-25', '2026-10-27'], '2026-10-27'), { atual: 2, melhor: 2 });
});

test('2 dias de folga quebram a sequência', () => {
  assert.deepEqual(calcularStreak(['2026-10-20', '2026-10-21', '2026-10-24'], '2026-10-24'), { atual: 1, melhor: 2 });
});

test('sequência continua viva com 1 dia sem estudo até hoje', () => {
  assert.equal(calcularStreak(['2026-10-26', '2026-10-27'], '2026-10-28').atual, 2);
  assert.equal(calcularStreak(['2026-10-26', '2026-10-27'], '2026-10-29').atual, 2);
});

test('sequência zera após 2 dias sem estudo até hoje', () => {
  assert.deepEqual(calcularStreak(['2026-10-26', '2026-10-27'], '2026-10-30'), { atual: 0, melhor: 2 });
});

test('datas inválidas são ignoradas', () => {
  assert.equal(Number.isNaN(diaParaNumero('2026-02-30')), true);
  assert.deepEqual(calcularStreak(['2026-02-30', 'lixo', '2026-10-29'], '2026-10-29'), { atual: 1, melhor: 1 });
});

test('markdown vazio', () => {
  const md = gerarMarkdown({ versao: 1, eventos: [] }, '2026-10-29');
  assert.match(md, /Gerado automaticamente/);
  assert.match(md, /Atual: \*\*0 dias\*\*/);
  assert.match(md, /Nenhuma atividade ainda/);
  assert.match(md, /começar uma nova sequência/);
});

test('markdown com atividades', () => {
  const ev = (dia, licaoId, acerto) => ({ tipo: 'atividade', licaoId, atividadeId: 'q1', acerto, dia });
  const md = gerarMarkdown({
    versao: 1,
    eventos: [
      ev('2026-10-28', 'workspace-1', true),
      ev('2026-10-29', 'workspace-1', false),
      ev('2026-10-29', 'workspace-2', true),
      { tipo: 'sessao', dia: '2026-10-29' },
    ],
  }, '2026-10-29');
  assert.match(md, /Atual: \*\*2 dias\*\*/);
  assert.match(md, /\| workspace-1 \| 2 \| 50% \|/);
  assert.match(md, /- 2026-10-29: 2 atividades, 50% de acerto, sessão concluída/);
  assert.match(md, /- 2026-10-28: 1 atividade, 100% de acerto/);
  assert.match(md, /Sessão de hoje concluída/);
});

test('markdown com catálogo mostra lições concluídas por módulo', () => {
  const ev = (licaoId, atividadeId, acerto) => ({ tipo: 'atividade', licaoId, atividadeId, acerto, dia: '2026-10-29' });
  const catalogo = [
    { id: 'workspace', titulo: { pt: 'Liferay Workspace', en: 'Liferay Workspace' }, licoes: [{ id: 'w1', atividades: ['q1', 'q2'] }, { id: 'w2', atividades: ['q1'] }] },
    { id: 'cx', titulo: { pt: 'Client Extensions', en: 'Client Extensions' }, licoes: [{ id: 'c1', atividades: ['q1'] }] },
  ];
  const md = gerarMarkdown({ versao: 1, eventos: [ev('w1', 'q1', true), ev('w1', 'q2', false), ev('w2', 'q9', true)] }, '2026-10-29', catalogo);
  assert.match(md, /## Módulos/);
  assert.match(md, /\| Liferay Workspace \| 1\/2 \| 67% \|/);
  assert.match(md, /\| Client Extensions \| 0\/1 \| - \|/);
  assert.doesNotMatch(md, /## Lições/);
});

test('markdown avisa no último dia de folga', () => {
  const md = gerarMarkdown({ versao: 1, eventos: [{ tipo: 'sessao', dia: '2026-10-27' }] }, '2026-10-29');
  assert.match(md, /último dia para manter a sequência de 1 dia/);
});
