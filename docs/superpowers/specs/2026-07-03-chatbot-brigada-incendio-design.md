# Design: Chatbot Brigada de Incêndio

Data: 2026-07-03

## Objetivo

Chatbot web multi-provider focado exclusivamente em brigada de incêndio /
segurança contra incêndio (procedimentos, uso de extintor, rotas de fuga,
normas, primeiros socorros relacionados). Atende tanto brigadistas
treinados (dúvidas técnicas) quanto funcionários comuns (orientação
básica). Não responde nada fora desse escopo.

## Escopo

- Sem RAG / base de documentos: conhecimento vem só do modelo de IA por
  trás, guiado por um system prompt fixo que trava o assunto.
- Sem persistência em banco: histórico de conversa vive no `localStorage`
  do navegador. Reiniciar o servidor não perde nada porque nada é salvo
  no servidor.
- Chaves de API ficam em `.env`, preenchidas pelo usuário depois — o
  template `.env.example` documenta as 6 variáveis esperadas. Provider
  sem chave configurada retorna erro amigável na UI, não quebra o app.
- 6 providers: Groq, Grok (xAI), Gemini, ChatGPT (OpenAI), Claude
  (Anthropic), DeepSeek. Usuário escolhe o provider num dropdown; o
  modelo específico de cada provider é fixo, definido no código
  (facilita trocar depois sem mexer na UI).
- Resposta em streaming (chunks aparecendo em tempo real), não resposta
  completa de uma vez.

## Arquitetura

Groq, Grok, Gemini, ChatGPT e DeepSeek expõem endpoint compatível com o
schema `/chat/completions` da OpenAI. Por isso o backend usa o SDK
`openai` oficial, trocando só `base_url` e `api_key` por provider — cobre
5 dos 6 providers com uma dependência só. Claude (Anthropic) usa schema
`messages` próprio, então usa o SDK `anthropic` separado. Resultado: 2
dependências de API cobrindo os 6 providers, um adapter único no
backend, sem biblioteca de abstração extra (LiteLLM) nem 6 SDKs nativos.

## Estrutura de pastas

```
chat_bot_brigada_de_incendio/
├── .env.example             # 6 variáveis de chave, sem valor
├── .env                     # gitignored, chaves reais do usuário
├── .gitignore
├── README.md                 # como rodar, como configurar chaves
├── docs/superpowers/specs/   # specs de design (este arquivo)
├── backend/
│   ├── app.py                 # Flask app + rota POST /chat (streaming)
│   ├── config.py               # registro dos 6 providers + system prompt
│   ├── providers.py             # adapter único: stream_reply(provider, messages)
│   ├── test_providers.py        # self-check da config, sem chamar rede
│   └── requirements.txt
└── frontend/
    ├── index.html
    ├── css/style.css           # neo-brutalista + animações
    └── js/chat.js              # streaming fetch, seletor, histórico localStorage
```

Flask serve `frontend/` via `static_folder`/`template_folder` apontando
pra `../frontend`, então frontend e backend ficam em pastas separadas mas
servidos pela mesma origem (sem CORS).

## Backend

`config.py` define um dict `PROVIDERS` com, por provider: label, tipo de
SDK (`openai` ou `anthropic`), `base_url` (quando aplicável), nome da
env var da chave, e modelo fixo. Também define `SYSTEM_PROMPT`, inserido
como mensagem `system` em toda chamada aos 6 providers, instruindo o
modelo a responder só sobre brigada de incêndio / segurança contra
incêndio e recusar educadamente qualquer coisa fora disso.

`providers.py` expõe uma função só: `stream_reply(provider_id, messages)
-> Iterator[str]`. Ramifica em dois caminhos (`openai` / `anthropic`) e
normaliza a saída pra sempre yield texto puro, chunk a chunk — quem
chama não precisa saber qual provider está por trás. Chave de API
ausente levanta um erro específico (`MissingAPIKeyError`), capturado em
`app.py`.

`app.py` expõe `POST /chat` recebendo `{provider, messages}` (histórico
completo da conversa, mandado pelo frontend a cada requisição já que não
há sessão de servidor) e retorna `Response(stream_reply(...),
mimetype="text/plain")`, deixando o Flask mandar os chunks conforme o
generator produz. Erro (chave ausente, falha de rede/API) vira um chunk
de texto de erro amigável em vez de HTTP 500 quebrado no meio do stream.

`test_providers.py`: self-check sem rede que valida que todos os 6
providers em `PROVIDERS` têm os campos obrigatórios preenchidos
corretamente (sdk válido, env var e modelo definidos) — pega erro de
configuração cedo, sem precisar de chave real nem chamada de API.

## Frontend

**Visual (neo-brutalismo):**
Fundo cru, blocos de cor sólida sem gradiente, bordas grossas pretas sem
cantos arredondados, sombra dura deslocada (`box-shadow` sem blur) em
cards/botões/balões. Paleta: vermelho de alarme, amarelo de alerta,
preto, branco — ligada ao tema de segurança contra incêndio. Tipografia
bold e grande nos headers, peso normal no corpo do texto pra manter
legibilidade. Botões com efeito de "pressionar" (sombra encolhe e bloco
desloca no `:active`).

**Animações:**
Mensagens entram com fade + slide-up sutil (~200ms). Indicador de
"digitando" com pontinhos pulsando antes do primeiro chunk chegar. Texto
de streaming aparece token a token conforme a resposta chega do backend.
Transições suaves no seletor de provider. Tudo respeita
`prefers-reduced-motion`.

**Comportamento (`chat.js`):**
Dropdown com os 6 providers no topo. Envia todo o histórico da conversa
a cada mensagem (`fetch('/chat', ...)`), lê a resposta via
`response.body.getReader()` e injeta o texto no balão em tempo real
conforme os chunks chegam. Histórico persiste em `localStorage` e
recarrega ao abrir a página; botão "Nova conversa" limpa. Erros de
rede/API aparecem como balão de alerta estilizado, não `alert()` nativo.

## Fora de escopo (YAGNI)

- RAG / base de documentos própria.
- Persistência em banco de dados.
- Autenticação de usuário / múltiplos usuários.
- Seleção de modelo específico dentro de cada provider (fixo no código).
- Dark mode (pode entrar depois se pedido).
