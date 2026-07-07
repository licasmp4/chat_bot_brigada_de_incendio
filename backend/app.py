import os
import time
from collections import defaultdict, deque
from threading import Lock

from dotenv import load_dotenv

load_dotenv()

from flask import Flask, Response, jsonify, render_template, request

from config import PROVIDERS, get_api_key
from providers import MissingAPIKeyError, stream_reply

app = Flask(
    __name__,
    static_folder="../frontend",
    static_url_path="/static",
    template_folder="../frontend",
)

# limites do /chat — protegem a chave do .env de abuso e o bolso de conversa infinita
RATE_LIMIT = 15      # requisições por janela, por IP
RATE_WINDOW = 60     # segundos
MAX_MESSAGES = 20    # só as últimas N mensagens vão pra IA
MAX_CHARS = 4000     # por mensagem

# ponytail: contador em memória, por worker; flask-limiter + redis se escalar
_hits = defaultdict(deque)
_hits_lock = Lock()


def _client_ip():
    # atrás de proxy (Render/Railway), o IP real vem no X-Forwarded-For
    forwarded = request.headers.get("X-Forwarded-For", "")
    return forwarded.split(",")[0].strip() or request.remote_addr or "?"


def _rate_limited(ip):
    now = time.monotonic()
    with _hits_lock:
        hits = _hits[ip]
        while hits and now - hits[0] > RATE_WINDOW:
            hits.popleft()
        if len(hits) >= RATE_LIMIT:
            return True
        hits.append(now)
        if len(_hits) > 10_000:
            for key in [k for k, q in _hits.items() if not q]:
                del _hits[key]
        return False


@app.route("/")
def index():
    providers = {
        pid: {**cfg, "configured": bool(get_api_key(pid))}
        for pid, cfg in PROVIDERS.items()
    }
    return render_template("index.html", providers=providers)


@app.route("/chat", methods=["POST"])
def chat():
    if _rate_limited(_client_ip()):
        return jsonify({
            "error": "Calma, brigadista! Muitas perguntas de uma vez — "
                     "o Chefe Hidrante pediu um minutinho pra recarregar o extintor."
        }), 429

    data = request.get_json(force=True, silent=True) or {}
    provider_id = data.get("provider")
    messages = data.get("messages")

    if provider_id not in PROVIDERS:
        return jsonify({"error": "provider inválido"}), 400
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "messages inválido"}), 400
    if any(
        not isinstance(m, dict)
        or m.get("role") not in ("user", "assistant")
        or not isinstance(m.get("content"), str)
        or not m["content"].strip()
        for m in messages
    ):
        return jsonify({"error": "mensagem inválida"}), 400

    # só as últimas mensagens, cortadas, e começando em "user" (exigência da API)
    messages = [
        {"role": m["role"], "content": m["content"][:MAX_CHARS]}
        for m in messages[-MAX_MESSAGES:]
    ]
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    if not messages:
        return jsonify({"error": "messages inválido"}), 400

    # chave do navegador (botão 🔑) tem prioridade sobre o .env
    user_key = (data.get("api_key") or "").strip()[:256] or None
    api_key = user_key or get_api_key(provider_id)
    if not api_key:
        cfg = PROVIDERS[provider_id]
        return jsonify({
            "error": f"Chave da API do {cfg['label']} não configurada. "
                     f"Cole a sua no botão 🔑 Chaves, ou defina {cfg['env']} no .env."
        }), 400

    def generate():
        try:
            for chunk in stream_reply(provider_id, messages, api_key):
                yield chunk
        except MissingAPIKeyError as exc:
            yield f"\n\n[erro] {exc}"
        except Exception as exc:
            yield f"\n\n[erro] Falha ao consultar {PROVIDERS[provider_id]['label']}: {exc}"

    return Response(generate(), mimetype="text/plain")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5005))
    # com PORT definido (deploy), debug desliga; local continua com reload
    app.run(host="0.0.0.0", port=port, debug="PORT" not in os.environ)


