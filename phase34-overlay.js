
/* ==========================================
   OBSERVER X - PHASE 3.4
   OBS PAUSE TIMER
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

const pauseRef = ref(db, `matches/${MATCH_ID}/pause`);
const offsetRef = ref(db, ".info/serverTimeOffset");

let pauseData = null;
let serverOffset = 0;

const timer = document.createElement("div");
timer.id = "p34OverlayTimer";

timer.innerHTML = `
  <div class="p34-overlay-clock">00:00</div>
  <div class="p34-overlay-caption"></div>
`;

timer.style.display = "none";

const clockEl = timer.querySelector(".p34-overlay-clock");
const captionEl = timer.querySelector(".p34-overlay-caption");

function validType(type) {
  return type === "timeout" || type === "technical";
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
  if (
    typeof data?.startedAt !== "number" ||
    !Number.isFinite(data.startedAt) ||
    data.startedAt <= 0
  ) {
    return null;
  }

  const elapsed = Math.max(
    0,
    Math.floor(
      (Date.now() + serverOffset - data.startedAt) / 1000
    )
  );

  return data.type === "timeout"
    ? Math.max(0, 60 - elapsed)
    : elapsed;
}

function attachTimer() {
  const layer = document.getElementById("p3Layer");

  if (!layer) return false;

  if (timer.parentElement !== layer) {
    layer.appendChild(timer);
  }

  return true;
}

function render() {
  if (!attachTimer()) return;

  const data = pauseData;

  if (!validType(data?.type)) {
    timer.style.display = "none";
    return;
  }

  timer.style.display = "flex";

  const isTimeout = data.type === "timeout";
  const seconds = getSeconds(data);

  timer.classList.toggle("p34-is-timeout", isTimeout);
  timer.classList.toggle("p34-is-technical", !isTimeout);

  clockEl.textContent = seconds === null
    ? "--:--"
    : formatTime(seconds);

  captionEl.textContent = seconds === null
    ? "SYNCING CLOCK"
    : isTimeout
      ? "60 SECOND COUNTDOWN"
      : "ELAPSED TIME";
}

onValue(offsetRef, snapshot => {
  serverOffset = Number(snapshot.val()) || 0;
});

onValue(pauseRef, snapshot => {
  pauseData = snapshot.val();
  render();
});

const observer = new MutationObserver(() => {
  attachTimer();
});

observer.observe(document.body, {
  childList: true
});

setInterval(render, 200);
render();
