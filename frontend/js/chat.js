const STORAGE_KEY = "brigada-chat-history";
const PROVIDER_KEY = "brigada-provider";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const providerSelect = document.getElementById("provider-select");
const newChatBtn = document.getElementById("new-chat-btn");

const SUGGESTIONS = [
  "Quais os tipos de extintores e quando usar cada um?",
  "O que fazer ao ouvir o alarme de incêndio?",
  "Primeiros socorros para queimaduras",
  "Como planejar rota de fuga e ponto de encontro?",
  "Responsabilidades do brigadista segundo a NBR 14276",
];

// ponytail: heurística por palavra-chave; NLP se der falso positivo demais
const EMERGENCY_RE = /socorro|pegando fogo|em chamas|est(ou|amos) pres[oa]|inc[êe]ndio (aqui|agora|na minha|no meu)/i;

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/* Markdown básico e seguro: escapa HTML primeiro, depois injeta só as tags
   geradas aqui (negrito, código, títulos, listas). */
function mdToHtml(md) {
  const esc = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const inline = (s) =>
    s
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");

  const out = [];
  let list = null;
  let inCode = false;
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const line of esc.split("\n")) {
    if (line.trim().startsWith("```")) {
      closeList();
      out.push(inCode ? "</code></pre>" : "<pre><code>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }
    const ul = line.match(/^\s*[-*] (.*)/);
    const ol = line.match(/^\s*\d+[.)] (.*)/);
    const heading = line.match(/^#{1,4} (.*)/);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul || ol)[1])}</li>`);
    } else if (heading) {
      closeList();
      out.push(`<h4>${inline(heading[1])}</h4>`);
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

function scrollToBottom() {
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  if (role === "bot") {
    el.innerHTML = mdToHtml(text);
  } else {
    el.textContent = text;
  }
  chatWindow.appendChild(el);
  scrollToBottom();
  return el;
}

function renderEmergencyBanner() {
  const el = document.createElement("div");
  el.className = "emergency-banner";
  el.innerHTML =
    '🚨 Se a emergência está acontecendo agora, ligue <a href="tel:193">193</a> (Corpo de Bombeiros) imediatamente.';
  chatWindow.appendChild(el);
  scrollToBottom();
}

function renderWelcome() {
  const el = document.createElement("div");
  el.className = "welcome";
  el.innerHTML = `
    <div class="welcome-icon" aria-hidden="true">🧯</div>
    <h2>Fala! Sou o Chefe Hidrante.</h2>
    <p>Prevenção, extintores, rotas de fuga, primeiros socorros e normas. Pergunta qualquer coisa — desde que pegue fogo (no bom sentido).</p>
    <div class="chips"></div>`;
  const chips = el.querySelector(".chips");
  SUGGESTIONS.forEach((text, i) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = text;
    chip.style.animationDelay = i * 60 + "ms";
    chip.addEventListener("click", () => sendMessage(text));
    chips.appendChild(chip);
  });
  chatWindow.appendChild(el);
}

function renderHistory(history) {
  chatWindow.innerHTML = "";
  if (!history.length) {
    renderWelcome();
    return;
  }
  for (const msg of history) {
    renderMessage(msg.role === "user" ? "user" : "bot", msg.content);
  }
}

const TYPING_LINES = [
  "consultando a NBR 14276...",
  "cheirando fumaça (protocolarmente)...",
  "desenrolando a mangueira...",
  "checando o benjamim da copa...",
  "procurando o pino do extintor...",
  "vestindo o capacete pra pensar melhor...",
];

function showTypingIndicator() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.innerHTML =
    '<span class="typing-indicator"><span></span><span></span><span></span></span><small class="typing-status"></small>';
  const status = el.querySelector(".typing-status");
  let i = Math.floor(Math.random() * TYPING_LINES.length);
  status.textContent = TYPING_LINES[i];
  const timer = setInterval(() => {
    if (!el.isConnected) return clearInterval(timer);
    status.textContent = TYPING_LINES[++i % TYPING_LINES.length];
  }, 1600);
  chatWindow.appendChild(el);
  scrollToBottom();
  return el;
}

function setBusy(busy) {
  chatInput.disabled = busy;
  sendBtn.disabled = busy;
  if (!busy) chatInput.focus();
}

let history = loadHistory();
renderHistory(history);

// restaura último provider escolhido; senão, primeiro com chave configurada
const savedProvider = localStorage.getItem(PROVIDER_KEY);
const savedOption = savedProvider &&
  providerSelect.querySelector(`option[value="${savedProvider}"]:not(:disabled)`);
if (savedOption) {
  providerSelect.value = savedProvider;
} else {
  const firstEnabled = providerSelect.querySelector("option:not(:disabled)");
  if (firstEnabled) providerSelect.value = firstEnabled.value;
}
providerSelect.addEventListener("change", () => {
  localStorage.setItem(PROVIDER_KEY, providerSelect.value);
});

async function sendMessage(text) {
  const selected = providerSelect.selectedOptions[0];
  if (!selected || selected.disabled) {
    renderMessage(
      "error",
      "Nenhum provedor de IA configurado. Preencha uma chave de API no arquivo .env e reinicie o servidor."
    );
    return;
  }

  if (!history.length) chatWindow.innerHTML = "";

  history.push({ role: "user", content: text });
  renderMessage("user", text);
  document.dispatchEvent(
    new CustomEvent("brigada:achievement", { detail: "primeira-pergunta" })
  );
  if (EMERGENCY_RE.test(text)) renderEmergencyBanner();

  let typingEl;
  setBusy(true);

  try {
    saveHistory(history);
    typingEl = showTypingIndicator();

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
      botEl.innerHTML = mdToHtml(botText);
      scrollToBottom();
    }

    history.push({ role: "assistant", content: botText });
    saveHistory(history);
  } catch (err) {
    if (typingEl) typingEl.remove();
    renderMessage("error", "Erro de conexão. Verifique sua internet e tente novamente.");
  } finally {
    setBusy(false);
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";
  sendMessage(text);
});

newChatBtn.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory(history);
  chatInput.focus();
});
