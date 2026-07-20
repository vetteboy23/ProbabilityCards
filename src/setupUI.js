import {
  GAME_FORMAT,
  GAME_FORMAT_LABEL,
  JOKER_OPTION,
  JOKER_OPTION_DEFINITIONS,
  selectablePlayers,
  buildGameSetup,
  validateGameSetup,
} from "./setupRules.js";
import { optionalHands } from "./optionalHands.js";
import { calculateFiveCardProbabilitiesExact } from "./fiveCardProbability.js";
import { calculateHoldemProbabilitiesExact } from "./sevenCardProbability.js";
import {
  buildStaticHandRanking,
  formatProbabilityPercent,
  RANKING_DIRECTION,
} from "./ranking.js";

const playerList = document.querySelector("#player-list");
const selectedCount = document.querySelector("#selected-count");
const createRankingButton = document.querySelector("#create-ranking");
const clearButton = document.querySelector("#clear-players");
const selectAllButton = document.querySelector("#select-all-players");
const feedback = document.querySelector("#setup-feedback");
const optionalHandList = document.querySelector("#optional-hand-list");
const selectedHandCount = document.querySelector("#selected-hand-count");
const selectAllHandsButton = document.querySelector("#select-all-hands");
const clearHandsButton = document.querySelector("#clear-hands");
const calculationPanel = document.querySelector("#calculation-panel");
const calculationStatus = document.querySelector("#calculation-status");
const calculationProgress = document.querySelector("#calculation-progress");
const cancelCalculationButton = document.querySelector("#cancel-calculation");
const rankingResult = document.querySelector("#ranking-result");
const resultSummary = document.querySelector("#result-summary");
const rankingSummary = document.querySelector("#ranking-summary");
const probabilityNote = document.querySelector("#probability-note");
const rankingBody = document.querySelector("#ranking-body");
const rankingDirection = document.querySelector("#ranking-direction");
const changeSetupButton = document.querySelector("#change-setup");
const printRankingButton = document.querySelector("#print-ranking");
const settingsOutput = document.querySelector("#settings-output");

let activeWorker = null;
let activeAbortController = null;
let activeCalculationReject = null;
let calculationSequence = 0;
let lastSetup = null;
let lastProbabilityResult = null;
const resultCache = new Map();

function renderPlayerList() {
  const fragment = document.createDocumentFragment();
  for (const person of selectablePlayers) {
    const label = document.createElement("label");
    label.className = "player-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "players";
    checkbox.value = person.id;
    const name = document.createElement("span");
    name.textContent = person.displayName;
    label.append(checkbox, name);
    fragment.append(label);
  }
  playerList.replaceChildren(fragment);
}

function renderOptionalHandList() {
  const fragment = document.createDocumentFragment();
  for (const hand of optionalHands) {
    const label = document.createElement("label");
    label.className = "optional-hand-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "optional-hands";
    checkbox.value = hand.id;
    const content = document.createElement("span");
    content.className = "optional-hand-copy";
    const name = document.createElement("strong");
    name.textContent = hand.name;
    const description = document.createElement("small");
    description.textContent = hand.shortDescription;
    content.append(name, description);
    label.append(checkbox, content);
    fragment.append(label);
  }
  optionalHandList.replaceChildren(fragment);
}

function getCheckedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(
    (input) => input.value
  );
}

function getSelectedRadioValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value ?? null;
}

function readFormState() {
  return {
    selectedPlayerIds: getCheckedValues("players"),
    selectedOptionalHandIds: getCheckedValues("optional-hands"),
    format: getSelectedRadioValue("format"),
    jokerOption: getSelectedRadioValue("jokers"),
    useVirtualSelf: document.querySelector("#use-virtual-self").checked,
  };
}

function updateCounts() {
  const playerCount = getCheckedValues("players").length;
  const handCount = getCheckedValues("optional-hands").length;
  selectedCount.textContent = `${playerCount} selected`;
  selectedCount.dataset.empty = playerCount === 0 ? "true" : "false";
  selectedHandCount.textContent = `${handCount} selected`;
  selectedHandCount.dataset.empty = handCount === 0 ? "true" : "false";
}

function setAll(name, checked) {
  for (const checkbox of document.querySelectorAll(`input[name="${name}"]`)) {
    checkbox.checked = checked;
  }
  updateCounts();
  invalidateResults();
}

function invalidateResults() {
  cancelActiveCalculation();
  rankingResult.hidden = true;
  calculationPanel.hidden = true;
  feedback.textContent = "";
  lastSetup = null;
  lastProbabilityResult = null;
}

function cancelActiveCalculation() {
  const reject = activeCalculationReject;
  activeCalculationReject = null;
  activeWorker?.terminate();
  activeWorker = null;
  activeAbortController?.abort();
  activeAbortController = null;
  reject?.(new DOMException("Calculation cancelled", "AbortError"));
  createRankingButton.disabled = false;
  createRankingButton.textContent = "Create ranking";
}

function cacheKey(setup) {
  return JSON.stringify({
    format: setup.format,
    includedJokerIds: setup.includedJokerIds,
    selectedPlayerIds: setup.selectedPlayerIds,
    selectedOptionalHandIds: setup.selectedOptionalHandIds,
  });
}

