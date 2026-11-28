
/* ==========================================
   OBSERVER X - PHASE 4.4.1
   ADMIN CONTROL CENTER
========================================== */

const P44_MENUS = [
  ["match", "◈", "MATCH CONTROL", "試合進行"],
  ["team", "▦", "TEAM SETTINGS", "大会・チーム設定"],
  ["icons", "▧", "PLAYER ICONS", "選手画像設定"],
  ["stats", "▥", "PLAYER STATS", "選手ステータス"],
  ["history", "◷", "ROUND HISTORY", "ラウンド履歴"],
  ["hud", "☷", "HUD CUSTOMIZER", "HUD設定"],
  ["theme", "◉", "BROADCAST THEME", "配信テーマ"],
  ["system", "⚙", "SYSTEM SETTINGS", "システム設定"]
];

const P44_OVERLAY_URL =
  new URL(
    "./overlay.html?rosterY=650&demo=0",
    location.href
  ).href;

function initializeP44() {
  const control = document.getElementById("controlPanel");

  if (!control || document.getElementById("p44Shell")) {
    return;
  }

  document.body.classList.add("p44-admin");

  const toolbar = control.querySelector(".toolbar");
  const matchSettings =
    document.getElementById("saveMatch")?.closest(".panel");

  const teams = control.querySelector(".teams");

  const initializePanel =
    document.getElementById("initialize")?.closest(".panel");

  const status = document.getElementById("status");

  const shell = document.createElement("div");
  shell.id = "p44Shell";

  shell.innerHTML = `
    <aside id="p44Sidebar">
      <div class="p44-sidebar-brand">
        <span>OBSERVER</span>
        <strong>X</strong>
        <small>CONTROL CENTER</small>
      </div>

      <div class="p44-nav-caption">WORKSPACE</div>

      <nav id="p44Navigation"></nav>

      <div class="p44-sidebar-footer">
        <strong>OBSERVER X</strong>
        <span>PHASE 4.4.1</span>
        <span>TOURNAMENT SYSTEM</span>
      </div>
    </aside>

    <div id="p44Workspace">
      <div id="p44Topbar">
        <div>
          <div class="p44-eyebrow">
            OBSERVER X / ADMIN
          </div>
          <h2 id="p44PageTitle">MATCH CONTROL</h2>
          <p id="p44PageDescription">試合進行</p>
        </div>

        <div id="p44ConnectionArea"></div>
      </div>

      <div id="p44Pages"></div>

      <div id="p44StatusArea"></div>
    </div>
  `;

  control.appendChild(shell);

  const navigation =
    document.getElementById("p44Navigation");

  const pages =
    document.getElementById("p44Pages");

  const pageMap = {};

  for (const [key, icon, title, description] of P44_MENUS) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "p44-nav-button";
    button.dataset.page = key;

    button.innerHTML = `
      <span class="p44-nav-icon">${icon}</span>
      <span class="p44-nav-label">
        <strong>${title}</strong>
        <small>${description}</small>
      </span>
    `;

    button.addEventListener("click", () => {
      showPage(key);
    });

    navigation.appendChild(button);

    const page = document.createElement("section");

    page.id = `p44Page-${key}`;
    page.className = "p44-page";
    page.hidden = true;

    pages.appendChild(page);
    pageMap[key] = page;
  }

  function showPage(key) {
    const selected = P44_MENUS.find(
      item => item[0] === key
    );

    if (!selected) return;

    for (const [pageKey, page] of Object.entries(pageMap)) {
      page.hidden = pageKey !== key;
    }

    navigation.querySelectorAll(".p44-nav-button")
      .forEach(button => {
        const active = button.dataset.page === key;

        button.classList.toggle("is-active", active);
        button.setAttribute(
          "aria-current",
          active ? "page" : "false"
        );
      });

    document.getElementById("p44PageTitle")
      .textContent = selected[2];

    document.getElementById("p44PageDescription")
      .textContent = selected[3];

    window.scrollTo(0, 0);
  }

  function moveToPage(element, key) {
    if (!element || !pageMap[key]) return;

    if (element.parentElement !== pageMap[key]) {
      pageMap[key].appendChild(element);
    }
  }

  /* ===== CONNECTION / STATUS ===== */

  if (toolbar) {
    document.getElementById("p44ConnectionArea")
      .appendChild(toolbar);
  }

  if (status) {
    document.getElementById("p44StatusArea")
      .appendChild(status);
  }

  /* ===== TEAM SETTINGS ===== */

  moveToPage(matchSettings, "team");
  moveToPage(teams, "team");

  /* ===== MATCH SCORE CONTROL ===== */

  const scorePanel = document.createElement("section");

  scorePanel.id = "p44ScorePanel";
  scorePanel.className = "panel";

  scorePanel.innerHTML = `
    <div class="p44-panel-heading">
      <span>LIVE MATCH</span>
      <h2>SCORE CONTROL</h2>
    </div>

    <div id="p44ScoreGrid">
      <div class="p44-score-team p44-team-a">
        <span class="p44-team-tag">TEAM A</span>
        <strong id="p44TeamAName">TEAM A</strong>
        <span id="p44TeamASide"></span>
        <div id="p44ScoreA"></div>
      </div>

      <div class="p44-score-team p44-team-b">
        <span class="p44-team-tag">TEAM B</span>
        <strong id="p44TeamBName">TEAM B</strong>
        <span id="p44TeamBSide"></span>
        <div id="p44ScoreB"></div>
      </div>
    </div>

    <div id="p44MatchInfo"></div>
  `;

  pageMap.match.appendChild(scorePanel);

  const originalScoreA =
    document.getElementById("scoreA")
      ?.closest(".score-control");

  const originalScoreB =
    document.getElementById("scoreB")
      ?.closest(".score-control");

  if (originalScoreA) {
    document.getElementById("p44ScoreA")
      .appendChild(originalScoreA);
  }

  if (originalScoreB) {
    document.getElementById("p44ScoreB")
      .appendChild(originalScoreB);
  }

  /* ===== EXISTING PHASE PANELS / FIX ===== */

  const panelRoutes = [
    [".phase3-panel", "match"],
    ["#p34AdminPanel", "match"],
    ["#p39Panel", "match"],
    [".p32-panel", "match"],
    [".p33-panel", "match"],

    ["#p35Panel", "icons"],
    ["#p36Panel", "hud"],
    ["#p37Panel", "theme"],
    ["#p38Panel", "stats"],
    ["#p43Panel", "history"]
  ];

  function collectPhasePanels() {
    for (const [selector, key] of panelRoutes) {
      const element = document.querySelector(selector);

      if (!element || !pageMap[key]) {
        continue;
      }

      if (element.parentElement !== pageMap[key]) {
        pageMap[key].appendChild(element);
      }
    }
  }

  collectPhasePanels();

  /* ===== SYSTEM SETTINGS ===== */

  const systemPanel = document.createElement("section");

  systemPanel.id = "p44SystemPanel";
  systemPanel.className = "panel";

  systemPanel.innerHTML = `
    <div class="p44-panel-heading">
      <span>BROADCAST CONNECTION</span>
      <h2>OBS OVERLAY</h2>
    </div>

    <p>
      OBSのブラウザソースに設定するURLです。
    </p>

    <label>
      OVERLAY URL
      <input id="p44OverlayUrl" readonly>
    </label>

    <div class="p44-system-actions">
      <button id="p44CopyUrl" type="button">
        URLをコピー
      </button>

      <button id="p44OpenOverlay" type="button">
        OVERLAYを開く
      </button>
    </div>

    <p id="p44SystemStatus" role="status"></p>

    <div class="p44-resolution">
      <span>WIDTH : 1920</span>
      <span>HEIGHT : 1080</span>
    </div>
  `;

  pageMap.system.appendChild(systemPanel);

  document.getElementById("p44OverlayUrl")
    .value = P44_OVERLAY_URL;

  document.getElementById("p44CopyUrl")
    .addEventListener("click", async () => {
      const message =
        document.getElementById("p44SystemStatus");

      try {
        await navigator.clipboard.writeText(
          P44_OVERLAY_URL
        );

        message.textContent = "URLをコピーしました";
      } catch {
        message.textContent =
          "URL欄から手動でコピーしてください";
      }
    });

  document.getElementById("p44OpenOverlay")
    .addEventListener("click", () => {
      window.open(
        P44_OVERLAY_URL,
        "_blank",
        "noopener,noreferrer"
      );
    });

  moveToPage(initializePanel, "system");

  /* ===== LIVE INFORMATION ===== */

  function syncText(id, value) {
    const element = document.getElementById(id);

    if (element && element.textContent !== value) {
      element.textContent = value;
    }
  }

  function syncMatchInfo() {
    syncText(
      "p44TeamAName",
      document.getElementById("teamAName")?.value
        || "TEAM A"
    );

    syncText(
      "p44TeamBName",
      document.getElementById("teamBName")?.value
        || "TEAM B"
    );

    syncText(
      "p44TeamASide",
      document.getElementById("teamASide")?.value
        || ""
    );

    syncText(
      "p44TeamBSide",
      document.getElementById("teamBSide")?.value
        || ""
    );

    const map =
      document.getElementById("map")?.value || "—";

    const mapNumber =
      document.getElementById("mapNumber")?.value || "1";

    const bestOf =
      document.getElementById("bestOf")?.value || "3";

    syncText(
      "p44MatchInfo",
      `${map}  /  MAP ${mapNumber}  /  BO${bestOf}`
    );
  }

  /* ===== AUTH / DYNAMIC PANELS ===== */

  function syncLayout() {
    document.body.classList.toggle(
      "p44-signed-in",
      !control.hidden
    );

    collectPhasePanels();
    syncMatchInfo();
  }

  const observer = new MutationObserver(syncLayout);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  observer.observe(control, {
    attributes: true,
    attributeFilter: ["hidden"]
  });

  control.addEventListener("input", syncMatchInfo);
  control.addEventListener("change", syncMatchInfo);

  // Firebaseからvalueが直接更新された場合にも対応
  window.setInterval(syncMatchInfo, 500);

  showPage("match");
  syncLayout();
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeP44,
    { once: true }
  );
} else {
  initializeP44();
}
