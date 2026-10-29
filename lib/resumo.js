import { calcularStreak } from './streak.js';

function agrupar(eventos, chave) {
  const grupos = new Map();
  for (const e of eventos) {
    const g = grupos.get(e[chave]) ?? { atividades: 0, acertos: 0, sessoes: 0 };
    if (e.tipo === 'atividade') {
      g.atividades++;
      if (e.acerto) g.acertos++;
    } else {
      g.sessoes++;
    }
    grupos.set(e[chave], g);
  }
  return grupos;
}

// Números do progresso usados pela tela inicial e pelo PROGRESSO.md.
// Lição concluída = todas as atividades dela respondidas pelo menos uma vez.
export function resumir(estado, hoje, catalogo = []) {
  const { eventos } = estado;
  const atividades = eventos.filter((e) => e.tipo === 'atividade');
  const porDia = agrupar(eventos, 'dia');
  const dias = [...porDia].map(([dia, g]) => ({ dia, ...g })).sort((a, b) => b.dia.localeCompare(a.dia));
  const respondidas = new Set(atividades.map((e) => `${e.licaoId}/${e.atividadeId}`));

  const modulos = catalogo.map((m) => {
    const ids = new Set(m.licoes.map((l) => l.id));
    const doModulo = atividades.filter((e) => ids.has(e.licaoId));
    return {
      id: m.id,
      titulo: m.titulo,
      concluidas: m.licoes.filter((l) => l.atividades.every((a) => respondidas.has(`${l.id}/${a}`))).length,
      total: m.licoes.length,
      atividades: doModulo.length,
      acertos: doModulo.filter((e) => e.acerto).length,
    };
  });

  const licoes = [...agrupar(atividades, 'licaoId')]
    .map(([id, g]) => ({ id, atividades: g.atividades, acertos: g.acertos }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    hoje,
    streak: calcularStreak(dias.map((d) => d.dia), hoje),
    estudouHoje: porDia.has(hoje),
    dias,
    modulos,
    licoes,
  };
}
