const stages = [...document.querySelectorAll(".stage")];
const stageLinks = [...document.querySelectorAll(".stage-link")];
const loadingScreen = document.querySelector("#loadingScreen");
const loadingBar = document.querySelector("#loadingBar");
const loadingLabel = document.querySelector("#loadingLabel");

const dialogue = [
  "Ei, piloto! Antes de tocar no refrigerador: aqui a física fica bem esquisita. No bom sentido.",
  "Um bit clássico é 0 ou 1. Um qubit pode estar numa combinação de |0⟩ e |1⟩ — até você medir.",
  "Superposição não é uma moeda escondida no ar. É um estado quântico com amplitudes e probabilidades.",
  "Qubits emaranhados têm correlações compartilhadas. Não é mensagem instantânea: Einstein pode relaxar.",
  "Interferência soma ou cancela amplitudes. Agora vamos manter nosso qubit frio o bastante para pensar."
];

const parts = {
  cooling: {
    title: "Frio de outro mundo.",
    description: "O refrigerador de diluição leva o chip a milikelvins, muito perto do zero absoluto. O frio ajuda a reduzir ruído térmico; não é um botão mágico contra toda decoerência."
  },
  control: {
    title: "Linhas de controle.",
    description: "Cabos levam sinais de micro-ondas até o chip para controlar os qubits. Eles também podem carregar ruído, então cada conexão precisa de cuidado."
  },
  chip: {
    title: "O chip QPU.",
    description: "Neste exemplo, circuitos supercondutores formam os qubits. Um pulso calibrado altera o estado; depois, uma medição retorna um resultado clássico."
  }
};

const questions = [
  {
    prompt: "Qual é a diferença essencial entre um bit clássico e um qubit?",
    answers: ["O bit é 0 ou 1; o qubit pode estar numa superposição de estados.", "O bit guarda mais informação que qualquer qubit.", "O qubit só pode existir como 0 ou 1, nunca em combinação.", "Um qubit é apenas um bit muito rápido."],
    correct: 0,
    explanation: "Isso! Um qubit pode ser preparado numa combinação de |0⟩ e |1⟩; a medição produz um resultado."
  },
  {
    prompt: "O que acontece quando medimos um qubit em superposição na base |0⟩, |1⟩?",
    answers: ["O aparelho lê os dois valores ao mesmo tempo.", "Obtemos um resultado, 0 ou 1, com probabilidades determinadas pelo estado.", "O qubit vira automaticamente um bit mais potente.", "A medição sempre retorna 0."],
    correct: 1,
    explanation: "Boa. A medição dá um resultado clássico; as amplitudes do estado determinam as probabilidades."
  },
  {
    prompt: "Dois qubits emaranhados são melhor descritos como...",
    answers: ["Dois qubits sem qualquer relação.", "Uma cópia perfeita de um qubit em dois lugares.", "Um estado conjunto com correlações que não se explicam como estados independentes.", "Uma forma de enviar informação mais rápido que a luz."],
    correct: 2,
    explanation: "Correto. O emaranhamento cria correlações quânticas, mas não permite comunicação instantânea."
  },
  {
    prompt: "Por que a interferência quântica é útil em algoritmos?",
    answers: ["Ela faz todos os resultados terem a mesma chance.", "Ela soma ou cancela amplitudes, podendo favorecer certos resultados.", "Ela impede qualquer erro de medição.", "Ela mantém o chip aquecido."],
    correct: 1,
    explanation: "Isso! Operações podem reforçar algumas amplitudes e cancelar outras antes da medição."
  },
  {
    prompt: "Por que refrigerar e isolar um processador quântico?",
    answers: ["Para fazer a eletricidade viajar mais devagar.", "Para que o computador nunca precise de medições.", "Para reduzir interações indesejadas que causam ruído e decoerência.", "Para transformar qualquer bit em um qubit."],
    correct: 2,
    explanation: "Missão cumprida. Temperatura baixa e isolamento ajudam a preservar o estado quântico, embora não eliminem todo ruído."
  }
];

let currentStage = "briefing";
let dialogueIndex = 0;
let inspected = new Set();
let cooled = false;
let pulsed = false;
let questionIndex = 0;
let quizStarted = false;
let correctAnswers = 0;
let cash = 0;
let combo = 0;
let decoherence = 0;
let answered = false;
let audioContext;
let masterGain;
let ambienceTimer;
let padOscillators = [];
let audioAvailable = Boolean(window.AudioContext || window.webkitAudioContext);

