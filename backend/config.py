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
