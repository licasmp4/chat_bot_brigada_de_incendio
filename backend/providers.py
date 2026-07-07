import openai
import anthropic

from config import PROVIDERS, SYSTEM_PROMPT, get_api_key


class MissingAPIKeyError(Exception):
    pass


def stream_reply(provider_id, messages, api_key=None):
    cfg = PROVIDERS[provider_id]
    # chave enviada pelo navegador tem prioridade sobre o .env
    api_key = api_key or get_api_key(provider_id)
    if not api_key:
        raise MissingAPIKeyError(
            f"Chave da API do {cfg['label']} não configurada. "
            f"Cole a sua no botão 🔑 Chaves, ou defina {cfg['env']} no .env."
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
