const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;   // 480
const H = canvas.height;  // 400

// 定数
const PADDLE_W = 75;
const PADDLE_H = 10;
const BALL_R = 8;
const ROWS = 5;
const COLS = 10;
const BLOCK_W = 40;
const BLOCK_H = 15;
const BLOCK_PAD = 2;
const BLOCK_OFFSET_X = (W - COLS * (BLOCK_W + BLOCK_PAD) + BLOCK_PAD) / 2;
const BLOCK_OFFSET_Y = 50;
const BLOCK_COLORS = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#457b9d'];

// 状態変数
let gameState; // 'ready' | 'playing' | 'over' | 'clear'
let score, lives;
let paddle, ball, blocks;

// キー入力
const keys = {};
document.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    handleAction();
  }
});
document.addEventListener('keyup', e => { keys[e.code] = false; });

// マウス操作
canvas.addEventListener('mousemove', e => {
  if (gameState !== 'playing') return;
  const rect = canvas.getBoundingClientRect();
  paddle.x = Math.max(0, Math.min(W - PADDLE_W, e.clientX - rect.left - PADDLE_W / 2));
});

// クリックで開始・発射
canvas.addEventListener('click', handleAction);

function handleAction() {
  if (gameState === 'ready' || gameState === 'over' || gameState === 'clear') {
    startGame();
  } else if (gameState === 'playing' && !ball.launched) {
    ball.launched = true;
  }
}

function startGame() {
  score = 0;
  lives = 3;
  initBlocks();
  resetBall();
  gameState = 'playing';
}

function initBlocks() {
  blocks = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      blocks.push({
        x: BLOCK_OFFSET_X + c * (BLOCK_W + BLOCK_PAD),
        y: BLOCK_OFFSET_Y + r * (BLOCK_H + BLOCK_PAD),
        color: BLOCK_COLORS[r],
        alive: true
      });
    }
  }
}

function resetBall() {
  paddle = { x: W / 2 - PADDLE_W / 2, y: H - 30 };
  ball = {
    x: W / 2,
    y: paddle.y - BALL_R,
    dx: 4 * (Math.random() < 0.5 ? 1 : -1),
    dy: -4,
    launched: false
  };
}

function update() {
  if (gameState !== 'playing') return;

  // キーボードでパドル移動
  if (keys['ArrowLeft'] || keys['KeyA']) paddle.x = Math.max(0, paddle.x - 6);
  if (keys['ArrowRight'] || keys['KeyD']) paddle.x = Math.min(W - PADDLE_W, paddle.x + 6);

  // 未発射中はボールをパドルに追従
  if (!ball.launched) {
    ball.x = paddle.x + PADDLE_W / 2;
    return;
  }

  // ボール移動
  ball.x += ball.dx;
  ball.y += ball.dy;

  // 左右の壁
  if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.dx = Math.abs(ball.dx); }
  if (ball.x + BALL_R > W) { ball.x = W - BALL_R; ball.dx = -Math.abs(ball.dx); }

  // 天井
  if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.dy = Math.abs(ball.dy); }

  // パドルとの衝突
  if (
    ball.dy > 0 &&
    ball.y + BALL_R >= paddle.y &&
    ball.y + BALL_R <= paddle.y + PADDLE_H + Math.abs(ball.dy) &&
    ball.x >= paddle.x &&
    ball.x <= paddle.x + PADDLE_W
  ) {
    const hit = (ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2); // -1 〜 +1
    const speed = Math.hypot(ball.dx, ball.dy);
    const angle = hit * (Math.PI / 3); // 最大60度
    ball.dx = speed * Math.sin(angle);
    ball.dy = -Math.abs(speed * Math.cos(angle));
    ball.y = paddle.y - BALL_R;
  }

  // 床（落下）
  if (ball.y - BALL_R > H) {
    lives--;
    if (lives <= 0) {
      gameState = 'over';
      return;
    }
    resetBall();
  }

  // ブロックとの衝突
  for (const b of blocks) {
    if (!b.alive) continue;
    const nearX = Math.max(b.x, Math.min(b.x + BLOCK_W, ball.x));
    const nearY = Math.max(b.y, Math.min(b.y + BLOCK_H, ball.y));
    const dx = ball.x - nearX;
    const dy = ball.y - nearY;
    if (dx * dx + dy * dy < BALL_R * BALL_R) {
      b.alive = false;
      score += 10;
      // 当たり方向を判定して反射
      if (Math.abs(dx) > Math.abs(dy)) ball.dx = -ball.dx;
      else ball.dy = -ball.dy;
    }
  }

  // 全ブロック消去でクリア
  if (blocks.every(b => !b.alive)) {
    gameState = 'clear';
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);

  if (gameState === 'ready') {
    drawCenterMessage('ブロック崩し', 'Space / クリックでスタート');
    return;
  }

  // ブロック描画
  for (const b of blocks) {
    if (!b.alive) continue;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, BLOCK_W, BLOCK_H, 3);
    ctx.fill();
    // ハイライト
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(b.x + 2, b.y + 2, BLOCK_W - 4, 3);
  }

  // パドル
  const g = ctx.createLinearGradient(0, paddle.y, 0, paddle.y + PADDLE_H);
  g.addColorStop(0, '#90caf9');
  g.addColorStop(1, '#1565c0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(paddle.x, paddle.y, PADDLE_W, PADDLE_H, 5);
  ctx.fill();

  // ボール
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#90caf9';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // HUD（スコア・残機）
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '14px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`スコア: ${score}`, 8, 18);
  ctx.textAlign = 'right';
  ctx.fillText(`残機: ${'♥'.repeat(lives)}`, W - 8, 18);

  // オーバーレイメッセージ
  if (gameState === 'over') {
    drawCenterMessage('GAME OVER', `スコア: ${score}　　Space / クリックでリトライ`);
  } else if (gameState === 'clear') {
    drawCenterMessage('CLEAR!', `最終スコア: ${score}　　Space / クリックでもう一度`);
  }
}

function drawCenterMessage(title, sub) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#aac8ff';
  ctx.fillText(sub, W / 2, H / 2 + 18);
}

// 初期化して開始
gameState = 'ready';
score = 0;
lives = 3;

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();
