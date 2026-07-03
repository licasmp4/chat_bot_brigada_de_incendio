# Chatbot Brigada de Incêndio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Flask + vanilla HTML/CSS/JS chatbot focused exclusively on brigada de incêndio, letting the user pick between 6 AI providers (Groq, Grok, Gemini, ChatGPT, Claude, DeepSeek), streaming responses in real time, styled neo-brutalist.

**Architecture:** Backend Flask app with a single provider adapter module (`stream_reply`) that talks to 5 providers via the `openai` SDK (base_url swap — they all speak the OpenAI chat-completions schema) and to Claude via the `anthropic` SDK. Frontend is plain HTML/CSS/JS with no build step, served by Flask from a separate `frontend/` folder. Chat history lives in the browser's `localStorage`; nothing is persisted server-side.

**Tech Stack:** Python 3, Flask, `openai` SDK, `anthropic` SDK, `python-dotenv`, vanilla HTML/CSS/JS.

## Global Constraints

- Only 2 API-client dependencies allowed (`openai`, `anthropic`) — do not add LiteLLM or other provider SDKs.
- No RAG, no database, no server-side session/persistence — history lives in browser `localStorage` only.
- Responses must stream (chunked), not return all at once.
- Every provider call must include `SYSTEM_PROMPT` restricting the bot to brigada de incêndio / fire-safety topics, refusing anything else.
- Missing API key for a provider must produce a friendly in-chat error, never a raw 500 or crash.
- Visual style is neo-brutalist: thick black borders, flat solid colors, hard offset shadows (no blur), minimal/no border-radius — combined with smooth, subtle animations (fade/slide on message entry, typing indicator, pressed-button feedback), all respecting `prefers-reduced-motion`.
- No test framework dependency (no pytest) — self-checks are plain `assert`-based scripts runnable via `python backend/test_*.py`, using `unittest.mock` from the standard library where mocking is needed.
- Backend and frontend stay in separate top-level folders (`backend/`, `frontend/`).

---

### Task 1: Backend config — provider registry and system prompt

**Files:**
- Create: `backend/config.py`
- Create: `backend/test_config.py`

**Interfaces:**
- Produces: `PROVIDERS: dict[str, dict]` (keys: `groq`, `grok`, `gemini`, `chatgpt`, `deepseek`, `claude`; each value has `label: str`, `sdk: "openai" | "anthropic"`, `base_url: str | None`, `env: str`, `model: str`), `SYSTEM_PROMPT: str`, `get_api_key(provider_id: str) -> str | None`.

- [ ] **Step 1: Write the failing self-check test**

Create `backend/test_config.py`:

```python
"""Self-check for backend/config.py — validates provider registry shape.
Run directly: python backend/test_config.py
"""
from config import PROVIDERS, SYSTEM_PROMPT, get_api_key

REQUIRED_KEYS = {"label", "sdk", "base_url", "env", "model"}
VALID_SDKS = {"openai", "anthropic"}
EXPECTED_PROVIDERS = {"groq", "grok", "gemini", "chatgpt", "deepseek", "claude"}


def test_all_providers_present():
    assert set(PROVIDERS.keys()) == EXPECTED_PROVIDERS, PROVIDERS.keys()


def test_provider_shape():
    for provider_id, cfg in PROVIDERS.items():
        missing = REQUIRED_KEYS - cfg.keys()
        assert not missing, f"{provider_id} missing keys: {missing}"
        assert cfg["sdk"] in VALID_SDKS, f"{provider_id} has invalid sdk: {cfg['sdk']}"
        assert cfg["env"], f"{provider_id} has empty env var name"
        assert cfg["model"], f"{provider_id} has empty model name"
        assert cfg["label"], f"{provider_id} has empty label"


def test_system_prompt_defined():
    assert isinstance(SYSTEM_PROMPT, str) and len(SYSTEM_PROMPT) > 20


def test_get_api_key_reads_env(monkeypatch_env=None):
    import os

    os.environ["GROQ_API_KEY"] = "test-value-123"
    assert get_api_key("groq") == "test-value-123"
    del os.environ["GROQ_API_KEY"]
    assert get_api_key("groq") is None


if __name__ == "__main__":
    test_all_providers_present()
    test_provider_shape()
    test_system_prompt_defined()
    test_get_api_key_reads_env()
    print("OK - config.py valid")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python test_config.py`
