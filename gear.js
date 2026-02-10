const ARMOR_SLOTS = ["helmet", "chest", "legs", "boots", "gloves"];
const SET_NAMES = ["Knight", "Rogue", "Mage", "Guardian", "Berserker"];
const TIER_NAMES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

let equippedArmor = {};
let equippedWeapon = null;

function createArmor(chestType) {
  const set = randomFrom(SET_NAMES);
  const slot = randomFrom(ARMOR_SLOTS);
  const tier = rollTier(chestType);
  return {
    kind: "armor",
    set,
    slot,
    tier,
    stats: generateArmorStats(set, tier)
  };
}

function createWeapon(chestType) {
  const tier = rollTier(chestType);
  return {
    kind: "weapon",
    name: "Soulblade",
    tier,
    stats: generateWeaponStats(tier)
  };
}

function rollTier(chestType) {
  const odds = {
    basic: [60, 30, 8, 2, 0],
    advanced: [40, 35, 15, 8, 2],
    elite: [20, 30, 25, 15, 10]
  };
  const table = odds[chestType];
  const roll = Math.random() * 100;
  let sum = 0;
  for (let i = 0; i < table.length; i++) {
    sum += table[i];
    if (roll < sum) return i;
  }
  return 0;
}

function generateArmorStats(set, tier) {
  return {
    health: 10 + tier * 8,
    armor: 2 + tier * 2,
    set
  };
}

function generateWeaponStats(tier) {
  return {
    damage: 12 + tier * 7,
    attackSpeed: 1 + tier * 0.12
  };
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function equipItem(item) {
  if (item.kind === "armor") {
    equippedArmor[item.slot] = item;
  } else {
    equippedWeapon = item;
  }
  updateGearUI();
  updateEquippedUI && updateEquippedUI();
}

function tryMerge(a, b) {
  const newTier = Math.min(a.tier + 1, 4);
  return {
    ...a,
    tier: newTier,
    stats: generateArmorStats(a.set, newTier)
  };
}

function tryMergeWeapon(a, b) {
  const newTier = Math.min(a.tier + 1, 4);
  return {
    ...a,
    tier: newTier,
    stats: generateWeaponStats(newTier)
  };
}

function getTotalArmor() {
  let total = 0;
  for (const slot of ARMOR_SLOTS) {
    const item = equippedArmor[slot];
    if (item) total += item.stats.armor;
  }
  return total;
}

function updateGearUI() {
  const el = document.getElementById("gear-info");
  if (!el) return;

  let text = "Armor: ";
  ARMOR_SLOTS.forEach(slot => {
    const item = equippedArmor[slot];
    text += item
      ? `[${slot}: ${item.set} ${TIER_NAMES[item.tier]}] `
      : `[${slot}: none] `;
  });

  text += " | Weapon: ";
  text += equippedWeapon
    ? `${equippedWeapon.name} ${TIER_NAMES[equippedWeapon.tier]}`
    : "none";

  el.textContent = text;
}

function describeItem(item) {
  if (item.kind === "armor") {
    return `${item.set} ${item.slot} (${TIER_NAMES[item.tier]})`;
  } else {
    return `${item.name} (${TIER_NAMES[item.tier]})`;
  }
}
