
/* ==========================================
   OBSERVER X — PHASE 3.3
   NEXT MAP / NEW SERIES CONTROL
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
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

const $ = id => document.getElementById(id);

const panel = document.createElement("section");
panel.className = "panel p33-panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p33-heading">
    <div>
      <h2>MATCH FLOW CONTROL</h2>
      <p class="p33-subtitle">
        NEXT MAP / NEW SERIES
      </p>
    </div>
    <span class="p33-tag">PHASE 3.3</span>
  </div>

  <div class="p33-info">
    <div class="p33-info-item">
      <span>CURRENT MAP</span>
      <strong id="p33Map">MAP 1</strong>
    </div>

    <div class="p33-info-item">
      <span>FORMAT</span>
      <strong id="p33Format">BO3</strong>
    </div>

    <div class="p33-info-item">
      <span>SERIES SCORE</span>
      <strong id="p33Series">0 - 0</strong>
    </div>
  </div>

  <div class="p33-actions">
    <div class="p33-action-card p33-next">
      <div class="p33-action-label">MAP TRANSITION</div>
      <h3>NEXT MAP</h3>
      <p>
        マップ勝利数を保持したまま、
        ラウンドスコアを0-0にリセットします。
      </p>
      <button type="button" id="p33Next">
        NEXT MAP →
      </button>
    </div>

    <div class="p33-action-card p33-new">
      <div class="p33-action-label">SERIES RESET</div>
      <h3>NEW SERIES</h3>
      <p>
        マップ勝利数とラウンドスコアを
        0-0に戻し、新しいシリーズを開始します。
      </p>
      <button type="button" id="p33New">
        NEW SERIES
      </button>
    </div>
  </div>

  <div class="p33-warning">
    これらの操作はFirebaseへ即時反映されます。
    実行前に確認画面が表示されます。
  </div>

  <p id="p33Status" role="status" aria-live="polite"></p>

  <dialog id="p33Dialog" class="p33-dialog">
    <h2 id="p33DialogTitle">CONFIRM ACTION</h2>
    <p id="p33DialogMessage"></p>

    <label class="p33-confirm-label">
      <input type="checkbox" id="p33ConfirmCheck">
      内容を確認しました
    </label>

    <div class="p33-dialog-actions">
      <button type="button" id="p33Cancel">
        キャンセル
      </button>
      <button type="button" id="p33Execute" disabled>
        実行する
      </button>
    </div>
  </dialog>
`;

const controlPanel = $("controlPanel");

if (!controlPanel) {
  throw new Error(
    "Observer X: #controlPanel が見つかりません"
  );
}

controlPanel.appendChild(panel);

let currentMatch = null;
let signedIn = false;
let busy = false;
let pendingAction = null;

const dialog = $("p33Dialog");

function getWins(team) {
  const value = Number(team?.seriesWins);
  return Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : 0;
}

function getBestOf(match) {
  const value = Number(match?.bestOf);
  return [1, 3, 5].includes(value) ? value : 3;
}

function getNeededWins(match) {
  return Math.floor(getBestOf(match) / 2) + 1;
}

function getMapNumber(match) {
  const value = Number(match?.mapNumber);
  return Number.isInteger(value) && value >= 1
    ? value
    : 1;
}

function isSeriesFinished(match) {
  const needed = getNeededWins(match);

  return (
    getWins(match.teamA) >= needed ||
    getWins(match.teamB) >= needed
  );
}

function setStatus(message) {
  $("p33Status").textContent = message;
}

function render() {
  const match = currentMatch;

  $("p33Map").textContent =
    match ? `MAP ${getMapNumber(match)}` : "NO DATA";

  $("p33Format").textContent =
    `BO${getBestOf(match)}`;

  $("p33Series").textContent = match
    ? `${getWins(match.teamA)} - ${getWins(match.teamB)}`
    : "0 - 0";

  const available = signedIn && !!match && !busy;

  $("p33Next").disabled =
    !available ||
    isSeriesFinished(match) ||
    getMapNumber(match) >= getBestOf(match);

  $("p33New").disabled = !available;
}

function openConfirmation(action) {
  if (!signedIn || !currentMatch || busy) {
    setStatus("試合データまたはログイン状態を確認してください");
    return;
  }

  if (
    action === "next" &&
    (
      isSeriesFinished(currentMatch) ||
      getMapNumber(currentMatch) >= getBestOf(currentMatch)
    )
  ) {
    setStatus("次のマップへ進行できません");
    return;
  }

  pendingAction = action;

  $("p33ConfirmCheck").checked = false;
  $("p33Execute").disabled = true;

  if (action === "next") {
    $("p33DialogTitle").textContent = "NEXT MAP";

    $("p33DialogMessage").textContent =
      `MAP ${getMapNumber(currentMatch)} から ` +
      `MAP ${getMapNumber(currentMatch) + 1} に進みます。` +
      " ラウンドスコアは0-0になり、" +
      "マップ勝利数は保持されます。" +
      " PAUSE・ROUND WIN演出は解除されます。";
  } else {
    $("p33DialogTitle").textContent = "NEW SERIES";

    $("p33DialogMessage").textContent =
      "新しいシリーズを開始します。" +
      " ラウンドスコアとマップ勝利数を0-0に戻し、" +
      "マップ番号を1に戻します。" +
      " チーム名・選手情報・マップ名・BO形式は保持されます。" +
      " PAUSE・ROUND WIN演出は解除されます。";
  }

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    setStatus("確認ダイアログに対応していないブラウザです");
    pendingAction = null;
  }
}

function resetEffects(match) {
  match.pause = {
    type: "none",
    team: ""
  };

  // Firebase Realtime Databaseではnullで削除される
  match.roundEvent = null;
}

async function executeAction() {
  if (
    !signedIn ||
    busy ||
    !pendingAction ||
    !$("p33ConfirmCheck").checked
  ) {
    return;
  }

  const action = pendingAction;

  busy = true;
  render();
  $("p33Execute").disabled = true;

  setStatus("Firebaseを更新中...");

  try {
    let reason = "";

    const result = await runTransaction(
      matchRef,
      match => {
        if (!match?.teamA || !match?.teamB) {
          reason = "試合データがありません";
          return;
        }

        const mapNumber = getMapNumber(match);
        const bestOf = getBestOf(match);

        if (action === "next") {
          if (isSeriesFinished(match)) {
            reason = "シリーズは既に決着しています";
            return;
          }

          if (mapNumber >= bestOf) {
            reason = "最終マップに到達しています";
            return;
          }

          match.mapNumber = mapNumber + 1;
        } else if (action === "new") {
          match.mapNumber = 1;
          match.teamA.seriesWins = 0;
          match.teamB.seriesWins = 0;
        } else {
          reason = "不明な操作です";
          return;
        }

        match.teamA.score = 0;
        match.teamB.score = 0;

        resetEffects(match);

        reason = "";
        return match;
      },
      { applyLocally: false }
    );

    if (!result.committed) {
      setStatus(
        reason || "更新はキャンセルされました"
      );
      return;
    }

    setStatus(
      action === "next"
        ? "NEXT MAP完了！次のマップへ進みました"
        : "NEW SERIES完了！シリーズをリセットしました"
    );

    pendingAction = null;
    dialog.close();

  } catch (error) {
    setStatus("更新エラー: " + error.message);
    console.error("Observer X Phase 3.3:", error);
  } finally {
    busy = false;
    render();
  }
}

$("p33Next").addEventListener("click", () => {
  openConfirmation("next");
});

$("p33New").addEventListener("click", () => {
  openConfirmation("new");
});

$("p33ConfirmCheck").addEventListener("change", e => {
  $("p33Execute").disabled = !e.target.checked || busy;
});

$("p33Cancel").addEventListener("click", () => {
  dialog.close();
});

$("p33Execute").addEventListener("click", executeAction);

dialog.addEventListener("cancel", e => {
  if (busy) e.preventDefault();
});

dialog.addEventListener("close", () => {
  if (!busy) pendingAction = null;
});

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;

  if (!signedIn && dialog.open && !busy) {
    dialog.close();
  }

  render();
});

onValue(
  matchRef,
  snapshot => {
    currentMatch = snapshot.val();
    render();
  },
  error => {
    currentMatch = null;
    setStatus(
      "Firebase読み取りエラー: " + error.message
    );
    render();
  }
);