Expected: `ModuleNotFoundError: No module named 'config'` (or ImportError, since `config.py` doesn't exist yet).

- [ ] **Step 3: Write `backend/config.py`**

```python
import os

SYSTEM_PROMPT = (
    "Você é um assistente especializado em brigada de incêndio e segurança "
    "contra incêndio: procedimentos de emergência, uso de extintores e "
    "hidrantes, rotas de fuga e abandono de área, prevenção de incêndio, "
    "primeiros socorros ligados a emergências de incêndio, e normas "
    "brasileiras relacionadas (como NBRs de segurança contra incêndio). "
    "Responda sempre em português do Brasil, de forma clara e direta. "
    "Se a pergunta não tiver relação com brigada de incêndio ou segurança "
    "contra incêndio, recuse educadamente e explique que só pode ajudar "
    "com esse assunto."
)

PROVIDERS = {
    "groq": {
        "label": "Groq",
        "sdk": "openai",
        "base_url": "https://api.groq.com/openai/v1",
        "env": "GROQ_API_KEY",
        "model": "llama-3.3-70b-versatile",
    },
    "grok": {
        "label": "Grok",
        "sdk": "openai",
        "base_url": "https://api.x.ai/v1",
        "env": "XAI_API_KEY",
        "model": "grok-3",
    },
    "gemini": {
        "label": "Gemini",
        "sdk": "openai",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai/",
        "env": "GEMINI_API_KEY",
        "model": "gemini-2.5-flash",
    },
    "chatgpt": {
        "label": "ChatGPT",
        "sdk": "openai",
        "base_url": None,
        "env": "OPENAI_API_KEY",
        "model": "gpt-4o-mini",
    },
    "deepseek": {
        "label": "DeepSeek",
        "sdk": "openai",
        "base_url": "https://api.deepseek.com",
        "env": "DEEPSEEK_API_KEY",
        "model": "deepseek-chat",
    },
    "claude": {
        "label": "Claude",
        "sdk": "anthropic",
        "base_url": None,
        "env": "ANTHROPIC_API_KEY",
        "model": "claude-sonnet-5",
    },
}


def get_api_key(provider_id):
    return os.environ.get(PROVIDERS[provider_id]["env"])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python test_config.py`
Expected: `OK - config.py valid`

- [ ] **Step 5: Commit**

```bash
git add backend/config.py backend/test_config.py
git commit -m "feat: add provider registry and system prompt config"
```

---

### Task 2: Backend provider adapter — unified streaming across 6 providers

**Files:**
- Create: `backend/providers.py`
- Create: `backend/test_providers.py`

**Interfaces:**
- Consumes: `config.PROVIDERS`, `config.SYSTEM_PROMPT`, `config.get_api_key(provider_id)` from Task 1.
- Produces: `stream_reply(provider_id: str, messages: list[dict]) -> Iterator[str]`, `MissingAPIKeyError(Exception)`.

- [ ] **Step 1: Write the failing tests**

Create `backend/test_providers.py`:

```python
"""Self-check for backend/providers.py — mocks the SDK clients, no network calls.
Run directly: python backend/test_providers.py
"""
import os
from unittest.mock import MagicMock, patch

import config
from providers import MissingAPIKeyError, stream_reply


def test_missing_api_key_raises():
    os.environ.pop("GROQ_API_KEY", None)
    try:
        list(stream_reply("groq", [{"role": "user", "content": "oi"}]))
        raise AssertionError("expected MissingAPIKeyError")
    except MissingAPIKeyError:
        pass


def test_openai_branch_yields_text_chunks():
    os.environ["GROQ_API_KEY"] = "fake-key"

    fake_chunk_1 = MagicMock()
    fake_chunk_1.choices = [MagicMock(delta=MagicMock(content="Olá"))]
    fake_chunk_2 = MagicMock()
    fake_chunk_2.choices = [MagicMock(delta=MagicMock(content=" mundo"))]

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = [fake_chunk_1, fake_chunk_2]

    with patch("providers.openai.OpenAI", return_value=fake_client) as fake_ctor:
        result = list(stream_reply("groq", [{"role": "user", "content": "oi"}]))

    assert result == ["Olá", " mundo"], result

    fake_ctor.assert_called_once_with(api_key="fake-key", base_url=config.PROVIDERS["groq"]["base_url"])
    call_kwargs = fake_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["model"] == config.PROVIDERS["groq"]["model"]
    assert call_kwargs["messages"][0] == {"role": "system", "content": config.SYSTEM_PROMPT}
    assert call_kwargs["messages"][1] == {"role": "user", "content": "oi"}
    assert call_kwargs["stream"] is True


def test_anthropic_branch_yields_text_chunks():
    os.environ["ANTHROPIC_API_KEY"] = "fake-key"

    fake_stream_cm = MagicMock()
    fake_stream_cm.__enter__.return_value.text_stream = iter(["Olá", " mundo"])
    fake_stream_cm.__exit__.return_value = False

    fake_client = MagicMock()
    fake_client.messages.stream.return_value = fake_stream_cm

    with patch("providers.anthropic.Anthropic", return_value=fake_client) as fake_ctor:
        result = list(stream_reply("claude", [{"role": "user", "content": "oi"}]))

    assert result == ["Olá", " mundo"], result

    fake_ctor.assert_called_once_with(api_key="fake-key")
    call_kwargs = fake_client.messages.stream.call_args.kwargs
    assert call_kwargs["model"] == config.PROVIDERS["claude"]["model"]
    assert call_kwargs["system"] == config.SYSTEM_PROMPT
    assert call_kwargs["messages"] == [{"role": "user", "content": "oi"}]


if __name__ == "__main__":
    test_missing_api_key_raises()
    test_openai_branch_yields_text_chunks()
    test_anthropic_branch_yields_text_chunks()
    print("OK - providers.py adapter valid")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python test_providers.py`
Expected: `ModuleNotFoundError: No module named 'providers'`

- [ ] **Step 3: Write `backend/providers.py`**

```python
import openai
import anthropic

from config import PROVIDERS, SYSTEM_PROMPT, get_api_key


class MissingAPIKeyError(Exception):
    pass


def stream_reply(provider_id, messages):
    cfg = PROVIDERS[provider_id]
    api_key = get_api_key(provider_id)
    if not api_key:
        raise MissingAPIKeyError(
            f"Chave da API do {cfg['label']} não configurada. "
            f"Defina {cfg['env']} no arquivo .env."
        )

    if cfg["sdk"] == "openai":
        yield from _stream_openai(cfg, api_key, messages)
    else:
        yield from _stream_anthropic(cfg, api_key, messages)


def _stream_openai(cfg, api_key, messages):
    client = openai.OpenAI(api_key=api_key, base_url=cfg["base_url"])
    full_messages = [{"role": "system", "content": SYSTEM_PROMPT}] + messages
    stream = client.chat.completions.create(
        model=cfg["model"],
        messages=full_messages,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta


def _stream_anthropic(cfg, api_key, messages):
    client = anthropic.Anthropic(api_key=api_key)
    with client.messages.stream(
        model=cfg["model"],
        system=SYSTEM_PROMPT,
        messages=messages,
        max_tokens=1024,
    ) as stream:
        for text in stream.text_stream:
            yield text
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && python test_providers.py`
Expected: `OK - providers.py adapter valid`

- [ ] **Step 5: Commit**

```bash
git add backend/providers.py backend/test_providers.py
git commit -m "feat: add unified streaming adapter for 6 AI providers"
```

---

### Task 3: Flask app — routes, streaming response, HTML skeleton

**Files:**
- Create: `backend/app.py`
- Create: `backend/test_app.py`
- Create: `frontend/index.html`

**Interfaces:**
- Consumes: `providers.stream_reply(provider_id, messages)`, `providers.MissingAPIKeyError`, `config.PROVIDERS` from Tasks 1-2.
- Produces: Flask `app` object (importable as `from app import app`). Route `GET /` renders `frontend/index.html`. Route `POST /chat` accepts JSON `{"provider": str, "messages": [{"role": str, "content": str}, ...]}`, returns a `text/plain` streamed response body (plain text chunks, not JSON, not SSE-formatted). `frontend/index.html` defines: `#provider-select` (populated from `providers`, one `<option>` per provider id/label), `#chat-window`, `#chat-form`, `#chat-input`, `#new-chat-btn`, and links `css/style.css` / `js/chat.js` via `url_for('static', ...)` (files created in Tasks 4-5; missing them causes a 404 on those assets but does not break page render).

- [ ] **Step 1: Write the failing tests**

Create `backend/test_app.py`:

```python
"""Self-check for backend/app.py using Flask's test client, no real network calls.
Run directly: python backend/test_app.py
"""
from unittest.mock import patch

from app import app
from providers import MissingAPIKeyError


def test_index_serves_html():
    client = app.test_client()
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"<!doctype html>" in resp.data.lower()


def test_chat_rejects_invalid_provider():
    client = app.test_client()
    resp = client.post("/chat", json={"provider": "nope", "messages": [{"role": "user", "content": "oi"}]})
    assert resp.status_code == 400


def test_chat_rejects_empty_messages():
    client = app.test_client()
    resp = client.post("/chat", json={"provider": "groq", "messages": []})
    assert resp.status_code == 400


def test_chat_streams_provider_output():
    client = app.test_client()
    with patch("app.stream_reply", return_value=iter(["Olá", " mundo"])):
        resp = client.post(
            "/chat",
            json={"provider": "groq", "messages": [{"role": "user", "content": "oi"}]},
        )
    assert resp.status_code == 200
    assert resp.get_data(as_text=True) == "Olá mundo"


def test_chat_handles_missing_api_key():
    client = app.test_client()

    def raise_missing_key(*args, **kwargs):
        raise MissingAPIKeyError("Chave da API do Groq não configurada.")

    with patch("app.stream_reply", side_effect=raise_missing_key):
        resp = client.post(
            "/chat",
            json={"provider": "groq", "messages": [{"role": "user", "content": "oi"}]},
        )
    assert resp.status_code == 200
    assert "erro" in resp.get_data(as_text=True).lower()


if __name__ == "__main__":
    test_index_serves_html()
    test_chat_rejects_invalid_provider()
    test_chat_rejects_empty_messages()
    test_chat_streams_provider_output()
    test_chat_handles_missing_api_key()
    print("OK - app.py valid")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && python test_app.py`
Expected: `ModuleNotFoundError: No module named 'app'`

- [ ] **Step 3: Write `backend/app.py`**

```python
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, Response, jsonify, render_template, request

from config import PROVIDERS
from providers import MissingAPIKeyError, stream_reply

app = Flask(
    __name__,
    static_folder="../frontend",
    static_url_path="/static",
    template_folder="../frontend",
)


@app.route("/")
def index():
    return render_template("index.html", providers=PROVIDERS)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True, silent=True) or {}
    provider_id = data.get("provider")
    messages = data.get("messages")

    if provider_id not in PROVIDERS:
        return jsonify({"error": "provider inválido"}), 400
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "messages inválido"}), 400

    def generate():
        try:
            for chunk in stream_reply(provider_id, messages):
                yield chunk
        except MissingAPIKeyError as exc:
            yield f"\n\n[erro] {exc}"
        except Exception as exc:
            yield f"\n\n[erro] Falha ao consultar {PROVIDERS[provider_id]['label']}: {exc}"

    return Response(generate(), mimetype="text/plain")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

- [ ] **Step 4: Write `frontend/index.html`**

```html
<!doctype html>
<html lang="pt-br">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Brigada de Incêndio — Assistente</title>
  <link rel="stylesheet" href="{{ url_for('static', filename='css/style.css') }}" />
</head>
<body>
  <header class="app-header">
    <h1>🔥 Assistente Brigada de Incêndio</h1>
    <div class="controls">
      <select id="provider-select" aria-label="Escolher provedor de IA">
        {% for id, cfg in providers.items() %}
        <option value="{{ id }}">{{ cfg.label }}</option>
        {% endfor %}
      </select>
      <button id="new-chat-btn" type="button">Nova conversa</button>
    </div>
  </header>

  <main id="chat-window" aria-live="polite"></main>

  <form id="chat-form" autocomplete="off">
    <input
      id="chat-input"
      type="text"
      placeholder="Pergunte sobre segurança contra incêndio..."
      aria-label="Mensagem"
      required
    />
    <button type="submit">Enviar</button>
  </form>

  <script src="{{ url_for('static', filename='js/chat.js') }}"></script>
</body>
</html>
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && python test_app.py`
Expected: `OK - app.py valid`

- [ ] **Step 6: Commit**

```bash
git add backend/app.py backend/test_app.py frontend/index.html
git commit -m "feat: add Flask app with streaming /chat route and HTML skeleton"
```

---

### Task 4: Neo-brutalist styling

**Files:**
- Create: `frontend/css/style.css`

**Interfaces:**
- Consumes: class/id names from `frontend/index.html` (Task 3): `.app-header`, `.controls`, `#chat-window`, `#chat-form`, `#chat-input`, `#provider-select`, `#new-chat-btn`. Also styles `.message`, `.message.user`, `.message.bot`, `.message.error`, `.typing-indicator` — classes that `frontend/js/chat.js` (Task 5) will add dynamically at runtime.
- Produces: `frontend/css/style.css`, loaded by `index.html` via `url_for('static', filename='css/style.css')`.

No unit test applies to static CSS — verification is visual, done in Step 2.

- [ ] **Step 1: Write `frontend/css/style.css`**

```css
:root {
  --color-bg: #f5f3ee;
  --color-fg: #111111;
  --color-alarm: #e8402b;
  --color-alert: #ffc72c;
  --color-panel: #ffffff;
  --border-width: 3px;
  --shadow-offset: 6px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: Arial, Helvetica, sans-serif;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: var(--color-alarm);
  color: #fff;
  border-bottom: var(--border-width) solid var(--color-fg);
}

.app-header h1 {
  font-size: 1.4rem;
  font-weight: 900;
  margin: 0;
  text-transform: uppercase;
}

.controls {
  display: flex;
  gap: 10px;
}

select,
button,
input[type="text"] {
  font: inherit;
  border: var(--border-width) solid var(--color-fg);
  border-radius: 4px;
  padding: 8px 12px;
  background: var(--color-panel);
  color: var(--color-fg);
}

select {
  transition: background-color 150ms ease-out, border-color 150ms ease-out;
}

select:focus {
  background-color: var(--color-alert);
  outline: none;
}

button {
  background: var(--color-alert);
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0 var(--color-fg);
  transition: transform 120ms ease-out, box-shadow 120ms ease-out;
}

button:hover {
  transform: translate(-2px, -2px);
  box-shadow: calc(var(--shadow-offset) + 2px) calc(var(--shadow-offset) + 2px) 0 var(--color-fg);
}

button:active {
  transform: translate(2px, 2px);
  box-shadow: 2px 2px 0 var(--color-fg);
}

#chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  overflow-y: auto;
}

.message {
  max-width: 70ch;
  padding: 12px 16px;
  border: var(--border-width) solid var(--color-fg);
  border-radius: 4px;
  background: var(--color-panel);
  box-shadow: var(--shadow-offset) var(--shadow-offset) 0 var(--color-fg);
  animation: message-in 200ms ease-out;
  white-space: pre-wrap;
}

.message.user {
  align-self: flex-end;
  background: var(--color-alert);
}

.message.bot {
  align-self: flex-start;
}

.message.error {
  align-self: flex-start;
  background: var(--color-alarm);
  color: #fff;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.typing-indicator {
  display: inline-flex;
  gap: 4px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-fg);
  animation: typing-pulse 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.15s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-pulse {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }
  40% {
    opacity: 1;
  }
}

#chat-form {
  display: flex;
  gap: 10px;
  padding: 16px 20px;
  border-top: var(--border-width) solid var(--color-fg);
  background: var(--color-panel);
}

#chat-input {
  flex: 1;
}

@media (prefers-reduced-motion: reduce) {
  .message {
    animation: none;
  }
  .typing-indicator span {
    animation: none;
  }
  button {
    transition: none;
  }
}
```

- [ ] **Step 2: Verify visually**

Run: `cd backend && python app.py`, open `http://localhost:5000` in a browser.
Expected: red header with title and dropdown/button styled with thick black borders and hard shadows, cream background, input form pinned to the bottom with the same border/shadow treatment. (Chat window will be empty and the form won't submit yet — `chat.js` doesn't exist until Task 5.)

- [ ] **Step 3: Commit**

```bash
git add frontend/css/style.css
git commit -m "feat: add neo-brutalist styling"
```

---

### Task 5: Frontend interactivity — streaming, provider selection, localStorage

**Files:**
- Create: `frontend/js/chat.js`

**Interfaces:**
- Consumes: DOM ids from `frontend/index.html` (Task 3): `#chat-window`, `#chat-form`, `#chat-input`, `#provider-select`, `#new-chat-btn`. Backend contract from Task 3: `POST /chat` with JSON `{"provider": string, "messages": [{"role": "user"|"assistant", "content": string}, ...]}`, response body is streamed plain text.
- Produces: `frontend/js/chat.js`, loaded by `index.html` via `url_for('static', filename='js/chat.js')`. Uses `localStorage` key `"brigada-chat-history"` (JSON array of `{role, content}`).

No unit test applies to this browser-only script (no build/JS-test tooling in this stack, per Global Constraints) — verification is manual, done in Step 2.

- [ ] **Step 1: Write `frontend/js/chat.js`**

```js
const STORAGE_KEY = "brigada-chat-history";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const providerSelect = document.getElementById("provider-select");
const newChatBtn = document.getElementById("new-chat-btn");

function loadHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

function renderHistory(history) {
  chatWindow.innerHTML = "";
  for (const msg of history) {
    renderMessage(msg.role === "user" ? "user" : "bot", msg.content);
  }
}

function showTypingIndicator() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

let history = loadHistory();
renderHistory(history);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  history.push({ role: "user", content: text });
  renderMessage("user", text);
  saveHistory(history);

  const typingEl = showTypingIndicator();

  try {
    const response = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: providerSelect.value, messages: history }),
    });

    typingEl.remove();

    if (!response.ok || !response.body) {
      renderMessage("error", "Não foi possível falar com o servidor. Tente novamente.");
      return;
    }

    const botEl = renderMessage("bot", "");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let botText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      botText += decoder.decode(value, { stream: true });
      botEl.textContent = botText;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    history.push({ role: "assistant", content: botText });
    saveHistory(history);
  } catch (err) {
    typingEl.remove();
    renderMessage("error", "Erro de conexão. Verifique sua internet e tente novamente.");
  }
});

newChatBtn.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory(history);
});
```

- [ ] **Step 2: Verify manually end-to-end**

Run: `cd backend && python app.py`, open `http://localhost:5000`.

1. Type a message and submit with any provider selected (no API key set yet).
   Expected: your message appears as a right-aligned yellow bubble, a typing indicator (three pulsing dots) appears briefly, then it's replaced by a red error bubble reading "Chave da API do \<provider\> não configurada. Defina \<ENV_VAR\> no arquivo .env."
2. Reload the page.
   Expected: the same messages are still there (loaded from `localStorage`).
3. Click "Nova conversa".
   Expected: chat window clears, and reloading the page keeps it empty.
4. (Optional, only if you have a real key) Add one provider's key to `.env`, restart the server, send a message.
   Expected: response text streams in progressively into a left-aligned white bubble, not all at once.

- [ ] **Step 3: Commit**

```bash
git add frontend/js/chat.js
git commit -m "feat: add streaming chat UI with localStorage history"
```

---

### Task 6: Project docs, dependency manifest, env template

**Files:**
- Create: `backend/requirements.txt`
- Create: `.env.example`
- Create: `README.md`

**Interfaces:**
- Consumes: `config.PROVIDERS` keys/env var names from Task 1 (to document in `.env.example`).
- Produces: nothing consumed by other tasks — this is the last task.

- [ ] **Step 1: Write `backend/requirements.txt`**

```
flask
python-dotenv
openai
anthropic
```

- [ ] **Step 2: Write `.env.example`**

```
# Groq — https://console.groq.com/keys
GROQ_API_KEY=

# Grok (xAI) — https://console.x.ai
XAI_API_KEY=

# Gemini — https://aistudio.google.com/apikey
GEMINI_API_KEY=

# ChatGPT (OpenAI) — https://platform.openai.com/api-keys
OPENAI_API_KEY=

# DeepSeek — https://platform.deepseek.com/api_keys
DEEPSEEK_API_KEY=

# Claude (Anthropic) — https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: Write `README.md`**

```markdown
# Assistente Brigada de Incêndio

Chatbot web focado em brigada de incêndio e segurança contra incêndio.
Escolha entre 6 provedores de IA (Groq, Grok, Gemini, ChatGPT, Claude,
DeepSeek) e converse em linguagem natural — o bot só responde sobre esse
assunto.

## Rodando localmente

1. Crie um ambiente virtual e instale as dependências:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r backend/requirements.txt
   ```

2. Copie `.env.example` para `.env` e preencha ao menos uma chave de API:

   ```bash
   cp .env.example .env
   ```

3. Rode o servidor:

   ```bash
   cd backend
   python app.py
   ```

4. Abra `http://localhost:5000` no navegador.

## Estrutura

- `backend/` — Flask, adapter de providers, config.
- `frontend/` — HTML/CSS/JS puro, sem build step.
- Histórico de conversa fica só no navegador (`localStorage`) — nada é
  salvo no servidor.

## Testes

Cada módulo do backend tem um self-check executável direto, sem
framework de teste:

```bash
cd backend
python test_config.py
python test_providers.py
python test_app.py
```
```

- [ ] **Step 4: Verify self-checks still pass together**

Run: `cd backend && python test_config.py && python test_providers.py && python test_app.py`
Expected: all three print their `OK - ...` lines, no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt .env.example README.md
git commit -m "docs: add README, requirements.txt, and .env.example"
```
