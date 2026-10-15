/**
 * Pure Standalone Super Mario Game Engine (Zero dependencies!)
 * Runs in any modern browser directly by opening index.html
 */

(function () {
  // Web Audio Synthesizer
  class SoundPlayer {
    constructor() {
      this.ctx = null;
      this.muted = false;
      this.musicOn = true;
      this.musicInterval = null;
    }
    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    tone(freq, type, dur, gainVal = 0.2, endGain = 0.001, detune = 0) {
      if (this.muted) return;
      try {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (detune) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + detune), this.ctx.currentTime + dur);
        }
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(endGain, this.ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + dur);
      } catch (e) {}
    }
    jump() { this.tone(160, 'square', 0.14, 0.18, 0.01, 320); }
    coin() {
      if (this.muted) return;
      this.init();
      const now = this.ctx.currentTime;
      const play = (f, d, l) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(f, now + d);
        gain.gain.setValueAtTime(0.2, now + d);
        gain.gain.exponentialRampToValueAtTime(0.001, now + d + l);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + d);
        osc.stop(now + d + l);
      };
      play(987.77, 0, 0.08);
      play(1318.51, 0.08, 0.28);
    }
    stomp() { this.tone(180, 'square', 0.1, 0.25, 0.01, -120); }
    powerup() {
      [330, 392, 659, 523, 587, 784].forEach((f, i) => {
        setTimeout(() => this.tone(f, 'square', 0.1, 0.2, 0.01), i * 60);
      });
    }
    fireball() { this.tone(550, 'sawtooth', 0.1, 0.2, 0.01, 400); }
    die() {
      this.stopMusic();
      [500, 400, 350, 300, 250, 200, 150].forEach((f, i) => {
        setTimeout(() => this.tone(f, 'square', 0.12, 0.25, 0.01), i * 90);
      });
    }
    victory() {
      this.stopMusic();
      const fanfare = [
        { f: 523, d: 140 }, { f: 659, d: 140 }, { f: 784, d: 140 },
        { f: 1046, d: 300 }, { f: 880, d: 140 }, { f: 1046, d: 500 },
        { f: 1174, d: 300 }, { f: 1318, d: 600 }
      ];
      let t = 0;
      fanfare.forEach(n => {
        setTimeout(() => this.tone(n.f, 'square', n.d / 1000, 0.3, 0.01), t);
        t += n.d + 40;
      });
    }
    playMusic(theme) {
      this.stopMusic();
      if (!this.musicOn || this.muted) return;
      this.init();
      if (theme === 'overworld') {
        const notes = [330, 330, 0, 330, 0, 262, 330, 0, 392, 0, 0, 0, 196, 0, 0, 0];
        let step = 0;
        this.musicInterval = setInterval(() => {
          if (!this.musicOn || this.muted) return;
          const n = notes[step % notes.length];
          if (n > 0) this.tone(n, 'square', 0.08, 0.08, 0.001);
          step++;
        }, 160);
      } else if (theme === 'underground') {
        const notes = [130, 260, 123, 246, 116, 233, 110, 220];
        let step = 0;
        this.musicInterval = setInterval(() => {
          if (!this.musicOn || this.muted) return;
          this.tone(notes[step % notes.length], 'triangle', 0.12, 0.1, 0.001);
          step++;
        }, 200);
      } else if (theme === 'castle') {
        const notes = [164, 155, 146, 138, 130, 123, 116, 110];
        let step = 0;
        this.musicInterval = setInterval(() => {
          if (!this.musicOn || this.muted) return;
          this.tone(notes[step % notes.length], 'sawtooth', 0.14, 0.07, 0.001);
          step++;
        }, 180);
      }
    }
    stopMusic() {
      if (this.musicInterval) {
        clearInterval(this.musicInterval);
        this.musicInterval = null;
      }
    }
  }

  const sfx = new SoundPlayer();

  // DOM Elements
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const hudScore = document.getElementById('hud-score');
  const hudCoins = document.getElementById('hud-coins');
  const hudLevel = document.getElementById('hud-level');
  const hudTime = document.getElementById('hud-time');
  const hudLives = document.getElementById('hud-lives');
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const victoryOverlay = document.getElementById('victory-overlay');
  const finalStats = document.getElementById('final-stats');

  const btnStart = document.getElementById('btn-start');
  const btnRestart = document.getElementById('btn-restart');
  const btnPlayAgain = document.getElementById('btn-play-again');
  const btnSound = document.getElementById('btn-sound');
  const btnMusic = document.getElementById('btn-music');

  let currentLevel = 1;
  let score = 0;
  let coins = 0;
  let lives = 3;
  let timeLeft = 300;
  let timerTimer = null;
  let gameState = 'start'; // start, playing, levelClear, gameOver, victory
  let animTick = 0;
  let cameraX = 0;

  // Keys
  const keys = { left: false, right: false, jump: false, action: false };

  // Level Generator
  function getLevelData(lvl) {
    const blocks = [];
    const enemies = [];
    const groundY = 380;

    if (lvl === 1) {
      // Overworld
      const segs = [{ s: 0, e: 800 }, { s: 900, e: 1500 }, { s: 1600, e: 2400 }];
      segs.forEach(sg => {
        for (let x = sg.s; x < sg.e; x += 32) {
          blocks.push({ x, y: groundY, w: 32, h: 48, t: 'ground' });
        }
      });
      // Bricks & ? blocks
      blocks.push({ x: 260, y: groundY - 96, w: 32, h: 32, t: 'q_coin' });
      blocks.push({ x: 320, y: groundY - 96, w: 32, h: 32, t: 'brick' });
      blocks.push({ x: 352, y: groundY - 96, w: 32, h: 32, t: 'q_mush' });
      blocks.push({ x: 384, y: groundY - 96, w: 32, h: 32, t: 'brick' });
      // Pipes
      [560, 720, 1100, 1340].forEach((px, i) => {
        const ph = 40 + i * 16;
        blocks.push({ x: px, y: groundY - ph, w: 48, h: ph, t: 'pipe' });
      });
      // Goombas
      [440, 640, 1020, 1240, 1700].forEach((ex, idx) => {
        enemies.push({ id: idx, type: 'goomba', x: ex, y: groundY - 32, w: 30, h: 30, vx: -1.2, vy: 0, alive: true, facing: 'left' });
      });
      return {
        id: 1, name: '1-1', theme: 'overworld', width: 2400,
        blocks, enemies, flagX: 2000, castleX: 2120, startX: 60, time: 300
      };
    } else if (lvl === 2) {
      // Underground
      const segs = [{ s: 0, e: 550 }, { s: 750, e: 1200 }, { s: 1400, e: 1850 }, { s: 2050, e: 2700 }];
      segs.forEach(sg => {
        for (let x = sg.s; x < sg.e; x += 32) {
          blocks.push({ x, y: groundY, w: 32, h: 48, t: 'ground' });
        }
      });
      // Moving platforms
      blocks.push({ x: 570, y: groundY - 40, w: 64, h: 18, t: 'moving', sx: 560, ex: 730, speed: 1.5, dir: 1 });
      blocks.push({ x: 1220, y: groundY - 30, w: 64, h: 18, t: 'moving_v', sy: groundY - 140, ey: groundY - 20, speed: 1.4, dir: -1 });
      blocks.push({ x: 1870, y: groundY - 50, w: 64, h: 18, t: 'moving', sx: 1860, ex: 2030, speed: 1.6, dir: 1 });
      // Powerup
      blocks.push({ x: 300, y: groundY - 96, w: 32, h: 32, t: 'q_fire' });
      // Koopas
      [420, 850, 1050, 1550, 2200].forEach((ex, idx) => {
        enemies.push({ id: idx + 10, type: 'koopa', x: ex, y: groundY - 36, w: 30, h: 36, vx: -1.3, vy: 0, alive: true, isShell: false, facing: 'left' });
      });
      return {
        id: 2, name: '2-1', theme: 'underground', width: 2700,
        blocks, enemies, flagX: 2350, castleX: 2470, startX: 60, time: 280
      };
    } else {
      // Castle (Level 3 - Bowser & Princess)
      // Entrance
      for (let x = 0; x < 500; x += 32) blocks.push({ x, y: groundY, w: 32, h: 48, t: 'castle_brick' });
      // Lava lake
      for (let x = 500; x < 2600; x += 32) blocks.push({ x, y: groundY + 20, w: 32, h: 60, t: 'lava' });
      // Floating pillars over lava
      [{ x: 580, w: 70 }, { x: 740, w: 70 }, { x: 920, w: 80 }, { x: 1100, w: 80 }, { x: 1300, w: 70 }, { x: 1480, w: 80 }].forEach(p => {
        for (let px = p.x; px < p.x + p.w; px += 32) blocks.push({ x: px, y: groundY - 30, w: 32, h: 32, t: 'castle_brick' });
      });
      // Fire powerup before boss
      blocks.push({ x: 936, y: groundY - 130, w: 32, h: 32, t: 'q_fire' });
      // Moving platform
      blocks.push({ x: 1600, y: groundY - 40, w: 64, h: 18, t: 'moving', sx: 1580, ex: 1750, speed: 1.5, dir: 1 });
      // Pre-bridge
      for (let x = 1800; x < 1960; x += 32) blocks.push({ x, y: groundY, w: 32, h: 48, t: 'castle_brick' });
      // Great Bowser Bridge
      for (let x = 1960; x < 2400; x += 30) blocks.push({ x, y: groundY, w: 30, h: 24, t: 'bridge' });
      // Axe to cut bridge
      blocks.push({ x: 2410, y: groundY - 40, w: 30, h: 40, t: 'axe' });
      // Post-bridge Princess Sanctuary
      for (let x = 2450; x < 3100; x += 32) blocks.push({ x, y: groundY, w: 32, h: 48, t: 'castle_brick' });

      // Bowser Boss
      enemies.push({
        id: 999, type: 'bowser', x: 2200, y: groundY - 68, w: 64, h: 68,
        vx: -0.8, vy: 0, alive: true, health: 4, attackTimer: 0, facing: 'left'
      });

      return {
        id: 3, name: '3-1', theme: 'castle', width: 3100,
        blocks, enemies, princessX: 2750, castleX: 2500, startX: 60, time: 260
      };
    }
  }

  // Active Level State
  let level = getLevelData(1);
  let player = {
    x: 60, y: 340, w: 24, h: 30, vx: 0, vy: 0,
    grounded: false, facing: 'right', form: 'small', invincible: 0
  };
  let items = [];
  let projectiles = [];
  let isCollapsing = false;
  let collapseTimer = 0;
  let princessRescued = false;

  function loadLevel(lvlNum) {
    currentLevel = lvlNum;
    level = getLevelData(lvlNum);
    timeLeft = level.time;
    cameraX = 0;
    items = [];
    projectiles = [];
    isCollapsing = false;
    collapseTimer = 0;
    princessRescued = false;

    player.x = level.startX;
    player.y = 340;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.w = 24;
    player.h = player.form === 'small' ? 30 : 42;

    updateHUD();
    sfx.playMusic(level.theme);
  }

  function updateHUD() {
    hudScore.textContent = String(score).padStart(6, '0');
    hudCoins.textContent = '🪙 x' + String(coins).padStart(2, '0');
    hudLevel.textContent = level.name;
    hudTime.textContent = String(timeLeft);
    hudLives.textContent = '❤️ x' + lives;
  }

  // Game Loop
  function gameLoop() {
    animTick++;
    if (gameState === 'playing' || gameState === 'levelClear' || gameState === 'victory') {
      update();
    }
    render();
    requestAnimationFrame(gameLoop);
  }

  function update() {
    // Player movement
    const maxSpd = keys.action ? 4.5 : 3.0;
    if (keys.left && !keys.right) {
      player.vx = Math.max(-maxSpd, player.vx - 0.35);
      player.facing = 'left';
    } else if (keys.right && !keys.left) {
      player.vx = Math.min(maxSpd, player.vx + 0.35);
      player.facing = 'right';
    } else {
      player.vx *= 0.82;
      if (Math.abs(player.vx) < 0.05) player.vx = 0;
    }

    if (keys.jump && player.grounded) {
      player.vy = -10.5;
      player.grounded = false;
      sfx.jump();
    }
    if (!keys.jump && player.vy < -4) player.vy *= 0.7;

    player.vy += 0.48;
    if (player.vy > 9.5) player.vy = 9.5;

    if (player.invincible > 0) player.invincible--;

    // Moving platforms
    level.blocks.forEach(b => {
      if (b.t === 'moving') {
        const prevX = b.x;
        b.x += b.speed * b.dir;
        if (b.x < b.sx) { b.x = b.sx; b.dir = 1; }
        if (b.x > b.ex) { b.x = b.ex; b.dir = -1; }
        if (player.grounded && player.x + player.w > b.x && player.x < b.x + b.w && Math.abs(player.y + player.h - b.y) <= 4) {
          player.x += b.x - prevX;
        }
      } else if (b.t === 'moving_v') {
        const prevY = b.y;
        b.y += b.speed * b.dir;
        if (b.y < b.sy) { b.y = b.sy; b.dir = 1; }
        if (b.y > b.ey) { b.y = b.ey; b.dir = -1; }
        if (player.grounded && player.x + player.w > b.x && player.x < b.x + b.w && Math.abs(player.y + player.h - b.y) <= 4) {
          player.y += b.y - prevY;
        }
      }
    });

    // Horizontal check
    player.x += player.vx;
    for (const b of level.blocks) {
      if (b.t === 'lava' || b.t === 'axe' || b.t === 'moving' || b.t === 'moving_v') continue;
      if (overlap(player, b)) {
        if (player.vx > 0) player.x = b.x - player.w;
        else if (player.vx < 0) player.x = b.x + b.w;
        player.vx = 0;
      }
    }

    // Vertical check
    player.y += player.vy;
    player.grounded = false;
    for (const b of level.blocks) {
      if (b.t === 'lava') {
        if (overlap(player, b)) { die(); return; }
        continue;
      }
      if (b.t === 'axe') {
        if (overlap(player, b) && !isCollapsing) triggerBridgeCollapse();
        continue;
      }
      if (overlap(player, b)) {
        if (player.vy > 0) {
          player.y = b.y - player.h;
          player.vy = 0;
          player.grounded = true;
        } else if (player.vy < 0) {
          player.y = b.y + b.h;
          player.vy = 0;
          bumpBlock(b);
        }
      }
    }

    // Fall in pit
    if (player.y > 450) { die(); return; }

    // Level 1 / 2 Flagpole
    if (level.flagX && player.x >= level.flagX && gameState === 'playing') {
      gameState = 'levelClear';
      sfx.victory();
      setTimeout(() => {
        if (currentLevel < 3) {
          loadLevel(currentLevel + 1);
          gameState = 'playing';
        }
      }, 3000);
    }

    // Princess Peach Rescue Trigger in Level 3!
    if (level.princessX && player.x >= level.princessX - 40 && !princessRescued) {
      princessRescued = true;
      gameState = 'victory';
      score += 10000;
      updateHUD();
      sfx.victory();
      finalStats.textContent = 'Toplam Skor: ' + score;
      victoryOverlay.classList.remove('hidden');
    }

    // Bridge collapse update
    if (isCollapsing) {
      collapseTimer++;
      if (collapseTimer % 6 === 0) {
        const bridges = level.blocks.filter(b => b.t === 'bridge');
        if (bridges.length > 0) {
          bridges.sort((a, b) => b.x - a.x);
          level.blocks = level.blocks.filter(b => b !== bridges[0]);
        } else {
          // Drop Bowser
          const bowser = level.enemies.find(e => e.type === 'bowser');
          if (bowser && bowser.alive) {
            bowser.vy = 7;
            bowser.y += bowser.vy;
            if (bowser.y > 480) bowser.alive = false;
          }
        }
      }
    }

    // Update Enemies
    level.enemies.forEach(e => {
      if (!e.alive) return;
      if (e.type === 'bowser') {
        e.attackTimer = (e.attackTimer || 0) + 1;
        e.x += e.vx;
        if (e.x < 2000) { e.vx = 0.8; e.facing = 'right'; }
        if (e.x > 2280) { e.vx = -0.8; e.facing = 'left'; }
        e.vy = (e.vy || 0) + 0.35;
        e.y += e.vy;
        level.blocks.forEach(b => {
          if ((b.t === 'bridge' || b.t === 'castle_brick') && overlap(e, b) && e.vy > 0) {
            e.y = b.y - e.h;
            e.vy = 0;
          }
        });
        if (e.attackTimer > 100) {
          e.attackTimer = 0;
          sfx.fireball();
          projectiles.push({ x: e.x, y: e.y + 24, vx: e.facing === 'left' ? -4.5 : 4.5, vy: 0, r: 8, fromPlayer: false, life: 180 });
        }
      } else {
        e.vy += 0.35;
        e.x += e.vx;
        level.blocks.forEach(b => {
          if (b.t !== 'lava' && b.t !== 'axe' && overlap(e, b)) {
            e.vx = -e.vx;
            e.facing = e.vx > 0 ? 'right' : 'left';
          }
        });
        e.y += e.vy;
        level.blocks.forEach(b => {
          if (b.t !== 'lava' && b.t !== 'axe' && overlap(e, b) && e.vy > 0) {
            e.y = b.y - e.h;
            e.vy = 0;
          }
        });
      }

      // Check collision with player
      if (overlap(player, e)) {
        if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 16) {
          // Stomp
          player.vy = -7.5;
          sfx.stomp();
          if (e.type === 'bowser') {
            e.health--;
            if (e.health <= 0) triggerBridgeCollapse();
          } else {
            e.alive = false;
            score += 200;
            updateHUD();
          }
        } else {
          hurt();
        }
      }
    });

    // Update Projectiles
    projectiles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      if (p.fromPlayer) {
        level.enemies.forEach(e => {
          if (e.alive && Math.hypot(p.x - (e.x + e.w/2), p.y - (e.y + e.h/2)) < p.r + e.w/2) {
            p.life = 0;
            if (e.type === 'bowser') {
              e.health--;
              if (e.health <= 0) triggerBridgeCollapse();
            } else {
              e.alive = false;
              score += 200;
              updateHUD();
            }
          }
        });
      } else {
        if (player.invincible === 0 && Math.hypot(p.x - (player.x + player.w/2), p.y - (player.y + player.h/2)) < p.r + 12) {
          p.life = 0;
          hurt();
        }
      }
    });
    projectiles = projectiles.filter(p => p.life > 0);

    // Items
    items.forEach(it => {
      if (it.collected) return;
      if (overlap(player, it)) {
        it.collected = true;
        sfx.powerup();
        score += 1000;
        if (it.t === 'mush' && player.form === 'small') {
          player.form = 'super';
          player.h = 42;
          player.y -= 12;
        } else if (it.t === 'fire') {
          player.form = 'fire';
          player.h = 42;
        }
        updateHUD();
      }
    });
    items = items.filter(it => !it.collected);

    // Smooth Camera
    const targetCam = player.x - 280;
    cameraX += (targetCam - cameraX) * 0.12;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > level.width - 800) cameraX = level.width - 800;
  }

  function bumpBlock(b) {
    if (b.t === 'q_coin') {
      b.t = 'empty';
      coins++;
      score += 200;
      sfx.coin();
      updateHUD();
    } else if (b.t === 'q_mush') {
      b.t = 'empty';
      sfx.powerup();
      items.push({ x: b.x, y: b.y - 30, w: 24, h: 24, t: 'mush', collected: false });
    } else if (b.t === 'q_fire') {
      b.t = 'empty';
      sfx.powerup();
      items.push({ x: b.x, y: b.y - 30, w: 24, h: 24, t: 'fire', collected: false });
    }
  }

  function hurt() {
    if (player.invincible > 0) return;
    if (player.form === 'fire') {
      player.form = 'super';
      player.invincible = 90;
    } else if (player.form === 'super') {
      player.form = 'small';
      player.h = 30;
      player.invincible = 90;
    } else {
      die();
    }
  }

  function die() {
    lives--;
    sfx.die();
    updateHUD();
    if (lives <= 0) {
      gameState = 'gameOver';
      gameoverOverlay.classList.remove('hidden');
    } else {
      loadLevel(currentLevel);
    }
  }

  function triggerBridgeCollapse() {
    isCollapsing = true;
    level.blocks = level.blocks.filter(b => b.t !== 'axe');
  }

  function shootFire() {
    if (player.form !== 'fire' || gameState !== 'playing') return;
    sfx.fireball();
    projectiles.push({
      x: player.facing === 'right' ? player.x + player.w + 4 : player.x - 4,
      y: player.y + 16,
      vx: player.facing === 'right' ? 6.5 : -6.5,
      vy: 1.5,
      r: 6,
      fromPlayer: true,
      life: 140
    });
  }

  function overlap(a, b) {
    const bw = b.w || b.width;
    const bh = b.h || b.height;
    return a.x < b.x + bw && a.x + a.w > b.x && a.y < b.y + bh && a.y + a.h > b.y;
  }

  // Render Function
  function render() {
    ctx.clearRect(0, 0, 800, 460);

    // Background
    if (level.theme === 'overworld') {
      ctx.fillStyle = '#5c94fc';
      ctx.fillRect(0, 0, 800, 460);
      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      for (let x = -((cameraX * 0.2) % 400); x < 900; x += 220) {
        ctx.beginPath();
        ctx.arc(x + 30, 40, 16, 0, Math.PI * 2);
        ctx.arc(x + 50, 34, 20, 0, Math.PI * 2);
        ctx.arc(x + 70, 38, 16, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (level.theme === 'underground') {
      ctx.fillStyle = '#060610';
      ctx.fillRect(0, 0, 800, 460);
    } else {
      ctx.fillStyle = '#180404';
      ctx.fillRect(0, 0, 800, 460);
    }

    // Blocks
    level.blocks.forEach(b => {
      const sx = b.x - cameraX;
      if (sx + b.w < -20 || sx > 820) return;

      if (b.t === 'ground') {
        ctx.fillStyle = level.theme === 'underground' ? '#305890' : '#d0812b';
        ctx.fillRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'castle_brick') {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(sx, b.y, b.w, b.h);
        ctx.strokeRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'brick') {
        ctx.fillStyle = '#b84418';
        ctx.fillRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'q_coin' || b.t === 'q_mush' || b.t === 'q_fire') {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(sx, b.y, b.w, b.h);
        ctx.fillStyle = '#78350f';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('?', sx + 10, b.y + 22);
      } else if (b.t === 'empty') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'pipe') {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(sx, b.y, b.w, b.h);
        ctx.strokeStyle = '#15803d';
        ctx.strokeRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'moving' || b.t === 'moving_v') {
        ctx.fillStyle = '#eab308';
        ctx.fillRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'bridge') {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(sx, b.y, b.w, b.h);
      } else if (b.t === 'axe') {
        ctx.fillStyle = '#fde047';
        ctx.fillRect(sx + 8, b.y, 14, b.h);
      } else if (b.t === 'lava') {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(sx, b.y, b.w, b.h);
      }
    });

    // Flagpole in Level 1 & 2
    if (level.flagX) {
      const fsx = level.flagX - cameraX;
      ctx.fillStyle = '#fff';
      ctx.fillRect(fsx, 150, 6, 230);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(fsx + 6, 160);
      ctx.lineTo(fsx + 36, 172);
      ctx.lineTo(fsx + 6, 184);
      ctx.fill();
    }

    // Castle
    if (level.castleX) {
      const csx = level.castleX - cameraX;
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(csx, 260, 110, 120);
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(csx + 55, 380, 22, 35, 0, Math.PI, 0);
      ctx.fill();
    }

    // Items
    items.forEach(it => {
      const isx = it.x - cameraX;
      if (it.t === 'mush') {
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(isx + 12, it.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
      } else if (it.t === 'fire') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(isx + 12, it.y + 12, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Enemies
    level.enemies.forEach(e => {
      if (!e.alive) return;
      const esx = e.x - cameraX;
      if (e.type === 'bowser') {
        ctx.fillStyle = '#15803d';
        ctx.fillRect(esx + 20, e.y, 44, e.h);
        ctx.fillStyle = '#eab308';
        ctx.fillRect(esx, e.y + 10, 30, 48);
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(esx + 6, e.y - 12, 24, 18);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(esx, e.y - 20, (e.health / 4) * 60, 6);
      } else if (e.type === 'koopa') {
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.ellipse(esx + 15, e.y + 18, 12, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#a0522d';
        ctx.beginPath();
        ctx.ellipse(esx + 15, e.y + 15, 14, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Princess Peach in Level 3
    if (level.princessX) {
      const psx = level.princessX - cameraX;
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(psx + 16, 335, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(psx + 10, 320, 12, 6);
      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.moveTo(psx + 10, 345);
      ctx.lineTo(psx + 22, 345);
      ctx.lineTo(psx + 28, 380);
      ctx.lineTo(psx + 4, 380);
      ctx.fill();
      if (princessRescued) {
        ctx.fillStyle = '#ec4899';
        ctx.font = '20px sans-serif';
        ctx.fillText('💖', psx + 8, 310);
      }
    }

    // Projectiles
    projectiles.forEach(p => {
      ctx.fillStyle = p.fromPlayer ? '#ea580c' : '#ef4444';
      ctx.beginPath();
      ctx.arc(p.x - cameraX, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mario
    if (player.invincible === 0 || Math.floor(player.invincible / 4) % 2 === 0) {
      const psx = player.x - cameraX;
      const isFire = player.form === 'fire';
      const capCol = isFire ? '#fff' : '#e52521';
      const shirtCol = isFire ? '#fff' : '#e52521';
      const pantsCol = isFire ? '#e52521' : '#0026a3';

      ctx.fillStyle = capCol;
      ctx.fillRect(psx + 4, player.y, player.w - 8, 8);
      ctx.fillStyle = '#fcd0a1';
      ctx.fillRect(psx + 6, player.y + 8, player.w - 10, 8);
      ctx.fillStyle = shirtCol;
      ctx.fillRect(psx + 4, player.y + 16, player.w - 8, player.h - 24);
      ctx.fillStyle = pantsCol;
      ctx.fillRect(psx + 4, player.y + player.h - 10, player.w - 8, 10);
    }
  }

  // Keyboard Event Listeners
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
      keys.action = true;
      shootFire();
    }
  });

  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') keys.jump = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') keys.action = false;
  });

  // Touch Controls
  const bindTouch = (id, onDown, onUp) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('touchstart', e => { e.preventDefault(); onDown(); });
    el.addEventListener('touchend', e => { e.preventDefault(); onUp(); });
    el.addEventListener('mousedown', e => { e.preventDefault(); onDown(); });
    el.addEventListener('mouseup', e => { e.preventDefault(); onUp(); });
  };

  bindTouch('touch-left', () => keys.left = true, () => keys.left = false);
  bindTouch('touch-right', () => keys.right = true, () => keys.right = false);
  bindTouch('touch-jump', () => keys.jump = true, () => keys.jump = false);
  bindTouch('touch-fire', () => { keys.action = true; shootFire(); }, () => keys.action = false);

  // Button Listeners
  btnStart.addEventListener('click', () => {
    startOverlay.classList.add('hidden');
    gameState = 'playing';
    sfx.init();
    sfx.playMusic(level.theme);
    if (!timerTimer) {
      timerTimer = setInterval(() => {
        if (gameState === 'playing') {
          timeLeft--;
          updateHUD();
          if (timeLeft <= 0) die();
        }
      }, 1000);
    }
  });

  btnRestart.addEventListener('click', () => {
    gameoverOverlay.classList.add('hidden');
    lives = 3;
    score = 0;
    coins = 0;
    loadLevel(1);
    gameState = 'playing';
  });

  btnPlayAgain.addEventListener('click', () => {
    victoryOverlay.classList.add('hidden');
    lives = 3;
    score = 0;
    coins = 0;
    loadLevel(1);
    gameState = 'playing';
  });

  btnSound.addEventListener('click', () => {
    sfx.muted = !sfx.muted;
    btnSound.textContent = sfx.muted ? '🔇 Ses: KAPALI' : '🔊 Ses: AÇIK';
  });

  btnMusic.addEventListener('click', () => {
    sfx.musicOn = !sfx.musicOn;
    btnMusic.textContent = sfx.musicOn ? '🎵 Müzik: AÇIK' : '🎵 Müzik: KAPALI';
    if (!sfx.musicOn) sfx.stopMusic();
    else sfx.playMusic(level.theme);
  });

  // Level selector buttons
  document.querySelectorAll('.level-jump-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const l = parseInt(btn.getAttribute('data-level'), 10);
      loadLevel(l);
      startOverlay.classList.add('hidden');
      gameoverOverlay.classList.add('hidden');
      victoryOverlay.classList.add('hidden');
      gameState = 'playing';
    });
  });

  // Initialize
  loadLevel(1);
  gameLoop();
})();
