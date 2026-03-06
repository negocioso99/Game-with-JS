// ─── Canvas Setup ─────────────────────────────────────────────────────────────
const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');

const COLS = 20;
const ROWS = 20;
const CELL = canvas.width / COLS;

// ─── Color Palette ────────────────────────────────────────────────────────────
const C = {
  bg:        '#070707',
  grid:      '#111',
  snake:     '#39ff14',
  snakeDim:  '#1a7a00',
  snakeHead: '#ffffff',
  food:      '#ff2222',
  foodGlow:  'rgba(255,34,34,0.4)',
  bonus:     '#ffb800',
  bonusGlow: 'rgba(255,184,0,0.4)',
};

// ─── Game State ───────────────────────────────────────────────────────────────
let snake, dir, nextDir, food, bonus;
let score, level, speed;
let paused, alive;
let gameLoop;
let bonusTimer    = 0;
let bonusVisible  = false;
let highScores    = [0, 0, 0];
let particles     = [];
let foodAnim      = 0;

// ─── Initialisation ───────────────────────────────────────────────────────────
function initGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9,  y: 10 },
    { x: 8,  y: 10 },
  ];
  dir          = { x: 1, y: 0 };
  nextDir      = { x: 1, y: 0 };
  score        = 0;
  level        = 1;
  speed        = 150;
  paused       = false;
  alive        = true;
  bonus        = null;
  bonusTimer   = 0;
  bonusVisible = false;
  particles    = [];
  foodAnim     = 0;
  placeFood();
  updateHUD();
}

// ─── Food & Bonus Placement ───────────────────────────────────────────────────
function placeFood() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function placeBonus() {
  let pos;
  do {
    pos = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  } while (
    snake.some(s => s.x === pos.x && s.y === pos.y) ||
    (food.x === pos.x && food.y === pos.y)
  );
  bonus        = pos;
  bonusVisible = true;
  bonusTimer   = 80;
}

// ─── Main Game Tick ───────────────────────────────────────────────────────────
function tick() {
  if (!alive || paused) return;

  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  // Wall collision
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
    return endGame();
  }
  // Self collision
  if (snake.some(s => s.x === head.x && s.y === head.y)) {
    return endGame();
  }

  snake.unshift(head);

  let ate = false;

  // Eating regular food
  if (head.x === food.x && head.y === food.y) {
    score += level * 10;
    ate = true;
    spawnParticles(food.x, food.y, C.food);
    placeFood();

    if (Math.random() < 0.25 && !bonusVisible) placeBonus();

    // Level up
    if (score > 0 && score % (level * 50) === 0) {
      level = Math.min(level + 1, 9);
      speed = Math.max(60, 150 - (level - 1) * 15);
      restartLoop();
    }
    updateHUD();
  }

  // Eating bonus food
  if (bonusVisible && bonus && head.x === bonus.x && head.y === bonus.y) {
    score += level * 50;
    ate = true;
    spawnParticles(bonus.x, bonus.y, C.bonus);
    bonus        = null;
    bonusVisible = false;
    updateHUD();
  }

  if (!ate) snake.pop();

  // Bonus timeout
  if (bonusVisible) {
    bonusTimer--;
    if (bonusTimer <= 0) {
      bonus        = null;
      bonusVisible = false;
    }
  }

  foodAnim = (foodAnim + 0.2) % (Math.PI * 2);
  updateParticles();
  draw();
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(tick, speed);
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function endGame() {
  alive = false;
  clearInterval(gameLoop);

  highScores.push(score);
  highScores.sort((a, b) => b - a);
  highScores = highScores.slice(0, 3);

  document.getElementById('finalScore').textContent = String(score).padStart(3, '0');
  document.getElementById('newHighMsg').style.display =
    score === highScores[0] ? 'block' : 'none';
  document.getElementById('gameOverScreen').classList.remove('hidden');

  drawDead();
}

// ─── Particles ────────────────────────────────────────────────────────────────
function spawnParticles(gx, gy, color) {
  const cx = gx * CELL + CELL / 2;
  const cy = gy * CELL + CELL / 2;
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd   = 1 + Math.random() * 3;
    particles.push({
      x:     cx,
      y:     cy,
      vx:    Math.cos(angle) * spd,
      vy:    Math.sin(angle) * spd,
      life:  1,
      color,
      size:  2 + Math.random() * 3,
    });
  }
}

function updateParticles() {
  particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.1;
    p.life -= 0.05;
  });
  particles = particles.filter(p => p.life > 0);
}

