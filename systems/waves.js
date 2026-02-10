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
  const el = document.getElementById("wave");
  if (el) el.textContent = wave;
}

function updateLevelUI() {
  const el = document.getElementById("player-level");
  if (el) el.textContent = playerLevel;
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