function showStage(id) {
  const destinations = ["briefing", "lab", "quiz", "garage"];
  const index = destinations.indexOf(id);
  if (index > 1 && !pulsed) return;
  if (id === "garage" && questionIndex < questions.length) return;
  if (id === "quiz" && questionIndex >= questions.length) return;

  if (id === "quiz" && !quizStarted) {
    renderQuestion();
    quizStarted = true;
  }

  currentStage = id;
  stages.forEach((stage) => {
    const active = stage.id === id;
    stage.classList.toggle("active", active);
    stage.hidden = !active;
  });
  stageLinks.forEach((link) => {
    const linkIndex = destinations.indexOf(link.dataset.goto);
    link.classList.toggle("active", link.dataset.goto === id);
    link.classList.toggle("complete", linkIndex < index);
    const furthestUnlocked = questionIndex >= questions.length ? 3 : pulsed ? 2 : 1;
    link.disabled = linkIndex > furthestUnlocked || (link.dataset.goto === "quiz" && questionIndex >= questions.length);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-goto]").forEach((button) => {
  button.addEventListener("click", () => showStage(button.dataset.goto));
});

document.querySelector("#dialogueNext").addEventListener("click", () => {
  dialogueIndex = (dialogueIndex + 1) % dialogue.length;
  document.querySelector("#dialogueText").textContent = `“${dialogue[dialogueIndex]}”`;
  document.querySelector("#dialogueCount").textContent = `${String(dialogueIndex + 1).padStart(2, "0")} / 05`;
});

function inspectPart(name) {
  const part = parts[name];
  if (!part) return;
  inspected.add(name);
  document.querySelector("#partTitle").textContent = part.title;
  document.querySelector("#partDescription").textContent = part.description;
  document.querySelector("#inspectionPanel .console-label").textContent = `COMPONENTE ${Object.keys(parts).indexOf(name) + 1} / 3`;
  document.querySelectorAll(".machine-part").forEach((item) => {
    item.classList.toggle("selected", item.dataset.part === name);
  });
  if (!cooled && inspected.size === Object.keys(parts).length) {
    const coolButton = document.querySelector("#coolButton");
    coolButton.disabled = false;
    coolButton.innerHTML = "INICIAR RESFRIAMENTO <span>↓</span>";
    document.querySelector("#systemStatus").textContent = "COMPONENTES INSPECIONADOS";
  }
}

document.querySelectorAll(".machine-part").forEach((part) => {
  part.addEventListener("click", () => inspectPart(part.dataset.part));
  part.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inspectPart(part.dataset.part);
    }
  });
});
document.querySelectorAll(".hotspot").forEach((hotspot) => {
  hotspot.addEventListener("click", () => inspectPart(hotspot.dataset.target));
});

document.querySelector("#coolButton").addEventListener("click", (event) => {
  if (cooled) return;
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = "RESFRIANDO... ↓";
  document.querySelector("#systemStatus").textContent = "RESFRIAMENTO EM CURSO";
  document.querySelector("#temperatureBar").style.width = "4%";
  let step = 0;
  const temperatures = ["2.8 K", "1.1 K", "420 mK", "96 mK", "15 mK"];
  const timer = window.setInterval(() => {
    document.querySelector("#temperatureValue").textContent = temperatures[step];
    step += 1;
    if (step === temperatures.length) {
      window.clearInterval(timer);
      cooled = true;
      document.querySelector("#temperatureBar").style.width = "100%";
      document.querySelector("#systemStatus").textContent = "ESTÁVEL • 15 mK";
      document.querySelector("#pulseButton").disabled = false;
      button.textContent = "ALVO ATINGIDO ✓";
      button.classList.remove("button-secondary");
      document.querySelector("#blochCaption").innerHTML = "Chip estabilizado.<br>Agora aplique um pulso.";
      inspectPart("cooling");
    }
  }, 420);
});

