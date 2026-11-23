
/* ==========================================
   OBSERVER X - PHASE 3.8
   PLAYER LIVE STATS - OVERLAY
========================================== */

import {
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const db = getDatabase(app);

const statsRef = ref(
  db,
  `matches/${MATCH_ID}/playerStats`
);

let stats = {};

function getStats(teamKey, index) {
  const data = stats?.[teamKey]?.[index] || {};

  return {
    kills: Math.max(0, Number(data.kills) || 0),
    deaths: Math.max(0, Number(data.deaths) || 0),
    assists: Math.max(0, Number(data.assists) || 0),
    alive: data.alive !== false
  };
}

function updatePlayer(card, teamKey, index) {
  const data = getStats(teamKey, index);

  const content = card.querySelector(".p35-player-content");
  if (!content) return;

  const meta = content.querySelector(".player-meta");
  if (!meta) return;

  let kda = content.querySelector(".p38-kda");

  if (!kda) {
    kda = document.createElement("span");
    kda.className = "p38-kda";
    meta.appendChild(kda);
  }

  const kdaText =
    `K ${data.kills} / D ${data.deaths} / A ${data.assists}`;

  if (kda.textContent !== kdaText) {
    kda.textContent = kdaText;
  }

  // 既存の「K/D/A —」部分を隠して、
  // 新しいKDAを表示する
  const originalText = Array.from(meta.childNodes)
    .find(node => node.nodeType === Node.TEXT_NODE);

  if (originalText) {
    const newText = originalText.textContent
      .replace(/\s*•\s*K\/D\/A\s*—/i, "");

    if (originalText.textContent !== newText) {
      originalText.textContent = newText;
    }
  }

  let life = content.querySelector(".p38-life-label");

  if (!life) {
    life = document.createElement("span");
    life.className = "p38-life-label";
    content.insertBefore(life, meta);
  }

  const lifeText = data.alive ? "ALIVE" : "DEAD";

  if (life.textContent !== lifeText) {
    life.textContent = lifeText;
  }

  life.classList.toggle("is-alive", data.alive);
  life.classList.toggle("is-dead", !data.alive);

  card.classList.toggle("p38-dead", !data.alive);
}

function applyStats() {
  for (const [teamKey, rosterId] of [
    ["teamA", "rosterA"],
    ["teamB", "rosterB"]
  ]) {
    const root = document.getElementById(rosterId);
    if (!root) continue;

    root.querySelectorAll(":scope > .player")
      .forEach((card, index) => {
        updatePlayer(card, teamKey, index);
      });
  }
}

// 既存script.jsがプレイヤー欄を再生成しても再適用
function observeRoster(id) {
  const root = document.getElementById(id);
  if (!root) return;

  const observer = new MutationObserver(() => {
    applyStats();
  });

  observer.observe(root, {
    childList: true
  });
}

function initialize() {
  observeRoster("rosterA");
  observeRoster("rosterB");
  applyStats();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialize,
    { once: true }
  );
} else {
  initialize();
}

onValue(statsRef, snapshot => {
  stats = snapshot.val() || {};
  applyStats();
}, error => {
  console.error("Phase 3.8 Firebase:", error);
});
