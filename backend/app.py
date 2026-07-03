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
