// Ordem dos passos da sessão, sem DOM nem rede (testada em test/passos.test.js).
// Antes da primeira atividade pendente de cada lição entra um passo de leitura com o resumo,
// mesmo que a lição tenha ficado pela metade numa sessão anterior. Revisão não ganha leitura.
// Cada atividade leva um rótulo: 'nova', 'continuacao' ou 'revisao'.
export function ordenarPassos(escolhidas, licoesVistas) {
  const lidas = new Set();
  const passos = [];
  for (const item of escolhidas) {
    const id = item.licao.id;
    const rotulo = item.revisao ? 'revisao' : licoesVistas.has(id) ? 'continuacao' : 'nova';
    if (rotulo !== 'revisao' && !lidas.has(id)) {
      lidas.add(id);
      passos.push({ tipo: 'leitura', licao: item.licao });
    }
    passos.push({ tipo: 'atividade', ...item, rotulo });
  }
  return passos;
}
