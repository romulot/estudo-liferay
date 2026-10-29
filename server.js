import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createProgressStore, validarEvento } from './lib/progress.js';
import { carregarConteudo } from './lib/content.js';
import { resumir } from './lib/resumo.js';
import { hoje } from './lib/datas.js';

const HOST = '127.0.0.1';
const BASE_PORT = Number(process.env.PORT) || 4321;
const MAX_PORT_TRIES = 10;
const MAX_BODY = 16 * 1024;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const conteudo = await carregarConteudo(process.env.CONTENT_DIR || path.join(ROOT, 'content'));
const progress = createProgressStore(
  process.env.DATA_DIR || path.join(ROOT, 'data'),
  process.env.PROGRESSO_MD || path.join(ROOT, 'PROGRESSO.md'),
  conteudo.catalogo(),
);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

// Converte a URL pedida em um caminho dentro de public/, ou null se sair dele.
function resolvePublicPath(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.includes('\0')) return null;
  if (decoded.endsWith('/')) decoded += 'index.html';
  const full = path.resolve(PUBLIC_DIR, '.' + path.posix.normalize('/' + decoded));
  return full.startsWith(PUBLIC_DIR + path.sep) ? full : null;
}

async function serveStatic(req, res) {
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = resolvePublicPath(pathname);
  if (!file) return send(res, 403, 'Forbidden');

  const type = MIME[path.extname(file).toLowerCase()];
  try {
    const info = await stat(file);
    if (!info.isFile() || !type) return send(res, 404, 'Not found');
    const body = await readFile(file);
    send(res, 200, req.method === 'HEAD' ? undefined : body, type);
  } catch {
    send(res, 404, 'Not found');
  }
}

function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8');
}

// Só aceita o próprio app: bloqueia outros sites (CSRF) e DNS rebinding.
function origemLocal(req) {
  const { port } = server.address();
  const permitidos = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!permitidos.includes(req.headers.host)) return false;
  if (req.method === 'GET') return true;
  return permitidos.some((h) => req.headers.origin === `http://${h}`);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    const partes = [];
    let tamanho = 0;
    req.on('data', function onData(chunk) {
      tamanho += chunk.length;
      if (tamanho > MAX_BODY) {
        // Para de acumular, mas drena o resto para o cliente receber o 413.
        req.off('data', onData);
        req.resume();
        reject(Object.assign(new Error('body grande demais'), { status: 413 }));
        return;
      }
      partes.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(partes).toString('utf8')));
    req.on('error', reject);
  });
}

// Rotas de leitura de conteúdo: o parâmetro só é usado como chave de busca em memória.
const ROTAS_CONTEUDO = [
  [/^\/api\/modulos$/, () => conteudo.modulos()],
  [/^\/api\/licoes\/([^/]+)$/, (id) => conteudo.licao(id)],
  [/^\/api\/i18n\/([^/]+)$/, (lang) => conteudo.i18n(lang)],
];

async function handleApi(req, res, pathname) {
  if (!origemLocal(req)) return sendJson(res, 403, { erro: 'origem não permitida' });

  for (const [re, buscar] of ROTAS_CONTEUDO) {
    const m = re.exec(pathname);
    if (!m) continue;
    if (req.method !== 'GET') return sendJson(res, 405, { erro: 'método não permitido' });
    const dados = buscar(...m.slice(1));
    return dados ? sendJson(res, 200, dados) : sendJson(res, 404, { erro: 'não encontrado' });
  }

  if (pathname === '/api/resumo') {
    if (req.method !== 'GET') return sendJson(res, 405, { erro: 'método não permitido' });
    return sendJson(res, 200, resumir(await progress.ler(), hoje(), conteudo.catalogo()));
  }

  if (pathname !== '/api/progress') return sendJson(res, 404, { erro: 'rota inexistente' });
  if (req.method === 'GET') return sendJson(res, 200, await progress.ler());
  if (req.method !== 'POST') return sendJson(res, 405, { erro: 'método não permitido' });

  if (!req.headers['content-type']?.startsWith('application/json')) {
    return sendJson(res, 415, { erro: 'use application/json' });
  }
  if (Number(req.headers['content-length']) > MAX_BODY) {
    return sendJson(res, 413, { erro: 'body grande demais' });
  }
  let corpo;
  try {
    corpo = JSON.parse(await lerCorpo(req));
  } catch (err) {
    return sendJson(res, err.status ?? 400, { erro: err.status ? err.message : 'JSON inválido' });
  }
  const evento = validarEvento(corpo);
  if (typeof evento === 'string') return sendJson(res, 400, { erro: evento });

  const estado = await progress.registrar(evento);
  sendJson(res, 201, { ok: true, total: estado.eventos.length });
}

const server = createServer((req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/')) {
    return handleApi(req, res, pathname).catch((err) => {
      console.error(err);
      sendJson(res, 500, { erro: 'erro interno' });
    });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return send(res, 405, 'Method not allowed');
  }
  serveStatic(req, res).catch(() => send(res, 500, 'Internal error'));
});

function openBrowser(url) {
  if (process.env.NO_OPEN) return;
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

let port = BASE_PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE' && port < BASE_PORT + MAX_PORT_TRIES - 1) {
    server.listen(++port, HOST);
    return;
  }
  console.error(`Não foi possível iniciar o servidor: ${err.message}`);
  process.exit(1);
});

server.once('listening', () => {
  const url = `http://${HOST}:${server.address().port}/`;
  console.log(`Estudo Liferay: ${url}`);
  openBrowser(url);
});

server.listen(port, HOST);
