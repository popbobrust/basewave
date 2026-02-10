// ===============================
// GAME CORE (FULL REWRITE)
// ===============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const healthEl = document.getElementById("health");
const enemiesLeftEl = document.getElementById("enemies-left");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let keys = {};
let mouse = { x: WIDTH / 2, y: HEIGHT / 2, down: false };

let player;
let bullets = [];
let enemies = [];
let particles = [];

let lastTime = 0;

// ===============================
// PLAYER
// ===============================

class Player {
  constructor() {
    this.x = WIDTH / 2;
    this.y = HEIGHT / 2;
    this.radius = 15;

    this.baseSpeed = 3;
    this.speed = this.baseSpeed;

    this.baseHealth = 100;
    this.maxHealth = this.baseHealth;
    this.health = this.maxHealth;

    this.baseFireRate = 200;
    this.fireRate = this.baseFireRate;
    this.lastShot = 0;
  }

  applyGearAndHelpers() {
    const moveMult = getMoveSpeedMult();
    const atkSpeedMult = getAttackSpeedMult();

    let extraHealth = 0;
    for (const slot of ARMOR_SLOTS) {
      const item = equippedArmor[slot];
      if (item) extraHealth += item.stats.health;
    }

    this.maxHealth = this.baseHealth + extraHealth;
    this.health = Math.min(this.health, this.maxHealth);

    this.speed = this.baseSpeed * moveMult;

    if (equippedWeapon) {
      this.fireRate = this.baseFireRate / (equippedWeapon.stats.attackSpeed * atkSpeedMult);
    } else {
      this.fireRate = this.baseFireRate / atkSpeedMult;
    }
  }

  update(dt) {
    let dx = 0, dy = 0;

    if (keys["w"] || keys["ArrowUp"]) dy -= 1;
    if (keys["s"] || keys["ArrowDown"]) dy += 1;
    if (keys["a"] || keys["ArrowLeft"]) dx -= 1;
    if (keys["d"] || keys["ArrowRight"]) dx += 1;

    const len = Math.hypot(dx, dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
      this.x += dx * this.speed;
      this.y += dy * this.speed;
    }

    this.x = Math.max(this.radius, Math.min(WIDTH - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(HEIGHT - this.radius, this.y));

    if (mouse.down) {
      const now = performance.now();
      if (now - this.lastShot > this.fireRate) {
        this.shoot();
        this.lastShot = now;
      }
    }
  }

  shoot() {
    // 360° melee sword
    if (equippedWeapon && equippedWeapon.name === "Soulblade") {
      const range = 80;
      const dmg = equippedWeapon.stats.damage;

      enemies.forEach(e => {
        if (!e.alive) return;
        if (Math.hypot(e.x - this.x, e.y - this.y) < range) {
          e.health -= dmg;
          spawnHitParticles(e.x, e.y, "#ffffff");
          if (e.health <= 0) {
            e.alive = false;
            onEnemyKilled();
            addCoins(5 + wave);
          }
        }
      });

      return;
    }

    // Default gun
    const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    bullets.push(new Bullet(
      this.x,
      this.y,
      Math.cos(angle) * 7,
      Math.sin(angle) * 7
    ));
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    ctx.rotate(angle);

    ctx.fillStyle = "#4caf50";
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ddd";
    ctx.fillRect(0, -4, this.radius + 10, 8);

    ctx.restore();
  }
}

// ===============================
// BULLET
// ===============================

class Bullet {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.vx = vx;
    this.vy = vy;
    this.alive = true;
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;

    if (
      this.x < -10 ||
      this.x > WIDTH + 10 ||
      this.y < -10 ||
      this.y > HEIGHT + 10
    ) {
      this.alive = false;
    }
  }

