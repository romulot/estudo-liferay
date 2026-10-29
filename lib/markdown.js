import { diaParaNumero } from './datas.js';
import { resumir } from './resumo.js';

const MAX_DIAS_LISTADOS = 30;

const pct = (acertos, total) => `${Math.round((acertos / total) * 100)}%`;
const dias = (n) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

function proximoPasso(estudouHoje, streak, ultimoDia, hoje) {
  if (estudouHoje) return 'Sessão de hoje feita. Volte amanhã para continuar a sequência.';
  if (streak.atual > 0) {
    const folga = diaParaNumero(hoje) - diaParaNumero(ultimoDia) === 2;
    return folga
      ? `Hoje é o último dia para manter a sequência de ${dias(streak.atual)}: faça a sessão de hoje.`
      : `Faça a sessão de hoje para chegar a ${dias(streak.atual + 1)} de sequência.`;
  }
  return 'Faça uma sessão curta hoje para começar uma nova sequência.';
}

export function gerarMarkdown(estado, hoje, catalogo = []) {
  const r = resumir(estado, hoje, catalogo);

  const linhas = [
    '# Progresso: Estudo Liferay',
    '',
    '> Gerado automaticamente a cada atividade. Edições manuais neste arquivo serão sobrescritas.',
    `> Atualizado em ${hoje}.`,
    '',
    '## Sequência',
    '',
    `- Atual: **${dias(r.streak.atual)}**`,
    `- Melhor: **${dias(r.streak.melhor)}**`,
    '- Regra: até 1 dia sem estudo entre dois dias estudados não quebra a sequência.',
    '',
  ];

  // Sem catálogo (ex.: testes), cai para a tabela simples por lição.
  if (r.modulos.length > 0) {
    linhas.push('## Módulos', '', '| Módulo | Lições concluídas | Acerto |', '|---|---:|---:|');
    for (const m of r.modulos) {
      linhas.push(`| ${m.titulo.pt} | ${m.concluidas}/${m.total} | ${m.atividades ? pct(m.acertos, m.atividades) : '-'} |`);
    }
    linhas.push('');
  } else if (r.licoes.length === 0) {
    linhas.push('## Lições', '', 'Nenhuma atividade ainda.', '');
  } else {
    linhas.push('## Lições', '', '| Lição | Atividades | Acerto |', '|---|---:|---:|');
    for (const l of r.licoes) linhas.push(`| ${l.id} | ${l.atividades} | ${pct(l.acertos, l.atividades)} |`);
    linhas.push('');
  }

  linhas.push('## Dias estudados', '');
  if (r.dias.length === 0) {
    linhas.push('Nenhum dia ainda.', '');
  } else {
    for (const d of r.dias.slice(0, MAX_DIAS_LISTADOS)) {
      const partes = [`${d.atividades} ${d.atividades === 1 ? 'atividade' : 'atividades'}`];
      if (d.atividades > 0) partes.push(`${pct(d.acertos, d.atividades)} de acerto`);
      if (d.sessoes > 0) partes.push('sessão concluída');
      linhas.push(`- ${d.dia}: ${partes.join(', ')}`);
    }
    if (r.dias.length > MAX_DIAS_LISTADOS) {
      linhas.push(`- ... e mais ${dias(r.dias.length - MAX_DIAS_LISTADOS)} anteriores`);
    }
    linhas.push('');
  }

  linhas.push('## Próximo passo', '', proximoPasso(r.estudouHoje, r.streak, r.dias[0]?.dia, hoje), '');
  return linhas.join('\n');
}
