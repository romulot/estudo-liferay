# Estudo Liferay

[Português](#português) · [English](#english)

---

## Português

App local para estudar Liferay **um pouco todo dia**: sessões curtas de 3 a 5 atividades (quiz e ordenar passos), sequência de dias, mapa de calor e progresso salvo em um arquivo `PROGRESSO.md`. Interface em pt-BR e en. O conteúdo é escrito com palavras próprias e cada lição aponta para a página oficial em [learn.liferay.com](https://learn.liferay.com/).

### Como rodar

Requisito: **Node.js 24** ou mais novo. Não há dependências para instalar.

```bash
npm start
```

O navegador abre em `http://127.0.0.1:4321/`. Se a porta estiver ocupada, o servidor tenta as próximas 9.

### Comandos

| Comando | O que faz |
|---|---|
| `npm start` | Sobe o servidor e abre o navegador |
| `npm test` | Roda os testes (lógica, validador e API) |
| `npm run check` | Valida o conteúdo: textos em pt e en, links oficiais, ids, respostas |

### Como funciona uma sessão

1. **Leitura**: resumo da lição nova, com link para a documentação oficial.
2. **Atividades**: até 5 que você ainda não fez, na ordem dos módulos. Se faltar, completa com revisão, começando pelas que você errou.
3. **Feedback na hora**: certo ou errado com ícone, texto e explicação.

A **sequência** aceita 1 dia sem estudo entre dois dias estudados; 2 dias seguidos sem estudo zeram a sequência.

### Onde fica o seu progresso

| Arquivo | Para quê |
|---|---|
| `data/progress.json` | **Fonte da verdade.** Cada resposta vira um evento. Faça backup desta pasta. |
| `data/progress.json.bak` | Cópia da gravação anterior, usada se o principal corromper. |
| `PROGRESSO.md` | Resumo legível, **gerado a cada atividade**. Não edite: será sobrescrito. |

A pasta `data/` fica fora do git (`.gitignore`). Para levar o progresso para outra máquina, copie `data/progress.json`.

### Adicionar ou editar lições

```
content/
  i18n/pt-BR.json, en.json     textos da interface
  modulos/<modulo>/
    _modulo.json               título e descrição do módulo
    <id-da-licao>.json         uma lição por arquivo
```

Cada lição tem `id` (igual ao nome do arquivo), `modulo`, `ordem`, `url` (learn.liferay.com), `versao`, `verificado_em`, `titulo`, `resumo` e `atividades` (`quiz` ou `ordenar`). Todo texto é `{ "pt": "...", "en": "..." }`. Veja [content/modulos/workspace/workspace-01-o-que-e.json](content/modulos/workspace/workspace-01-o-que-e.json) como modelo.

Depois de editar:

1. `npm run check` para achar erros (mostra arquivo e campo exatos).
2. Reinicie o `npm start`: o conteúdo é lido só na inicialização.

**Política de conteúdo:** escreva com suas palavras, faça perguntas originais e sempre aponte a página oficial. Não copie trechos da documentação. Atualize `verificado_em` ao conferir uma lição; o check avisa quando passam 180 dias.

### Variáveis de ambiente (opcionais)

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `4321` | Porta inicial |
| `NO_OPEN` | vazio | Qualquer valor impede abrir o navegador |
| `DATA_DIR` | `data/` | Onde gravar `progress.json` |
| `PROGRESSO_MD` | `PROGRESSO.md` | Onde gerar o resumo |
| `CONTENT_DIR` | `content/` | De onde ler o conteúdo |

### Segurança

O servidor escuta só em `127.0.0.1`, serve apenas a pasta `public/`, aceita gravação só vinda do próprio app (Origin e Host conferidos) e limita o corpo das requisições a 16 KB.

---

## English

A local app to study Liferay **a little every day**: short sessions of 3 to 5 activities (quizzes and step ordering), a day streak, a heatmap and progress saved to a `PROGRESSO.md` file. UI in pt-BR and en. Content is written in our own words and every lesson links to its official page on [learn.liferay.com](https://learn.liferay.com/).

### Running

Requirement: **Node.js 24** or newer. There are no dependencies to install.

```bash
npm start
```

The browser opens at `http://127.0.0.1:4321/`. If the port is taken, the server tries the next 9.

### Commands

| Command | What it does |
|---|---|
| `npm start` | Starts the server and opens the browser |
| `npm test` | Runs the tests (logic, validator and API) |
| `npm run check` | Validates content: pt and en texts, official links, ids, answers |

### How a session works

1. **Reading**: a summary of the new lesson, linking to the official docs.
2. **Activities**: up to 5 you have not done yet, in module order. If there are fewer, it fills in with review, starting with the ones you got wrong.
3. **Instant feedback**: right or wrong with icon, text and explanation.

The **streak** allows 1 day without study between two study days; 2 days in a row without study reset it.

### Where your progress lives

| File | Purpose |
|---|---|
| `data/progress.json` | **Source of truth.** Every answer becomes an event. Back up this folder. |
| `data/progress.json.bak` | Copy of the previous write, used if the main file gets corrupted. |
| `PROGRESSO.md` | Readable summary (in pt-BR), **regenerated after every activity**. Do not edit: it is overwritten. |

The `data/` folder is git-ignored. To move your progress to another machine, copy `data/progress.json`.

### Adding or editing lessons

See the folder layout in the Portuguese section above. Every lesson has `id` (same as the file name), `modulo`, `ordem`, `url` (learn.liferay.com), `versao`, `verificado_em`, `titulo`, `resumo` and `atividades` (`quiz` or `ordenar`). Every text is `{ "pt": "...", "en": "..." }`.

After editing:

1. Run `npm run check` to find errors (it shows the exact file and field).
2. Restart `npm start`: content is only read at startup.

**Content policy:** write in your own words, ask original questions and always link the official page. Do not copy passages from the documentation. Update `verificado_em` when you re-check a lesson; the check warns after 180 days.

### Environment variables (optional)

`PORT` (default `4321`), `NO_OPEN` (any value skips opening the browser), `DATA_DIR` (default `data/`), `PROGRESSO_MD` (default `PROGRESSO.md`), `CONTENT_DIR` (default `content/`).

### Security

The server only listens on `127.0.0.1`, only serves the `public/` folder, only accepts writes from the app itself (Origin and Host are checked) and limits request bodies to 16 KB.
