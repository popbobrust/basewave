// ===============================
// ABILITIES SYSTEM (FULL REWRITE)
// ===============================

// Abilities with visuals, star levels, evo, no duplicates, and helper scaling

const MAX_ABILITIES = 6;

let abilities = [];
let helpers = []; // each helper: { id, name, level }

// Visual state
let guardianOrbs = [];
let molotovPools = [];
let droneBullets = [];
let droneAngle = 0;

// Ability definitions
const ABILITY_POOL = [
  {
    id: "guardian_halo",
    name: "Guardian Halo",
    basePower: 5,
    cooldown: 800
  },
  {
    id: "forcefield",
    name: "Forcefield",
    basePower: 4,
    cooldown: 500
  },
  {
    id: "molotov_ring",
    name: "Molotov Ring",
    basePower: 7,
    cooldown: 2200
  },
  {
    id: "drone",
    name: "Assault Drone",
    basePower: 3,      // lower damage
    cooldown: 200      // much faster
  }
];

// Helper definitions (now with star levels)
const HELPER_POOL = [
  { id: "atk_speed", name: "Attack Speed Up" },
  { id: "move_speed", name: "Move Speed Up" },
  { id: "damage_up", name: "Damage Up" },
  { id: "cdr", name: "Cooldown Reduction" },
  { id: "regen", name: "Health Regen" },
  { id: "crit", name: "Crit Chance" },
  { id: "evo", name: "Evolution Core" }
];

// ===============================
// RESET
// ===============================

function resetAbilities() {
  abilities = [];
  helpers = [];
  guardianOrbs = [];
  molotovPools = [];
  droneBullets = [];
  droneAngle = 0;
  updateAbilitiesBar();
}

// ===============================
// ADD / UPGRADE ABILITIES
// ===============================

function addAbility(def) {
  if (abilities.length >= MAX_ABILITIES) return;
  abilities.push({
    ...def,
    level: 1,
    evolved: false,
    lastCast: performance.now()
  });
  updateAbilitiesBar();
}

function upgradeAbility(ab) {
  ab.level = Math.min(ab.level + 1, 5);
  updateAbilitiesBar();
}

// ===============================
// HELPERS (NOW WITH STAR LEVELS)
// ===============================

function addHelper(def) {
  const existing = helpers.find(h => h.id === def.id);
  if (existing) {
    existing.level = Math.min(existing.level + 1, 5);
  } else {
    helpers.push({ ...def, level: 1 });
  }
}

function getHelperLevel(id) {
  const h = helpers.find(h => h.id === id);
  return h ? h.level : 0;
}

function hasHelper(id) {
  return helpers.some(h => h.id === id);
}

// ===============================
// MULTIPLIERS
// ===============================

function getAbilityDamageMult() {
  let mult = 1;
  mult += getHelperLevel("damage_up") * 0.1;
  mult += getHelperLevel("crit") * 0.05;
  return mult;
}

function getAttackSpeedMult() {
  return 1 + getHelperLevel("atk_speed") * 0.1;
}

function getMoveSpeedMult() {
  return 1 + getHelperLevel("move_speed") * 0.08;
}

function getCooldownMult() {
  return Math.max(0.6, 1 - getHelperLevel("cdr") * 0.05);
}

function applyRegen(dt) {
  const lvl = getHelperLevel("regen");
  if (!lvl || !player) return;
  const regen = lvl * 0.5;
  player.health = Math.min(player.maxHealth, player.health + regen * dt / 1000);
}

// ===============================
// ABILITY CASTING
// ===============================

function updateAbilities(dt) {
  if (!player) return;

  const now = performance.now();
  const dmgMult = getAbilityDamageMult();
  const cdMult = getCooldownMult();

  abilities.forEach(ab => {
    const cd = ab.cooldown * cdMult;
    if (now - ab.lastCast >= cd) {
      castAbility(ab, dmgMult);
      ab.lastCast = now;
    }
  });

  updateGuardianOrbs(dt);
  updateMolotovPools(dt);
  updateDroneBullets(dt);

  applyRegen(dt);
}

function evolveAbilityIfPossible(ab) {
  if (!ab.evolved && hasHelper("evo")) {
    ab.evolved = true;
  }
}

function castAbility(ab, dmgMult) {
  evolveAbilityIfPossible(ab);

  const base = ab.basePower;
  const levelMult = 1 + (ab.level - 1) * 0.5;
  const evoMult = ab.evolved ? 2.5 : 1;
  const damage = base * levelMult * evoMult * dmgMult;

  switch (ab.id) {
    case "guardian_halo": spawnGuardianOrbs(ab, damage); break;
    case "forcefield": applyForcefield(ab, damage); break;
    case "molotov_ring": spawnMolotov(ab, damage); break;
    case "drone": spawnDroneShot(ab, damage); break;
  }
}

// ===============================
// GUARDIAN HALO
// ===============================

function spawnGuardianOrbs(ab, damage) {
  const count = 2 + ab.level;
  const radius = 60 + ab.level * 10;
  const speed = ab.evolved ? 0.008 : 0.004;

  guardianOrbs = [];
  for (let i = 0; i < count; i++) {
    guardianOrbs.push({
      angle: (Math.PI * 2 * i) / count,
      radius,
      damage,
      speed
    });
  }
}