// ─── Rendering ────────────────────────────────────────────────────────────────
function draw() {
  // Background
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Grid
  ctx.strokeStyle = C.grid;
  ctx.lineWidth   = 0.5;
  for (let x = 0; x <= COLS; x++) {
    ctx.beginPath();
    ctx.moveTo(x * CELL, 0);
    ctx.lineTo(x * CELL, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * CELL);
    ctx.lineTo(canvas.width, y * CELL);
    ctx.stroke();
  }

  // Particles
  particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle   = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  // Food (pulsing + glow)
  const pulse = 1 + Math.sin(foodAnim) * 0.15;
  const fr    = (CELL / 2 - 3) * pulse;
  ctx.shadowBlur  = 16;
  ctx.shadowColor = C.foodGlow;
  ctx.fillStyle   = C.food;
  ctx.fillRect(food.x * CELL + CELL / 2 - fr, food.y * CELL + CELL / 2 - fr, fr * 2, fr * 2);
  ctx.shadowBlur  = 0;
  // Pixel cross highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(food.x * CELL + CELL / 2 - 1, food.y * CELL + 3, 2, 4);
  ctx.fillRect(food.x * CELL + 3, food.y * CELL + CELL / 2 - 1, 4, 2);

  // Bonus food
  if (bonusVisible && bonus) {
    const flash = bonusTimer > 20 ? 1 : (bonusTimer % 4 < 2 ? 1 : 0);
    if (flash) {
      ctx.shadowBlur  = 20;
      ctx.shadowColor = C.bonusGlow;
      ctx.fillStyle   = C.bonus;
      ctx.fillRect(bonus.x * CELL + 3, bonus.y * CELL + 3, CELL - 6, CELL - 6);
      ctx.shadowBlur    = 0;
      ctx.fillStyle     = '#000';
      ctx.font          = `bold ${CELL - 8}px monospace`;
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillText('★', bonus.x * CELL + CELL / 2, bonus.y * CELL + CELL / 2 + 1);
    }
  }

  // Snake body
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const t      = i / snake.length;
    const pad    = isHead ? 1 : 2;

    if (isHead) {
      ctx.shadowBlur  = 12;
      ctx.shadowColor = C.snake;
      ctx.fillStyle   = C.snakeHead;
    } else {
      ctx.shadowBlur = 0;
      ctx.fillStyle  = `rgb(0,${Math.floor(220 * (1 - t * 0.6))},0)`;
    }

    ctx.fillRect(seg.x * CELL + pad, seg.y * CELL + pad, CELL - pad * 2, CELL - pad * 2);
    ctx.shadowBlur = 0;

    // Eyes on head
    if (isHead) {
      ctx.fillStyle = '#000';
      const es = 3;
      if (dir.x ===  1) { ctx.fillRect(seg.x*CELL+CELL-7, seg.y*CELL+4,      es, es); ctx.fillRect(seg.x*CELL+CELL-7, seg.y*CELL+CELL-7, es, es); }
      if (dir.x === -1) { ctx.fillRect(seg.x*CELL+3,      seg.y*CELL+4,      es, es); ctx.fillRect(seg.x*CELL+3,      seg.y*CELL+CELL-7, es, es); }
      if (dir.y === -1) { ctx.fillRect(seg.x*CELL+4,      seg.y*CELL+3,      es, es); ctx.fillRect(seg.x*CELL+CELL-7, seg.y*CELL+3,      es, es); }
      if (dir.y ===  1) { ctx.fillRect(seg.x*CELL+4,      seg.y*CELL+CELL-7, es, es); ctx.fillRect(seg.x*CELL+CELL-7, seg.y*CELL+CELL-7, es, es); }
    }
  });
}

function drawDead() {
  draw();
  ctx.fillStyle = 'rgba(255,0,0,0.08)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ─── HUD Updates ─────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('scoreDisplay').textContent = String(score).padStart(3, '0');
  document.getElementById('levelDisplay').textContent = String(level).padStart(2, '0');
  const best = Math.max(score, highScores[0] || 0);
  document.getElementById('bestDisplay').textContent  = String(best).padStart(3, '0');
}

function updateHighScoreDisplay() {
  const ids   = ['hs1', 'hs2', 'hs3'];
  const names = ['AAA', 'BBB', 'CCC'];
  ids.forEach((id, i) => {
    const el = document.getElementById(id);
    if (highScores[i] > 0) {
      el.textContent = `${names[i]}  ${String(highScores[i]).padStart(3, '0')}`;
      el.className   = 'hs-entry' + (i === 0 ? ' top' : '');
    } else {
      el.textContent = '---';
      el.className   = 'hs-entry';
    }
  });
}

// ─── Keyboard Controls ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const map = {
    ArrowUp:    { x: 0,  y: -1 },
    ArrowDown:  { x: 0,  y:  1 },
    ArrowLeft:  { x: -1, y:  0 },
    ArrowRight: { x: 1,  y:  0 },
    w: { x: 0,  y: -1 },
    s: { x: 0,  y:  1 },
    a: { x: -1, y:  0 },
    d: { x: 1,  y:  0 },
  };

  if (map[e.key]) {
    e.preventDefault();
    const nd = map[e.key];
    if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd;
  }

  if (e.key === 'p' || e.key === 'P') {
    if (alive) {
      paused = !paused;
      if (!paused) draw();
    }
  }
});

// ─── Mobile D-Pad Controls ────────────────────────────────────────────────────
[
  ['btnUp',    { x: 0,  y: -1 }],
  ['btnDown',  { x: 0,  y:  1 }],
  ['btnLeft',  { x: -1, y:  0 }],
  ['btnRight', { x: 1,  y:  0 }],
].forEach(([id, nd]) => {
  document.getElementById(id).addEventListener('touchstart', e => {
    e.preventDefault();
    if (nd.x !== -dir.x || nd.y !== -dir.y) nextDir = nd;
  }, { passive: false });
});

// ─── Button Events ────────────────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startScreen').classList.add('hidden');
  initGame();
  draw();
  gameLoop = setInterval(tick, speed);
});

document.getElementById('restartBtn').addEventListener('click', () => {
  document.getElementById('gameOverScreen').classList.add('hidden');
  updateHighScoreDisplay();
  initGame();
  draw();
  gameLoop = setInterval(tick, speed);
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
updateHighScoreDisplay();

// Draw a static grid on the start screen canvas
ctx.fillStyle   = C.bg;
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.strokeStyle = C.grid;
ctx.lineWidth   = 0.5;
for (let x = 0; x <= COLS; x++) {
  ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, canvas.height); ctx.stroke();
}
for (let y = 0; y <= ROWS; y++) {
  ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(canvas.width, y * CELL); ctx.stroke();
}
