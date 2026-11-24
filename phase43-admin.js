
/* ==========================================
   OBSERVER X
   PHASE 4.3 - ROUND HISTORY ADMIN
========================================== */

import { getApps, initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import { getAuth, onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getDatabase,
  ref,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from
  "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

const defaults = {
  visible: false,
  x: 960,
  y: 650,
  width: 1230,
  height: 400
};

let match = null;
let signedIn = false;
let busy = false;

const $ = id => document.getElementById(id);

const panel = document.createElement("section");
panel.id = "p43Panel";
panel.className = "panel p43-panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p43-heading">
    <div>
      <h2>ROUND HISTORY CONTROL</h2>
      <p>ラウンド勝利履歴・OBS表示設定</p>
    </div>
    <span class="p43-tag">PHASE 4.3</span>
  </div>

  <div class="p43-admin-state" id="p43State">
    HIDDEN
  </div>

  <div class="p43-buttons">
    <button type="button" id="p43Show">
      SHOW ROUND HISTORY
    </button>

    <button type="button" id="p43Hide">
      HIDE ROUND HISTORY
    </button>
  </div>

  <h3>ROUND HISTORY EDITOR</h3>

  <div class="p43-editor">
    <label>
      ROUND NUMBER
      <input id="p43Round" type="number"
        min="1" max="999" value="1">
    </label>

    <label>
      WINNER
      <select id="p43Winner">
        <option value="A">TEAM A</option>
        <option value="B">TEAM B</option>
      </select>
    </label>
  </div>

  <div class="p43-buttons">
    <button type="button" id="p43SaveRound">
      SAVE ROUND
    </button>

    <button type="button" id="p43DeleteRound">
      DELETE ROUND
    </button>
  </div>

  <div id="p43HistoryList"></div>

  <h3>HUD LAYOUT SETTINGS</h3>

  <div class="p43-settings">

    <label>
      CENTER X
      <input id="p43X" type="number"
        min="0" max="1920" value="960">
    </label>

    <label>
      POSITION Y
      <input id="p43Y" type="number"
        min="0" max="1080" value="650">
    </label>

    <label>
      WIDTH
      <input id="p43Width" type="number"
        min="600" max="1920" value="1230">
    </label>

    <label>
      HEIGHT
      <input id="p43Height" type="number"
        min="240" max="1080" value="400">
    </label>

  </div>

  <div class="p43-buttons">
    <button type="button" id="p43SaveLayout">
      SAVE LAYOUT
    </button>

    <button type="button" id="p43ResetLayout">
      RESET LAYOUT
    </button>
  </div>

  <p id="p43Status" role="status"></p>
`;

const controlPanel = $("controlPanel");

if (!controlPanel) {
  throw new Error("#controlPanel が見つかりません");
}

controlPanel.appendChild(panel);

function getUI() {
  return {
    ...defaults,
    ...(match?.roundHistoryUI || {})
  };
}

function teamName(team) {
  return team === "A"
    ? match?.teamA?.name || "TEAM A"
    : match?.teamB?.name || "TEAM B";
}

function setStatus(text) {
  $("p43Status").textContent = text;
}

function setBusy(value) {
  busy = value;

  panel.querySelectorAll("button").forEach(button => {
    button.disabled = value || !signedIn || !match;
  });
}

async function writeChanges(changes, message) {
  if (!signedIn || !match || busy) return;

  setBusy(true);

  try {
    await update(matchRef, changes);
    setStatus(message);
  } catch (error) {
    setStatus("更新エラー: " + error.message);
    console.error("Phase 4.3:", error);
  } finally {
    setBusy(false);
    render();
  }
}

function renderHistory() {
  const list = $("p43HistoryList");

  list.replaceChildren();

  const history = Object.entries(
    match?.roundHistory || {}
  )
    .filter(([key, entry]) =>
      Number(key) >= 1 &&
      Number.isInteger(Number(key)) &&
      ["A", "B"].includes(entry?.team)
    )
    .sort((a, b) => Number(a[0]) - Number(b[0]));

  if (!history.length) {
    const empty = document.createElement("p");

    empty.className = "p43-empty";
    empty.textContent = "まだラウンド履歴がありません";

    list.appendChild(empty);
    return;
  }

  history.forEach(([key, entry]) => {
    const row = document.createElement("button");

    row.type = "button";
    row.className = "p43-history-row";
    row.dataset.team = entry.team;

    const round = document.createElement("span");
    round.textContent = `ROUND ${key}`;

    const winner = document.createElement("strong");
    winner.textContent = teamName(entry.team);

    const edit = document.createElement("span");
    edit.textContent = "EDIT";

    row.append(round, winner, edit);

    row.onclick = () => {
      $("p43Round").value = key;
      $("p43Winner").value = entry.team;

      setStatus(`ROUND ${key} を編集中`);
    };

    row.disabled = busy || !signedIn;

    list.appendChild(row);
  });
}

function render() {
  const ui = getUI();

  const state = $("p43State");

  state.textContent = ui.visible
    ? "LIVE ON OBS"
    : "HIDDEN";

  state.classList.toggle(
    "is-visible",
    ui.visible === true
  );

  $("p43Winner").options[0].textContent = teamName("A");
  $("p43Winner").options[1].textContent = teamName("B");

  const fields = {
    p43X: ui.x,
    p43Y: ui.y,
    p43Width: ui.width,
    p43Height: ui.height
  };

  Object.entries(fields).forEach(([id, value]) => {
    const input = $(id);

    if (
      document.activeElement !== input &&
      input.dataset.dirty !== "true"
    ) {
      input.value = value;
    }
  });

  renderHistory();
  setBusy(busy);
}

function readRound() {
  const round = Number($("p43Round").value);

  if (
    !Number.isInteger(round) ||
    round < 1 ||
    round > 999
  ) {
    setStatus("ROUND NUMBERを確認してください");
    return null;
  }

  return round;
}

$("p43Show").onclick = () => {
  writeChanges(
    { "roundHistoryUI/visible": true },
    "ROUND HISTORYを表示しました"
  );
};

$("p43Hide").onclick = () => {
  writeChanges(
    { "roundHistoryUI/visible": false },
    "ROUND HISTORYを非表示にしました"
  );
};

$("p43SaveRound").onclick = () => {
  const round = readRound();
  if (round === null) return;

  const team = $("p43Winner").value;

  writeChanges(
    {
      [`roundHistory/${round}`]: {
        round,
        team,
        recordedAt: Date.now()
      }
    },
    `ROUND ${round} を保存しました`
  );
};

$("p43DeleteRound").onclick = () => {
  const round = readRound();
  if (round === null) return;

  if (!confirm(`ROUND ${round} を削除しますか？`)) {
    return;
  }

  writeChanges(
    {
      [`roundHistory/${round}`]: null
    },
    `ROUND ${round} を削除しました`
  );
};

const layoutIds = [
  "p43X",
  "p43Y",
  "p43Width",
  "p43Height"
];

layoutIds.forEach(id => {
  $(id).addEventListener("input", () => {
    $(id).dataset.dirty = "true";
  });
});

function clearDirty() {
  layoutIds.forEach(id => {
    delete $(id).dataset.dirty;
  });
}

$("p43SaveLayout").onclick = async () => {
  const inputs = layoutIds.map(id => $(id));

  if (inputs.some(input => !input.checkValidity() ||
    input.value.trim() === "")) {
    setStatus("レイアウト設定の数値を確認してください");
    return;
  }

  const x = Number($("p43X").value);
  const y = Number($("p43Y").value);
  const width = Number($("p43Width").value);
  const height = Number($("p43Height").value);

  if (
    x - width / 2 < 0 ||
    x + width / 2 > 1920 ||
    y + height > 1080
  ) {
    setStatus("パネルが画面外にはみ出しています");
    return;
  }

  clearDirty();

  await writeChanges(
    {
      "roundHistoryUI/x": x,
      "roundHistoryUI/y": y,
      "roundHistoryUI/width": width,
      "roundHistoryUI/height": height
    },
    "HUDレイアウトを保存しました"
  );
};

$("p43ResetLayout").onclick = async () => {
  clearDirty();

  await writeChanges(
    {
      "roundHistoryUI/x": defaults.x,
      "roundHistoryUI/y": defaults.y,
      "roundHistoryUI/width": defaults.width,
      "roundHistoryUI/height": defaults.height
    },
    "初期レイアウトに戻しました"
  );
};

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;

  render();
});

onValue(matchRef, snapshot => {
  match = snapshot.val();

  render();
}, error => {
  match = null;
  render();

  setStatus("同期エラー: " + error.message);
});

/* ==========================================
   PHASE 4.3 - TOURNAMENT NAME SETTINGS
========================================== */

const tournamentSettings = document.createElement("div");

tournamentSettings.className = "p43-tournament-settings";

tournamentSettings.innerHTML = `
  <h3>TOURNAMENT NAME</h3>

  <label>
    大会名
    <input
      type="text"
      id="p43TournamentName"
      maxlength="100"
      placeholder="大会名を入力"
    >
  </label>

  <button type="button" id="p43SaveTournament">
    SAVE TOURNAMENT NAME
  </button>
`;

panel.insertBefore(
  tournamentSettings,
  $("p43Status")
);

const tournamentInput = $("p43TournamentName");

let tournamentDirty = false;

tournamentInput.addEventListener("input", () => {
  tournamentDirty = true;
});

$("p43SaveTournament").onclick = async () => {
  const name = tournamentInput.value.trim();

  if (!name) {
    setStatus("大会名を入力してください");
    return;
  }

  await writeChanges(
    {
      "roundHistoryUI/tournamentName": name
    },
    "大会名を保存しました"
  );

  tournamentDirty = false;
};

onValue(
  ref(db, `matches/${MATCH_ID}/roundHistoryUI/tournamentName`),
  snapshot => {
    if (!tournamentDirty) {
      tournamentInput.value =
        snapshot.val() || "NID CUSTOM #1";
    }
  }
);
