/* BRIGADA™ — mecânicas do site (tudo vanilla, zero deps)
   1 chamas no hero · 2 marquee · 3 quiz · 4 extintor certo
   5 botão de pânico · 6 detector de vacilo · 7 conquistas · 8 easter egg 193 */

const $ = (sel) => document.querySelector(sel);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============ 7. conquistas (toasts + localStorage) ============ */

const ACH_KEY = "brigada-achievements";
const ACHIEVEMENTS = {
  "primeira-pergunta": ["🔥", "Fagulha Curiosa", "Primeira pergunta ao Chefe Hidrante"],
  "chamas-5": ["🧯", "Mata-Fogo Amador", "5 chamas apagadas no site"],
  "chamas-15": ["😤", "Inimigo Pessoal do Fogo", "15 chamas apagadas"],
  "quiz-done": ["🎓", "Formado na Teoria", "Terminou o Quiz do Brigadista"],
  "quiz-perfect": ["👑", "Lorde do Hidrante", "Gabaritou o quiz"],
  "extintor-3": ["🍷", "Sommelier de Extintor", "3 extintores certos seguidos"],
  "panico": ["🚨", "Apertou Mesmo", "Apertou o botão que dizia NÃO APERTE"],
  "vacilo": ["🕵️", "Fiscal de Vacilo", "Sorteou seu primeiro vacilo"],
  "193": ["📟", "Código Secreto", "Digitou 193 na página. Respeito."],
  "fumaca": ["🧎", "Sobrevivente do Rodapé", "Sobreviveu ao Modo Fumaça ficando embaixo"],
  "cacada": ["🦅", "Olho de Águia", "Achou os 5 perigos escondidos na sala"],
  "evacuacao": ["🕺", "Coreógrafo da Fuga", "Acertou a ordem da evacuação sem errar"],
  "certificado": ["🖼️", "Emoldurou", "Gerou o Diploma de Brigadista de Sofá"],
  "dias-zero": ["📉", "Recorde Negativo", "Zerou o placar de dias sem incêndio"],
  "rebelde": ["😈", "Problema com Autoridade", "Apertou o NÃO APERTE 3 vezes. O botão desistiu."],
  "chaveiro": ["🔑", "Trouxe a Própria Chave", "Colou a própria chave de API. Independência total."],
};

function loadAch() {
  try { return JSON.parse(localStorage.getItem(ACH_KEY)) || {}; }
  catch { return {}; }
}

function unlock(id) {
  const done = loadAch();
  if (done[id] || !ACHIEVEMENTS[id]) return;
  done[id] = true;
  localStorage.setItem(ACH_KEY, JSON.stringify(done));
  const [emoji, title, desc] = ACHIEVEMENTS[id];
  toast(emoji, `Conquista: ${title}`, desc);
  sfx.ach();
  updateAchCount();
}

