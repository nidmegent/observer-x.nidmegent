
import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getDatabase, ref, onValue, runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

const panel = document.createElement("section");
panel.className = "panel p32-panel";
panel.hidden = true;

panel.innerHTML = `
  <h2>SERIES CONTROL</h2>
  <p class="p32-help">
    BO1 / BO3 / BO5 マップ勝利数管理
  </p>

  <div class="p32-teams">
    <div class="p32-team p32-a">
      <div id="p32NameA" class="p32-team-name">TEAM A</div>
      <div id="p32ScoreA" class="p32-score">0</div>
      <div id="p32DotsA" class="p32-dots"></div>

      <div class="p32-controls">
        <button type="button" id="p32MinusA">−</button>
        <button type="button" id="p32PlusA">MAP WIN ＋</button>
      </div>
    </div>

    <div class="p32-team p32-b">
      <div id="p32NameB" class="p32-team-name">TEAM B</div>
      <div id="p32ScoreB" class="p32-score">0</div>
      <div id="p32DotsB" class="p32-dots"></div>

      <div class="p32-controls">
        <button type="button" id="p32MinusB">−</button>
        <button type="button" id="p32PlusB">MAP WIN ＋</button>
      </div>
    </div>
  </div>

  <div class="p32-summary">
    <span id="p32Format">BO3</span>
    <strong id="p32SeriesScore">0 - 0</strong>
    <span id="p32Result">SERIES IN PROGRESS</span>
  </div>

  <p class="p32-help">
    マップ勝利数とラウンドスコアは別管理です。
  </p>
  <p id="p32Status" role="status" aria-live="polite"></p>
`;

document.getElementById("controlPanel").appendChild(panel);

const $ = id => document.getElementById(id);

let match = null;
let busy = false;
let signedIn = false;

function winsNeeded(bestOf) {
  const bo = [1, 3, 5].includes(Number(bestOf))
    ? Number(bestOf) : 3;
  return Math.floor(bo / 2) + 1;
}

function getWins(team) {
  return Math.max(
    0,
    Math.trunc(Number(team?.seriesWins) || 0)
  );
}

function drawDots(element, wins, total) {
  element.replaceChildren();

  for (let i = 0; i < total; i++) {
    const dot = document.createElement("span");
    dot.className = "p32-dot";
    if (i < wins) dot.classList.add("active");
    element.appendChild(dot);
  }
}

function render() {
  if (!match) {
    $("p32Result").textContent = "MATCH DATA NOT FOUND";
    $("p32Status").textContent =
      "先にPhase 2の初期データを作成してください";
    return;
  }

  const needed = winsNeeded(match.bestOf);
  const a = getWins(match.teamA);
  const b = getWins(match.teamB);

  $("p32NameA").textContent = match.teamA?.name || "TEAM A";
  $("p32NameB").textContent = match.teamB?.name || "TEAM B";

  $("p32ScoreA").textContent = a;
  $("p32ScoreB").textContent = b;

  drawDots($("p32DotsA"), a, needed);
  drawDots($("p32DotsB"), b, needed);

  $("p32Format").textContent =
    `BO${[1,3,5].includes(Number(match.bestOf))
      ? match.bestOf : 3}`;

  $("p32SeriesScore").textContent = `${a} - ${b}`;

  if (a >= needed) {
    $("p32Result").textContent = "TEAM A SERIES WINNER";
  } else if (b >= needed) {
    $("p32Result").textContent = "TEAM B SERIES WINNER";
  } else {
    $("p32Result").textContent = "SERIES IN PROGRESS";
  }

  const finished = a >= needed || b >= needed;

  $("p32PlusA").disabled =
    busy || !signedIn || finished || a >= needed;
  $("p32PlusB").disabled =
    busy || !signedIn || finished || b >= needed;

  $("p32MinusA").disabled =
    busy || !signedIn || a <= 0;
  $("p32MinusB").disabled =
    busy || !signedIn || b <= 0;
}

async function changeWins(teamKey, delta) {
  if (busy || !signedIn) return;

  busy = true;
  render();
  $("p32Status").textContent = "更新中...";

  try {
    let rejection = "";

    const result = await runTransaction(
      matchRef,
      current => {
        if (!current?.teamA || !current?.teamB) {
          rejection = "試合データがありません";
          return;
        }

        const needed = winsNeeded(current.bestOf);
        const a = getWins(current.teamA);
        const b = getWins(current.teamB);
        const old = teamKey === "teamA" ? a : b;

        if (delta > 0 && (a >= needed || b >= needed)) {
          rejection = "シリーズは既に決着しています";
          return;
        }

        const next = old + delta;

        if (next < 0 || next > needed) {
          rejection = "マップ勝利数が範囲外です";
          return;
        }

        current[teamKey].seriesWins = next;
        rejection = "";
        return current;
      },
      { applyLocally: false }
    );

    $("p32Status").textContent = result.committed
      ? "マップ勝利数を更新しました"
      : (rejection || "更新はキャンセルされました");

  } catch (error) {
    $("p32Status").textContent =
      "更新エラー: " + error.message;
    console.error(error);
  } finally {
    busy = false;
    render();
  }
}

$("p32PlusA").onclick = () => changeWins("teamA", 1);
$("p32MinusA").onclick = () => changeWins("teamA", -1);
$("p32PlusB").onclick = () => changeWins("teamB", 1);
$("p32MinusB").onclick = () => changeWins("teamB", -1);

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;
  render();
});

onValue(matchRef, snapshot => {
  match = snapshot.val();
  render();
}, error => {
  $("p32Status").textContent =
    "Firebase読み取りエラー: " + error.message;
});
