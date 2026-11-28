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
  勝利演出・スコア加算・ラウンド履歴記録・
  次ラウンドへの進行を自動で行います。
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
  if (!match?.teamA || !match?.teamB) {
    throw new Error("初期データがありません");
  }

  if (!["A", "B"].includes(team)) {
    throw new Error("勝利チームが不正です");
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  // 操作開始時点のラウンド番号
  const expectedRound =
    Math.max(0, Math.trunc(Number(match.teamA.score) || 0)) +
    Math.max(0, Math.trunc(Number(match.teamB.score) || 0)) +
    1;

  let reason = "";

  const result = await runTransaction(
    matchRef,
    value => {
      if (!value?.teamA || !value?.teamB) {
        reason = "試合データがありません";
        return;
      }

      const scoreA = Math.max(
        0, Math.trunc(Number(value.teamA.score) || 0)
      );

      const scoreB = Math.max(
        0, Math.trunc(Number(value.teamB.score) || 0)
      );

      const round = scoreA + scoreB + 1;

      // 他の操作によるスコア変更を検出
      if (round !== expectedRound) {
        reason = "ラウンドが更新されています";
        return;
      }

      // 演出中の連続操作を防止
      if (
        value.roundEvent?.type === "roundWin" &&
        Number(value.roundEvent.expiresAt) > now
      ) {
        reason = "ROUND WIN演出中です";
        return;
      }

      const history = {
        ...(value.roundHistory || {})
      };

      // 別チームで記録済みの場合は停止
      if (
        history[round] &&
        history[round].team !== team
      ) {
        reason =
          `ROUND ${round} は別チームで記録済みです`;
        return;
      }

      // ラウンド履歴を記録
      if (!history[round]) {
        history[round] = {
          team,
          round,
          recordedAt: now
        };
      }

      value.roundHistory = history;

      // 勝利チームのスコアを自動加算
      if (team === "A") {
        value.teamA.score = scoreA + 1;
      } else {
        value.teamB.score = scoreB + 1;
      }

      // ROUND WIN演出
      value.roundEvent = {
        id,
        type: "roundWin",
        team,
        expiresAt: now + 5000
      };

      // SPIKE状態リセット
      value.spikeStatus = {
        status: "none",
        holder: "none",
        site: "A"
      };

      // 全プレイヤーをALIVEに戻す
      // KILLS / DEATHS / ASSISTSは保持
      value.playerStats = value.playerStats || {};

      for (const teamKey of ["teamA", "teamB"]) {
        value.playerStats[teamKey] =
          value.playerStats[teamKey] || {};

        for (let i = 0; i < 5; i++) {
          value.playerStats[teamKey][i] = {
            ...(value.playerStats[teamKey][i] || {}),
            alive: true
          };
        }
      }

      reason = "";
      return value;
    },
    { applyLocally: false }
  );

  if (!result.committed) {
    throw new Error(
      reason || "ROUND WINの更新に失敗しました"
    );
  }
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