function toast(emoji, title, desc) {
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span class="toast-emoji"></span><div><span></span><small></small></div>`;
  el.querySelector(".toast-emoji").textContent = emoji;
  el.querySelector("div > span").textContent = title;
  el.querySelector("small").textContent = desc;
  $("#toast-zone").appendChild(el);
  setTimeout(() => {
    el.classList.add("bye");
    el.addEventListener("animationend", () => el.remove());
  }, 4200);
}

document.addEventListener("brigada:achievement", (e) => unlock(e.detail));

/* ============ 2. marquee de dicas ============ */

const TIPS = [
  "USE AS ESCADAS — O ELEVADOR NÃO É SEU AMIGO NO INCÊNDIO",
  "FUMAÇA SOBE, VOCÊ DESCE (AGACHADO)",
  "193 É DE GRAÇA. INCÊNDIO SAI CARO",
  "EXTINTOR NÃO É CABIDE DE CASACO",
  "ÁGUA EM ÓLEO QUENTE = FILME DE TERROR NA COZINHA",
  "ROUPA PEGOU FOGO? PARE, DEITE E ROLE",
  "PORTA CORTA-FOGO FECHADA SALVA VIDAS",
  "SEU BENJAMIM ESTÁ CANSADO. DESLIGUE ALGUMA COISA",
  "PONTO DE ENCONTRO NÃO É SUGESTÃO",
  "ALARME TOCOU? NÃO É ENSAIO DA BANDA. SAIA",
  "PASTA DE DENTE É PRA DENTE, NÃO PRA QUEIMADURA",
  "DETECTOR DE FUMAÇA SEM PILHA É ENFEITE DE TETO",
  "VELA AROMÁTICA + CORTINA = ROMANCE QUE ACABA MAL",
  "NÃO VOLTE PRA PEGAR O CELULAR. ELE NÃO VOLTARIA POR VOCÊ",
];

const ZOEIRAS = [
  "ESTE SITE NUNCA PEGOU FOGO. COINCIDÊNCIA? NÃO. TREINAMENTO",
  "O BOTÃO NÃO APERTE JÁ FOI APERTADO 6.402 VEZES. DECEPCIONANTE",
  "NENHUMA SAMAMBAIA FOI QUEIMADA NA PRODUÇÃO DESTE SITE",
  "SEU EXTINTOR VENCEU E O SITE SABE. O SITE JULGA",
  "EVACUAR COM ESTILO AINDA É EVACUAR",
  "O CHEFE HIDRANTE NÃO TIRA FÉRIAS. O FOGO TAMBÉM NÃO",
];

function fillMarquee(id, list) {
  const track = document.getElementById(id);
  if (!track) return;
  // duplica pro loop infinito do translateX(-50%)
  track.innerHTML = [...list, ...list].map((t) => `<span>${t} ✦</span>`).join("");
}
fillMarquee("marquee-top", TIPS);
fillMarquee("marquee-mid", TIPS);
fillMarquee("marquee-bottom", ZOEIRAS);

/* ============ 1. apague as chamas do hero ============ */

const hero = $("#hero");
const flameCountEl = $("#flame-count");
let flamesOut = 0;

function spawnFlame() {
  if (!hero || reducedMotion) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "flame";
  btn.setAttribute("aria-label", "Apagar chama");
  btn.textContent = "🔥";
  btn.style.left = 5 + Math.random() * 88 + "%";
  btn.style.top = 12 + Math.random() * 72 + "%";
  btn.style.fontSize = 1.6 + Math.random() * 1.2 + "rem";
  btn.addEventListener("click", (e) => {
    if (btn.classList.contains("out")) return;
    btn.classList.add("out");
    btn.textContent = "💨";
    sprayFoam(e.clientX, e.clientY);
    flamesOut++;
    flameCountEl.textContent = flamesOut;
    if (flamesOut >= 5) unlock("chamas-5");
    if (flamesOut >= 15) unlock("chamas-15");
    btn.addEventListener("animationend", () => btn.remove(), { once: true });
    setTimeout(spawnFlame, 900 + Math.random() * 2500);
  });
  hero.appendChild(btn);
}

function sprayFoam(x, y) {
  const rect = hero.getBoundingClientRect();
  for (let i = 0; i < 9; i++) {
    const p = document.createElement("span");
    p.className = "foam";
    p.style.left = x - rect.left + "px";
    p.style.top = y - rect.top + "px";
    const ang = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 60;
    p.style.setProperty("--dx", Math.cos(ang) * dist + "px");
    p.style.setProperty("--dy", Math.sin(ang) * dist - 20 + "px");
    hero.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

for (let i = 0; i < 4; i++) setTimeout(spawnFlame, i * 600);

/* ============ sirene (WebAudio, sem assets) ============ */

const siren = (() => {
  let ctx, osc, gain, timer, hi = false;
  return {
    on: false,
    start() {
      if (!soundOn()) {
        toast("🔇", "Som desligado", "Ligue no botão de som lá na barra de cima.");
        return;
      }
      ctx = ctx || new AudioContext();
      osc = ctx.createOscillator();
      gain = ctx.createGain();
      osc.type = "sawtooth";
      gain.gain.value = 0.05;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      timer = setInterval(() => {
        hi = !hi;
        osc.frequency.linearRampToValueAtTime(hi ? 960 : 640, ctx.currentTime + 0.35);
      }, 400);
      this.on = true;
    },
    stop() {
      clearInterval(timer);
      if (osc) { osc.stop(); osc.disconnect(); }
      this.on = false;
    },
    blip() {
      // toque curto (easter egg)
      this.start();
      setTimeout(() => this.stop(), 1200);
    },
  };
})();

/* ============ 5. botão de pânico ============ */

const panicDialog = $("#panic-dialog");
const sirenToggle = $("#siren-toggle");

const panicBtn = $("#panic-btn");
const PANIC_TEXTS = ["Não aperte", "Sério, não", "Confia?", "Tá... aperta"];
let panicHovers = 0;
let panicPresses = 0;

// o botão negocia com você a cada passada de mouse
panicBtn.addEventListener("mouseenter", () => {
  panicBtn.textContent = PANIC_TEXTS[++panicHovers % PANIC_TEXTS.length];
});

panicBtn.addEventListener("click", () => {
  panicDialog.showModal();
  panicDialog.querySelectorAll(".panic-steps li").forEach((li, i) => {
    li.style.animationDelay = 150 + i * 130 + "ms";
  });
  unlock("panico");
  if (++panicPresses >= 3) unlock("rebelde");
});

sirenToggle.addEventListener("click", () => {
  if (siren.on) {
    siren.stop();
    sirenToggle.textContent = "🔊 Ligar sirene";
  } else {
    siren.start();
    sirenToggle.textContent = "🔇 Desligar sirene";
  }
});

panicDialog.addEventListener("close", () => {
  siren.stop();
  sirenToggle.textContent = "🔊 Ligar sirene";
});

document.querySelectorAll("[data-close]").forEach((btn) =>
  btn.addEventListener("click", () => btn.closest("dialog").close())
);

/* ============ popup de boas-vindas (1x por navegador) ============ */

const WELCOME_KEY = "brigada-welcome-seen";
const welcomeDialog = $("#welcome-dialog");
if (!localStorage.getItem(WELCOME_KEY)) welcomeDialog.showModal();
welcomeDialog.addEventListener("close", () => localStorage.setItem(WELCOME_KEY, "1"));

/* ============ 3. quiz do brigadista ============ */

const QUIZ = [
  {
    q: "Fogo Classe A é fogo em...",
    opts: ["Líquidos inflamáveis", "Materiais sólidos (madeira, papel, tecido)", "Equipamentos elétricos", "Óleo de cozinha"],
    a: 1,
    why: "Classe A = sólidos que deixam brasa e cinza. O clássico papel/madeira/tecido.",
  },
  {
    q: "Pode jogar água em equipamento elétrico energizado?",
    opts: ["Pode, água resolve tudo", "Só um copinho", "Nunca — risco de choque; use CO₂ ou pó", "Depende da marca do equipamento"],
    a: 2,
    why: "Água conduz eletricidade. Em Classe C, o combo é CO₂ ou pó químico — nunca água.",
  },
  {
    q: "O alarme de incêndio tocou. Você:",
    opts: ["Termina o e-mail primeiro", "Pega o elevador, é mais rápido", "Sai pela rota de fuga usando a ESCADA", "Vai ver de onde vem o cheiro"],
    a: 2,
    why: "Elevador pode parar no andar do fogo ou travar sem energia. Escada, sempre.",
  },
  {
    q: "Panela com óleo pegou fogo. O que fazer?",
    opts: ["Jogar água pra esfriar", "Abafar com tampa e desligar o fogo", "Levar a panela até a pia correndo", "Assoprar com força"],
    a: 1,
    why: "Água em óleo quente explode em bola de fogo. Abafe (tampa/pano úmido) e corte o calor.",
  },
  {
    q: "Tem fumaça no corredor. Como você se desloca?",
    opts: ["Andando normal, mas rápido", "Agachado, perto do chão", "Na ponta dos pés", "De costas, pra não ver o perigo"],
    a: 1,
    why: "Fumaça e calor sobem. O ar mais respirável fica embaixo — desloque-se agachado.",
  },
  {
    q: "Sua roupa pegou fogo. A ordem certa é:",
    opts: ["Corra, grite, pule", "Pare, deite e role", "Tire a roupa correndo", "Procure um espelho"],
    a: 1,
    why: "Correr alimenta a chama com oxigênio. Pare, deite e role até abafar o fogo.",
  },
  {
    q: "A NBR 14276 trata de quê?",
    opts: ["Instalação de chuveiros", "Brigada de incêndio — requisitos e formação", "Sinalização de rodovias", "Fabricação de extintores"],
    a: 1,
    why: "NBR 14276 define os requisitos da brigada de incêndio: composição, formação e atribuições.",
  },
  {
    q: "Qual o número do Corpo de Bombeiros no Brasil?",
    opts: ["190", "192", "193", "0800-FOGO"],
    a: 2,
    why: "193, de graça, de qualquer telefone. 190 é polícia, 192 é SAMU.",
  },
  {
    q: "O triângulo do fogo é formado por:",
    opts: ["Combustível, oxigênio e calor", "Fogo, fumaça e cinza", "Madeira, papel e álcool", "Três bombeiros de mãos dadas"],
    a: 0,
    why: "Tire qualquer um dos três e o fogo apaga. É a base de todo método de extinção.",
  },
  {
    q: "Fogo Classe D é fogo em:",
    opts: ["Documentos importantes", "Metais combustíveis (magnésio, titânio)", "Derivados de petróleo", "Drama"],
    a: 1,
    why: "Metais combustíveis pedem pó especial. Água pode reagir e piorar — muito.",
  },
  {
    q: "Detector de fumaça se instala:",
    opts: ["No teto — fumaça sobe", "Rente ao chão", "Dentro do armário", "Colado no fogão, pra pegar no flagra"],
    a: 0,
    why: "Fumaça sobe, então ele mora no teto. Na cozinha, longe do fogão — senão vira alarme de torrada.",
  },
  {
    q: "Queimadura leve: o primeiro socorro correto é:",
    opts: ["Pasta de dente na hora", "Manteiga, receita da vovó", "Água corrente fria por 10 a 20 minutos", "Estourar as bolhas"],
    a: 2,
    why: "Água corrente fria (não gelada). Pasta de dente e manteiga são lenda urbana — e infecção garantida.",
  },
  {
    q: "O ponto de encontro serve para:",
    opts: ["Tirar selfie da fumaça", "Conferir se todo mundo saiu", "Esperar o trânsito melhorar", "Decidir quem volta pra pegar as coisas"],
    a: 1,
    why: "É onde a brigada confere quem saiu. Sem isso, alguém entra no prédio atrás de quem já está na rua.",
  },
  {
    q: "Você esqueceu o celular lá dentro. Você:",
    opts: ["Volta rapidinho, 30 segundos", "Manda o estagiário", "NÃO volta em hipótese alguma", "Volta se o boleto vencer hoje"],
    a: 2,
    why: "Voltar pra buscar objetos mata mais gente que a chama inicial. Nada lá dentro vale a viagem.",
  },
  {
    q: "Quem pode usar o hidrante de parede do prédio?",
    opts: ["Qualquer curioso com força no braço", "Brigadistas treinados e bombeiros", "Só o síndico", "O estagiário, de novo"],
    a: 1,
    why: "Mangueira de hidrante tem pressão séria. Sem treino, ela controla você — não o contrário.",
  },
];

const PATENTES = [
  [0, "🔥", "Risco Ambulante", "Tecnicamente, você é o que a brigada combate."],
  [3, "💨", "Estagiário da Fumaça", "Já sabe onde é a saída. Metade do caminho."],
  [6, "🧯", "Sargento Extintor", "Sólido. Falta pouco pro topo do hidrante."],
  [8, "👑", "Lorde do Hidrante", "Gabaritou. O Chefe Hidrante te respeita."],
];

const quizDialog = $("#quiz-dialog");
const quizBody = $("#quiz-body");
const QUIZ_ROUND = 8;
let quizSet = [], quizIdx = 0, quizScore = 0;

function openQuiz() {
  quizIdx = 0;
  quizScore = 0;
  quizSet = [...QUIZ].sort(() => Math.random() - 0.5).slice(0, QUIZ_ROUND);
  quizDialog.showModal();
  renderQuizStep();
}

function renderQuizStep() {
  const item = quizSet[quizIdx];
  quizBody.innerHTML = `
    <div class="quiz-progress"><i style="width:${(quizIdx / quizSet.length) * 100}%"></i></div>
    <p class="quiz-q">${quizIdx + 1}/${quizSet.length} — ${item.q}</p>
    <div class="quiz-options"></div>
    <p class="feedback"></p>`;
  const box = quizBody.querySelector(".quiz-options");
  const feedback = quizBody.querySelector(".feedback");
  item.opts.forEach((opt, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "option-btn";
    b.textContent = opt;
    b.style.animationDelay = i * 50 + "ms";
    b.addEventListener("click", () => {
      if (quizBody.dataset.locked) return;
      quizBody.dataset.locked = "1";
      const right = i === item.a;
      b.classList.add(right ? "correct" : "wrong");
      if (!right) box.children[item.a].classList.add("correct");
      if (right) quizScore++;
      right ? sfx.ok() : sfx.bad();
      feedback.innerHTML = `<strong>${right ? "Acertou!" : "Errou."}</strong> ${item.why}`;
      feedback.classList.toggle("bad", !right);
      setTimeout(() => {
        delete quizBody.dataset.locked;
        quizIdx++;
        quizIdx < quizSet.length ? renderQuizStep() : renderQuizResult();
      }, 2600);
    });
    box.appendChild(b);
  });
}

function renderQuizResult() {
  const [, emoji, nome, zoeira] = [...PATENTES].reverse().find(([min]) => quizScore >= min);
  quizBody.innerHTML = `
    <div class="quiz-progress"><i style="width:100%"></i></div>
    <div class="quiz-result">
      <span class="patente">${emoji}</span>
      <h4>${nome}</h4>
      <p>${quizScore}/${quizSet.length} acertos. ${zoeira}</p>
      <button type="button" class="btn btn-ink" id="quiz-again">Tentar de novo</button>
    </div>`;
  $("#quiz-again").addEventListener("click", openQuiz);
  unlock("quiz-done");
  if (quizScore === quizSet.length) unlock("quiz-perfect");
}

$("#quiz-open").addEventListener("click", openQuiz);
$("#nav-quiz").addEventListener("click", (e) => { e.preventDefault(); openQuiz(); });

/* ============ 4. qual extintor? ============ */

const EXTINGUISHERS = [
  { id: "agua", label: "💧 Água" },
  { id: "espuma", label: "🫧 Espuma" },
  { id: "co2", label: "☁️ CO₂" },
  { id: "po", label: "🧂 Pó ABC" },
];

const FIRES = [
  {
    text: "🗑️ A lixeira do RH pegou fogo (papel e planilhas impressas).",
    ok: ["agua", "espuma", "po"],
    best: "Classe A (sólidos): água resolve — resfria e apaga a brasa.",
    fail: "Nesse aqui até água servia. As planilhas agradeceriam.",
  },
  {
    text: "⛽ Poça de gasolina em chamas no estacionamento.",
    ok: ["espuma", "po", "co2"],
    best: "Classe B (líquidos): espuma abafa por cima. Água só espalha o combustível pegando fogo.",
    fail: "Água em gasolina = você criou um rio de fogo. Parabéns, cineasta.",
  },
  {
    text: "⚡ O quadro elétrico está faiscando e soltando fumaça.",
    ok: ["co2", "po"],
    best: "Classe C (energizado): CO₂ não conduz eletricidade e não deixa resíduo.",
    fail: "Molhou equipamento energizado. O choque era grátis e você pegou.",
  },
  {
    text: "💻 O notebook do estagiário entrou em combustão (de novo).",
    ok: ["co2", "po"],
    best: "Equipamento elétrico: CO₂ é o ideal — apaga sem destruir o que sobrou.",
    fail: "Era só CO₂. O estagiário vai lembrar disso na retrospectiva.",
  },
  {
    text: "🍳 Frigideira com óleo em chamas na copa.",
    ok: ["po"],
    best: "Fogo em óleo de cozinha: abafe (tampa!) ou use classe K/pó. NUNCA água.",
    fail: "Água em óleo quente = bola de fogo instantânea. A copa virou lenda.",
  },
];

const extScenario = $("#ext-scenario");
const extOptions = $("#ext-options");
const extFeedback = $("#ext-feedback");
const extStreakEl = $("#ext-streak");
let extStreak = 0;
let currentFire;

function nextFire() {
  let pick;
  do { pick = FIRES[Math.floor(Math.random() * FIRES.length)]; } while (pick === currentFire);
  currentFire = pick;
  extScenario.textContent = pick.text;
  extFeedback.textContent = "";
  extFeedback.classList.remove("bad");
  extOptions.querySelectorAll("button").forEach((b) => {
    b.classList.remove("correct", "wrong");
    b.disabled = false;
  });
}

EXTINGUISHERS.forEach((ext) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "option-btn";
  b.textContent = ext.label;
  b.addEventListener("click", () => {
    if (b.disabled) return;
    extOptions.querySelectorAll("button").forEach((x) => (x.disabled = true));
    const right = currentFire.ok.includes(ext.id);
    b.classList.add(right ? "correct" : "wrong");
    if (right) {
      extStreak++;
      sfx.ok();
      extFeedback.innerHTML = `<strong>Apagou! 🎉</strong> ${currentFire.best}`;
      if (extStreak >= 3) unlock("extintor-3");
    } else {
      extStreak = 0;
      sfx.bad();
      resetDays("Você escolheu o extintor errado. O placar sentiu.");
      extFeedback.innerHTML = `<strong>O fogo cresceu. 🔥</strong> ${currentFire.fail} ${currentFire.best}`;
      extFeedback.classList.add("bad");
    }
    extStreakEl.textContent = extStreak;
    setTimeout(nextFire, 3200);
  });
  extOptions.appendChild(b);
});

nextFire();

/* ============ 6. detector de vacilo ============ */

const VACILOS = [
  ["O extintor virou cabide de casaco.", "Acesso ao extintor deve estar sempre livre e sinalizado (NBR 12693)."],
  ["A rota de fuga virou depósito de caixas de Natal.", "Saídas de emergência precisam estar 100% desobstruídas (NBR 9077)."],
  ["Um benjamim com 6 aparelhos na mesma tomada.", "Sobrecarga é a origem clássica do incêndio elétrico. Distribua a carga."],
  ["Extintor com carga vencida desde 2019.", "Inspeção mensal, manutenção anual. Extintor vencido é enfeite caro."],
  ["A porta corta-fogo escorada... com o extintor.", "Porta corta-fogo só funciona FECHADA. E o extintor tem casa própria."],
  ["Fumar no almoxarifado 'só dessa vez'.", "Materiais combustíveis + brasa = estatística. Fume na área designada."],
  ["O alarme de incêndio está no silencioso.", "Alarme inaudível não avisa ninguém. Teste periódico é obrigação da brigada."],
  ["Ninguém foi ao treinamento de evacuação.", "Simulado periódico é requisito da NBR 14276. Quem treina não congela na hora H."],
];

const slotDisplay = $("#slot-display");
const slotFix = $("#slot-fix");
const slotBtn = $("#slot-btn");

slotBtn.addEventListener("click", () => {
  slotBtn.disabled = true;
  slotFix.textContent = "";
  slotDisplay.classList.add("rolling");
  let spins = 0;
  const timer = setInterval(() => {
    slotDisplay.textContent = VACILOS[Math.floor(Math.random() * VACILOS.length)][0];
    if (++spins >= (reducedMotion ? 1 : 14)) {
      clearInterval(timer);
      slotDisplay.classList.remove("rolling");
      const [vacilo, fix] = VACILOS[Math.floor(Math.random() * VACILOS.length)];
      slotDisplay.textContent = `🚩 ${vacilo}`;
      slotFix.innerHTML = `<strong>Como consertar:</strong> ${fix}`;
      slotBtn.disabled = false;
      unlock("vacilo");
    }
  }, reducedMotion ? 0 : 85);
});

/* ============ sons (WebAudio, sem assets) ============ */

const SOUND_KEY = "brigada-sound";
function soundOn() { return localStorage.getItem(SOUND_KEY) !== "off"; }

let audioCtx;
function beep(freq, dur, type = "square", delay = 0) {
  if (!soundOn()) return;
  audioCtx = audioCtx || new AudioContext();
  const t = audioCtx.currentTime + delay;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.045, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(audioCtx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

const sfx = {
  ok: () => { beep(660, .1); beep(880, .14, "square", .09); },
  bad: () => beep(150, .3, "sawtooth"),
  ach: () => { beep(523, .09); beep(659, .09, "square", .1); beep(784, .18, "square", .2); },
};

const soundBtn = $("#sound-btn");
function renderSoundBtn() { soundBtn.textContent = soundOn() ? "🔊" : "🔇"; }
soundBtn.addEventListener("click", () => {
  localStorage.setItem(SOUND_KEY, soundOn() ? "off" : "on");
  if (!soundOn()) siren.stop();
  renderSoundBtn();
  if (soundOn()) sfx.ok();
});
renderSoundBtn();

/* ============ 7b. galeria de conquistas ============ */

const achDialog = $("#ach-dialog");
const TOTAL_ACH = Object.keys(ACHIEVEMENTS).length;

function updateAchCount() {
  const n = Object.keys(loadAch()).length;
  $("#ach-count").textContent = `${n}/${TOTAL_ACH}`;
  $("#cert-progress").textContent = `${n}/${TOTAL_ACH}`;
}

$("#ach-btn").addEventListener("click", () => {
  const done = loadAch();
  const n = Object.keys(done).length;
  $("#ach-progress").textContent =
    `${n}/${TOTAL_ACH} desbloqueadas` + (n === TOTAL_ACH ? " — aposentadoria heroica! 🎉" : "");
  $("#ach-progress-bar").style.width = (n / TOTAL_ACH) * 100 + "%";
  const grid = $("#ach-grid");
  grid.innerHTML = "";
  for (const [id, [emoji, title, desc]] of Object.entries(ACHIEVEMENTS)) {
    const has = done[id];
    const item = document.createElement("div");
    item.className = "ach-item" + (has ? "" : " locked");
    item.innerHTML = `<span class="a-emoji"></span><div><b></b><small></small></div>`;
    item.querySelector(".a-emoji").textContent = has ? emoji : "🔒";
    item.querySelector("b").textContent = has ? title : "???";
    item.querySelector("small").textContent = desc;
    grid.appendChild(item);
  }
  achDialog.showModal();
});
updateAchCount();

/* ============ 13. placar: dias sem incêndio ============ */

const SINCE_KEY = "brigada-since";
if (!localStorage.getItem(SINCE_KEY)) localStorage.setItem(SINCE_KEY, Date.now());
const daysNum = $("#days-num");

function renderDays() {
  const days = Math.max(0, Math.floor((Date.now() - +localStorage.getItem(SINCE_KEY)) / 864e5));
  daysNum.textContent = days;
}

function resetDays(reason) {
  localStorage.setItem(SINCE_KEY, Date.now());
  renderDays();
  daysNum.classList.remove("zeroed");
  void daysNum.offsetWidth; // reinicia a animação
  daysNum.classList.add("zeroed");
  unlock("dias-zero");
  toast("📉", "Placar zerado", reason);
}
renderDays();

/* ============ 9. modo fumaça ============ */

const smokeOverlay = $("#smoke-overlay");
const smokeTimerEl = $("#smoke-timer");
const smokeHud = document.querySelector(".smoke-hud");
let smokeInterval = null;
let smokeLeft = 15;

function smokeStop() {
  clearInterval(smokeInterval);
  smokeInterval = null;
  smokeOverlay.hidden = true;
  document.removeEventListener("pointermove", smokeWatch);
}

function smokeWatch(e) {
  // subiu pra zona da fumaça: tossiu, timer volta pro início
  if (e.clientY < innerHeight * 0.6) {
    smokeLeft = 15;
    smokeTimerEl.textContent = smokeLeft;
    smokeHud.classList.remove("ouch");
    void smokeHud.offsetWidth;
    smokeHud.classList.add("ouch");
    sfx.bad();
  }
}

$("#smoke-start").addEventListener("click", () => {
  smokeLeft = 15;
  smokeTimerEl.textContent = smokeLeft;
  smokeOverlay.hidden = false;
  document.addEventListener("pointermove", smokeWatch);
  smokeInterval = setInterval(() => {
    smokeLeft--;
    smokeTimerEl.textContent = smokeLeft;
    if (smokeLeft <= 0) {
      smokeStop();
      unlock("fumaca");
      toast("😮‍💨", "Ar puro!", "Você ficou na zona respirável. A fumaça desistiu de você.");
    }
  }, 1000);
});

$("#smoke-quit").addEventListener("click", () => {
  smokeStop();
  toast("🫁", "Saiu tossindo", "Na vida real: pano no nariz e rumo à saída, agachado.");
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !smokeOverlay.hidden) smokeStop();
});

/* ============ 10. caça aos perigos ============ */

const HUNT_SAFE = [
  ["🛋️", "É um sofá. Confortável e inocente."],
  ["🪴", "Samambaia. Só julga em silêncio."],
  ["🖼️", "Quadro de pôr do sol. Zero risco, gosto duvidoso."],
  ["📚", "Livros. Perigosos só pras suas férias."],
  ["🖥️", "Monitor desligado. Descansando."],
  ["🧸", "Urso de pelúcia. Aliado."],
  ["🪑", "Cadeira. Ergonomia duvidosa, risco baixo."],
  ["☕", "Café frio. Triste, não perigoso."],
  ["🕰️", "Relógio. Só mata o tempo."],
  ["🧦", "Meia perdida. Mistério, não incêndio."],
  ["🎸", "Violão. Risco só no repertório."],
  ["📻", "Rádio velho. Funciona na base do carinho."],
  ["🪞", "Espelho. O único risco é a sinceridade."],
  ["🧊", "Gelo. Literalmente o anti-fogo."],
  ["🎈", "Balão. Estoura, não incendeia."],
  ["🪥", "Escova de dentes. Combate outra placa."],
  ["📎", "Clipe. Inofensivo desde sempre."],
  ["🥔", "Batata. Não pega fogo sozinha."],
  ["🧻", "Estoque de papel da pandemia. Longe do fogão, passa."],
];

const HUNT_HAZ = [
  ["🕯️", "Vela acesa colada na cortina — clássico dos incêndios domésticos. Apague antes de sair."],
  ["🔌", "Benjamim com 6 plugues. Sobrecarga esquenta o fio e a festa começa. Distribua a carga."],
  ["🚬", "Cigarro aceso largado. Brasa + estofado = manchete. Apague direito, sempre."],
  ["📦", "Caixas empilhadas NA FRENTE da saída. Rota de fuga é sagrada (NBR 9077)."],
  ["🍳", "Panela no fogo sem ninguém olhando. O óleo passa do ponto e ignição espontânea."],
];

const huntGrid = $("#hunt-grid");
const huntCount = $("#hunt-count");
const huntFeedback = $("#hunt-feedback");
let huntFound = 0;

function buildHunt() {
  huntFound = 0;
  huntCount.textContent = "0";
  huntFeedback.textContent = "Clique no que pode causar incêndio.";
  huntFeedback.classList.remove("bad");
  const cells = [
    ...HUNT_SAFE.map(([e, quip]) => ({ e, quip, haz: false })),
    ...HUNT_HAZ.map(([e, quip]) => ({ e, quip, haz: true })),
  ].sort(() => Math.random() - 0.5);
  huntGrid.innerHTML = "";
  for (const cell of cells) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = cell.e;
    b.setAttribute("aria-label", "Item da sala");
    b.addEventListener("click", () => {
      if (cell.haz) {
        b.classList.add("found");
        huntCount.textContent = ++huntFound;
        sfx.ok();
        huntFeedback.innerHTML = `<strong>Perigo real!</strong> ${cell.quip}`;
        huntFeedback.classList.remove("bad");
        if (huntFound === HUNT_HAZ.length) {
          unlock("cacada");
          huntFeedback.innerHTML =
            "<strong>Sala segura!</strong> Achou todos os 5. A sala se rearruma em instantes...";
          setTimeout(buildHunt, 4000);
        }
      } else {
        b.classList.remove("nope");
        void b.offsetWidth;
        b.classList.add("nope");
        beep(300, .06);
        huntFeedback.innerHTML = `<strong>Falso alarme.</strong> ${cell.quip}`;
        huntFeedback.classList.add("bad");
      }
    });
    huntGrid.appendChild(b);
  }
}
buildHunt();

/* ============ 11. ordem na fuga ============ */

const EVAC_STEPS = [
  "Pare o que está fazendo",
  "Avise as pessoas por perto",
  "Deixe os pertences para trás",
  "Siga a rota de fuga (agachado na fumaça)",
  "Desça pela ESCADA, nunca elevador",
  "Ponto de encontro — e fique lá",
];

const evacList = $("#evac-list");
const evacFeedback = $("#evac-feedback");
let evacNext = 0;
let evacErrors = 0;

function buildEvac() {
  evacNext = 0;
  evacErrors = 0;
  evacFeedback.textContent = "O alarme tocou! Qual o primeiro passo?";
  evacFeedback.classList.remove("bad");
  const shuffled = EVAC_STEPS.map((t, i) => ({ t, i })).sort(() => Math.random() - 0.5);
  evacList.innerHTML = "";
  for (const step of shuffled) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "evac-step";
    b.innerHTML = `<span class="num">?</span><span></span>`;
    b.querySelector("span:last-child").textContent = step.t;
    b.addEventListener("click", () => {
      if (step.i === evacNext) {
        b.classList.add("done");
        b.querySelector(".num").textContent = ++evacNext;
        beep(440 + evacNext * 60, .08);
        evacFeedback.classList.remove("bad");
        if (evacNext === EVAC_STEPS.length) {
          if (evacErrors === 0) {
            unlock("evacuacao");
            evacFeedback.innerHTML =
              "<strong>Coreografia perfeita! 🕺</strong> Evacuou sem pisar no pé de ninguém.";
          } else {
            evacFeedback.innerHTML =
              `<strong>Chegou vivo!</strong> Mas tropeçou ${evacErrors}x no caminho. Embaralhe e tente o 10/10.`;
          }
        } else {
          evacFeedback.textContent = "Isso! E agora?";
        }
      } else {
        evacErrors++;
        b.classList.remove("wrong");
        void b.offsetWidth;
        b.classList.add("wrong");
        sfx.bad();
        evacFeedback.innerHTML = "<strong>Opa, ordem errada.</strong> Pensa: o que vem AGORA?";
        evacFeedback.classList.add("bad");
      }
    });
    evacList.appendChild(b);
  }
}
$("#evac-reset").addEventListener("click", buildEvac);
buildEvac();

/* ============ 12. diploma de brigadista de sofá ============ */

function certPatente(n) {
  if (n >= 12) return ["👑", "Lorde do Hidrante"];
  if (n >= 8) return ["🧯", "Sargento Extintor"];
  if (n >= 4) return ["💨", "Estagiário da Fumaça"];
  return ["🔥", "Risco Ambulante (com potencial)"];
}

$("#cert-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#cert-name").value.trim() || "Brigadista Anônimo";
  const n = Object.keys(loadAch()).length;
  const [emoji, patente] = certPatente(n);
  await document.fonts.ready;

  const cv = document.createElement("canvas");
  cv.width = 1200;
  cv.height = 850;
  const c = cv.getContext("2d");
  c.fillStyle = "#f4e9e1";
  c.fillRect(0, 0, 1200, 850);
  c.strokeStyle = "#212529";
  c.lineWidth = 10;
  c.strokeRect(30, 30, 1140, 790);
  c.lineWidth = 3;
  c.setLineDash([12, 10]);
  c.strokeRect(52, 52, 1096, 746);
  c.setLineDash([]);
  c.textAlign = "center";
  c.fillStyle = "#212529";
  c.font = "800 26px Archivo, sans-serif";
  c.fillText("BRIGADA™ APRESENTA, COM ORGULHO QUESTIONÁVEL,", 600, 130);
  c.font = "900 64px Archivo, sans-serif";
  c.fillText("DIPLOMA DE BRIGADISTA", 600, 220);
  c.fillStyle = "#ab54f7";
  c.fillText("DE SOFÁ", 600, 295);
  c.fillStyle = "#212529";
  c.font = "24px 'Space Grotesk', sans-serif";
  c.fillText("certifica que", 600, 370);
  c.font = "700 52px 'Space Grotesk', sans-serif";
  c.fillStyle = "#ff5c38";
  c.fillText(name.toUpperCase(), 600, 440);
  c.fillStyle = "#212529";
  c.font = "24px 'Space Grotesk', sans-serif";
  c.fillText("concluiu com bravura o treinamento não-oficial de segurança contra incêndio", 600, 500);
  c.fillText("e atingiu a patente de", 600, 540);
  c.font = "900 40px Archivo, sans-serif";
  c.fillText(`${emoji} ${patente.toUpperCase()} ${emoji}`, 600, 605);
  c.font = "20px 'Space Grotesk', sans-serif";
  c.fillText(`${n}/${TOTAL_ACH} conquistas · emitido em ${new Date().toLocaleDateString("pt-BR")}`, 600, 660);
  c.font = "italic 22px 'Space Grotesk', sans-serif";
  c.fillText("________________________", 600, 730);
  c.fillText("Chefe Hidrante 🧯 — validade: até o próximo vacilo", 600, 762);

  const a = document.createElement("a");
  a.download = "diploma-brigadista-de-sofa.png";
  a.href = cv.toDataURL("image/png");
  a.click();
  unlock("certificado");
  toast("📜", "Diploma emitido!", "Pendure com orgulho. Longe de fontes de calor.");
});

/* ============ 14. moods do Chefe Hidrante ============ */

const MOODS = [
  "online e levemente paranoico com tomadas",
  "contando extintores pela 14ª vez hoje",
  "de olho no benjamim da copa",
  "ensaiando a sirene no chuveiro",
  "lendo a NBR 14276 por lazer",
  "desconfiando da vela aromática",
  "medindo a distância até a saída (de novo)",
];
const moodEl = document.querySelector(".chat-brand p");
let moodIdx = 0;
setInterval(() => {
  moodEl.textContent = MOODS[++moodIdx % MOODS.length];
}, 7000);

/* ============ stickers fofoqueiros ============ */

document.querySelectorAll(".sticker[data-quip]").forEach((s) => {
  s.addEventListener("click", () => {
    beep(700, .07);
    toast(s.textContent, "Ficha técnica", s.dataset.quip);
  });
});

const renanStamp = $(".stamp-renan");
renanStamp.addEventListener("click", () => {
  beep(700, .07);
  toast("👌", "Selo SUPIMPEX", renanStamp.dataset.quip);
});

/* ============ aba chorona ============ */

const realTitle = document.title;
document.addEventListener("visibilitychange", () => {
  document.title = document.hidden ? "🔥 VOLTA! ISSO PODE PEGAR FOGO" : realTitle;
});

/* ============ recado pros curiosos do F12 ============ */

console.log(
  "%c🧯 BRIGADA™",
  "font-size:28px;font-weight:900;color:#ff5c38;text-shadow:2px 2px 0 #212529"
);
console.log(
  "%cInspecionando o código? Ótimo instinto de brigadista.\nDica: digite 193 na página (fora do chat). Feito por Lucas Gonzaga.",
  "font-size:13px;color:#4a5464"
);

/* ============ 8. easter egg: digite 193 ============ */

let keyBuffer = "";
document.addEventListener("keydown", (e) => {
  if (/input|textarea|select/i.test(e.target.tagName)) return;
  keyBuffer = (keyBuffer + e.key).slice(-3);
  if (keyBuffer === "193") {
    keyBuffer = "";
    siren.blip();
    unlock("193");
    toast("🚒", "193 na área!", "Bombeiro de bolso acionado com sucesso.");
  }
});
