import { diaParaNumero } from './datas.js';

// Até 1 dia sem estudo entre dois dias estudados não quebra a sequência.
const MAX_INTERVALO = 2;

// Sequência = quantidade de dias estudados em uma cadeia sem buracos de 2+ dias.
export function calcularStreak(dias, hoje) {
  const nums = [...new Set(dias.map(diaParaNumero))].filter(Number.isFinite).sort((a, b) => a - b);
  if (nums.length === 0) return { atual: 0, melhor: 0 };

  let melhor = 1;
  let cadeia = 1;
  for (let i = 1; i < nums.length; i++) {
    cadeia = nums[i] - nums[i - 1] <= MAX_INTERVALO ? cadeia + 1 : 1;
    melhor = Math.max(melhor, cadeia);
  }
  const viva = diaParaNumero(hoje) - nums.at(-1) <= MAX_INTERVALO;
  return { atual: viva ? cadeia : 0, melhor };
}
