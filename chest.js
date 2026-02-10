const CHEST_COST = {
  basic: 50,
  advanced: 150,
  elite: 400
};

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

  equipItem(item);
  setMessage(`You obtained ${describeItem(item)}!`);
}

function describeItem(item) {
  if (item.kind === "armor") {
    return `${item.set} ${item.slot} (${TIER_NAMES[item.tier]})`;
  } else {
    return `${item.name} (${TIER_NAMES[item.tier]})`;
  }
}

function hookChestButtons() {
  document.querySelectorAll(".chest-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-type");
      openChest(type);
    });
  });
}