document.querySelector("#pulseButton").addEventListener("click", (event) => {
  if (!cooled || pulsed) return;
  pulsed = true;
  event.currentTarget.disabled = true;
  event.currentTarget.innerHTML = "PULSO APLICADO ✓";
  document.querySelector("#qubitState").textContent = "(|0⟩ + |1⟩) / √2";
  document.querySelector("#blochVector").setAttribute("d", "M65 56 108 56");
  document.querySelector("#blochPoint").setAttribute("cx", "108");
  document.querySelector("#blochPoint").setAttribute("cy", "56");
  document.querySelector("#blochCaption").innerHTML = "Superposição criada: aqui, cada resultado tem 50% de chance.<br>A medição ainda dará 0 ou 1.";
  document.querySelector("#toQuiz").disabled = false;
  document.querySelector("#systemStatus").textContent = "QUBIT PREPARADO • 15 mK";
  document.querySelector('.stage-link[data-goto="quiz"]').disabled = false;
  inspectPart("chip");
});

document.querySelector("#toQuiz").addEventListener("click", () => {
  if (!quizStarted) {
    questionIndex = 0;
    correctAnswers = 0;
    cash = 0;
    combo = 0;
    decoherence = 0;
  }
  showStage("quiz");
});

function renderQuestion() {
  const question = questions[questionIndex];
  answered = false;
  document.querySelector("#missionLabel").textContent = `MISSÃO ${questionIndex + 1} / ${questions.length}`;
  document.querySelector("#missionProgress").style.width = `${(questionIndex / questions.length) * 100}%`;
  document.querySelector("#questionTag").textContent = `DOSSIÊ ${String(questionIndex + 1).padStart(2, "0")}`;
  document.querySelector("#questionText").textContent = question.prompt;
  document.querySelector("#cashCount").textContent = `$ ${String(cash).padStart(3, "0")}`;
  document.querySelector("#comboLabel").textContent = `COMBO ×${combo}`;
  const stars = document.querySelector("#decoherenceStars");
  stars.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < decoherence ? "lit" : ""}">${i < decoherence ? "★" : "☆"}</span>`).join(" ");
  stars.setAttribute("aria-label", `${decoherence} de 5 estrelas de decoerência`);
  const list = document.querySelector("#answerList");
  list.replaceChildren();
  question.answers.forEach((answer, index) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "answer-option";
    option.innerHTML = `<span class="answer-key">${String.fromCharCode(65 + index)}</span><span>${answer}</span>`;
    option.addEventListener("click", () => chooseAnswer(index));
    list.append(option);
  });
  document.querySelector("#answerFeedback").textContent = "";
  document.querySelector("#answerFeedback").className = "answer-feedback";
  document.querySelector("#nextQuestion").hidden = true;
}

function chooseAnswer(selected) {
  if (answered) return;
  answered = true;
  const question = questions[questionIndex];
  const options = [...document.querySelectorAll(".answer-option")];
  options.forEach((option, index) => {
    option.disabled = true;
    if (index === question.correct) option.classList.add("correct");
    else if (index === selected) option.classList.add("incorrect");
  });
  const feedback = document.querySelector("#answerFeedback");
  if (selected === question.correct) {
    correctAnswers += 1;
    combo += 1;
    cash += 100 + Math.max(0, combo - 1) * 25;
    feedback.classList.add("good");
    feedback.textContent = `ACERTO! +$${100 + Math.max(0, combo - 1) * 25} • ${question.explanation}`;
  } else {
    combo = 0;
    decoherence = Math.min(5, decoherence + 1);
    feedback.classList.add("bad");
    feedback.textContent = `DECOERÊNCIA! A resposta certa está marcada. ${question.explanation}`;
  }
  document.querySelector("#cashCount").textContent = `$ ${String(cash).padStart(3, "0")}`;
  document.querySelector("#comboLabel").textContent = `COMBO ×${combo}`;
  const stars = document.querySelector("#decoherenceStars");
  stars.innerHTML = Array.from({ length: 5 }, (_, i) => `<span class="${i < decoherence ? "lit" : ""}">${i < decoherence ? "★" : "☆"}</span>`).join(" ");
  stars.setAttribute("aria-label", `${decoherence} de 5 estrelas de decoerência`);
  document.querySelector("#nextQuestion").hidden = false;
  document.querySelector("#nextQuestion").textContent = questionIndex === questions.length - 1 ? "FINALIZAR MISSÃO →" : "PRÓXIMO DESAFIO →";
}

