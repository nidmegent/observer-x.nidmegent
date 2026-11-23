
/* ==========================================
   OBSERVER X - PHASE 3.4
   ADMIN PAUSE TIMER
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
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const pauseRef = ref(db, `matches/${MATCH_ID}/pause`);
const offsetRef = ref(db, ".info/serverTimeOffset");

let pauseData = null;
let serverOffset = 0;
let signedIn = false;
let stamping = false;
let lastStampKey = "";

const panel = document.createElement("section");
panel.id = "p34AdminPanel";
panel.innerHTML = `
  <div class="p34-admin-header">
    <div>
      <h2>PAUSE TIMER</h2>
      <span>PHASE 3.4 / LIVE CLOCK</span>
    </div>
    <span class="p34-live">● LIVE</span>
  </div>

  <div class="p34-admin-body">
    <div id="p34AdminType">NO ACTIVE PAUSE</div>
    <div id="p34AdminClock">--:--</div>
    <div id="p34AdminNote">
      TIME OUT / TECHNICAL PAUSE 待機中
    </div>
  </div>
`;

panel.hidden = true;
document.body.appendChild(panel);

const typeEl = document.getElementById("p34AdminType");
const clockEl = document.getElementById("p34AdminClock");
const noteEl = document.getElementById("p34AdminNote");

function validType(type) {
  return type === "timeout" || type === "technical";
}

function validStartedAt(value) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return (
    String(Math.floor(s / 60)).padStart(2, "0") +
    ":" +
    String(s % 60).padStart(2, "0")
  );
}

function getSeconds(data) {
  if (!validStartedAt(data?.startedAt)) {
    return 0;
  }

  const elapsed = Math.max(
    0,
    Math.floor(
      (Date.now() + serverOffset - data.startedAt) / 1000
    )
  );

  if (data.type === "timeout") {
    return Math.max(0, 60 - elapsed);
  }

  return elapsed;
}

function render() {
  const data = pauseData;

  if (!validType(data?.type)) {
    typeEl.textContent = "NO ACTIVE PAUSE";
    clockEl.textContent = "--:--";
    noteEl.textContent = "PAUSEは開始されていません";
    panel.classList.remove("p34-timeout", "p34-technical");
    return;
  }

  const isTimeout = data.type === "timeout";

  panel.classList.toggle("p34-timeout", isTimeout);
  panel.classList.toggle("p34-technical", !isTimeout);

  typeEl.textContent = isTimeout
    ? `TIME OUT / TEAM ${data.team || "-"}`
    : "TECHNICAL PAUSE";

  clockEl.textContent = formatTime(
    isTimeout ? getSeconds(data) : getSeconds(data)
  );

  noteEl.textContent = !validStartedAt(data.startedAt)
    ? "開始時刻を同期中..."
    : isTimeout
      ? "60 SECOND COUNTDOWN"
      : "ELAPSED TIME";
}

/*
  既存のPhase 3ボタンがpauseを書き込んだ後、
  startedAtがない場合だけ追加する。

  transaction内でも再確認するので、
  他の管理者が先に記録した時刻を上書きしない。
*/
async function ensureStartedAt(data) {
  if (
    !signedIn ||
    stamping ||
    !validType(data?.type) ||
    validStartedAt(data.startedAt)
  ) {
    return;
  }

  const key = `${data.type}:${data.team || ""}`;

  if (lastStampKey === key) return;

  stamping = true;
  lastStampKey = key;

  try {
    await runTransaction(
      pauseRef,
      current => {
        if (!current || !validType(current.type)) {
          return;
        }

        if (
          current.type !== data.type ||
          (current.team || "") !== (data.team || "")
        ) {
          return;
        }

        if (validStartedAt(current.startedAt)) {
          return;
        }

        current.startedAt = serverTimestamp();
        return current;
      },
      { applyLocally: false }
    );
  } catch (error) {
    console.error("Phase 3.4 timestamp error:", error);
  } finally {
    stamping = false;
    lastStampKey = "";
  }
}

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;

  if (signedIn && pauseData) {
    ensureStartedAt(pauseData);
  }
});

onValue(offsetRef, snapshot => {
  serverOffset = Number(snapshot.val()) || 0;
});

onValue(pauseRef, snapshot => {
  pauseData = snapshot.val();
  render();
  ensureStartedAt(pauseData);
});

setInterval(render, 200);
render();
