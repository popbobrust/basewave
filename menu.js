let gameRunning = false;
let paused = false;

function showMainMenu() {
  document.getElementById("main-menu").classList.remove("hidden");
}

function hideMainMenu() {
  document.getElementById("main-menu").classList.add("hidden");
}

function pauseGame() {
  if (!gameRunning) return;
  paused = true;
  document.getElementById("pause-menu").classList.remove("hidden");
}

function resumeGame() {
  paused = false;
  document.getElementById("pause-menu").classList.add("hidden");
}

function quitToMenu() {
  paused = false;
  gameRunning = false;
  document.getElementById("pause-menu").classList.add("hidden");
  showMainMenu();
}

function showDeathScreen() {
  const menu = document.getElementById("death-menu");
  const summary = document.getElementById("death-summary");
  summary.textContent = `You died on wave ${wave}, level ${playerLevel}, with ${coins} coins.`;
  menu.classList.remove("hidden");
}

function hideDeathScreen() {
  document.getElementById("death-menu").classList.add("hidden");
}

function hookMenuButtons() {
  document.getElementById("play-btn").addEventListener("click", () => {
    hideMainMenu();
    hideDeathScreen();
    startGame();
  });

  document.getElementById("resume-btn").addEventListener("click", () => {
    resumeGame();
  });

  document.getElementById("quit-btn").addEventListener("click", () => {
    quitToMenu();
  });

  document.getElementById("death-restart-btn").addEventListener("click", () => {
    hideDeathScreen();
    hideMainMenu();
    startGame();
  });

  document.getElementById("death-menu-btn").addEventListener("click", () => {
    hideDeathScreen();
    showMainMenu();
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Escape" && gameRunning) {
      paused ? resumeGame() : pauseGame();
    }
  });
  const invBtn = document.getElementById("inventory-btn");
  if (invBtn) {
    invBtn.addEventListener("click", () => {
      openInventory();
    });
  }

}

function setMessage(text) {
  const el = document.getElementById("message");
  if (el) el.textContent = text;
}
