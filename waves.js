let wave = 1;
let enemiesKilled = 0;
let playerLevel = 1;
let nextLevelThreshold = 10;

function resetWaves() {
  wave = 1;
  enemiesKilled = 0;
  playerLevel = 1;
  nextLevelThreshold = 10;
  updateWaveUI();
  updateLevelUI();
}

function updateWaveUI() {
  document.getElementById("wave").textContent = wave;
}

function updateLevelUI() {
  document.getElementById("player-level").textContent = playerLevel;
}

function onEnemyKilled() {
  enemiesKilled++;
  if (enemiesKilled >= nextLevelThreshold) {
    enemiesKilled = 0;
    playerLevel++;
    nextLevelThreshold = Math.floor(nextLevelThreshold * 1.25);
    updateLevelUI();
    showLevelUpChoices();
  }
}

function nextWave() {
  wave++;
  updateWaveUI();
}
