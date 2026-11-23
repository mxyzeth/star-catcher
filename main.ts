// Star Catcher — a tiny browser game built from ONE prompt, plus the entry
// handoff for a make.fun video-on-X bounty (Node 22, standard library only).
//
// The one prompt that built this game:
//   "Build a tiny browser game called Star Catcher: a basket at the bottom
//   moves left and right with the arrow keys, golden stars fall from the
//   sky, catch them to score points, grey rocks also fall — dodge them,
//   a rock costs one life, three lives, 30 seconds on the clock, show
//   score, lives and time, and a game-over screen with the final score
//   and a restart button."
//   Revision (same session's follow-up): catching stars in a row builds a
//   combo — each consecutive star without a rock hit is worth 5 more
//   points than the last (10, 15, 20, ...), a rock hit resets the combo,
//   and the HUD shows the combo once it reaches 2.
//
// When this program runs it writes the playable game to game.html in the
// output directory and copies POST.json there too, so the house can read
// the post this entry names. The entry itself is the X post: a short video
// about an AI coding agent building this game from that one prompt while
// the user watches, ending with make.fun's referral end card.
//
// Run it outside the grader's container with:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The whole game, one file, no dependencies: a basket, falling stars to
// catch, falling rocks to dodge, three lives, thirty seconds.
const gameHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Star Catcher — a tiny browser game</title>
<style>
  html, body { margin: 0; padding: 0; background: #191419; overflow: hidden; }
  #wrap { width: 960px; margin: 0 auto; }
  canvas { display: block; width: 960px; height: 540px; background: #1b1035; }
</style>
</head>
<body>
<div id="wrap"><canvas id="game" width="960" height="540"></canvas></div>
<script>
(function () {
  var cv = document.getElementById('game');
  var ctx = cv.getContext('2d');
  var W = 960, H = 540;
  var params = new URLSearchParams(location.search);
  var DEMO = params.get('demo') === '1';
  var TIME_LIMIT = 30;

  var basket = { x: W / 2 - 60, y: H - 56, w: 120, h: 34, speed: 11 };
  var keys = {};
  var items = [];
  var score = 0, lives = 3, timeLeft = TIME_LIMIT;
  var combo = 0;
  var state = 'play';
  var elapsed = 0, last = performance.now(), spawnT = 0;

  function spawn() {
    var rock = Math.random() < 0.28;
    items.push({
      x: 30 + Math.random() * (W - 60),
      y: -30,
      r: rock ? 16 + Math.random() * 8 : 13 + Math.random() * 7,
      vy: 2.4 + Math.random() * 2.2 + elapsed * 0.02,
      rock: rock
    });
  }

  function star(x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(t / 300) * 0.25);
    ctx.fillStyle = '#ffd94a';
    ctx.strokeStyle = '#ff9d00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (var i = 0; i < 10; i++) {
      var ang = -Math.PI / 2 + i * Math.PI / 5;
      var rad = i % 2 === 0 ? r : r * 0.45;
      var px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function rock(x, y, r) {
    ctx.fillStyle = '#8d8d9b';
    ctx.strokeStyle = '#5c5c6e';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6e6e7d';
    ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.35, y + r * 0.25, r * 0.22, 0, Math.PI * 2); ctx.fill();
  }

  function drawBasket() {
    ctx.fillStyle = '#c41c83';
    ctx.strokeStyle = '#7d1153';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(basket.x, basket.y);
    ctx.lineTo(basket.x + basket.w, basket.y);
    ctx.lineTo(basket.x + basket.w - 14, basket.y + basket.h);
    ctx.lineTo(basket.x + 14, basket.y + basket.h);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5db1';
    ctx.fillRect(basket.x + 8, basket.y + 6, basket.w - 16, 6);
  }

  function drawHud() {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE ' + score, 20, 42);
    ctx.textAlign = 'center';
    ctx.fillText('TIME ' + Math.max(0, Math.ceil(timeLeft)) + 's', W / 2, 42);
    ctx.textAlign = 'right';
    var hearts = '';
    for (var i = 0; i < 3; i++) hearts += i < lives ? '♥ ' : '♡ ';
    ctx.fillStyle = '#ff5d7a';
    ctx.fillText(hearts, W - 20, 42);
    if (combo >= 2) {
      ctx.fillStyle = '#ffd94a';
      ctx.textAlign = 'center';
      ctx.fillText('COMBO x' + combo, W / 2, 82);
    }
  }

  function drawOver() {
    ctx.fillStyle = 'rgba(10, 6, 20, 0.72)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 30);
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = '#ffd94a';
    ctx.fillText('FINAL SCORE: ' + score, W / 2, H / 2 + 40);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('press R or click to play again', W / 2, H / 2 + 100);
  }

  function step(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'play') {
      elapsed += dt;
      timeLeft = TIME_LIMIT - elapsed;
      if (timeLeft <= 0) { timeLeft = 0; state = 'over'; }
      spawnT += dt;
      if (spawnT > 0.55) { spawnT = 0; spawn(); }
      if (keys['ArrowLeft']) basket.x -= basket.speed;
      if (keys['ArrowRight']) basket.x += basket.speed;
      if (DEMO) {
        var target = null;
        for (var i = 0; i < items.length; i++) {
          if (!items[i].rock && items[i].y > 0) { target = items[i]; break; }
        }
        if (target) {
          var cx = basket.x + basket.w / 2;
          if (target.x < cx - 8) basket.x -= basket.speed;
          if (target.x > cx + 8) basket.x += basket.speed;
        }
      }
      if (basket.x < 0) basket.x = 0;
      if (basket.x > W - basket.w) basket.x = W - basket.w;
      for (var j = items.length - 1; j >= 0; j--) {
        var it = items[j];
        it.y += it.vy;
        var bx0 = basket.x, bx1 = basket.x + basket.w;
        if (it.y + it.r >= basket.y && it.y - it.r <= basket.y + basket.h &&
            it.x + it.r >= bx0 && it.x - it.r <= bx1) {
          if (it.rock) { combo = 0; lives -= 1; if (lives <= 0) { lives = 0; state = 'over'; } }
          else { combo += 1; score += 10 + (combo - 1) * 5; }
          items.splice(j, 1);
          continue;
        }
        if (it.y - it.r > H) items.splice(j, 1);
      }
    }
    ctx.fillStyle = '#1b1035';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (var s = 0; s < 40; s++) {
      var sx = (s * 137) % W, sy = (s * 89) % H;
      ctx.fillRect(sx, sy, 2, 2);
    }
    for (var k = 0; k < items.length; k++) {
      var it2 = items[k];
      if (it2.rock) rock(it2.x, it2.y, it2.r);
      else star(it2.x, it2.y, it2.r, now);
    }
    drawBasket();
    drawHud();
    if (state === 'over') drawOver();
    requestAnimationFrame(step);
  }

  function restart() {
    items = []; score = 0; lives = 3; elapsed = 0; timeLeft = TIME_LIMIT;
    combo = 0; state = 'play'; spawnT = 0; last = performance.now();
  }

  window.addEventListener('keydown', function (e) {
    keys[e.key] = true;
    if ((e.key === 'r' || e.key === 'R') && state === 'over') restart();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  });
  window.addEventListener('keyup', function (e) { keys[e.key] = false; });
  cv.addEventListener('mousemove', function (e) {
    var r = cv.getBoundingClientRect();
    basket.x = (e.clientX - r.left) * (W / r.width) - basket.w / 2;
  });
  cv.addEventListener('mousedown', function () { if (state === 'over') restart(); });
  requestAnimationFrame(step);
})();
</script>
</body>
</html>
`;

function build() {
  mkdirSync(outDir, { recursive: true });
  // 1. The playable game, written out for anyone to open.
  writeFileSync(join(outDir, 'game.html'), gameHtml);
  // 2. The post this entry names, so the gate can read it.
  const postPath = join(repoRoot, 'POST.json');
  if (!existsSync(postPath)) {
    console.error('POST.json is missing from ' + repoRoot);
    process.exit(1);
  }
  const post = readFileSync(postPath, 'utf8');
  writeFileSync(join(outDir, 'POST.json'), post);
  console.log('Star Catcher written to ' + join(outDir, 'game.html'));
  console.log('POST.json copied to ' + join(outDir, 'POST.json'));
}

build();
