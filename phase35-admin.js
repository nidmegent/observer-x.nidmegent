
/* ==========================================
   OBSERVER X - PHASE 3.5
   CUSTOM PLAYER ICON ADMIN
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

let currentMatch = null;
let signedIn = false;

const panel = document.createElement("section");
panel.id = "p35Panel";
panel.hidden = true;

panel.innerHTML = `
  <h2>CUSTOM PLAYER ICONS</h2>
  <p class="p35-description">
    プレイヤーごとに公開画像URLを指定できます。
    保存後、OBSにリアルタイム反映されます。
  </p>

  <div id="p35PlayersA" class="p35-team-a"></div>
  <div id="p35PlayersB" class="p35-team-b"></div>

  <p id="p35Status" role="status" aria-live="polite"></p>
`;

document.body.appendChild(panel);

const statusEl = document.getElementById("p35Status");

function setStatus(message) {
  statusEl.textContent = message;
}

function validUrl(value) {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

async function saveIcon(teamKey, index, input, button) {
  if (!signedIn) {
    setStatus("ログインしてください");
    return;
  }

  const url = input.value.trim();

  if (!validUrl(url)) {
    setStatus("HTTPSの画像URLを入力してください");
    return;
  }

  button.disabled = true;
  setStatus("保存中...");

  try {
    const playerRef = ref(
      db,
      `matches/${MATCH_ID}/${teamKey}/players/${index}`
    );

    const result = await runTransaction(
      playerRef,
      player => {
        if (!player || typeof player !== "object") {
          return;
        }

        if (url) {
          player.iconUrl = url;
        } else {
          player.iconUrl = null;
        }

        return player;
      },
      { applyLocally: false }
    );

    setStatus(
      result.committed
        ? "アイコン設定を保存しました！"
        : "保存できませんでした。選手データを確認してください"
    );
  } catch (error) {
    console.error("Phase 3.5:", error);
    setStatus("保存エラー: " + error.message);
  } finally {
    button.disabled = false;
  }
}

function createPlayerRow(teamKey, player, index) {
  const row = document.createElement("div");
  row.className = "p35-admin-player";

  const preview = document.createElement("img");
  preview.className = "p35-admin-preview";
  preview.alt = "アイコンプレビュー";

  const name = document.createElement("div");
  name.className = "p35-admin-name";
  name.textContent =
    `${index + 1}. ${player?.name || "PLAYER"}`;

  const controls = document.createElement("div");
  controls.className = "p35-admin-controls";

  const input = document.createElement("input");
  input.type = "url";
  input.placeholder = "https://example.com/icon.png";
  input.value = player?.iconUrl || "";
  input.maxLength = 2048;

  const save = document.createElement("button");
  save.type = "button";
  save.textContent = "保存";

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "p35-clear";
  clear.textContent = "削除";

  function updatePreview() {
    const url = input.value.trim();

    if (url && validUrl(url)) {
      preview.src = url;
      preview.style.visibility = "visible";
    } else {
      preview.removeAttribute("src");
      preview.style.visibility = "hidden";
    }
  }

  preview.onerror = () => {
    preview.style.visibility = "hidden";
  };

  input.addEventListener("change", updatePreview);

  save.addEventListener("click", () => {
    saveIcon(teamKey, index, input, save);
  });

  clear.addEventListener("click", async () => {
    input.value = "";
    updatePreview();
    await saveIcon(teamKey, index, input, clear);
  });

  controls.append(input, save, clear);
  row.append(preview, name, controls);

  updatePreview();

  return row;
}

function renderTeam(teamKey, rootId) {
  const root = document.getElementById(rootId);
  root.replaceChildren();

  const team = currentMatch?.[teamKey];
  if (!team) return;

  const title = document.createElement("h3");
  title.className = "p35-team-title";
  title.textContent =
    `${teamKey === "teamA" ? "TEAM A" : "TEAM B"} — ` +
    (team.name || "");

  root.appendChild(title);

  const players = Array.isArray(team.players)
    ? team.players
    : [];

  players.slice(0, 5).forEach((player, index) => {
    root.appendChild(
      createPlayerRow(teamKey, player, index)
    );
  });
}

function render() {
  if (!signedIn || !currentMatch) return;

  renderTeam("teamA", "p35PlayersA");
  renderTeam("teamB", "p35PlayersB");
}

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;

  if (signedIn) render();
});

onValue(
  matchRef,
  snapshot => {
    currentMatch = snapshot.val();
    render();
  },
  error => {
    setStatus("読み取りエラー: " + error.message);
  }
);
