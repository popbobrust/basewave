// INVENTORY SYSTEM

let inventoryItems = []; // infinite list
let selectedInventoryIndex = null;

function addItemToInventory(item) {
  item._new = true;
  inventoryItems.push(item);
  updateInventoryUI();
  saveInventory();
}

function getInventoryItems() {
  return inventoryItems;
}

function clearNewFlag(item) {
  item._new = false;
}

function openInventory() {
  selectedInventoryIndex = null;
  updateInventoryUI();
  document.getElementById("inventory-menu").classList.remove("hidden");
}

function closeInventory() {
  document.getElementById("inventory-menu").classList.add("hidden");
}

// Rarity → color mapping
function getRarityColor(tier) {
  switch (tier) {
    case 0: return "#9e9e9e"; // Common gray
    case 1: return "#4caf50"; // Uncommon green
    case 2: return "#2196f3"; // Rare blue
    case 3: return "#9c27b0"; // Epic purple
    case 4: return "#ffeb3b"; // Legendary yellow
    default: return "#ffffff";
  }
}

function updateInventoryUI() {
  const list = document.getElementById("inventory-list");
  if (!list) return;
  list.innerHTML = "";

  inventoryItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "inventory-item";
    div.style.padding = "4px 6px";
    div.style.borderBottom = "1px solid #333";
    div.style.cursor = "pointer";
    if (index === selectedInventoryIndex) {
      div.style.background = "#333";
    }

    const label = describeItem(item);
    div.textContent = label;

    // Color by rarity
    if (typeof item.tier === "number") {
      div.style.color = getRarityColor(item.tier);
    }

    if (item._new) {
      const tag = document.createElement("span");
      tag.textContent = " NEW";
      tag.style.color = "#ffeb3b";
      tag.style.marginLeft = "6px";
      div.appendChild(tag);
    }

    div.addEventListener("click", () => {
      selectedInventoryIndex = index;
      clearNewFlag(item);
      updateInventoryUI();
      updateEquippedUI();
    });

    list.appendChild(div);
  });

  updateEquippedUI();
}

function updateEquippedUI() {
  const container = document.getElementById("equipped-slots");
  if (!container) return;

  const slotEls = container.querySelectorAll("[data-slot]");
  slotEls.forEach(el => {
    const slot = el.getAttribute("data-slot");
    let text = "None";
    if (slot === "weapon" && equippedWeapon) {
      text = describeItem(equippedWeapon);
    } else if (slot !== "weapon") {
      const item = equippedArmor[slot];
      if (item) text = describeItem(item);
    }
    el.querySelector(".slot-item").textContent = text;
  });
}

function inventoryKeepSelected() {
  if (selectedInventoryIndex == null) return;
  const item = inventoryItems[selectedInventoryIndex];
  if (!item) return;
  clearNewFlag(item);
  updateInventoryUI();
}

function inventoryMoveSelected() {
  if (selectedInventoryIndex == null) return;
  const item = inventoryItems[selectedInventoryIndex];
  if (!item) return;

  equipItem(item);
  clearNewFlag(item);
  updateInventoryUI();
  saveInventory();
}

function inventoryMergeSelected() {
  if (selectedInventoryIndex == null) return;
  const item = inventoryItems[selectedInventoryIndex];
  if (!item) return;

  const sameIndex = inventoryItems.findIndex((other, idx) => {
    if (idx === selectedInventoryIndex) return false;
    if (item.kind !== other.kind) return false;
    if (item.kind === "armor") {
      return other.set === item.set && other.slot === item.slot && other.tier === item.tier;
    } else {
      return other.name === item.name && other.tier === item.tier;
    }
  });

  if (sameIndex === -1) {
    setMessage("No matching item to merge with.");
    return;
  }

  const other = inventoryItems[sameIndex];
  let merged;
  if (item.kind === "armor") {
    merged = tryMerge(item, other);
  } else {
    merged = tryMergeWeapon(item, other);
  }

  const keepIndex = Math.min(selectedInventoryIndex, sameIndex);
  inventoryItems.splice(Math.max(selectedInventoryIndex, sameIndex), 1);
  inventoryItems.splice(keepIndex, 1, merged);
  selectedInventoryIndex = keepIndex;
  merged._new = true;

  setMessage("Items merged!");
  updateInventoryUI();
  saveInventory();
}

function hookInventoryButtons() {
  const invBtn = document.getElementById("inventory-btn");
  if (invBtn) {
    invBtn.addEventListener("click", () => {
      openInventory();
    });
  }

  document.getElementById("inv-keep-btn").addEventListener("click", inventoryKeepSelected);
  document.getElementById("inv-move-btn").addEventListener("click", inventoryMoveSelected);
  document.getElementById("inv-merge-btn").addEventListener("click", inventoryMergeSelected);
  document.getElementById("inv-close-btn").addEventListener("click", closeInventory);
}

document.addEventListener("DOMContentLoaded", () => {
  updateEquippedUI();
});

function saveInventory() {
  const data = {
    inventory: inventoryItems,
    equippedArmor,
    equippedWeapon,
    coins
  };
  localStorage.setItem("waveSave", JSON.stringify(data));
}

function loadInventory() {
  const raw = localStorage.getItem("waveSave");
  if (!raw) return;

  const data = JSON.parse(raw);

  inventoryItems = data.inventory || [];
  equippedArmor = data.equippedArmor || {};
  equippedWeapon = data.equippedWeapon || null;
  coins = data.coins || 0;

  updateInventoryUI();
  updateGearUI();
  updateCurrencyUI();
}