function probabilitySettings(setup) {
  return {
    includedJokerIds: [...setup.includedJokerIds],
    selectedPlayerIds: [...setup.selectedPlayerIds],
    selectedOptionalHandIds: [...setup.selectedOptionalHandIds],
    useVirtualSelf: setup.useVirtualSelf,
  };
}

function updateProgress(progress, format) {
  if (format === GAME_FORMAT.FIVE_CARD_DRAW) {
    const fraction = Math.max(0, Math.min(1, progress.fractionComplete ?? 0));
    calculationProgress.value = fraction;
    calculationStatus.textContent = `Checking five-card combinations — ${Math.round(
      fraction * 100
    )}% complete.`;
    return;
  }

  const fraction = progress.totalCombinationCount
    ? progress.weightedCombinationCount / progress.totalCombinationCount
    : 0;
  calculationProgress.value = Math.max(0, Math.min(1, fraction));
  calculationStatus.textContent = "Calculating roster-dependent Hold’em attendance probabilities…";
}

function runInWorker(setup) {
  return new Promise((resolve, reject) => {
    const isFiveCard = setup.format === GAME_FORMAT.FIVE_CARD_DRAW;
    const workerUrl = isFiveCard
      ? "./src/fiveCardProbabilityWorker.js"
      : "./src/sevenCardProbabilityWorker.js";
    const worker = new Worker(workerUrl, { type: "module" });
    activeWorker = worker;
    activeCalculationReject = reject;
    const id = ++calculationSequence;

    worker.addEventListener("message", (event) => {
      const message = event.data ?? {};
      const messageId = isFiveCard ? message.calculationId : message.id;
      if (messageId !== id) return;

      if (message.type === "progress") {
        updateProgress(message.progress ?? {}, setup.format);
      } else if (message.type === "result") {
        worker.terminate();
        activeWorker = null;
        activeCalculationReject = null;
        resolve(message.result);
      } else if (message.type === "cancelled") {
        worker.terminate();
        activeWorker = null;
        activeCalculationReject = null;
        reject(new DOMException("Calculation cancelled", "AbortError"));
      } else if (message.type === "error") {
        worker.terminate();
        activeWorker = null;
        activeCalculationReject = null;
        reject(new Error(message.error?.message ?? "Probability calculation failed"));
      }
    });

    worker.addEventListener("error", (event) => {
      worker.terminate();
      activeWorker = null;
      activeCalculationReject = null;
      reject(event.error ?? new Error(event.message || "Worker failed"));
    });

    if (isFiveCard) {
      worker.postMessage({
        type: "calculate",
        calculationId: id,
        settings: probabilitySettings(setup),
        batchSize: 10000,
      });
    } else {
      worker.postMessage({ id, settings: probabilitySettings(setup) });
    }
  });
}

