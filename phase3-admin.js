
import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getDatabase, ref, onValue, update, runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

let match = null;
let busy = false;

const panel = document.createElement("section");
panel.className = "panel phase3-panel";
panel.hidden = true;

panel.innerHTML = `
  <h2>PHASE 3 — BROADCAST CONTROL</h2>
  <p class="p3-subtitle">
    OBSへリアルタイムに演出を送信します
  </p>

  <div class="p3-section">
    <h3>PAUSE CONTROL</h3>

    <label>
      TIME OUTを取得したチーム
      <select id="p3Team">
        <option value="A">TEAM A</option>
        <option value="B">TEAM B</option>
      </select>
    </label>

    <div class="p3-buttons">
      <button type="button" id="p3Timeout">
        TIME OUT
      </button>
      <button type="button" id="p3Technical">
        TECHNICAL PAUSE
      </button>
    </div>

    <button type="button" id="p3Clear" class="p3-clear">
      演出を解除
    </button>
  </div>

  <div class="p3-section">
    <h3>ROUND WIN</h3>

    <div class="p3-buttons">
      <button type="button" id="p3WinA">
        TEAM A WIN
      </button>
      <button type="button" id="p3WinB">
        TEAM B WIN
      </button>
    </div>
    <p class="p3-help">
      約5秒間表示します。スコアは自動加算しません。
    </p>
  </div>

  <div class="p3-section">
    <h3>SIDE CONTROL</h3>
    <button type="button" id="p3Swap">
      ATTACK / DEFENSE 一括切り替え
    </button>
  </div>

  <div class="p3-section">
    <h3>現在の演出状態</h3>
    <div id="p3Current" class="p3-current">
      NORMAL MATCH
    </div>
    <p id="p3Status" role="status" aria-live="polite"></p>
  </div>
`;

const controlPanel = document.getElementById("controlPanel");
controlPanel.prepend(panel);

const $ = id => document.getElementById(id);

function message(text) {
  $("p3Status").textContent = text;
}

function setBusy(value) {
  busy = value;
  panel.querySelectorAll("button").forEach(button => {
    button.disabled = value;
  });
}

async function perform(action) {
  if (busy) return;

  setBusy(true);
  try {
    await action();
    message("Firebaseへの送信が完了しました");
  } catch (error) {
    message("操作失敗: " + error.message);
    console.error("Phase 3:", error);
  } finally {
    setBusy(false);
  }
}

function teamName(key) {
  return match?.[key]?.name || (key === "teamA" ? "TEAM A" : "TEAM B");
}

function updateTeamOptions() {
  const selected = $("p3Team").value;
  $("p3Team").options[0].textContent = teamName("teamA");
  $("p3Team").options[1].textContent = teamName("teamB");
  $("p3Team").value = selected;
}

function showState() {
  const pause = match?.pause;
  const current = $("p3Current");

  if (pause?.type === "timeout") {
    const key = pause.team === "B" ? "teamB" : "teamA";
    current.textContent = `TIME OUT — ${teamName(key)}`;
    current.dataset.mode = "timeout";
  } else if (pause?.type === "technical") {
    current.textContent = "TECHNICAL PAUSE";
    current.dataset.mode = "technical";
  } else {
    current.textContent = "NORMAL MATCH";
    current.dataset.mode = "none";
  }
}

$("p3Timeout").onclick = () => perform(async () => {
  if (!match) throw new Error("初期データがありません");
  await update(matchRef, {
    pause: {
      type: "timeout",
      team: $("p3Team").value
    }
  });
});

$("p3Technical").onclick = () => perform(async () => {
  if (!match) throw new Error("初期データがありません");
  await update(matchRef, {
    pause: {
      type: "technical",
      team: ""
    }
  });
});

$("p3Clear").onclick = () => perform(async () => {
  if (!match) throw new Error("初期データがありません");
  await update(matchRef, {
    pause: {
      type: "none",
      team: ""
    }
  });
});


async function roundWin(team) {
  if (!match) throw new Error("初期データがありません");

  const id = crypto.randomUUID();

  await update(matchRef, {
    // ROUND WIN 演出
    roundEvent: {
      id,
      type: "roundWin",
      team,
      expiresAt: Date.now() + 5000
    },

    // PHASE 3.9 - スパイク状態リセット
    spikeStatus: {
      status: "none",
      holder: "none",
      site: "A"
    }
  });
}


$("p3WinA").onclick = () => perform(() => roundWin("A"));
$("p3WinB").onclick = () => perform(() => roundWin("B"));

$("p3Swap").onclick = () => perform(async () => {
  if (!match) throw new Error("初期データがありません");

  const result = await runTransaction(
    matchRef,
    value => {
      if (!value?.teamA || !value?.teamB) return;

      const sideA = value.teamA.side;
      const sideB = value.teamB.side;

      value.teamA.side = sideB;
      value.teamB.side = sideA;

      return value;
    },
    { applyLocally: false }
  );

  if (!result.committed) {
    throw new Error("攻守切り替えが完了しませんでした");
  }
});

onAuthStateChanged(auth, user => {
  panel.hidden = !user;
});

onValue(matchRef, snapshot => {
  match = snapshot.val();
  updateTeamOptions();
  showState();
}, error => {
  message("同期エラー: " + error.message);
});
