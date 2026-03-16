const canvas  = document.getElementById('canvas');
const ctx     = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const ovTitle = document.getElementById('ovTitle');
const ovSub   = document.getElementById('ovSub');
const ovScore = document.getElementById('ovScore');
const btnPlay = document.getElementById('btnPlay');
const scoreEl = document.getElementById('scoreDisplay');
const hiEl    = document.getElementById('hiDisplay');
const lvlEl   = document.getElementById('lvlDisplay');

const COLS = 20, ROWS = 20;

const C = {
  bg:    '#06060f',
  gridL: '#0d0d2b',
  snakeH:'#00ff88',
  food:  '#ff3c6e',
  foodG: 'rgba(255,60,110,',
};

let snake, dir, nextDir, food, score, hiScore, level, speed, gameLoop, running, paused;

hiScore = parseInt(localStorage.getItem('snakeHi') || '0');
hiEl.textContent = hiScore;

function cellSize() { return canvas.width / COLS; }

function init() {
  snake   = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  dir     = { x: 1, y: 0 };
  nextDir = { x: 1, y: 0 };
  score   = 0; level = 1; speed = 120;
  scoreEl.textContent = '0';
  lvlEl.textContent   = '1';
  spawnFood();
}

function spawnFood() {
  let pos;
  do {
    pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  food = pos;
}

function step() {
  if (paused) return;
  dir = { ...nextDir };
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { endGame(); return; }
  if (snake.some(s => s.x === head.x && s.y === head.y))             { endGame(); return; }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10 * level;
    scoreEl.textContent = score;
    if (score > hiScore) {
      hiScore = score;
      hiEl.textContent = hiScore;
      localStorage.setItem('snakeHi', hiScore);
    }
    const newLevel = Math.floor(score / 50) + 1;
    if (newLevel > level) {
      level = newLevel;
      speed = Math.max(55, 80 - (level - 1) * 10);
      lvlEl.textContent = level;
      restartLoop();
    }
    spawnFood();
  } else {
    snake.pop();
  }
  draw();
}

function draw() {
  const CELL = cellSize();

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = C.gridL;
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= COLS; i++) {
    ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke();
  }

  // Food
  const fx = food.x * CELL + CELL / 2, fy = food.y * CELL + CELL / 2;
  const foodGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, CELL * 0.7);
  foodGrad.addColorStop(0, C.food);
  foodGrad.addColorStop(1, C.foodG + '0)');
  ctx.fillStyle = foodGrad;
  ctx.fillRect(food.x * CELL - 4, food.y * CELL - 4, CELL + 8, CELL + 8);
  ctx.shadowColor = C.food; ctx.shadowBlur = 18;
  ctx.fillStyle = C.food;
  roundRect(ctx, food.x * CELL + 2, food.y * CELL + 2, CELL - 4, CELL - 4, 3);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Snake
  snake.forEach((seg, i) => {
    const isHead = i === 0;
    const alpha  = isHead ? 1 : Math.max(0.35, 1 - i * 0.04);
    ctx.shadowColor = C.snakeH;
    ctx.shadowBlur  = isHead ? 14 : 6;
    ctx.fillStyle   = isHead
      ? C.snakeH
      : `rgba(0,${Math.floor(204 - i * 4)},${Math.floor(106 + i * 2)},${alpha})`;
    roundRect(ctx, seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, isHead ? 5 : 3);
    ctx.fill();
    if (isHead) {
      ctx.shadowBlur = 0; ctx.fillStyle = C.bg;
      const es = CELL > 14 ? 3 : 2;
      const ex1 = seg.x*CELL + (dir.x===0 ? CELL*.3 : (dir.x>0 ? CELL*.65 : CELL*.2));
      const ey1 = seg.y*CELL + (dir.y===0 ? CELL*.3 : (dir.y>0 ? CELL*.65 : CELL*.2));
      const ex2 = seg.x*CELL + (dir.x===0 ? CELL*.65 : (dir.x>0 ? CELL*.65 : CELL*.2));
      const ey2 = seg.y*CELL + (dir.y===0 ? CELL*.65 : (dir.y>0 ? CELL*.65 : CELL*.2));
      ctx.beginPath(); ctx.arc(ex1, ey1, es, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex2, ey2, es, 0, Math.PI*2); ctx.fill();
    }
  });
  ctx.shadowBlur = 0;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y,     x+w, y+r,     r);
  ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h); ctx.arcTo(x,   y+h,   x,   y+h-r,   r);
  ctx.lineTo(x, y+r); ctx.arcTo(x,     y,     x+r, y,         r);
  ctx.closePath();
}

