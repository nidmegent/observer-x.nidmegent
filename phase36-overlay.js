
/* ==========================================
   OBSERVER X - PHASE 3.6
   PLAYER HUD CUSTOMIZER OVERLAY
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

const settingsRef = ref(
  db,
  `matches/${MATCH_ID}/hudStyle`
);

const defaults = {
  iconSize: 54,
  iconShape: "rounded",
  backgroundOpacity: 96,
  nameSize: 17,
  rosterYA: 650,
  rosterYB: 650
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n)
    ? Math.max(min, Math.min(max, Math.round(n)))
    : fallback;
}

function applySettings(data = {}) {
  const root = document.documentElement.style;

  const iconSize = clamp(
    data.iconSize, 40, 70, defaults.iconSize
  );

  const opacity = clamp(
    data.backgroundOpacity,
    0, 100, defaults.backgroundOpacity
  );

  const nameSize = clamp(
    data.nameSize, 14, 26, defaults.nameSize
  );

  const rosterYA = clamp(
    data.rosterYA, 0, 900, defaults.rosterYA
  );

  const rosterYB = clamp(
    data.rosterYB, 0, 900, defaults.rosterYB
  );

  const shape = ["square", "rounded", "circle"]
    .includes(data.iconShape)
    ? data.iconShape
    : defaults.iconShape;

  const radius = {
    square: "0px",
    rounded: "6px",
    circle: "50%"
  }[shape];

  root.setProperty("--p36-icon-size", iconSize + "px");
  root.setProperty("--p36-icon-radius", radius);
  root.setProperty(
    "--p36-background-opacity",
    String(opacity / 100)
  );
  root.setProperty("--p36-name-size", nameSize + "px");
  root.setProperty("--p36-roster-a-y", rosterYA + "px");
  root.setProperty("--p36-roster-b-y", rosterYB + "px");
  root.setProperty(
    "--p36-icon-space",
    (iconSize + 23) + "px"
  );
}

applySettings(defaults);

onValue(
  settingsRef,
  snapshot => {
    applySettings(snapshot.val() || defaults);
  },
  error => {
    console.error(
      "Observer X Phase 3.6 Firebase:",
      error
    );
  }
);
