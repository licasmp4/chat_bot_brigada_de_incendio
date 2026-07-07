import os

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


@app.route("/")
def index():
    providers = {
        pid: {**cfg, "configured": bool(get_api_key(pid))}
        for pid, cfg in PROVIDERS.items()
    }
    return render_template("index.html", providers=providers)


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True, silent=True) or {}
    provider_id = data.get("provider")
    messages = data.get("messages")

    if provider_id not in PROVIDERS:
        return jsonify({"error": "provider inválido"}), 400
    if not isinstance(messages, list) or not messages:
        return jsonify({"error": "messages inválido"}), 400
    if any(m.get("role") not in ("user", "assistant") for m in messages):
        return jsonify({"error": "role de mensagem inválida"}), 400

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
    port = int(os.environ.get("PORT", 5000))
    # com PORT definido (deploy), debug desliga; local continua com reload
    app.run(host="0.0.0.0", port=port, debug="PORT" not in os.environ)


