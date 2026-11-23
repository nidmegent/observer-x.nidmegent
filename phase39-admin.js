
/* ==========================================
   OBSERVER X - PHASE 3.9
   SPIKE STATUS HUD / ADMIN
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
const matchRef = ref(db, `matches/${MATCH_ID}`);

const panel = document.createElement("section");
panel.id = "p39Panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p39-heading">
    <div>
      <h2>SPIKE STATUS CONTROL</h2>
      <p>PHASE 3.9 / LIVE BROADCAST</p>
    </div>
    <span class="p39-live">LIVE</span>
  </div>

  <div class="p39-section">
    <h3>SPIKE HOLDER</h3>
    <div class="p39-buttons">
      <button type="button" data-holder="teamA">TEAM A</button>
      <button type="button" data-holder="teamB">TEAM B</button>
      <button type="button" data-holder="none">NONE</button>
    </div>
  </div>

  <div class="p39-section">
    <h3>PLANT SITE</h3>
    <div class="p39-buttons">
      <button type="button" data-site="A">A SITE</button>
      <button type="button" data-site="B">B SITE</button>
      <button type="button" data-site="C">C SITE</button>
    </div>
  </div>

  <div class="p39-section">
    <h3>SPIKE ACTION</h3>
    <div class="p39-buttons">
      <button type="button" id="p39Plant">SPIKE PLANTED</button>
      <button type="button" id="p39Reset">RESET SPIKE</button>
    </div>
  </div>

  <div class="p39-current" id="p39Current">
    SPIKE STATUS: NONE
  </div>
  <p id="p39Message" role="status" aria-live="polite"></p>
`;

document.body.appendChild(panel);

let signedIn = false;
let busy = false;
let spike = {
  status: "none",
  holder: "none",
  site: "A"
};

const $ = id => document.getElementById(id);

function setMessage(message) {
  $("p39Message").textContent = message;
}

function normalizeSpike(value) {
  const v = value || {};
  return {
    status: ["none", "carried", "planted"].includes(v.status)
      ? v.status : "none",
    holder: ["none", "teamA", "teamB"].includes(v.holder)
      ? v.holder : "none",
    site: ["A", "B", "C"].includes(v.site)
      ? v.site : "A"
  };
}

function updateUI() {
  panel.querySelectorAll("[data-holder]").forEach(button => {
    const active =
      spike.status === "carried" &&
      button.dataset.holder === spike.holder;

    button.classList.toggle("p39-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });

  panel.querySelectorAll("[data-site]").forEach(button => {
    const active = button.dataset.site === spike.site;
    button.classList.toggle("p39-selected", active);
    button.setAttribute("aria-pressed", String(active));
  });

  let description = "NONE";

  if (spike.status === "carried") {
    description = spike.holder === "teamA"
      ? "CARRIED BY TEAM A"
      : spike.holder === "teamB"
        ? "CARRIED BY TEAM B"
        : "NONE";
  }

  if (spike.status === "planted") {
    description = `PLANTED / ${spike.site} SITE`;
  }

  $("p39Current").textContent = `SPIKE STATUS: ${description}`;
  $("p39Plant").disabled = spike.status === "planted";
}

async function saveSpike(next, message) {
  if (!signedIn || busy) return;

  busy = true;
  panel.classList.add("p39-busy");

  try {
    await update(matchRef, {
      spikeStatus: next
    });
    setMessage(message);
  } catch (error) {
    console.error("Phase 3.9:", error);
    setMessage("保存エラー: " + error.message);
  } finally {
    busy = false;
    panel.classList.remove("p39-busy");
  }
}

panel.querySelectorAll("[data-holder]").forEach(button => {
  button.addEventListener("click", async () => {
    const holder = button.dataset.holder;

    await saveSpike({
      ...spike,
      holder,
      status: holder === "none" ? "none" : "carried"
    }, "スパイク所持状態を更新しました");
  });
});

panel.querySelectorAll("[data-site]").forEach(button => {
  button.addEventListener("click", async () => {
    await saveSpike({
      ...spike,
      site: button.dataset.site
    }, "設置サイトを選択しました");
  });
});

$("p39Plant").addEventListener("click", async () => {
  if (spike.status === "planted") return;

  if (!confirm(
    `${spike.site} SITE にスパイクを設置済みとして表示しますか？`
  )) return;

  await saveSpike({
    ...spike,
    status: "planted"
  }, "SPIKE PLANTEDを表示しました");
});

$("p39Reset").addEventListener("click", async () => {
  await saveSpike({
    status: "none",
    holder: "none",
    site: "A"
  }, "スパイク表示をリセットしました");
});

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;
});

onValue(matchRef, snapshot => {
  spike = normalizeSpike(snapshot.val()?.spikeStatus);
  updateUI();
}, error => {
  setMessage("読み取りエラー: " + error.message);
});
