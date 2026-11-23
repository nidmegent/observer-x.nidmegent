
/* ==========================================
   OBSERVER X - PHASE 3.7
   BROADCAST THEME SYSTEM - OVERLAY
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

const themeRef = ref(
  db,
  `matches/${MATCH_ID}/broadcastTheme`
);

const DEFAULT = {
  teamA: "#35d3e3",
  teamB: "#ff5369",
  panel: "#080e18"
};

function validColor(value, fallback) {
  return typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value)
    ? value
    : fallback;
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");

  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function readableTextColor(hex) {
  const [r, g, b] = hexToRgb(hex);

  const brightness =
    (r * 299 + g * 587 + b * 114) / 1000;

  return brightness >= 145
    ? "#071019"
    : "#ffffff";
}

function applyTheme(data) {
  const theme = data && typeof data === "object"
    ? data
    : DEFAULT;

  const a = validColor(
    theme.teamA,
    DEFAULT.teamA
  );

  const b = validColor(
    theme.teamB,
    DEFAULT.teamB
  );

  const bg = validColor(
    theme.panel,
    DEFAULT.panel
  );

  const root = document.documentElement.style;
  const [r, g, blue] = hexToRgb(bg);

  root.setProperty("--team-a", a);
  root.setProperty("--team-b", b);

  root.setProperty("--p37-team-a", a);
  root.setProperty("--p37-team-b", b);

  root.setProperty(
    "--p37-team-a-text",
    readableTextColor(a)
  );

  root.setProperty(
    "--p37-team-b-text",
    readableTextColor(b)
  );

  root.setProperty(
    "--p37-panel-rgb",
    `${r}, ${g}, ${blue}`
  );

  root.setProperty(
    "--panel",
    `rgba(${r}, ${g}, ${blue}, .96)`
  );

  document.documentElement.dataset.p37Theme = "active";
}

applyTheme(DEFAULT);

onValue(
  themeRef,
  snapshot => {
    applyTheme(snapshot.val());
  },
  error => {
    console.error(
      "Observer X Phase 3.7:",
      error
    );
  }
);
