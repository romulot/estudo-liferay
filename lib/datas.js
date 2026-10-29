const DIA_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;

// Dia local no formato YYYY-MM-DD, o mesmo que o navegador envia.
export function hoje(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

// Converte YYYY-MM-DD em número de dias desde 1970, ou NaN se a data não existir.
export function diaParaNumero(dia) {
  const m = DIA_RE.exec(dia);
  if (!m) return NaN;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(t);
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return NaN;
  return t / DAY_MS;
}
