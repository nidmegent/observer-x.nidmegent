
/* ==========================================
   OBSERVER X - PHASE 3.8
   PLAYER LIVE STATS - ADMIN
========================================== */

import {
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const base = `matches/${MATCH_ID}`;
const matchRef = ref(db, base);

let match = null;
let stats = {};
let signedIn = false;
let busy = false;

const panel = document.createElement("section");
panel.id = "p38Panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p38-header">
    <div>
      <h2>PLAYER LIVE STATS</h2>
      <p>PHASE 3.8 / MANUAL CONTROL</p>
    </div>
    <span class="p38-tag">LIVE</span>
  </div>

  <p class="p38-help">
    K / D / A を編集し、保存ボタンで反映します。
    ALIVE / DEAD は押すとすぐに反映されます。
  </p>

  <div id="p38TeamA"></div>
  <div id="p38TeamB"></div>

  <div class="p38-footer">
    <button type="button" id="p38NextRound">
      NEXT ROUND / ALL ALIVE
    </button>
  </div>

  <p id="p38Status" role="status" aria-live="polite"></p>
`;

document.body.appendChild(panel);

const $ = id => document.getElementById(id);

function status(message) {
  $("p38Status").textContent = message;
}

function playerStats(teamKey, index) {
  const value = stats?.[teamKey]?.[index] || {};
  return {
    kills: Number(value.kills) || 0,
    deaths: Number(value.deaths) || 0,
    assists: Number(value.assists) || 0,
    alive: value.alive !== false
  };
}

async function writeChanges(changes, message) {
  if (!signedIn || busy) return;

  busy = true;
  panel.classList.add("p38-busy");

  try {
    await update(matchRef, changes);
    status(message);
  } catch (error) {
    console.error("Phase 3.8:", error);
    status("保存エラー: " + error.message);
  } finally {
    busy = false;
    panel.classList.remove("p38-busy");
  }
}

function createPlayer(teamKey, index, player) {
  const data = playerStats(teamKey, index);
  const row = document.createElement("div");
  row.className = "p38-player";

  const name = document.createElement("strong");
  name.className = "p38-name";
  name.textContent =
    `${index + 1}. ${player?.name || "PLAYER"}`;

  const inputs = document.createElement("div");
  inputs.className = "p38-inputs";

  function numberInput(label, value) {
    const wrapper = document.createElement("label");
    const title = document.createElement("span");
    title.textContent = label;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "999";
    input.step = "1";
    input.value = value;

    wrapper.append(title, input);
    inputs.appendChild(wrapper);

    return input;
  }

  const kills = numberInput("K", data.kills);
  const deaths = numberInput("D", data.deaths);
  const assists = numberInput("A", data.assists);

  const actions = document.createElement("div");
  actions.className = "p38-actions";

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "SAVE KDA";

  const alive = document.createElement("button");
  alive.type = "button";
  alive.className =
    "p38-life " + (data.alive ? "is-alive" : "is-dead");
  alive.textContent = data.alive ? "ALIVE" : "DEAD";

  function readNumber(input) {
    const value = Number(input.value);
    return Number.isFinite(value)
      ? Math.max(0, Math.min(999, Math.floor(value)))
      : 0;
  }

  save.addEventListener("click", async () => {
    const path = `playerStats/${teamKey}/${index}`;

    await writeChanges({
      [`${path}/kills`]: readNumber(kills),
      [`${path}/deaths`]: readNumber(deaths),
      [`${path}/assists`]: readNumber(assists)
    }, `${player?.name || "PLAYER"} のKDAを保存しました`);
  });

  alive.addEventListener("click", async () => {
    const next = !playerStats(teamKey, index).alive;

    await writeChanges({
      [`playerStats/${teamKey}/${index}/alive`]: next
    }, next ? "ALIVEに変更しました" : "DEADに変更しました");
  });

  actions.append(save, alive);
  row.append(name, inputs, actions);

  return row;
}

function renderTeam(teamKey, targetId) {
  const root = $(targetId);
  root.replaceChildren();

  const team = match?.[teamKey];
  if (!team) return;

  const heading = document.createElement("h3");
  heading.textContent =
    `${teamKey === "teamA" ? "TEAM A" : "TEAM B"} — ` +
    (team.name || "");

  root.appendChild(heading);

  const players = Array.isArray(team.players)
    ? team.players
    : Object.values(team.players || {});

  players.slice(0, 5).forEach((player, index) => {
    root.appendChild(createPlayer(teamKey, index, player));
  });
}

function render() {
  if (!signedIn || busy) return;

  renderTeam("teamA", "p38TeamA");
  renderTeam("teamB", "p38TeamB");
}

$("p38NextRound").addEventListener("click", async () => {
  if (!signedIn || busy) return;

  if (!confirm(
    "10人全員の生存状態をALIVEに戻しますか？\nKDAは維持されます。"
  )) return;

  const changes = {};

  for (const teamKey of ["teamA", "teamB"]) {
    for (let i = 0; i < 5; i++) {
      changes[`playerStats/${teamKey}/${i}/alive`] = true;
    }
  }

  await writeChanges(
    changes,
    "全プレイヤーをALIVEに戻しました"
  );
});

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;
  render();
});

onValue(matchRef, snapshot => {
  match = snapshot.val();
  stats = match?.playerStats || {};
  render();
}, error => {
  status("読み取りエラー: " + error.message);
});
