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

function hookMenuButtons() {
  document.getElementById("play-btn").addEventListener("click", () => {
    hideMainMenu();
    startGame();
  });

  document.getElementById("resume-btn").addEventListener("click", () => {
    resumeGame();
  });

  document.getElementById("quit-btn").addEventListener("click", () => {
    quitToMenu();
  });

  window.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      if (!gameRunning) return;
      paused ? resumeGame() : pauseGame();
    }
  });
}

function setMessage(text) {
  const el = document.getElementById("message");
  if (el) el.textContent = text;
}
