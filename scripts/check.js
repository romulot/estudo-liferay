// Valida o conteúdo: lições e módulos com pt e en completos, e paridade das chaves da UI.
// Uso: npm run check  (ou node scripts/check.js <pasta-content>)
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarModulo, validarLicao, compararI18n } from '../lib/schema.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.resolve(process.argv[2] ?? path.join(ROOT, 'content'));
const MODULO_JSON = '_modulo.json';

const erros = [];
const avisos = [];
const rel = (f) => path.relative(ROOT, f).replaceAll('\\', '/');

async function lerJson(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (err) {
    erros.push(`${rel(file)}: ${err.code === 'ENOENT' ? 'arquivo não encontrado' : `JSON inválido (${err.message})`}`);
    return null;
  }
}

async function checarI18n() {
  const dir = path.join(CONTENT, 'i18n');
  const pt = await lerJson(path.join(dir, 'pt-BR.json'));
  const en = await lerJson(path.join(dir, 'en.json'));
  if (pt && en) for (const e of compararI18n(pt, en, 'i18n/pt-BR.json', 'i18n/en.json')) erros.push(e);
}

async function checarModulos() {
  const base = path.join(CONTENT, 'modulos');
  const pastas = (await readdir(base, { withFileTypes: true })).filter((d) => d.isDirectory());
  if (pastas.length === 0) erros.push(`${rel(base)}: nenhum módulo encontrado`);

  const licoesVistas = new Map();
  let totalLicoes = 0;
  for (const pasta of pastas) {
    const dir = path.join(base, pasta.name);
    const modFile = path.join(dir, MODULO_JSON);
    const modulo = await lerJson(modFile);
    if (modulo) for (const e of validarModulo(modulo, pasta.name)) erros.push(`${rel(modFile)}: ${e}`);

    const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.json') && f !== MODULO_JSON);
    if (arquivos.length === 0) avisos.push(`${rel(dir)}: módulo sem lições`);
    for (const nome of arquivos) {
      const file = path.join(dir, nome);
      const licao = await lerJson(file);
      if (!licao) continue;
      totalLicoes++;
      const arquivoId = path.basename(nome, '.json');
      const r = validarLicao(licao, { arquivoId, moduloId: pasta.name });
      for (const e of r.erros) erros.push(`${rel(file)}: ${e}`);
      for (const a of r.avisos) avisos.push(`${rel(file)}: ${a}`);
      // O progresso guarda só o id da lição, então ele precisa ser único em todo o conteúdo.
      if (licoesVistas.has(arquivoId)) erros.push(`${rel(file)}: id "${arquivoId}" já usado em ${licoesVistas.get(arquivoId)}`);
      licoesVistas.set(arquivoId, rel(file));
    }
  }
  return { modulos: pastas.length, licoes: totalLicoes };
}

await checarI18n();
const total = await checarModulos().catch((err) => {
  erros.push(`${rel(path.join(CONTENT, 'modulos'))}: ${err.message}`);
  return { modulos: 0, licoes: 0 };
});

for (const a of avisos) console.warn(`aviso  ${a}`);
for (const e of erros) console.error(`erro   ${e}`);
console.log(`\n${total.modulos} módulo(s), ${total.licoes} lição(ões): ${erros.length} erro(s), ${avisos.length} aviso(s).`);
process.exit(erros.length ? 1 : 0);
