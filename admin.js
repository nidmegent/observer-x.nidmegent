
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-auth.js";

import {
  getDatabase, ref, onValue, update,
  runTransaction
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import { firebaseConfig, MATCH_ID } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const matchRef = ref(db, `matches/${MATCH_ID}`);

const $ = id => document.getElementById(id);
let currentMatch = null;
let unsubscribe = null;
let dirty = false;

const defaults = {
  eventName: "OBSERVER X CHAMPIONSHIP",
  matchInfo: "GRAND FINAL",
  map: "ASCENT",
  mapNumber: 1,
  bestOf: 3,
  teamA: {
    name: "TEAM ALPHA",
    score: 0,
    side: "ATTACK",
    players: Array.from({length:5}, (_,i) => ({
      name: `ALPHA ${i+1}`, agent: "UNKNOWN"
    }))
  },
  teamB: {
    name: "TEAM BRAVO",
    score: 0,
    side: "DEFENSE",
    players: Array.from({length:5}, (_,i) => ({
      name: `BRAVO ${i+1}`, agent: "UNKNOWN"
    }))
  }
};

function status(message) {
  $("status").textContent = message;
}

function createPlayerInputs(containerId, prefix) {
  const root = $(containerId);
  for (let i=0; i<5; i++) {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <input id="${prefix}Name${i}" maxlength="32"
        placeholder="PLAYER ${i+1}">
      <input id="${prefix}Agent${i}" maxlength="32"
        placeholder="AGENT">`;
    root.appendChild(row);
  }
}

createPlayerInputs("playersA", "a");
createPlayerInputs("playersB", "b");

function renderTeam(prefix, team) {
  $(`team${prefix}Name`).value = team.name ?? "";
  $(`team${prefix}Side`).value = team.side ?? "ATTACK";
  $(`score${prefix}`).textContent = team.score ?? 0;

  const p = prefix.toLowerCase();
  for (let i=0; i<5; i++) {
    $(`${p}Name${i}`).value =
      team.players?.[i]?.name ?? "";
    $(`${p}Agent${i}`).value =
      team.players?.[i]?.agent ?? "";
  }
}

function render(match) {
  $("eventName").value = match.eventName ?? "";
  $("matchInfo").value = match.matchInfo ?? "";
  $("map").value = match.map ?? "ASCENT";
  $("mapNumber").value = match.mapNumber ?? 1;
  $("bestOf").value = String(match.bestOf ?? 3);

  renderTeam("A", match.teamA);
  renderTeam("B", match.teamB);
}

function readPlayers(prefix) {
  return Array.from({length:5}, (_,i) => ({
    name: $(`${prefix}Name${i}`).value.trim() || "PLAYER",
    agent: $(`${prefix}Agent${i}`).value.trim() || "UNKNOWN"
  }));
}

async function saveFields(fields) {
  if (!currentMatch) {
    status("先に初期データを作成してください");
    return;
  }
  try {
    await update(matchRef, fields);
    dirty = false;
    status("保存しました。OBSにも反映されます。");
  } catch (error) {
    status("保存エラー: " + error.message);
  }
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    await signInWithEmailAndPassword(
      auth, $("email").value, $("password").value
    );
    $("password").value = "";
    status("ログインしました");
  } catch (error) {
    status("ログイン失敗: " + error.code);
  }
});

$("logout").onclick = () => signOut(auth);

$("initialize").onclick = async () => {
  try {
    const result = await runTransaction(
      matchRef,
      value => value === null ? defaults : undefined,
      {applyLocally:false}
    );
    status(result.committed
      ? "初期データを作成しました"
      : "既に試合データがあります");
  } catch (error) {
    status("初期化エラー: " + error.message);
  }
};

$("saveMatch").onclick = () => saveFields({
  eventName: $("eventName").value.trim(),
  matchInfo: $("matchInfo").value.trim(),
  map: $("map").value,
  mapNumber: Math.max(1, Number($("mapNumber").value) || 1),
  bestOf: Number($("bestOf").value)
});

function teamFields(key, prefix) {
  return {
    [`${key}/name`]: $(`team${prefix}Name`).value.trim(),
    [`${key}/side`]: $(`team${prefix}Side`).value,
    [`${key}/players`]: readPlayers(prefix.toLowerCase())
  };
}

$("saveA").onclick = () =>
  saveFields(teamFields("teamA", "A"));

$("saveB").onclick = () =>
  saveFields(teamFields("teamB", "B"));

async function changeScore(team, delta) {
  if (!currentMatch) {
    status("先に初期データを作成してください");
    return;
  }
  try {
    await runTransaction(
      ref(db, `matches/${MATCH_ID}/${team}/score`),
      value => Math.max(0, (Number(value) || 0) + delta),
      {applyLocally:false}
    );
    status("スコアを更新しました");
  } catch (error) {
    status("スコア更新エラー: " + error.message);
  }
}

$("aPlus").onclick = () => changeScore("teamA", 1);
$("aMinus").onclick = () => changeScore("teamA", -1);
$("bPlus").onclick = () => changeScore("teamB", 1);
$("bMinus").onclick = () => changeScore("teamB", -1);

// 入力中にリアルタイム同期でフォームが戻らないようにする
$("controlPanel").addEventListener("input", () => {
  dirty = true;
});
$("controlPanel").addEventListener("change", () => {
  dirty = true;
});

onAuthStateChanged(auth, user => {
  $("loginPanel").hidden = !!user;
  $("controlPanel").hidden = !user;

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentMatch = null;
  dirty = false;

  if (!user) {
    $("connection").textContent = "未接続";
    return;
  }

  $("connection").textContent = "Firebase接続中";

  unsubscribe = onValue(matchRef, snapshot => {
    currentMatch = snapshot.val();
    $("connection").textContent = currentMatch
      ? "● REALTIME CONNECTED"
      : "初期データ未作成";

    if (currentMatch && !dirty) {
      render(currentMatch);
    }
  }, error => {
    status("データ取得エラー: " + error.message);
    $("connection").textContent = "接続エラー";
  });
});