document.querySelector("#nextQuestion").addEventListener("click", () => {
  if (!answered) return;
  questionIndex += 1;
  if (questionIndex === questions.length) {
    renderResults();
    showStage("garage");
  } else {
    renderQuestion();
  }
});

function renderResults() {
  document.querySelector("#missionProgress").style.width = "100%";
  document.querySelector("#finalScore").innerHTML = `${correctAnswers} <span>/ 5</span>`;
  document.querySelector("#finalCash").textContent = `$ ${String(cash).padStart(3, "0")}`;
  const vehicle = document.querySelector("#vehicleName");
  const body = document.querySelector(".car-body");
  const paint = document.querySelector("#vehicleSvg linearGradient");
  const message = document.querySelector("#garageMessage");
  const caption = document.querySelector("#vehicleCaption");
  const title = document.querySelector("#finalRank");
  const variants = [
    {
      name: "SUCATA CLÁSSICA ENFERRUJADA", rank: "CALOURO", message: "O QPU chegou inteiro — e isso já é uma vitória. A cidade ainda está aprendendo a confiar em você.",
      caption: "Toda lenda começa com uma caranga que pega na terceira tentativa.", colors: ["#71514b", "#bb7852", "#665052"],
      shape: "M86 190l18-43c8-18 25-29 44-32l67-10 58-54c10-9 22-14 36-14h82c19 0 36 9 47 24l42 54 62 18c16 5 27 19 27 36v22H86z"
    },
    {
      name: "MUSCLE CAR RETRÔ NEON", rank: "PILOTO DE RUA", message: "Boa recuperação! Você já sabe diferenciar uma boa pergunta de um bit clássico.",
      caption: "Motor alto, suspensão baixa e uma quantidade suspeita de neon.", colors: ["#a13b6b", "#ff914f", "#733b8a"],
      shape: "M70 190l15-40c8-18 24-28 46-31l82-8 39-48c11-13 25-19 42-19h102c20 0 38 8 52 24l39 44 66 15c19 5 29 18 29 37v26H70z"
    },
    {
      name: "SUPERESPORTIVO HÍBRIDO", rank: "ESPECIALISTA QPU", message: "Quatro de cinco! Você entende a física e sabe manter o sistema sob controle.",
      caption: "Acelera com estilo e deixa as probabilidades no retrovisor.", colors: ["#207f91", "#48d8d1", "#7056bb"],
      shape: "M52 190l26-37c10-15 26-23 45-27l100-15 44-43c11-10 24-15 40-15h104c19 0 37 8 49 23l39 47 63 13c17 4 29 18 29 36v26H52z"
    },
    {
      name: "HYPERCAR QUÂNTICO EDIÇÃO LIMITADA", rank: "LENDÁRIO • 5/5", message: "Pontuação perfeita! Você recuperou o qubit e dominou os conceitos da missão.",
      caption: "Uma máquina improvável para uma cidade que já viu de tudo.", colors: ["#ee6fb0", "#ffbd68", "#47d9df"],
      shape: "M44 190l28-38c12-17 30-25 51-29l101-19 44-40c13-12 29-18 47-18h115c22 0 42 10 54 27l36 48 61 10c20 4 34 19 34 39v20H44z"
    }
  ];
  const variant = correctAnswers < 2 ? variants[0] : correctAnswers < 4 ? variants[1] : correctAnswers === 4 ? variants[2] : variants[3];
  vehicle.textContent = variant.name;
  title.textContent = variant.rank;
  message.textContent = variant.message;
  caption.textContent = variant.caption;
  body.setAttribute("d", variant.shape);
  paint.querySelectorAll("stop").forEach((stop, index) => stop.setAttribute("stop-color", variant.colors[index]));
}

