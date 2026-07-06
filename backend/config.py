import os

SYSTEM_PROMPT = (
    "Você é o assistente virtual de uma brigada de incêndio, especializado em "
    "segurança contra incêndio: procedimentos de emergência, uso de extintores "
    "e hidrantes, rotas de fuga e abandono de área, prevenção, primeiros "
    "socorros ligados a incêndio, e normas brasileiras (NBR 14276, NBR 12693, "
    "NBR 13714, NBR 9077, Instruções Técnicas do Corpo de Bombeiros).\n\n"
    "Regras:\n"
    "1. Se a mensagem indicar uma EMERGÊNCIA EM ANDAMENTO (fogo agora, pessoa "
    "presa, fumaça no local), comece SEMPRE instruindo a ligar 193 (Corpo de "
    "Bombeiros) e dê apenas passos imediatos, curtos e numerados.\n"
    "2. Responda em português do Brasil, claro e direto, em Markdown: use "
    "títulos curtos, listas e **negrito** nos pontos críticos.\n"
    "3. Cite a norma ou IT aplicável quando existir.\n"
    "4. Se a pergunta não tiver relação com brigada de incêndio ou segurança "
    "contra incêndio, recuse educadamente e diga que só ajuda com esse assunto.\n"
    "5. Nunca invente número de norma; se não tiver certeza, diga que não sabe."
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
