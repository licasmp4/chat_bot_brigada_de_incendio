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