document.querySelector("#replayButton").addEventListener("click", () => {
  dialogueIndex = 0;
  inspected = new Set();
  cooled = false;
  pulsed = false;
  questionIndex = 0;
  quizStarted = false;
  correctAnswers = 0;
  cash = 0;
  combo = 0;
  decoherence = 0;
  document.querySelector("#dialogueText").textContent = `“${dialogue[0]}”`;
  document.querySelector("#dialogueCount").textContent = "01 / 05";
  document.querySelector("#temperatureValue").textContent = "4.2 K";
  document.querySelector("#temperatureBar").style.width = "76%";
  document.querySelector("#systemStatus").textContent = "ESTÁVEL • 4.2 K";
  document.querySelector("#coolButton").disabled = true;
  document.querySelector("#coolButton").innerHTML = "INSPECIONE OS 3 COMPONENTES <span>↓</span>";
  document.querySelector("#coolButton").classList.add("button-secondary");
  document.querySelector("#pulseButton").disabled = true;
  document.querySelector("#pulseButton").textContent = "APLICAR PULSO π/2 ↗";
  document.querySelector("#qubitState").textContent = "|0⟩";
  document.querySelector("#blochVector").setAttribute("d", "M65 56 65 15");
  document.querySelector("#blochPoint").setAttribute("cx", "65");
  document.querySelector("#blochPoint").setAttribute("cy", "15");
  document.querySelector("#blochCaption").innerHTML = "O qubit está no estado |0⟩.<br>Resfrie o chip para continuar.";
  document.querySelector("#toQuiz").disabled = true;
  document.querySelector("#partTitle").textContent = "Sua bancada, piloto.";
  document.querySelector("#partDescription").textContent = "O computador quântico precisa de temperaturas extremas e controle delicado. Investigue as peças antes de iniciar a simulação.";
  document.querySelector("#inspectionPanel .console-label").textContent = "SELECIONE UM COMPONENTE";
  showStage("briefing");
});

async function toggleSound() {
  const toggle = document.querySelector("#soundToggle");
  if (!audioAvailable) {
    document.querySelector("#soundLabel").textContent = "ÁUDIO INDISPONÍVEL";
    toggle.disabled = true;
    return;
  }
  if (audioContext && audioContext.state !== "closed") {
    window.clearInterval(ambienceTimer);
    const contextToClose = audioContext;
    audioContext = null;
    padOscillators = [];
    document.querySelector("#soundLabel").textContent = "SOM: OFF";
    toggle.setAttribute("aria-pressed", "false");
    await contextToClose.close();
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();
  await audioContext.resume();
  masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.12, audioContext.currentTime + 1.2);
  masterGain.connect(audioContext.destination);

  [110, 164.81, 220].forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = index === 1 ? "triangle" : "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = index === 0 ? 0.2 : 0.09;
    oscillator.connect(gain);
    gain.connect(masterGain);
    oscillator.start();
    padOscillators.push(oscillator);
  });

  const sequences = [
    [440, 523.25, 659.25, 523.25, 392, 523.25, 587.33, 523.25],
    [349.23, 440, 523.25, 440, 329.63, 440, 523.25, 440],
    [392, 493.88, 587.33, 493.88, 329.63, 392, 493.88, 392],
    [329.63, 392, 493.88, 392, 293.66, 392, 440, 392]
  ];
  let noteIndex = 0;
  ambienceTimer = window.setInterval(() => {
    if (!audioContext || audioContext.state !== "running") return;
    const now = audioContext.currentTime;
    const frequency = sequences[Math.floor(noteIndex / 8) % sequences.length][noteIndex % 8];
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
    oscillator.connect(envelope);
    envelope.connect(masterGain);
    oscillator.start(now);
    oscillator.stop(now + 0.7);
    noteIndex = (noteIndex + 1) % 32;
  }, 680);

  document.querySelector("#soundLabel").textContent = "SOM: ON";
  toggle.setAttribute("aria-pressed", "true");
}

document.querySelector("#soundToggle").addEventListener("click", toggleSound);

if (!audioAvailable) {
  document.querySelector("#soundLabel").textContent = "ÁUDIO INDISPONÍVEL";
  document.querySelector("#soundToggle").disabled = true;
}

showStage("briefing");

let loadingProgress = 0;
const loadingTimer = window.setInterval(() => {
  loadingProgress += 7 + Math.random() * 12;
  loadingBar.style.width = `${Math.min(100, loadingProgress)}%`;
  if (loadingProgress > 36) loadingLabel.textContent = "ESTABILIZANDO A SUPERPOSIÇÃO...";
  if (loadingProgress >= 100) {
    window.clearInterval(loadingTimer);
    loadingLabel.textContent = "PRONTO PARA A MISSÃO";
    window.setTimeout(() => loadingScreen.classList.add("dismissed"), 500);
  }
}, 140);
