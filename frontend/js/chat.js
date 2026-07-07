const STORAGE_KEY = "brigada-chat-history";
const PROVIDER_KEY = "brigada-provider";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const providerSelect = document.getElementById("provider-select");
const newChatBtn = document.getElementById("new-chat-btn");

/* o Chefe Hidrante em pessoa: SVG inline, olhos que piscam, boca que fala */
const HYDRANT_SVG = `
<svg class="hydrant" viewBox="0 0 64 64" aria-hidden="true">
  <rect x="16" y="55" width="32" height="6" rx="3" fill="var(--ink)"/>
  <rect x="20" y="20" width="24" height="37" rx="9" fill="var(--red)" stroke="var(--ink)" stroke-width="2.5"/>
  <path d="M 20 21 a 12 12 0 0 1 24 0 z" fill="var(--red)" stroke="var(--ink)" stroke-width="2.5"/>
  <circle cx="32" cy="6.5" r="3.5" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/>
  <rect x="16" y="18.5" width="32" height="5" rx="2.5" fill="var(--ink)"/>
  <circle cx="14.5" cy="36" r="5" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/>
  <circle cx="49.5" cy="36" r="5" fill="var(--yellow)" stroke="var(--ink)" stroke-width="2.5"/>
  <g class="eyes">
    <circle cx="27" cy="33" r="4.2" fill="var(--white)" stroke="var(--ink)" stroke-width="2"/>
    <circle cx="37" cy="33" r="4.2" fill="var(--white)" stroke="var(--ink)" stroke-width="2"/>
    <g class="pupils">
      <circle cx="27.8" cy="33.5" r="1.7" fill="var(--ink)"/>
      <circle cx="37.8" cy="33.5" r="1.7" fill="var(--ink)"/>
    </g>
  </g>
  <circle cx="23.5" cy="40" r="1.8" fill="#ff9d87"/>
  <circle cx="40.5" cy="40" r="1.8" fill="#ff9d87"/>
  <path class="mouth" d="M 28 42.5 q 4 3.5 8 0" fill="none" stroke="var(--ink)" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

function botRow() {
  const row = document.createElement("div");
  row.className = "bot-row";
  const avatar = document.createElement("span");
  avatar.className = "bot-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerHTML = HYDRANT_SVG;
  row.appendChild(avatar);
  return row;
}

// o avatar do cabeçalho também vira o boneco — e os olhos seguem o cursor
document.querySelector(".chat-avatar").innerHTML = HYDRANT_SVG;

if (!matchMedia("(prefers-reduced-motion: reduce)").matches && matchMedia("(pointer: fine)").matches) {
  const pupils = document.querySelector(".chat-avatar .pupils");
  document.addEventListener("mousemove", (e) => {
    const box = pupils.closest("svg").getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    const dist = Math.hypot(dx, dy) || 1;
    pupils.style.transform = `translate(${(dx / dist) * 1.6}px, ${(dy / dist) * 1.4}px)`;
  });
}

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
    const row = botRow();
    row.appendChild(el);
    chatWindow.appendChild(row);
  } else {
    el.textContent = text;
    chatWindow.appendChild(el);
  }
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
  const row = botRow();
  row.classList.add("talking");
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
  row.appendChild(el);
  chatWindow.appendChild(row);
  scrollToBottom();
  return row;
}

function setBusy(busy) {
  chatInput.disabled = busy;
  sendBtn.disabled = busy;
  if (!busy) chatInput.focus();
}

let history = loadHistory();
renderHistory(history);

/* chaves de API do usuário (BYOK) — ficam só no navegador */
const KEYS_KEY = "brigada-api-keys";

function loadKeys() {
  try {
    return JSON.parse(localStorage.getItem(KEYS_KEY)) || {};
  } catch {
    return {};
  }
}

function refreshProviderOptions() {
  const keys = loadKeys();
  for (const opt of providerSelect.options) {
    const hasLocal = !!keys[opt.value];
    const hasServer = opt.dataset.configured === "1";
    opt.disabled = !hasLocal && !hasServer;
    opt.textContent =
      opt.dataset.label +
      (hasLocal ? " — 🔑 sua chave" : hasServer ? "" : " — sem chave");
  }
}
refreshProviderOptions();

const keysDialog = document.getElementById("keys-dialog");
const keysForm = document.getElementById("keys-form");

document.getElementById("keys-btn").addEventListener("click", () => {
  const keys = loadKeys();
  keysForm.querySelectorAll("input[data-provider]").forEach((inp) => {
    inp.value = keys[inp.dataset.provider] || "";
  });
  keysDialog.showModal();
});

keysForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const keys = {};
  keysForm.querySelectorAll("input[data-provider]").forEach((inp) => {
    const v = inp.value.trim();
    if (v) keys[inp.dataset.provider] = v;
  });
  localStorage.setItem(KEYS_KEY, JSON.stringify(keys));
  refreshProviderOptions();
  keysDialog.close();
  if (Object.keys(keys).length) {
    if (typeof toast === "function") toast("🔑", "Chaves salvas", "Só neste navegador. Prometido.");
    document.dispatchEvent(new CustomEvent("brigada:achievement", { detail: "chaveiro" }));
  }
});

document.getElementById("keys-clear").addEventListener("click", () => {
  localStorage.removeItem(KEYS_KEY);
  keysForm.querySelectorAll("input[data-provider]").forEach((inp) => (inp.value = ""));
  refreshProviderOptions();
});

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
      "Nenhum provedor de IA configurado. Cole sua chave no botão 🔑 Chaves ali em cima, ou preencha o arquivo .env."
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
      body: JSON.stringify({
        provider: providerSelect.value,
        messages: history.slice(-20), // backend também corta; economiza banda
        api_key: loadKeys()[providerSelect.value],
      }),
    });

    typingEl.remove();

    if (!response.ok || !response.body) {
      let msg = "Não foi possível falar com o servidor. Tente novamente.";
      try {
        msg = (await response.json()).error || msg;
      } catch {}
      renderMessage("error", msg);
      return;
    }

    const botEl = renderMessage("bot", "");
    botEl.closest(".bot-row").classList.add("talking");
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

    // erro no meio do stream não vira "memória" do bot no histórico
    const errIdx = botText.indexOf("\n\n[erro]");
    if (errIdx !== -1) {
      const clean = botText.slice(0, errIdx).trim();
      const errText = botText.slice(errIdx).replace(/^\s*\[erro\]\s*/, "");
      if (clean) {
        botEl.innerHTML = mdToHtml(clean);
        history.push({ role: "assistant", content: clean });
      } else {
        botEl.closest(".bot-row").remove();
      }
      saveHistory(history);
      renderMessage("error", errText);
      return;
    }

    if (!botText.trim()) {
      botEl.closest(".bot-row").remove();
      renderMessage("error", "O Chefe Hidrante ficou sem palavras. Tente de novo.");
      return;
    }

    history.push({ role: "assistant", content: botText });
    saveHistory(history);

    const avatar = document.querySelector(".chat-avatar");
    if (avatar) {
      avatar.classList.add("boing");
      avatar.addEventListener("animationend", () => avatar.classList.remove("boing"), { once: true });
    }
  } catch (err) {
    if (typingEl) typingEl.remove();
    renderMessage("error", "Erro de conexão. Verifique sua internet e tente novamente.");
  } finally {
    // boca fecha aconteça o que acontecer
    document.querySelectorAll(".bot-row.talking").forEach((r) => r.classList.remove("talking"));
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
