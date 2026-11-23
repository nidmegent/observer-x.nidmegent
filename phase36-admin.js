
/* ==========================================
   OBSERVER X - PHASE 3.6
   PLAYER HUD CUSTOMIZER ADMIN
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

const settingsRef = ref(
  db,
  `matches/${MATCH_ID}/hudStyle`
);

const DEFAULTS = {
  iconSize: 54,
  iconShape: "rounded",
  backgroundOpacity: 96,
  nameSize: 17,
  rosterYA: 650,
  rosterYB: 650
};

let currentSettings = { ...DEFAULTS };
let signedIn = false;
let dirty = false;

const panel = document.createElement("section");
panel.id = "p36Panel";
panel.hidden = true;

panel.innerHTML = `
  <div class="p36-heading">
    <div>
      <h2>PLAYER HUD CUSTOMIZER</h2>
      <p>PHASE 3.6 / DESIGN CONTROL</p>
    </div>
    <span class="p36-tag">LIVE HUD</span>
  </div>

  <div class="p36-setting">
    <label>
      アイコンサイズ
      <strong id="p36IconSizeValue">54px</strong>
    </label>
    <input id="p36IconSize"
      type="range" min="40" max="70" value="54">
  </div>

  <div class="p36-setting">
    <label for="p36IconShape">アイコンの形</label>
    <select id="p36IconShape">
      <option value="square">四角</option>
      <option value="rounded">角丸</option>
      <option value="circle">丸</option>
    </select>
  </div>

  <div class="p36-setting">
    <label>
      HUD背景の不透明度
      <strong id="p36OpacityValue">96%</strong>
    </label>
    <input id="p36Opacity"
      type="range" min="0" max="100" value="96">
  </div>

  <div class="p36-setting">
    <label>
      プレイヤー名の文字サイズ
      <strong id="p36NameSizeValue">17px</strong>
    </label>
    <input id="p36NameSize"
      type="range" min="14" max="26" value="17">
  </div>

  <div class="p36-setting">
    <label>
      左側HUDの高さ
      <strong id="p36RosterYAValue">650px</strong>
    </label>
    <input id="p36RosterYA"
      type="range" min="0" max="900" value="650">
  </div>

  <div class="p36-setting">
    <label>
      右側HUDの高さ
      <strong id="p36RosterYBValue">650px</strong>
    </label>
    <input id="p36RosterYB"
      type="range" min="0" max="900" value="650">
  </div>

  <div class="p36-actions">
    <button type="button" id="p36Save">
      SAVE HUD SETTINGS
    </button>
    <button type="button" id="p36Reset">
      RESET DEFAULT
    </button>
  </div>

  <p id="p36Status" role="status" aria-live="polite"></p>
`;

document.body.appendChild(panel);

const $ = id => document.getElementById(id);

const fields = {
  iconSize: $("p36IconSize"),
  iconShape: $("p36IconShape"),
  backgroundOpacity: $("p36Opacity"),
  nameSize: $("p36NameSize"),
  rosterYA: $("p36RosterYA"),
  rosterYB: $("p36RosterYB")
};

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(min, Math.min(max, Math.round(number)))
    : fallback;
}

function normalize(data = {}) {
  return {
    iconSize: clamp(data.iconSize, 40, 70, 54),
    iconShape: ["square", "rounded", "circle"]
      .includes(data.iconShape)
      ? data.iconShape
      : "rounded",
    backgroundOpacity: clamp(
      data.backgroundOpacity, 0, 100, 96
    ),
    nameSize: clamp(data.nameSize, 14, 26, 17),
    rosterYA: clamp(data.rosterYA, 0, 900, 650),
    rosterYB: clamp(data.rosterYB, 0, 900, 650)
  };
}

function updateLabels() {
  $("p36IconSizeValue").textContent =
    fields.iconSize.value + "px";

  $("p36OpacityValue").textContent =
    fields.backgroundOpacity.value + "%";

  $("p36NameSizeValue").textContent =
    fields.nameSize.value + "px";

  $("p36RosterYAValue").textContent =
    fields.rosterYA.value + "px";

  $("p36RosterYBValue").textContent =
    fields.rosterYB.value + "px";
}

function fillFields(data) {
  for (const [key, element] of Object.entries(fields)) {
    element.value = data[key];
  }
  updateLabels();
}

function readFields() {
  const values = {};
  for (const [key, element] of Object.entries(fields)) {
    values[key] = element.value;
  }
  return normalize(values);
}

function setStatus(message) {
  $("p36Status").textContent = message;
}

function updateButtons() {
  $("p36Save").disabled = !signedIn;
  $("p36Reset").disabled = !signedIn;
}

for (const element of Object.values(fields)) {
  element.addEventListener("input", () => {
    dirty = true;
    updateLabels();
    setStatus("未保存の変更があります");
  });
}

$("p36Save").addEventListener("click", async () => {
  if (!signedIn) return;

  const data = readFields();

  $("p36Save").disabled = true;
  setStatus("Firebaseに保存中...");

  try {
    await set(settingsRef, data);
    currentSettings = data;
    dirty = false;
    setStatus("HUD設定を保存しました！ OBSに反映されます");
  } catch (error) {
    setStatus("保存エラー: " + error.message);
  } finally {
    updateButtons();
  }
});

$("p36Reset").addEventListener("click", async () => {
  if (!signedIn) return;

  if (!confirm("HUDデザインを初期設定に戻しますか？")) {
    return;
  }

  $("p36Reset").disabled = true;

  try {
    await set(settingsRef, { ...DEFAULTS });
    currentSettings = { ...DEFAULTS };
    dirty = false;
    fillFields(currentSettings);
    setStatus("初期設定に戻しました");
  } catch (error) {
    setStatus("リセットエラー: " + error.message);
  } finally {
    updateButtons();
  }
});

onAuthStateChanged(auth, user => {
  signedIn = !!user;
  panel.hidden = !signedIn;
  updateButtons();
});

onValue(
  settingsRef,
  snapshot => {
    currentSettings = normalize(
      snapshot.val() || DEFAULTS
    );

    if (!dirty) {
      fillFields(currentSettings);
    }
  },
  error => {
    setStatus("読み取りエラー: " + error.message);
  }
);

fillFields(DEFAULTS);
updateButtons();