async function runWithoutWorker(setup) {
  activeAbortController = new AbortController();
  if (setup.format === GAME_FORMAT.FIVE_CARD_DRAW) {
    return calculateFiveCardProbabilitiesExact(probabilitySettings(setup), {
      signal: activeAbortController.signal,
      batchSize: 5000,
      onProgress(progress) {
        updateProgress(progress, setup.format);
      },
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
  return calculateHoldemProbabilitiesExact(probabilitySettings(setup), {
    onAttendanceProgress(progress) {
      updateProgress(progress, setup.format);
    },
  });
}

async function calculateProbabilities(setup) {
  const key = cacheKey(setup);
  if (resultCache.has(key)) return resultCache.get(key);

  let result;
  if (typeof Worker === "function") {
    try {
      result = await runInWorker(setup);
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      result = await runWithoutWorker(setup);
    }
  } else {
    result = await runWithoutWorker(setup);
  }
  resultCache.set(key, result);
  return result;
}

function renderSummary(setup) {
  resultSummary.replaceChildren();
  const optionalNames = setup.selectedOptionalHandNames.length
    ? setup.selectedOptionalHandNames.join(", ")
    : "None — built-in hands only";
  const summaryItems = [
    ["Players", setup.selectedPlayerNames.join(", ")],
    ["Format", setup.formatLabel],
    ["Deck", `${setup.deckSize} cards — ${setup.jokerLabel}`],
    ["Virtual self", setup.useVirtualSelf ? "Enabled for play" : "Disabled"],
    ["Optional hands", optionalNames],
  ];

  for (const [term, description] of summaryItems) {
    const item = document.createElement("div");
    item.className = "summary-item";
    const dt = document.createElement("dt");
    dt.textContent = term;
    const dd = document.createElement("dd");
    dd.textContent = description;
    item.append(dt, dd);
    resultSummary.append(item);
  }
}

function changeSetup() {
  cancelActiveCalculation();
  rankingResult.hidden = true;
  calculationPanel.hidden = true;
  feedback.textContent = "";

  document.querySelector("#players-heading")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });

  window.requestAnimationFrame(() => {
    playerList.querySelector('input[name="players"]')?.focus({ preventScroll: true });
  });
}

function renderRanking() {
  if (!lastSetup || !lastProbabilityResult) return;
  const ranking = buildStaticHandRanking(lastProbabilityResult, lastSetup, {
    direction: rankingDirection.value,
  });

  rankingBody.replaceChildren();
  for (const row of ranking.rows) {
    const tr = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.className = "rank-cell";
    rankCell.textContent = String(row.rank);

    const handCell = document.createElement("td");
    const handName = document.createElement("strong");
    handName.textContent = row.handName;
    const category = document.createElement("small");
    category.className = "hand-meta";
    category.textContent = row.categoryLabel;
    handCell.append(handName, category);
    if (row.tiedByHouseRule) {
      const tie = document.createElement("small");
      tie.className = "hand-meta";
      tie.textContent = "House-rule tie: Rare Exact Pair";
      handCell.append(tie);
    }
    if (row.gameplayVirtualSelfAlias) {
      const alias = document.createElement("small");
      alias.className = "hand-meta";
      alias.textContent = `Uses ${row.probabilitySourceHandName} probability`;
      handCell.append(alias);
    }

    const definitionCell = document.createElement("td");
    definitionCell.textContent = row.description;

    const probabilityCell = document.createElement("td");
    probabilityCell.className = "probability-cell";
    probabilityCell.textContent = formatProbabilityPercent(row.probabilityPercent);

    tr.append(rankCell, handCell, definitionCell, probabilityCell);
    rankingBody.append(tr);
  }

  rankingSummary.textContent = `${ranking.rowCount} ranked hands. Rank 1 is the strongest and rarest.`;
  probabilityNote.textContent = lastSetup.virtualSelfProbabilityNote;
  settingsOutput.textContent = JSON.stringify(lastSetup, null, 2);
}

async function createRanking() {
  const state = readFormState();
  const validation = validateGameSetup(state);
  if (!validation.valid) {
    feedback.textContent = validation.errors.join(" ");
    feedback.focus();
    rankingResult.hidden = true;
    return;
  }

  cancelActiveCalculation();
  feedback.textContent = "";
  lastSetup = buildGameSetup(state);
  rankingResult.hidden = true;
  calculationPanel.hidden = false;
  calculationProgress.removeAttribute("value");
  calculationStatus.textContent =
    lastSetup.format === GAME_FORMAT.FIVE_CARD_DRAW
      ? "Preparing exact five-card enumeration…"
      : "Loading exact Hold’em tables and calculating attendance…";
  createRankingButton.disabled = true;
  createRankingButton.textContent = "Calculating…";

  try {
    lastProbabilityResult = await calculateProbabilities(lastSetup);
    calculationProgress.value = 1;
    calculationStatus.textContent = "Exact ranking complete.";
    renderSummary(lastSetup);
    renderRanking();
    rankingResult.hidden = false;
    rankingResult.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    if (error?.name !== "AbortError") {
      feedback.textContent = error?.message ?? String(error);
      feedback.focus();
    }
  } finally {
    calculationPanel.hidden = true;
    createRankingButton.disabled = false;
    createRankingButton.textContent = "Create ranking";
    activeWorker = null;
    activeAbortController = null;
    activeCalculationReject = null;
  }
}

renderPlayerList();
renderOptionalHandList();
updateCounts();

for (const container of [playerList, optionalHandList]) {
  container.addEventListener("change", () => {
    updateCounts();
    invalidateResults();
  });
}
for (const input of document.querySelectorAll(
  'input[name="format"], input[name="jokers"], #use-virtual-self'
)) {
  input.addEventListener("change", invalidateResults);
}

createRankingButton.addEventListener("click", createRanking);
cancelCalculationButton.addEventListener("click", () => {
  cancelActiveCalculation();
  calculationPanel.hidden = true;
  feedback.textContent = "Calculation cancelled.";
});
clearButton.addEventListener("click", () => setAll("players", false));
selectAllButton.addEventListener("click", () => setAll("players", true));
selectAllHandsButton.addEventListener("click", () => setAll("optional-hands", true));
clearHandsButton.addEventListener("click", () => setAll("optional-hands", false));
rankingDirection.addEventListener("change", renderRanking);
changeSetupButton.addEventListener("click", changeSetup);
printRankingButton.addEventListener("click", () => window.print());

document.querySelector("#format-draw-label").textContent =
  GAME_FORMAT_LABEL[GAME_FORMAT.FIVE_CARD_DRAW];
document.querySelector("#format-holdem-label").textContent =
  GAME_FORMAT_LABEL[GAME_FORMAT.TEXAS_HOLDEM];
document.querySelector("#joker-none-label").textContent =
  JOKER_OPTION_DEFINITIONS[JOKER_OPTION.NONE].label;
document.querySelector("#joker-kick-label").textContent =
  JOKER_OPTION_DEFINITIONS[JOKER_OPTION.KICK_ONLY].label;
document.querySelector("#joker-pipe-label").textContent =
  JOKER_OPTION_DEFINITIONS[JOKER_OPTION.PIPE_ONLY].label;
document.querySelector("#joker-both-label").textContent =
  JOKER_OPTION_DEFINITIONS[JOKER_OPTION.BOTH].label;
