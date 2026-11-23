
/* ==========================================
   OBSERVER X - PHASE 3.7
   BROADCAST THEME SYSTEM - ADMIN
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
  set
} from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

import {
  firebaseConfig,
  MATCH_ID
} from "./firebase-config.js";

const app = getApps()[0] || initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const themeRef = ref(
  db,
  `matches/${MATCH_ID}/broadcastTheme`
);

const PRESETS = {
  cyber: {
    name: "CYBER CYAN",
    teamA: "#35d3e3",
    teamB: "#ff5369",
    panel: "#080e18"
  },
  purple: {
    name: "NEON PURPLE",
    teamA: "#cda4ff",
    teamB: "#ff7cc8",
    panel: "#1c1229"
  },
  gold: {
    name: "CHAMPIONS GOLD",
    teamA: "#e8b966",
    teamB: "#f18c61",
    panel: "#20170e"
  },
  mono: {
    name: "MONOCHROME",
    teamA: "#d4dce4",
    teamB: "#8e9aa6",
    panel: "#101418"
  }
};

const DEFAULT = {
  preset: "cyber",
  ...PRESETS.cyber
};

let signedIn = false;
let dirty = false;

const panel = document.createElement("section");
panel.id = "p37Panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p37-header">
    <div>
      <h2>BROADCAST THEME SYSTEM</h2>
      <p>PHASE 3.7 / COLOR CONTROL</p>
    </div>
    <span class="p37-tag">OBS LIVE</span>
  </div>

  <div class="p37-presets">
    <button type="button" data-preset="cyber">
      CYBER CYAN
    </button>
    <button type="button" data-preset="purple">
      NEON PURPLE
    </button>
    <button type="button" data-preset="gold">
      CHAMPIONS GOLD
    </button>
    <button type="button" data-preset="mono">
      MONOCHROME
    </button>
  </div>

  <div class="p37-color-grid">
    <label class="p37-color-field">
      <span>TEAM A COLOR</span>
      <input type="color" id="p37TeamA">
    </label>

    <label class="p37-color-field">
      <span>TEAM B COLOR</span>
      <input type="color" id="p37TeamB">
    </label>

    <label class="p37-color-field">
      <span>HUD PANEL COLOR</span>
      <input type="color" id="p37PanelColor">
    </label>
  </div>

  <div class="p37-preview">
    <div class="p37-preview-team p37-preview-a">
      <span>TEAM ALPHA</span>
      <strong>8</strong>
    </div>

    <div class="p37-preview-team p37-preview-b">
      <strong>6</strong>
      <span>TEAM BRAVO</span>
    </div>
  </div>

  <div class="p37-actions">
    <button type="button" id="p37Save">
      SAVE BROADCAST THEME
    </button>

    <button type="button" id="p37Reset">
      RESET DEFAULT
    </button>
  </div>

  <p id="p37Status" role="status" aria-live="polite"></p>
`;

document.body.appendChild(panel);

const $ = id => document.getElementById(id);

const teamAInput = $("p37TeamA");
const teamBInput = $("p37TeamB");
const panelInput = $("p37PanelColor");

const saveButton = $("p37Save");
const resetButton = $("p37Reset");

let selectedPreset = "cyber";

function validColor(value, fallback) {
  return typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toLowerCase()
    : fallback;
}

function normalize(data) {
  const source = data && typeof data === "object"
    ? data
    : DEFAULT;

  return {
    preset: Object.hasOwn(PRESETS, source.preset)
      ? source.preset
      : "custom",

    teamA: validColor(
      source.teamA,
      DEFAULT.teamA
    ),

    teamB: validColor(
      source.teamB,
      DEFAULT.teamB
    ),

    panel: validColor(
      source.panel,
      DEFAULT.panel
    )
  };
}

function updatePreview() {
  const a = teamAInput.value;
  const b = teamBInput.value;
  const bg = panelInput.value;

  panel.style.setProperty("--p37-a", a);
  panel.style.setProperty("--p37-b", b);
  panel.style.setProperty("--p37-panel", bg);

  panel.querySelectorAll("[data-preset]").forEach(button => {
    button.classList.toggle(
      "p37-selected",
      button.dataset.preset === selectedPreset
    );
  });
}

function fillFields(data) {
  const theme = normalize(data);

  selectedPreset = theme.preset;
  teamAInput.value = theme.teamA;
  teamBInput.value = theme.teamB;
  panelInput.value = theme.panel;

  updatePreview();
}

function readFields() {
  return {
    preset: selectedPreset,
    teamA: teamAInput.value,
    teamB: teamBInput.value,
    panel: panelInput.value
  };
}

function setStatus(message) {
  $("p37Status").textContent = message;
}

function updateButtons() {
  saveButton.disabled = !signedIn;
  resetButton.disabled = !signedIn;
}

panel.querySelectorAll("[data-preset]").forEach(button => {
  button.addEventListener("click", () => {
    selectedPreset = button.dataset.preset;

    const preset = PRESETS[selectedPreset];

    teamAInput.value = preset.teamA;
    teamBInput.value = preset.teamB;
    panelInput.value = preset.panel;

    dirty = true;
    updatePreview();
    setStatus("テーマを選択しました。保存するとOBSに反映されます");
  });
});

for (const input of [
  teamAInput,
  teamBInput,
  panelInput
]) {
  input.addEventListener("input", () => {
    selectedPreset = "custom";
    dirty = true;
    updatePreview();
    setStatus("カスタムカラーを編集中です");
  });
}

async function saveTheme(theme) {
  if (!signedIn) return;

  saveButton.disabled = true;
  resetButton.disabled = true;

  setStatus("Firebaseに保存中...");

  try {
    await set(themeRef, normalize(theme));

    dirty = false;
    setStatus("テーマを保存しました！ OBSに反映されます");
  } catch (error) {
    console.error("Phase 3.7:", error);
    setStatus("保存エラー: " + error.message);
  } finally {
    updateButtons();
  }
}

saveButton.addEventListener("click", () => {
  saveTheme(readFields());
});

resetButton.addEventListener("click", () => {
  if (!signedIn) return;

  if (!confirm("配信テーマを初期設定に戻しますか？")) {
    return;
  }

  fillFields(DEFAULT);
  saveTheme(DEFAULT);
});

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;
  updateButtons();
});

onValue(
  themeRef,
  snapshot => {
    if (!dirty) {
      fillFields(snapshot.val() || DEFAULT);
    }
  },
  error => {
    setStatus("読み取りエラー: " + error.message);
  }
);

fillFields(DEFAULT);
updateButtons();