  draw() {
    ctx.fillStyle = "#ffeb3b";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===============================
// ENEMY
// ===============================

class Enemy {
  constructor(x, y, speed, health) {
    this.x = x;
    this.y = y;
    this.radius = 14;
    this.speed = speed;
    this.health = health;
    this.alive = true;
  }

  update(dt) {
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    this.x += Math.cos(angle) * this.speed;
    this.y += Math.sin(angle) * this.speed;

    const dist = Math.hypot(this.x - player.x, this.y - player.y);
    if (dist < this.radius + player.radius) {
      this.alive = false;

      const armor = getTotalArmor();
      const reduced = Math.max(4, 10 - armor * 0.3);

      player.health -= reduced;
      spawnHitParticles(this.x, this.y, "#f44336");

      if (player.health <= 0) {
        endGame(false);
      }
    }
  }

  draw() {
    ctx.fillStyle = "#f44336";
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===============================
// PARTICLES
// ===============================

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.life = 400;
    this.color = color;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx;
    this.y += this.vy;
  }

  draw() {
    const alpha = Math.max(this.life / 400, 0);
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function spawnHitParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// ===============================
// WAVE SPAWNING
// ===============================

function spawnWave() {
  enemies = [];
  const enemyCount = 4 + wave * 2;

  for (let i = 0; i < enemyCount; i++) {
    let x, y;
    const edge = Math.floor(Math.random() * 4);

    if (edge === 0) { x = Math.random() * WIDTH; y = -20; }
    else if (edge === 1) { x = WIDTH + 20; y = Math.random() * HEIGHT; }
    else if (edge === 2) { x = Math.random() * WIDTH; y = HEIGHT + 20; }
    else { x = -20; y = Math.random() * HEIGHT; }

    const speed = 1.2 + wave * 0.2;
    const health = 30 + wave * 8;

    enemies.push(new Enemy(x, y, speed, health));
  }

  enemiesLeftEl.textContent = enemies.length;
}

// ===============================
// GAME CONTROL
// ===============================

function startGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  particles = [];

  // Persistent gear + coins
  resetAbilities();
  resetWaves();

  player.applyGearAndHelpers();

  gameRunning = true;
  paused = false;
  setMessage("");

  spawnWave();
  updateHealthUI();

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function endGame(won) {
  gameRunning = false;

  if (won) {
    setMessage(`You survived wave ${wave}!`);
    showMainMenu();
  } else {
    setMessage(`You died on wave ${wave}.`);
    showDeathScreen();
  }
}

// ===============================
// LEVEL-UP MENU
// ===============================

function showLevelUpChoices() {
  paused = true;

  const menu = document.getElementById("levelup-menu");
  const container = document.getElementById("levelup-options");
  container.innerHTML = "";

  const options = [];
  const used = new Set();

  while (options.length < 3) {
    const isAbility = Math.random() < 0.6;

    if (isAbility) {
      const ab = randomFrom(ABILITY_POOL);
      if (used.has("ab_" + ab.id)) continue;
      used.add("ab_" + ab.id);
      options.push({ type: "ability", def: ab });
    } else {
      const h = randomFrom(HELPER_POOL);
      if (used.has("h_" + h.id)) continue;
      used.add("h_" + h.id);
      options.push({ type: "helper", def: h });
    }
  }

  options.forEach(opt => {
    const div = document.createElement("div");
    div.className = "levelup-option";

    const title = document.createElement("div");
    title.className = "levelup-title";

    const stars = document.createElement("div");
    stars.className = "levelup-stars";

    if (opt.type === "ability") {
      const existing = abilities.find(a => a.id === opt.def.id);
      const nextLevel = Math.min((existing ? existing.level : 0) + 1, 5);

      title.textContent = `Ability: ${opt.def.name}`;
      stars.textContent = "★".repeat(nextLevel) + "☆".repeat(5 - nextLevel);
    } else {
      const existing = helpers.find(h => h.id === opt.def.id);
      const nextLevel = Math.min((existing ? existing.level : 0) + 1, 5);

      title.textContent = `Helper: ${opt.def.name}`;
      stars.textContent = "★".repeat(nextLevel) + "☆".repeat(5 - nextLevel);
    }

    div.appendChild(title);
    div.appendChild(stars);

    div.addEventListener("click", () => {
      if (opt.type === "ability") {
        const existing = abilities.find(a => a.id === opt.def.id);
        if (existing) upgradeAbility(existing);
        else addAbility(opt.def);
      } else {
        addHelper(opt.def);
        player.applyGearAndHelpers();
      }

      menu.classList.add("hidden");
      paused = false;
    });

    container.appendChild(div);
  });

  menu.classList.remove("hidden");
}

// ===============================
// UPDATE / DRAW
// ===============================

function updateHealthUI() {
  healthEl.textContent = Math.round(player.health);
}

function update(dt) {
  if (!gameRunning || paused) return;

  player.applyGearAndHelpers();
  player.update(dt);

  bullets.forEach(b => b.update(dt));
  bullets = bullets.filter(b => b.alive);

  enemies.forEach(e => e.update(dt));
  enemies = enemies.filter(e => e.alive);

  bullets.forEach(b => {
    enemies.forEach(e => {
      if (!e.alive) return;
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.radius + e.radius) {
        const dmg = equippedWeapon ? equippedWeapon.stats.damage : 20;
        e.health -= dmg;
        b.alive = false;
        spawnHitParticles(e.x, e.y, "#ffeb3b");

        if (e.health <= 0) {
          e.alive = false;
          onEnemyKilled();
          addCoins(5 + wave);
        }
      }
    });
  });

  particles.forEach(p => p.update(dt));
  particles = particles.filter(p => p.life > 0);

  enemiesLeftEl.textContent = enemies.length;
  updateHealthUI();

  updateAbilities(dt);

  if (enemies.length === 0 && gameRunning) {
    nextWave();
    spawnWave();
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (!player) return;

  player.draw();
  bullets.forEach(b => b.draw());
  enemies.forEach(e => e.draw());
  particles.forEach(p => p.draw());
  drawAbilities(ctx);
}

function gameLoop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  if (gameRunning) {
    update(dt);
    draw();
    requestAnimationFrame(gameLoop);
  }
}

// ===============================
// INPUT
// ===============================

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener("mousedown", e => {
  if (e.button === 0) mouse.down = true;
});

canvas.addEventListener("mouseup", e => {
  if (e.button === 0) mouse.down = false;
});

// ===============================
// INIT
// ===============================

hookMenuButtons();
hookChestButtons();
showMainMenu();
hookInventoryButtons();
