let coins = 0;

function resetCurrency() {
  coins = 0;
  updateCurrencyUI();
}

function addCoins(amount) {
  coins += amount;
  updateCurrencyUI();
}

function spendCoins(amount) {
  if (coins >= amount) {
    coins -= amount;
    updateCurrencyUI();
    return true;
  }
  return false;
}

function updateCurrencyUI() {
  const el = document.getElementById("coins");
  if (el) el.textContent = coins;
}
