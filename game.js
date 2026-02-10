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

// ---------- Player / Enemy / Bullet / Particle ----------

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
    const bonuses = getSetBonuses();
    const moveMult = getMoveSpeedMult();
    const atkSpeedMult = getAttackSpeedMult();

    let extraHealth = 0;
    for (const slot of ARMOR_SLOTS) {
      const item = equippedArmor[slot];
      if (item) extraHealth += item.stats.health;
    }
    if (equippedWeapon) {
      this.fireRate =
        this.baseFireRate / (equippedWeapon.stats.attackSpeed * atkSpeedMult);
    } else {
      this.fireRate = this.baseFireRate / atkSpeedMult;
    }

    this.maxHealth = (this.baseHealth + extraHealth) * bonuses.healthMult;
    this.health = Math.min(this.health, this.maxHealth);
    this.speed = this.baseSpeed * moveMult;
  }

  update(dt) {
    let dx = 0;
    let dy = 0;

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
    const angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    const speed = 7;
    bullets.push(
      new Bullet(
        this.x,
        this.y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      )
    );
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
      player.health -= 10;
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
    const p = new Particle(x, y, color);
    particles.push(p);
  }
}

// ---------- Wave spawning ----------

function spawnWave() {
  enemies = [];
  const enemyCount = 4 + wave * 2;
  for (let i = 0; i < enemyCount; i++) {
    let x, y;
    const edge = Math.floor(Math.random() * 4);
    if (edge === 0) {
      x = Math.random() * WIDTH;
      y = -20;
    } else if (edge === 1) {
      x = WIDTH + 20;
      y = Math.random() * HEIGHT;
    } else if (edge === 2) {
      x = Math.random() * WIDTH;
      y = HEIGHT + 20;
    } else {
      x = -20;
      y = Math.random() * HEIGHT;
    }

    const speed = 1.2 + wave * 0.2;
    const health = 30 + wave * 8;
    enemies.push(new Enemy(x, y, speed, health));
  }
  enemiesLeftEl.textContent = enemies.length;
}

// ---------- Game control ----------

function startGame() {
  player = new Player();
  bullets = [];
  enemies = [];
  particles = [];
  resetCurrency();
  resetGear();
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
  setMessage(
    won ? `You survived wave ${wave}!` : `You died on wave ${wave}.`
  );
  showMainMenu();
}

// ---------- Level-up UI ----------

function showLevelUpChoices() {
  paused = true;

  const menu = document.getElementById("levelup-menu");
  const container = document.getElementById("levelup-options");
  container.innerHTML = "";

  const options = [];
  while (options.length < 3) {
    if (Math.random() < 0.6) {
      const ab = randomFrom(ABILITY_POOL);
      options.push({ type: "ability", def: ab });
    } else {
      const helper = randomFrom(HELPER_POOL);
      options.push({ type: "helper", def: helper });
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
      const level = existing ? existing.level : 0;
      title.textContent = `Ability: ${opt.def.name}`;
      stars.textContent =
        "★".repeat(level || 1) + "☆".repeat(5 - (level || 1));
    } else {
      title.textContent = `Helper: ${opt.def.name}`;
      stars.textContent = "";
    }

    div.appendChild(title);
    div.appendChild(stars);

    div.addEventListener("click", () => {
      if (opt.type === "ability") {
        const existing = abilities.find(a => a.id === opt.def.id);
        if (existing) {
          upgradeAbility(existing);
        } else {
          addAbility(opt.def);
        }
      } else {
        addHelper(opt.def);
        if (player) player.applyGearAndHelpers();
      }
      menu.classList.add("hidden");
      paused = false;
    });

    container.appendChild(div);
  });

  menu.classList.remove("hidden");
}

// ---------- Update / Draw ----------

function updateHealthUI() {
  if (healthEl && player) {
    healthEl.textContent = Math.round(player.health);
  }
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
      const dist = Math.hypot(b.x - e.x, b.y - e.y);
      if (dist < b.radius + e.radius && e.alive && b.alive) {
        let bulletDamage = 20;
        if (equippedWeapon) {
          bulletDamage = equippedWeapon.stats.damage;
        }
        e.health -= bulletDamage;
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

  enemies = enemies.filter(e => e.alive);
  bullets = bullets.filter(b => b.alive);

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

// ---------- Input ----------

window.addEventListener("keydown", e => {
  keys[e.key] = true;
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
});

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

// ---------- Init ----------

hookMenuButtons();
hookChestButtons();
showMainMenu();
