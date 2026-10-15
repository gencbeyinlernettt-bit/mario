/**
 * Core Mario Game Engine: Physics, Collisions, Enemies, Boss Fight, and State
 */

import { Player, Enemy, Block, Item, Projectile, FloatingText, Particle, Princess, FlagPole, LevelConfig, GameState } from './types';
import { createLevel } from './levels';
import { audio } from './audioEngine';

export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onCoinsChange?: (coins: number) => void;
  onLivesChange?: (lives: number) => void;
  onTimeChange?: (time: number) => void;
  onLevelChange?: (level: number, name: string) => void;
  onStateChange?: (state: GameState) => void;
  onVictory?: () => void;
}

export class MarioGameEngine {
  public state: GameState = 'title';
  public currentLevelNum: number = 1;
  public level!: LevelConfig;
  public player!: Player;
  public items: Item[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  
  public cameraX: number = 0;
  public score: number = 0;
  public coins: number = 0;
  public lives: number = 3;
  public timeLeft: number = 300;
  public animTick: number = 0;

  // Key states
  public keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    jump: false,
    action: false // run fast or shoot fireball
  };

  private callbacks: GameCallbacks;
  private timerInterval: number | null = null;
  private isBridgeCollapsing: boolean = false;
  private bridgeCollapseTimer: number = 0;
  private cutsceneStep: number = 0;
  private cutsceneTimer: number = 0;

  constructor(callbacks: GameCallbacks = {}) {
    this.callbacks = callbacks;
    this.initLevel(1);
  }

  public initLevel(levelNum: number) {
    this.currentLevelNum = levelNum;
    this.level = createLevel(levelNum);
    this.timeLeft = this.level.timeLimit;
    this.cameraX = 0;
    this.items = [];
    this.projectiles = [];
    this.particles = [];
    this.floatingTexts = [];
    this.isBridgeCollapsing = false;
    this.bridgeCollapseTimer = 0;
    this.cutsceneStep = 0;
    this.cutsceneTimer = 0;

    // Reset player
    this.player = {
      x: this.level.startX,
      y: this.level.startY,
      vx: 0,
      vy: 0,
      width: 24,
      height: 30,
      isGrounded: false,
      facing: 'right',
      form: this.player?.form && this.player.form !== 'small' ? this.player.form : 'small',
      isInvincible: false,
      invincibleTimer: 0,
      isJumping: false,
      animFrame: 0,
      animTimer: 0,
      crouching: false
    };

    if (this.player.form !== 'small') {
      this.player.height = 42;
    }

    this.callbacks.onLevelChange?.(this.currentLevelNum, this.level.name);
    this.callbacks.onLivesChange?.(this.lives);
    this.callbacks.onCoinsChange?.(this.coins);
    this.callbacks.onScoreChange?.(this.score);
    this.callbacks.onTimeChange?.(this.timeLeft);

    audio.playTheme(this.level.theme);
  }

  public start() {
    this.state = 'playing';
    this.callbacks.onStateChange?.('playing');
    this.startTimer();
    audio.playTheme(this.level.theme);
  }

  public pause() {
    if (this.state === 'playing') {
      this.state = 'paused';
      this.callbacks.onStateChange?.('paused');
      this.stopTimer();
      audio.stopMusic();
    } else if (this.state === 'paused') {
      this.state = 'playing';
      this.callbacks.onStateChange?.('playing');
      this.startTimer();
      audio.playTheme(this.level.theme);
    }
  }

  public restartGame() {
    this.lives = 3;
    this.score = 0;
    this.coins = 0;
    this.initLevel(1);
    this.start();
  }

  public restartLevel() {
    this.initLevel(this.currentLevelNum);
    this.start();
  }

  public nextLevel() {
    if (this.currentLevelNum < 3) {
      this.initLevel(this.currentLevelNum + 1);
      this.start();
    }
  }

  public warpToLevel(lvl: number) {
    if (lvl >= 1 && lvl <= 3) {
      this.initLevel(lvl);
      this.start();
    }
  }