function startGame() {
  init();
  overlay.classList.add('hidden');
  running = true; paused = false;
  restartLoop(); draw();
}

function restartLoop() {
  clearInterval(gameLoop);
  gameLoop = setInterval(step, speed);
}

function endGame() {
  clearInterval(gameLoop);
  running = false;
  ovTitle.textContent = 'GAME OVER';
  ovTitle.className   = 'ov-title';
  ovSub.textContent   = 'BETTER LUCK NEXT TIME';
  ovScore.textContent = `SCORE: ${score}  //  HI: ${hiScore}`;
  ovScore.classList.remove('hidden');
  btnPlay.textContent = '[ RETRY ]';
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (!running) return;
  paused = !paused;
  if (paused) {
    clearInterval(gameLoop);
    ctx.fillStyle = 'rgba(6,6,16,.6)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#c0c8ff';
    ctx.font = `bold ${canvas.width * 0.05}px Orbitron, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
  } else {
    restartLoop();
  }
}

// Keyboard
document.addEventListener('keydown', e => {
  switch (e.key) {
    case 'ArrowUp':    case 'w': case 'W': if (dir.y !==  1) nextDir={x:0,y:-1}; e.preventDefault(); break;
    case 'ArrowDown':  case 's': case 'S': if (dir.y !== -1) nextDir={x:0,y:1};  e.preventDefault(); break;
    case 'ArrowLeft':  case 'a': case 'A': if (dir.x !==  1) nextDir={x:-1,y:0}; e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D': if (dir.x !== -1) nextDir={x:1,y:0};  e.preventDefault(); break;
    case 'p': case 'P': togglePause(); break;
  }
});

// D-Pad buttons
document.getElementById('btnPlay').addEventListener('click', startGame);
document.getElementById('dUp').addEventListener('click',    () => { if(dir.y !== 1)  nextDir={x:0,y:-1}; });
document.getElementById('dDown').addEventListener('click',  () => { if(dir.y !== -1) nextDir={x:0,y:1};  });
document.getElementById('dLeft').addEventListener('click',  () => { if(dir.x !== 1)  nextDir={x:-1,y:0}; });
document.getElementById('dRight').addEventListener('click', () => { if(dir.x !== -1) nextDir={x:1,y:0};  });
document.getElementById('dPause').addEventListener('click', togglePause);

// Swipe en el canvas
let tx = 0, ty = 0;
canvas.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; e.preventDefault(); }, { passive: false });
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - tx;
  const dy = e.changedTouches[0].clientY - ty;
  if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
  if (Math.abs(dx) > Math.abs(dy)) {
    if (dx > 0 && dir.x !== -1) nextDir = {x:1,y:0};
    else if (dx < 0 && dir.x !== 1) nextDir = {x:-1,y:0};
  } else {
    if (dy > 0 && dir.y !== -1) nextDir = {x:0,y:1};
    else if (dy < 0 && dir.y !== 1) nextDir = {x:0,y:-1};
  }
  e.preventDefault();
}, { passive: false });

// Canvas responsivo
function resizeCanvas() {
  const size = Math.min(400, Math.floor(window.innerWidth * 0.9));
  canvas.width  = size;
  canvas.height = size;
  if (!running || paused) draw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

init();
draw();