function updateGuardianOrbs(dt) {
  if (!player) return;

  guardianOrbs.forEach(o => {
    o.angle += o.speed * dt;
    const x = player.x + Math.cos(o.angle) * o.radius;
    const y = player.y + Math.sin(o.angle) * o.radius;

    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - x, e.y - y) < 18) {
        e.health -= o.damage;
        spawnHitParticles(e.x, e.y, "#66bb6a");
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
}

// ===============================
// FORCEFIELD
// ===============================

function applyForcefield(ab, damage) {
  const baseRadius = 70 + ab.level * 12;
  const radius = ab.evolved ? baseRadius * 1.4 : baseRadius;

  enemies.forEach(e => {
    if (!e.alive) return;
    if (Math.hypot(e.x - player.x, e.y - player.y) < radius) {
      const slow = ab.evolved ? 0.4 : 0.7;
      e.x -= (e.x - player.x) * 0.01 * slow;
      e.y -= (e.y - player.y) * 0.01 * slow;

      e.health -= damage * 0.5;
      if (e.health <= 0) {
        e.alive = false;
        spawnHitParticles(e.x, e.y, "#42a5f5");
        onEnemyKilled();
        addCoins(5 + wave);
      }
    }
  });
}

// ===============================
// MOLOTOV
// ===============================

function spawnMolotov(ab, damage) {
  const count = 1 + ab.level;
  const radius = 120 + ab.level * 15;
  const size = ab.evolved ? 80 : 50;
  const life = ab.evolved ? 4500 : 3000;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    molotovPools.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      radius: size,
      damage,
      life
    });
  }
}

function updateMolotovPools(dt) {
  molotovPools.forEach(p => {
    p.life -= dt;
    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - p.x, e.y - p.y) < p.radius) {
        e.health -= p.damage * (dt / 1000) * 3;
        spawnHitParticles(e.x, e.y, "#ff7043"); // same style as other damage
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });
  molotovPools = molotovPools.filter(p => p.life > 0);
}

// ===============================
// DRONE (REWORK)
// ===============================

function spawnDroneShot(ab, damage) {
  // handled in updateDroneBullets via continuous firing
}

let droneMissileTimer = 0;

function updateDroneBullets(dt) {
  droneAngle += 0.002 * dt;

  const droneAb = abilities.find(a => a.id === "drone");
  if (droneAb && player) {
    const fireInterval = droneAb.evolved ? 120 : 180;
    droneMissileTimer += dt;
    while (droneMissileTimer >= fireInterval) {
      droneMissileTimer -= fireInterval;

      const baseAngle = droneAngle;
      const angles = droneAb.evolved ? [baseAngle + 0.09, baseAngle - 0.09] : [baseAngle + 0.09, baseAngle + 0.17];

      angles.forEach(a => {
        const speed = 4;
        droneBullets.push({
          x: player.x + Math.cos(droneAngle) * 40,
          y: player.y + Math.sin(droneAngle) * 40,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          damage: droneAb.basePower * (1 + (droneAb.level - 1) * 0.5) * getAbilityDamageMult(),
          life: 900,
          radius: 18
        });
      });
    }
  }

  droneBullets.forEach(b => {
    b.life -= dt;
    b.x += b.vx;
    b.y += b.vy;

    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(e.x - b.x, e.y - b.y) < b.radius) {
        e.health -= b.damage;
        spawnHitParticles(e.x, e.y, "#ffee58");
        b.life = 0;
        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });

  droneBullets = droneBullets.filter(b => b.life > 0);
}

// ===============================
// DRAW VISUALS
// ===============================

function drawAbilities(ctx) {
  // Guardian orbs
  guardianOrbs.forEach(o => {
    const x = player.x + Math.cos(o.angle) * o.radius;
    const y = player.y + Math.sin(o.angle) * o.radius;
    ctx.fillStyle = "rgba(102,187,106,0.8)";
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
  });

  // Forcefield
  const ff = abilities.find(a => a.id === "forcefield");
  if (ff) {
    const base = 70 + ff.level * 12;
    const radius = ff.evolved ? base * 1.4 : base;
    ctx.strokeStyle = "rgba(66,165,245,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Molotov pools
  molotovPools.forEach(p => {
    ctx.fillStyle = "rgba(255,112,67,0.3)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  });

  // Drone body
  const droneAb = abilities.find(a => a.id === "drone");
  if (droneAb && player) {
    const radius = 40;
    const x = player.x + Math.cos(droneAngle) * radius;
    const y = player.y + Math.sin(droneAngle) * radius;
    ctx.fillStyle = "#90caf9";
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Drone missiles
  droneBullets.forEach(b => {
    ctx.fillStyle = "#ffee58";
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
}


// ===============================
// ABILITY BAR UI
// ===============================

function updateAbilitiesBar() {
  const bar = document.getElementById("abilities-bar");
  bar.innerHTML = "";

  for (let i = 0; i < MAX_ABILITIES; i++) {
    const slot = document.createElement("div");
    slot.className = "ability-slot";

    const ab = abilities[i];
    if (ab) {
      const name = document.createElement("span");
      name.className = "ability-name";
      name.textContent = ab.name;

      const stars = document.createElement("span");
      stars.className = "ability-stars";
      stars.textContent = "★".repeat(ab.level) + "☆".repeat(5 - ab.level);

      slot.appendChild(name);
      slot.appendChild(stars);
    } else {
      slot.textContent = "Empty";
    }

    bar.appendChild(slot);
  }
}
