import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hoje } from '../lib/datas.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let servidor;
let dir;
let porta;

before(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'estudo-liferay-'));
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      NO_OPEN: '1',
      PORT: String(40000 + Math.floor(Math.random() * 20000)),
      DATA_DIR: dir,
      PROGRESSO_MD: path.join(dir, 'PROGRESSO.md'),
    },
  });
  const linha = await new Promise((resolve, reject) => {
    servidor.stdout.once('data', (d) => resolve(String(d)));
    servidor.once('exit', (code) => reject(new Error(`servidor saiu com código ${code}`)));
  });
  porta = Number(/:(\d+)\//.exec(linha)[1]);
});

after(async () => {
  servidor?.kill();
  await rm(dir, { recursive: true, force: true });
});

// http.request em vez de fetch: permite caminhos sem normalizar e cabeçalho Host falso.
function req(caminho, { method = 'GET', headers = {}, body } = {}) {
  return new Promise((resolve, reject) => {
    const r = request({ host: '127.0.0.1', port: porta, path: caminho, method, headers }, (res) => {
      const partes = [];
      res.on('data', (c) => partes.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(partes).toString('utf8') }));
    });
    r.on('error', reject);
    r.end(body);
  });
}

const origem = () => `http://127.0.0.1:${porta}`;
const post = (corpo, headers = {}) => req('/api/progress', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: origem(), ...headers },
  body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
});
const evento = (atividadeId = 'q1') => ({ tipo: 'atividade', licaoId: 'workspace-01-o-que-e', atividadeId, acerto: true, dia: hoje() });

test('serve a página inicial', async () => {
  const r = await req('/');
  assert.equal(r.status, 200);
  assert.match(r.body, /<main id="app"/);
});

test('arquivos fora de public/ nunca são servidos', async () => {
  for (const caminho of ['/../package.json', '/%2e%2e/package.json', '/..%2f..%2fserver.js', '/..%5c..%5cserver.js', '/%E0%A4%A']) {
    const r = await req(caminho);
    assert.notEqual(r.status, 200, caminho);
    assert.doesNotMatch(r.body, /"name": "estudo-liferay"|createServer/, caminho);
  }
});

test('ids de conteúdo não viram caminho de arquivo', async () => {
  for (const caminho of ['/api/licoes/..%2f..%2fpackage.json', '/api/licoes/_modulo', '/api/licoes/__proto__', '/api/i18n/..%2fpt-BR', '/api/i18n/toString']) {
    assert.equal((await req(caminho)).status, 404, caminho);
  }
  assert.equal((await req('/api/licoes/workspace-01-o-que-e')).status, 200);
});

test('Host de outro domínio é recusado (DNS rebinding)', async () => {
  assert.equal((await req('/api/progress', { headers: { host: 'evil.example' } })).status, 403);
});

test('POST exige Origin do próprio app', async () => {
  assert.equal((await post(evento(), { origin: 'http://evil.example' })).status, 403);
  const semOrigem = await req('/api/progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(evento()) });
  assert.equal(semOrigem.status, 403);
});

test('limites de corpo e formato', async () => {
  assert.equal((await post('x'.repeat(20 * 1024))).status, 413);
  assert.equal((await post(evento(), { 'content-type': 'text/plain' })).status, 415);
  assert.equal((await post('{quebrado')).status, 400);
  assert.equal((await post({ ...evento(), licaoId: '../x' })).status, 400);
  assert.equal((await post({ ...evento(), dia: '2020-01-01' })).status, 400);
});

test('gravações simultâneas não se perdem e geram o PROGRESSO.md', async () => {
  const respostas = await Promise.all(Array.from({ length: 20 }, (_, i) => post(evento(`c${i}`))));
  assert.ok(respostas.every((r) => r.status === 201));
  const salvo = JSON.parse(await readFile(path.join(dir, 'progress.json'), 'utf8'));
  const concorrentes = salvo.eventos.filter((e) => e.atividadeId.startsWith('c'));
  assert.equal(new Set(concorrentes.map((e) => e.atividadeId)).size, 20);
  assert.match(await readFile(path.join(dir, 'PROGRESSO.md'), 'utf8'), /Gerado automaticamente/);
});

test('resumo reflete o que foi gravado', async () => {
  const r = JSON.parse((await req('/api/resumo')).body);
  assert.equal(r.estudouHoje, true);
  assert.equal(r.streak.atual, 1);
});
