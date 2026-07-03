const STORAGE_KEY = "brigada-chat-history";

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const providerSelect = document.getElementById("provider-select");
const newChatBtn = document.getElementById("new-chat-btn");

function loadHistory() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function renderMessage(role, text) {
  const el = document.createElement("div");
  el.className = `message ${role}`;
  el.textContent = text;
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

function renderHistory(history) {
  chatWindow.innerHTML = "";
  for (const msg of history) {
    renderMessage(msg.role === "user" ? "user" : "bot", msg.content);
  }
}

function showTypingIndicator() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
  chatWindow.appendChild(el);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return el;
}

let history = loadHistory();
renderHistory(history);

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  chatInput.value = "";
  history.push({ role: "user", content: text });
  renderMessage("user", text);

  let typingEl;

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
      botEl.textContent = botText;
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }

    history.push({ role: "assistant", content: botText });
    saveHistory(history);
  } catch (err) {
    if (typingEl) typingEl.remove();
    renderMessage("error", "Erro de conexão. Verifique sua internet e tente novamente.");
  }
});

newChatBtn.addEventListener("click", () => {
  history = [];
  saveHistory(history);
  renderHistory(history);
});
