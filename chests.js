const CHEST_COST = {
  basic: 50,
  advanced: 150,
  elite: 400
};

let lastCrateItem = null;

function openChest(type) {
  const cost = CHEST_COST[type];
  if (!cost) return;
  if (!spendCoins(cost)) {
    setMessage("Not enough coins!");
    return;
  }

  let item;
  if (Math.random() < 0.7) {
    item = createArmor(type);
  } else {
    item = createWeapon(type);
  }

  lastCrateItem = item;
  const text = describeItem(item);
  const popup = document.getElementById("crate-popup");
  document.getElementById("crate-item-text").textContent = `You obtained ${text}!`;
  popup.classList.remove("hidden");
}

function hookChestButtons() {
  document.querySelectorAll(".chest-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      openChest(type);
    });
  });

  document.getElementById("crate-ok-btn").addEventListener("click", () => {
    document.getElementById("crate-popup").classList.add("hidden");
    if (lastCrateItem) {
      addItemToInventory(lastCrateItem);
      lastCrateItem = null;
    }
  });
}