  private startTimer() {
    this.stopTimer();
    this.timerInterval = window.setInterval(() => {
      if (this.state === 'playing') {
        this.timeLeft--;
        this.callbacks.onTimeChange?.(this.timeLeft);
        if (this.timeLeft <= 0) {
          this.handlePlayerDeath();
        }
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // Shoot fireball if Mario is Fire Mario
  public shootFireball() {
    if (this.player.form !== 'fire' || this.state !== 'playing') return;
    // Limit to max 2 active fireballs
    const activeFireballs = this.projectiles.filter((p) => p.fromPlayer);
    if (activeFireballs.length >= 2) return;

    audio.fireball();
    this.projectiles.push({
      id: Date.now() + Math.random(),
      x: this.player.facing === 'right' ? this.player.x + this.player.width + 4 : this.player.x - 4,
      y: this.player.y + 16,
      vx: this.player.facing === 'right' ? 6.5 : -6.5,
      vy: 2,
      radius: 6,
      fromPlayer: true,
      life: 140
    });
  }

  // Update Game Loop (called every requestAnimationFrame)
  public update() {
    this.animTick++;

    if (this.state === 'playing') {
      this.updatePlayer();
      this.updateMovingPlatforms();
      this.updateEnemies();
      this.updateItems();
      this.updateProjectiles();
      this.updateParticles();
      this.updateFloatingTexts();
      this.updateBlocks();
      this.updateBossBridge();
      this.updateCamera();
    } else if (this.state === 'levelClear') {
      this.updateLevelClearCutscene();
      this.updateParticles();
      this.updateCamera();
    } else if (this.state === 'gameVictory') {
      this.updatePrincessCutscene();
      this.updateParticles();
      this.updateFloatingTexts();
    }
  }

  // Player physics and input
  private updatePlayer() {
    const p = this.player;

    // Horizontal movement
    const maxSpeed = this.keys.action ? 4.5 : 3.0;
    const accel = 0.35;
    const friction = 0.82;

    if (this.keys.left && !this.keys.right) {
      p.vx = Math.max(-maxSpeed, p.vx - accel);
      p.facing = 'left';
    } else if (this.keys.right && !this.keys.left) {
      p.vx = Math.min(maxSpeed, p.vx + accel);
      p.facing = 'right';
    } else {
      p.vx *= friction;
      if (Math.abs(p.vx) < 0.05) p.vx = 0;
    }

    // Walking animation
    if (Math.abs(p.vx) > 0.2) {
      p.animTimer += Math.abs(p.vx) * 0.15;
      p.animFrame = p.animTimer;
    } else {
      p.animFrame = 0;
    }

    // Jumping
    if (this.keys.jump && p.isGrounded) {
      p.vy = -10.5;
      p.isGrounded = false;
      p.isJumping = true;
      audio.jump(p.form !== 'small');
    }

    // Variable jump height
    if (!this.keys.jump && p.vy < -4) {
      p.vy *= 0.7; // release jump early for shorter jump
    }

    // Gravity
    p.vy += 0.48;
    if (p.vy > 9.5) p.vy = 9.5;

    // Invincibility countdown
    if (p.isInvincible) {
      p.invincibleTimer--;
      if (p.invincibleTimer <= 0) {
        p.isInvincible = false;
      }
    }

    // Horizontal collision
    p.x += p.vx;
    this.handleHorizontalBlockCollisions(p);

    // Keep within world bounds
    if (p.x < 0) {
      p.x = 0;
      p.vx = 0;
    }
    if (p.x > this.level.width - p.width) {
      p.x = this.level.width - p.width;
      p.vx = 0;
    }

    // Vertical collision
    p.y += p.vy;
    p.isGrounded = false;
    this.handleVerticalBlockCollisions(p);

    // Fall in pit or lava
    if (p.y > 440) {
      this.handlePlayerDeath();
      return;
    }

    // Check Flagpole collision (Level 1 & 2)
    if (this.level.flagPole && !this.level.flagPole.isTriggered) {
      const pole = this.level.flagPole;
      if (p.x + p.width >= pole.x && p.x <= pole.x + 10 && p.y + p.height >= pole.y && p.y <= pole.y + pole.height) {
        this.triggerLevelClear();
      }
    }

    // Check Golden Axe collision in Level 3 (Boss bridge)
    if (this.level.id === 3 && !this.isBridgeCollapsing) {
      const axe = this.level.blocks.find((b) => b.type === 'axe');
      if (axe && this.checkOverlap(p, axe)) {
        this.triggerBossBridgeCollapse();
      }
    }

    // Check Princess Peach trigger in Level 3
    if (this.level.princess && !this.level.princess.isRescued) {
      const pr = this.level.princess;
      if (p.x + p.width >= pr.x - 30) {
        this.triggerPrincessRescue();
      }
    }
  }

  // Moving platforms
  private updateMovingPlatforms() {
    this.level.blocks.forEach((b) => {
      if (b.type !== 'moving_platform') return;

      const prevX = b.x;
      const prevY = b.y;

      if (b.isVertical) {
        b.y += (b.moveSpeed || 1) * (b.moveDir || 1);
        if (b.y < (b.startY || 100)) {
          b.y = b.startY || 100;
          b.moveDir = 1;
        } else if (b.y > (b.endY || 350)) {
          b.y = b.endY || 350;
          b.moveDir = -1;
        }
      } else {
        b.x += (b.moveSpeed || 1) * (b.moveDir || 1);
        if (b.x < (b.startX || 100)) {
          b.x = b.startX || 100;
          b.moveDir = 1;
        } else if (b.x > (b.endX || 300)) {
          b.x = b.endX || 300;
          b.moveDir = -1;
        }
      }

      // Carry player if standing on it
      if (this.player.isGrounded && this.checkStandingOn(this.player, b)) {
        this.player.x += b.x - prevX;
        this.player.y += b.y - prevY;
      }
    });
  }

  private checkStandingOn(p: Player, b: Block): boolean {
    return p.x + p.width > b.x && p.x < b.x + b.width && Math.abs(p.y + p.height - b.y) <= 4;
  }

  // Block updates (bump return)
  private updateBlocks() {
    this.level.blocks.forEach((b) => {
      if (b.bumpOffset && b.bumpOffset > 0) {
        b.bumpOffset -= 1.5;
        if (b.bumpOffset < 0) b.bumpOffset = 0;
      }
    });
  }

  // Horizontal Block Collision
  private handleHorizontalBlockCollisions(p: Player) {
    for (const b of this.level.blocks) {
      if (b.type === 'lava' || b.type === 'axe' || b.type === 'moving_platform') continue;
      if (this.checkOverlap(p, b)) {
        if (p.vx > 0) {
          p.x = b.x - p.width;
          p.vx = 0;
        } else if (p.vx < 0) {
          p.x = b.x + b.width;
          p.vx = 0;
        }
      }
    }
  }

  // Vertical Block Collision
  private handleVerticalBlockCollisions(p: Player) {
    for (const b of this.level.blocks) {
      if (b.type === 'lava') {
        if (this.checkOverlap(p, b)) {
          this.handlePlayerDeath();
          return;
        }
        continue;
      }
      if (b.type === 'axe') continue;

      if (this.checkOverlap(p, b)) {
        if (p.vy > 0) {
          // Landing on top of block
          p.y = b.y - p.height;
          p.vy = 0;
          p.isGrounded = true;
          p.isJumping = false;
        } else if (p.vy < 0) {
          // Hitting block from below
          p.y = b.y + b.height;
          p.vy = 0;
          this.bumpBlock(b);
        }
      }
    }
  }

  // Mario hits block from underneath
  private bumpBlock(b: Block) {
    b.bumpOffset = 8;

    if (b.type === 'question_coin') {
      b.type = 'empty';
      audio.coin();
      this.addCoins(1);
      this.addScore(200, b.x + 8, b.y - 16);
      this.spawnCoinParticle(b.x + 10, b.y - 20);
    } else if (b.type === 'question_mushroom') {
      b.type = 'empty';
      audio.powerupAppear();
      this.spawnItem('mushroom', b.x, b.y - 32);
    } else if (b.type === 'question_flower') {
      b.type = 'empty';
      audio.powerupAppear();
      this.spawnItem('fireflower', b.x, b.y - 32);
    } else if (b.type === 'brick') {
      if (this.player.form !== 'small') {
        // Super/Fire Mario destroys brick!
        audio.breakBrick();
        this.addScore(50, b.x + 8, b.y);
        this.spawnBrickFragments(b.x, b.y);
        // Remove block
        this.level.blocks = this.level.blocks.filter((block) => block !== b);
      } else {
        audio.bump();
      }
    } else {
      audio.bump();
    }
  }

  // Spawn Items
  private spawnItem(type: 'mushroom' | 'fireflower', x: number, y: number) {
    this.items.push({
      id: Date.now() + Math.random(),
      type,
      x,
      y,
      vx: type === 'mushroom' ? 1.5 : 0,
      vy: -2,
      width: 24,
      height: 24,
      collected: false
    });
  }

  // Update Items
  private updateItems() {
    this.items.forEach((it) => {
      if (it.collected) return;

      // Item physics (mushroom walks and falls)
      if (it.type === 'mushroom') {
        it.vy += 0.35;
        it.x += it.vx;
        // Collision with blocks
        for (const b of this.level.blocks) {
          if (b.type === 'lava' || b.type === 'axe') continue;
          if (this.checkOverlap(it, b)) {
            it.vx = -it.vx;
            break;
          }
        }
        it.y += it.vy;
        for (const b of this.level.blocks) {
          if (b.type === 'lava' || b.type === 'axe') continue;
          if (this.checkOverlap(it, b)) {
            if (it.vy > 0) {
              it.y = b.y - it.height;
              it.vy = 0;
            }
          }
        }
      }

      // Check collision with player
      if (this.checkOverlap(this.player, it)) {
        it.collected = true;
        audio.powerupCollect();

        if (it.type === 'mushroom') {
          this.addScore(1000, it.x, it.y);
          if (this.player.form === 'small') {
            this.player.form = 'super';
            this.player.height = 42;
            this.player.y -= 12;
          }
        } else if (it.type === 'fireflower') {
          this.addScore(1000, it.x, it.y);
          this.player.form = 'fire';
          this.player.height = 42;
        }
      }
    });

    this.items = this.items.filter((it) => !it.collected);
  }

  // Update Projectiles (Player Fireballs & Bowser Fireballs)
  private updateProjectiles() {
    this.projectiles.forEach((p) => {
      p.x += p.vx;
      p.vy += 0.25;
      p.y += p.vy;
      p.life--;

      // Bounce on ground blocks
      for (const b of this.level.blocks) {
        if (b.type === 'lava' || b.type === 'axe') continue;
        if (
          p.x + p.radius > b.x &&
          p.x - p.radius < b.x + b.width &&
          p.y + p.radius > b.y &&
          p.y - p.radius < b.y + b.height
        ) {
          if (p.vy > 0) {
            p.y = b.y - p.radius;
            p.vy = -3.5; // bounce!
          } else {
            p.life = 0; // hit side or ceiling
          }
        }
      }

      // Hit enemies
      if (p.fromPlayer) {
        for (const e of this.level.enemies) {
          if (!e.isAlive) continue;
          if (
            p.x + p.radius > e.x &&
            p.x - p.radius < e.x + e.width &&
            p.y + p.radius > e.y &&
            p.y - p.radius < e.y + e.height
          ) {
            p.life = 0;
            if (e.type === 'bowser') {
              e.health = (e.health || 4) - 1;
              audio.stomp();
              this.addScore(500, e.x, e.y);
              if (e.health <= 0) {
                this.triggerBossBridgeCollapse();
              }
            } else {
              e.isAlive = false;
              audio.kick();
              this.addScore(200, e.x, e.y);
              this.spawnEnemyDefeatParticle(e.x, e.y);
            }
            break;
          }
        }
      } else {
        // Hit Mario
        if (
          !this.player.isInvincible &&
          p.x + p.radius > this.player.x &&
          p.x - p.radius < this.player.x + this.player.width &&
          p.y + p.radius > this.player.y &&
          p.y - p.radius < this.player.y + this.player.height
        ) {
          p.life = 0;
          this.hurtPlayer();
        }
      }
    });

    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.x > 0 && p.x < this.level.width);
  }

  // Update Enemies (AI, Goombas, Koopas, Piranhas, Bowser)
  private updateEnemies() {
    this.level.enemies.forEach((e) => {
      if (!e.isAlive && !e.isSquished) return;

      // Squished timer
      if (e.isSquished) {
        e.squishTimer = (e.squishTimer || 0) - 1;
        if (e.squishTimer <= 0) {
          e.isAlive = false;
          e.isSquished = false;
        }
        return;
      }

      // Activate enemies when near camera
      if (e.x > this.cameraX + 750 || e.x < this.cameraX - 150) return;

      switch (e.type) {
        case 'goomba': {
          e.vy += 0.4;
          e.x += e.vx;

          // Turn around on block collision
          for (const b of this.level.blocks) {
            if (b.type === 'lava' || b.type === 'axe') continue;
            if (this.checkOverlap(e, b)) {
              if (e.vx > 0) {
                e.x = b.x - e.width;
                e.vx = -Math.abs(e.vx);
                e.facing = 'left';
              } else {
                e.x = b.x + b.width;
                e.vx = Math.abs(e.vx);
                e.facing = 'right';
              }
            }
          }

          e.y += e.vy;
          for (const b of this.level.blocks) {
            if (b.type === 'lava' || b.type === 'axe') continue;
            if (this.checkOverlap(e, b)) {
              if (e.vy > 0) {
                e.y = b.y - e.height;
                e.vy = 0;
              }
            }
          }
          break;
        }

        case 'koopa': {
          e.vy += 0.4;
          e.x += e.vx;

          // Shell movement or walking
          for (const b of this.level.blocks) {
            if (b.type === 'lava' || b.type === 'axe') continue;
            if (this.checkOverlap(e, b)) {
              if (e.vx > 0) {
                e.x = b.x - e.width;
                e.vx = -Math.abs(e.vx);
                e.facing = 'left';
              } else {
                e.x = b.x + b.width;
                e.vx = Math.abs(e.vx);
                e.facing = 'right';
              }
            }
          }

          e.y += e.vy;
          for (const b of this.level.blocks) {
            if (b.type === 'lava' || b.type === 'axe') continue;
            if (this.checkOverlap(e, b)) {
              if (e.vy > 0) {
                e.y = b.y - e.height;
                e.vy = 0;
              }
            }
          }

          // If fast moving shell, crush other enemies!
          if (e.isShell && Math.abs(e.vx) > 2) {
            for (const other of this.level.enemies) {
              if (other !== e && other.isAlive && this.checkOverlap(e, other)) {
                other.isAlive = false;
                audio.kick();
                this.addScore(400, other.x, other.y);
                this.spawnEnemyDefeatParticle(other.x, other.y);
              }
            }
          }
          break;
        }

        case 'piranha': {
          // Snapping up and down
          const cycle = Math.sin(this.animTick * 0.04);
          if (e.startY !== undefined && e.targetY !== undefined) {
            e.y = e.startY + (e.targetY - e.startY) * Math.max(0, cycle);
          }
          break;
        }

        case 'podoboo': {
          // Jumping fireball from lava
          e.vy += 0.22;
          e.y += e.vy;
          if (e.startY && e.y > e.startY + 40) {
            e.y = e.startY;
            e.vy = -7.5; // leap again!
          }
          break;
        }

        case 'bowser': {
          // Final Boss AI:
          // Patrolling the bridge, jumping, breathing fire
          e.attackTimer = (e.attackTimer || 0) + 1;
          e.jumpTimer = (e.jumpTimer || 0) + 1;

          // Patrol range (1980 to 2260)
          e.x += e.vx;
          if (e.x < 2000) {
            e.vx = 0.8;
            e.facing = 'right';
          } else if (e.x > 2280) {
            e.vx = -0.8;
            e.facing = 'left';
          }

          // Face player
          if (this.player.x < e.x) {
            e.facing = 'left';
          } else {
            e.facing = 'right';
          }

          // Heavy jump
          if (e.jumpTimer > 120 && e.vy === 0) {
            e.vy = -5.5;
            e.jumpTimer = 0;
          }

          e.vy += 0.35;
          e.y += e.vy;

          // Bridge ground collision for Bowser
          for (const b of this.level.blocks) {
            if (b.type === 'bridge_tile' || b.type === 'castle_brick') {
              if (this.checkOverlap(e, b) && e.vy > 0) {
                e.y = b.y - e.height;
                e.vy = 0;
              }
            }
          }

          // Shoot Fireball towards Mario
          if (e.attackTimer > 100) {
            e.attackTimer = 0;
            audio.fireball();
            this.projectiles.push({
              id: Date.now() + Math.random(),
              x: e.facing === 'left' ? e.x - 8 : e.x + e.width + 8,
              y: e.y + 24,
              vx: e.facing === 'left' ? -4.2 : 4.2,
              vy: 0,
              radius: 9,
              fromPlayer: false,
              life: 180
            });
          }
          break;
        }
      }

      // Check collision between Player and Enemy
      if (this.checkOverlap(this.player, e)) {
        this.handlePlayerEnemyCollision(e);
      }
    });
  }

  // Handle Mario vs Enemy Collision
  private handlePlayerEnemyCollision(e: Enemy) {
    const p = this.player;

    // Mario stomps on top of enemy!
    const isStomping = p.vy > 0 && p.y + p.height - p.vy <= e.y + 16;

    if (isStomping) {
      if (e.type === 'goomba') {
        e.isSquished = true;
        e.squishTimer = 30;
        p.vy = -7.5; // bounce Mario up!
        audio.stomp();
        this.addScore(100, e.x, e.y);
      } else if (e.type === 'koopa') {
        if (!e.isShell) {
          // Retreat into shell
          e.isShell = true;
          e.vx = 0;
          e.height = 24;
          p.vy = -7.5;
          audio.stomp();
          this.addScore(100, e.x, e.y);
        } else {
          // Kick the shell!
          e.vx = p.x < e.x ? 6.5 : -6.5;
          p.vy = -6;
          audio.kick();
          this.addScore(400, e.x, e.y);
        }
      } else if (e.type === 'bowser') {
        // Bounce off Bowser but Bowser takes 1 damage
        p.vy = -8.5;
        e.health = (e.health || 4) - 1;
        audio.stomp();
        this.addScore(500, e.x, e.y);
        if (e.health <= 0) {
          this.triggerBossBridgeCollapse();
        }
      } else {
        // Piranha / Podoboo cannot be stomped!
        this.hurtPlayer();
      }
    } else {
      // Side/bottom hit
      if (e.type === 'koopa' && e.isShell && e.vx === 0) {
        // Stationary shell: kick it!
        e.vx = p.x < e.x ? 6.5 : -6.5;
        audio.kick();
      } else {
        this.hurtPlayer();
      }
    }
  }

  // Mario takes damage
  private hurtPlayer() {
    if (this.player.isInvincible) return;

    if (this.player.form === 'fire') {
      this.player.form = 'super';
      this.player.isInvincible = true;
      this.player.invincibleTimer = 90;
      audio.pipeOrHurt();
    } else if (this.player.form === 'super') {
      this.player.form = 'small';
      this.player.height = 30;
      this.player.isInvincible = true;
      this.player.invincibleTimer = 90;
      audio.pipeOrHurt();
    } else {
      // Small Mario dies
      this.handlePlayerDeath();
    }
  }

  // Player death
  private handlePlayerDeath() {
    if (this.state === 'gameOver') return;
    audio.die();
    this.lives--;
    this.callbacks.onLivesChange?.(this.lives);

    if (this.lives <= 0) {
      this.state = 'gameOver';
      this.stopTimer();
      this.callbacks.onStateChange?.('gameOver');
    } else {
      this.restartLevel();
    }
  }

  // Trigger Boss Bridge Collapse (Axe cut or Bowser HP = 0)
  public triggerBossBridgeCollapse() {
    if (this.isBridgeCollapsing) return;
    this.isBridgeCollapsing = true;
    this.bridgeCollapseTimer = 0;
    audio.bowserFall();

    // Spawn rubble particles at axe
    const axe = this.level.blocks.find((b) => b.type === 'axe');
    if (axe) {
      this.spawnBrickFragments(axe.x, axe.y);
      this.level.blocks = this.level.blocks.filter((b) => b !== axe);
    }
  }

  // Bridge collapsing block by block
  private updateBossBridge() {
    if (!this.isBridgeCollapsing) return;
    this.bridgeCollapseTimer++;

    if (this.bridgeCollapseTimer % 6 === 0) {
      // Find rightmost bridge tile
      const bridgeTiles = this.level.blocks.filter((b) => b.type === 'bridge_tile');
      if (bridgeTiles.length > 0) {
        // Sort descending
        bridgeTiles.sort((a, b) => b.x - a.x);
        const tileToRemove = bridgeTiles[0];
        this.spawnBrickFragments(tileToRemove.x, tileToRemove.y);
        this.level.blocks = this.level.blocks.filter((b) => b !== tileToRemove);
      } else {
        // All bridge tiles collapsed, drop Bowser into lava!
        const bowser = this.level.enemies.find((e) => e.type === 'bowser');
        if (bowser && bowser.isAlive) {
          bowser.vy = 8;
          bowser.y += bowser.vy;
          if (bowser.y > 480) {
            bowser.isAlive = false;
            this.addScore(5000, 2300, 300);
          }
        }
      }
    }
  }

  // Level Clear (Flagpole for Level 1 & 2)
  private triggerLevelClear() {
    this.state = 'levelClear';
    this.callbacks.onStateChange?.('levelClear');
    audio.stageClear();
    this.stopTimer();
    this.cutsceneStep = 0;
    this.cutsceneTimer = 0;

    if (this.level.flagPole) {
      this.level.flagPole.isTriggered = true;
    }
  }

  // Level Clear Flagpole animation
  private updateLevelClearCutscene() {
    this.cutsceneTimer++;
    const pole = this.level.flagPole;

    if (this.cutsceneStep === 0) {
      // Flag slides down
      if (pole && pole.flagY < pole.y + pole.height - 24) {
        pole.flagY += 3;
      }
      // Mario slides down pole
      if (pole && this.player.y < pole.y + pole.height - this.player.height) {
        this.player.y += 3;
      } else {
        this.cutsceneStep = 1;
        this.cutsceneTimer = 0;
      }
    } else if (this.cutsceneStep === 1) {
      // Mario walks right into castle
      this.player.vx = 2.2;
      this.player.facing = 'right';
      this.player.x += this.player.vx;
      this.player.animFrame += 0.2;

      if (this.player.x >= this.level.castleX + 45) {
        this.cutsceneStep = 2;
        this.cutsceneTimer = 0;
      }
    } else if (this.cutsceneStep === 2) {
      // Wait a moment then load next level
      if (this.cutsceneTimer > 70) {
        if (this.currentLevelNum < 3) {
          this.nextLevel();
        }
      }
    }
  }

  // Princess Peach Rescue Trigger!
  public triggerPrincessRescue() {
    if (this.state === 'gameVictory') return;
    this.state = 'gameVictory';
    this.callbacks.onStateChange?.('gameVictory');
    this.stopTimer();
    audio.victoryFanfare();

    if (this.level.princess) {
      this.level.princess.isRescued = true;
    }

    this.addScore(10000, this.level.princess?.x || 2750, 300);
    this.callbacks.onVictory?.();
  }

  // Princess Peach Cutscene
  private updatePrincessCutscene() {
    this.cutsceneTimer++;
    const pr = this.level.princess;

    // Mario walks up close to Princess
    if (pr && this.player.x < pr.x - 36) {
      this.player.x += 1.2;
      this.player.facing = 'right';
      this.player.animFrame += 0.15;
    }

    // Spawn celebratory floating hearts & confetti particles
    if (this.cutsceneTimer % 15 === 0 && pr) {
      this.spawnHeartParticle(pr.x + 16, pr.y - 20);
      this.spawnConfettiParticles(pr.x, pr.y - 40);
    }
  }

  // Camera Smooth Following
  private updateCamera() {
    const targetCameraX = this.player.x - 280;
    this.cameraX += (targetCameraX - this.cameraX) * 0.12;

    if (this.cameraX < 0) this.cameraX = 0;
    if (this.cameraX > this.level.width - 800) {
      this.cameraX = this.level.width - 800;
    }
  }

  // Helper: AABB overlap check
  private checkOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  // Add Score with floating text
  public addScore(amount: number, x: number, y: number) {
    this.score += amount;
    this.callbacks.onScoreChange?.(this.score);
    this.floatingTexts.push({
      id: Date.now() + Math.random(),
      text: `+${amount}`,
      x,
      y,
      opacity: 1,
      vy: -1.2
    });
  }

  // Add Coins (100 coins = 1UP)
  public addCoins(count: number = 1) {
    this.coins += count;
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      this.callbacks.onLivesChange?.(this.lives);
      audio.powerupCollect();
      this.floatingTexts.push({
        id: Date.now(),
        text: '1UP!',
        x: this.player.x,
        y: this.player.y - 20,
        opacity: 1,
        vy: -1.5
      });
    }
    this.callbacks.onCoinsChange?.(this.coins);
  }

  // Spawn visual particles
  private spawnCoinParticle(x: number, y: number) {
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 4 - 2,
        color: '#facc15',
        size: 4,
        life: 25,
        maxLife: 25
      });
    }
  }

  private spawnBrickFragments(x: number, y: number) {
    const pieces = [
      { vx: -2.5, vy: -6 },
      { vx: 2.5, vy: -6 },
      { vx: -2, vy: -3 },
      { vx: 2, vy: -3 }
    ];
    pieces.forEach((p) => {
      this.particles.push({
        x: x + 8,
        y: y + 8,
        vx: p.vx,
        vy: p.vy,
        color: '#b84418',
        size: 7,
        life: 40,
        maxLife: 40
      });
    });
  }

  private spawnEnemyDefeatParticle(x: number, y: number) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: -Math.random() * 5 - 1,
        color: '#fbbf24',
        size: 5,
        life: 30,
        maxLife: 30
      });
    }
  }

  private spawnHeartParticle(x: number, y: number) {
    this.floatingTexts.push({
      id: Date.now() + Math.random(),
      text: '💖',
      x: x + (Math.random() - 0.5) * 30,
      y,
      opacity: 1,
      vy: -1.2
    });
  }

  private spawnConfettiParticles(x: number, y: number) {
    const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    for (let i = 0; i < 12; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 60,
        y: y + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: Math.random() * 5 + 3,
        life: 50,
        maxLife: 50
      });
    }
  }

  private updateParticles() {
    this.particles.forEach((pt) => {
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.25; // gravity on particles
      pt.life--;
    });
    this.particles = this.particles.filter((pt) => pt.life > 0);
  }

  private updateFloatingTexts() {
    this.floatingTexts.forEach((ft) => {
      ft.y += ft.vy;
      ft.opacity -= 0.02;
    });
    this.floatingTexts = this.floatingTexts.filter((ft) => ft.opacity > 0);
  }
}
