/**
 * High-performance 2D Pixel Art Canvas Renderer
 * Renders Mario, Enemies, Bowser Boss, Princess Peach, Blocks, and FX.
 */

import { Player, Enemy, Block, Item, Projectile, FloatingText, Particle, Princess, FlagPole, LevelConfig } from './types';

export class GameRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public setDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  // Clear and render background according to level theme
  public renderBackground(level: LevelConfig, cameraX: number, animTick: number) {
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    if (level.theme === 'overworld') {
      // Sunny sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#5c94fc');
      skyGrad.addColorStop(0.8, '#91b9fc');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h);

      // Clouds (slow parallax)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      const cloudOffset = (cameraX * 0.2) % 400;
      for (let x = -cloudOffset; x < w + 200; x += 220) {
        this.drawCloud(x, 40);
        this.drawCloud(x + 110, 85, 0.7);
      }

      // Distant green hills (medium parallax)
      const hillOffset = (cameraX * 0.4) % 350;
      for (let x = -hillOffset - 100; x < w + 100; x += 280) {
        ctx.fillStyle = '#00a800';
        ctx.beginPath();
        ctx.ellipse(x + 100, 380, 140, 80, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#008800';
        ctx.beginPath();
        ctx.ellipse(x + 100, 380, 135, 75, 0, Math.PI, 0);
        ctx.stroke();
      }

      // Bushes
      const bushOffset = (cameraX * 0.7) % 260;
      for (let x = -bushOffset; x < w + 100; x += 240) {
        ctx.fillStyle = '#00d800';
        ctx.beginPath();
        ctx.arc(x + 30, 370, 18, 0, Math.PI * 2);
        ctx.arc(x + 55, 365, 22, 0, Math.PI * 2);
        ctx.arc(x + 80, 370, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (level.theme === 'underground') {
      // Dark cavern
      const cavernGrad = ctx.createLinearGradient(0, 0, 0, h);
      cavernGrad.addColorStop(0, '#060610');
      cavernGrad.addColorStop(1, '#11152a');
      ctx.fillStyle = cavernGrad;
      ctx.fillRect(0, 0, w, h);

      // Stalactites in background
      ctx.fillStyle = '#1c223d';
      const caveOffset = (cameraX * 0.3) % 200;
      for (let x = -caveOffset; x < w + 100; x += 80) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 25, 60 + Math.sin(x) * 20);
        ctx.lineTo(x + 50, 0);
        ctx.fill();
      }
    } else if (level.theme === 'castle') {
      // Dark fiery fortress
      const castleGrad = ctx.createLinearGradient(0, 0, 0, h);
      castleGrad.addColorStop(0, '#100303');
      castleGrad.addColorStop(0.7, '#240707');
      castleGrad.addColorStop(1, '#4a0f0f');
      ctx.fillStyle = castleGrad;
      ctx.fillRect(0, 0, w, h);

      // Stone brick background grid
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      for (let y = 0; y < h; y += 32) {
        ctx.fillRect(0, y, w, 2);
      }

      // Torches on castle wall
      const torchOffset = (cameraX * 0.8) % 180;
      for (let x = -torchOffset + 50; x < w; x += 180) {
        // Torch holder
        ctx.fillStyle = '#555';
        ctx.fillRect(x, 140, 6, 20);
        // Torch flame
        const flamePulse = Math.sin(animTick * 0.2 + x) * 4;
        ctx.fillStyle = '#ff4400';
        ctx.beginPath();
        ctx.arc(x + 3, 134 + flamePulse, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffea00';
        ctx.beginPath();
        ctx.arc(x + 3, 134 + flamePulse, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCloud(x: number, y: number, scale: number = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.arc(30, 20, 16, 0, Math.PI * 2);
    ctx.arc(50, 14, 20, 0, Math.PI * 2);
    ctx.arc(70, 18, 16, 0, Math.PI * 2);
    ctx.arc(90, 20, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Render Blocks
  public renderBlocks(blocks: Block[], cameraX: number, animTick: number) {
    const ctx = this.ctx;
    const w = this.canvasWidth;

    blocks.forEach((b) => {
      const screenX = b.x - cameraX;
      // Skip if off-screen
      if (screenX + b.width < -50 || screenX > w + 50) return;

      const y = b.y - (b.bumpOffset || 0);

      switch (b.type) {
        case 'ground':
          ctx.fillStyle = '#d0812b';
          ctx.fillRect(screenX, y, b.width, b.height);
          // Top grass/dirt line
          ctx.fillStyle = '#fcb040';
          ctx.fillRect(screenX, y, b.width, 4);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(screenX, y + b.height - 3, b.width, 3);
          break;

        case 'castle_brick':
          ctx.fillStyle = '#6b7280';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#374151';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 1, y + 1, b.width - 2, b.height - 2);
          ctx.fillStyle = '#9ca3af';
          ctx.fillRect(screenX + 3, y + 3, 6, 4);
          break;

        case 'brick':
          ctx.fillStyle = '#b84418';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#4a1500';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, y, b.width, b.height);
          // Brick pattern
          ctx.beginPath();
          ctx.moveTo(screenX, y + b.height / 2);
          ctx.lineTo(screenX + b.width, y + b.height / 2);
          ctx.moveTo(screenX + b.width / 2, y);
          ctx.lineTo(screenX + b.width / 2, y + b.height / 2);
          ctx.stroke();
          break;

        case 'question_coin':
        case 'question_mushroom':
        case 'question_flower': {
          const pulse = Math.sin(animTick * 0.1) * 2;
          ctx.fillStyle = '#f8b800';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#c47000';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX + 1, y + 1, b.width - 2, b.height - 2);

          // Draw '?' mark
          ctx.fillStyle = '#7a3900';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', screenX + b.width / 2, y + b.height / 2 + pulse * 0.5);
          break;
        }

        case 'empty':
          ctx.fillStyle = '#8a6442';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#422810';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, y, b.width, b.height);
          // Rivets
          ctx.fillStyle = '#301800';
          ctx.fillRect(screenX + 3, y + 3, 3, 3);
          ctx.fillRect(screenX + b.width - 6, y + 3, 3, 3);
          ctx.fillRect(screenX + 3, y + b.height - 6, 3, 3);
          ctx.fillRect(screenX + b.width - 6, y + b.height - 6, 3, 3);
          break;

        case 'moving_platform':
          ctx.fillStyle = '#eab308';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#a16207';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, y, b.width, b.height);
          // Chevron grip stripes
          ctx.fillStyle = '#713f12';
          for (let px = screenX + 6; px < screenX + b.width - 6; px += 12) {
            ctx.fillRect(px, y + 4, 4, b.height - 8);
          }
          break;

        case 'pipe_top_left':
        case 'pipe_top_right':
        case 'pipe_left':
        case 'pipe_right': {
          const isTop = b.type.includes('top');
          const isRight = b.type.includes('right');
          ctx.fillStyle = isRight ? '#00a800' : '#80d010';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#005000';
          ctx.lineWidth = 2;
          if (isTop) {
            ctx.strokeRect(screenX, y, b.width, b.height);
          } else {
            ctx.strokeRect(screenX, y, b.width, b.height);
          }
          break;
        }

        case 'bridge_tile':
          ctx.fillStyle = '#d97706';
          ctx.fillRect(screenX, y, b.width, b.height);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 2;
          ctx.strokeRect(screenX, y, b.width, b.height);
          // Rope link
          ctx.fillStyle = '#b45309';
          ctx.fillRect(screenX + 4, y + 2, b.width - 8, 4);
          break;

        case 'axe': {
          // The golden axe to cut Bowser's bridge!
          const axGlow = Math.sin(animTick * 0.15) * 3;
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(screenX + 4, y, 6, b.height);
          // Axe head
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(screenX + 10, y + 6);
          ctx.lineTo(screenX + 26 + axGlow, y + 2);
          ctx.lineTo(screenX + 26 + axGlow, y + 22);
          ctx.lineTo(screenX + 10, y + 16);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = '#b45309';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }

        case 'lava': {
          const wave = Math.sin(animTick * 0.1 + b.x * 0.05) * 4;
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(screenX, y + wave, b.width, b.height);
          ctx.fillStyle = '#fbbf24';
          ctx.fillRect(screenX, y + wave, b.width, 6);
          // Bubbles
          if ((Math.floor(animTick * 0.05 + b.x) % 7) === 0) {
            ctx.beginPath();
            ctx.arc(screenX + 12, y + wave - 3, 5, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
      }
    });
  }

  // Render Flagpole & Castle for level exit
  public renderFlagPole(pole: FlagPole | undefined, castleX: number, cameraX: number, animTick: number) {
    const ctx = this.ctx;
    if (pole) {
      const screenX = pole.x - cameraX;
      // Pole shaft
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(screenX, pole.y, 6, pole.height);
      // Golden sphere on top
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(screenX + 3, pole.y, 8, 0, Math.PI * 2);
      ctx.fill();

      // Flag
      const flagWave = Math.sin(animTick * 0.15) * 3;
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.moveTo(screenX + 6, pole.flagY);
      ctx.lineTo(screenX + 34 + flagWave, pole.flagY + 12);
      ctx.lineTo(screenX + 6, pole.flagY + 24);
      ctx.closePath();
      ctx.fill();
    }

    // Small Castle
    const cScreenX = castleX - cameraX;
    if (cScreenX > -200 && cScreenX < this.canvasWidth + 200) {
      // Main wall
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cScreenX, 260, 110, 120);
      // Battlements
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(cScreenX + i * 30, 240, 20, 20);
      }
      // Gate
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(cScreenX + 55, 380, 22, 35, 0, Math.PI, 0);
      ctx.fill();
      // Roof flag
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cScreenX + 53, 215, 3, 25);
      ctx.beginPath();
      ctx.moveTo(cScreenX + 56, 215);
      ctx.lineTo(cScreenX + 75, 223);
      ctx.lineTo(cScreenX + 56, 231);
      ctx.fill();
    }
  }

  // Render Mario!
  public renderPlayer(player: Player, cameraX: number) {
    const ctx = this.ctx;
    const screenX = player.x - cameraX;
    const screenY = player.y;

    // Blink when invincible
    if (player.isInvincible && Math.floor(player.invincibleTimer / 4) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(screenX + player.width / 2, screenY + player.height / 2);
    if (player.facing === 'left') {
      ctx.scale(-1, 1);
    }

    const isSuper = player.form !== 'small';
    const isFire = player.form === 'fire';

    // Palette
    const capColor = isFire ? '#ffffff' : '#e52521';
    const shirtColor = isFire ? '#ffffff' : '#e52521';
    const overallsColor = isFire ? '#e52521' : '#0026a3';
    const skinColor = '#fcd0a1';
    const hairColor = '#6a3b00';
    const shoeColor = '#8b4513';

    const w = player.width;
    const h = player.height;

    // Body drawing based on state
    if (!isSuper) {
      // SMALL MARIO (16x24 approx)
      // Cap
      ctx.fillStyle = capColor;
      ctx.fillRect(-8, -h / 2, 16, 6);
      ctx.fillRect(-4, -h / 2 + 3, 16, 4); // visor

      // Face & hair
      ctx.fillStyle = hairColor;
      ctx.fillRect(-10, -h / 2 + 5, 5, 5);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-5, -h / 2 + 5, 12, 7);
      // Eye & mustache
      ctx.fillStyle = '#000000';
      ctx.fillRect(2, -h / 2 + 6, 2, 3);
      ctx.fillRect(0, -h / 2 + 10, 8, 3); // mustache

      // Shirt & Overalls
      const walkCycle = Math.floor(player.animFrame) % 3;
      ctx.fillStyle = shirtColor;
      ctx.fillRect(-7, -h / 2 + 12, 14, 6);
      ctx.fillStyle = overallsColor;
      ctx.fillRect(-6, -h / 2 + 16, 12, 6);

      // Legs / Feet
      ctx.fillStyle = shoeColor;
      if (!player.isGrounded) {
        // Jumping pose
        ctx.fillRect(-8, -h / 2 + 20, 6, 5);
        ctx.fillRect(2, -h / 2 + 18, 7, 5);
      } else if (Math.abs(player.vx) > 0.3) {
        if (walkCycle === 0) {
          ctx.fillRect(-8, -h / 2 + 21, 6, 4);
          ctx.fillRect(2, -h / 2 + 21, 6, 4);
        } else if (walkCycle === 1) {
          ctx.fillRect(-10, -h / 2 + 20, 6, 4);
          ctx.fillRect(3, -h / 2 + 22, 6, 4);
        } else {
          ctx.fillRect(-5, -h / 2 + 22, 6, 4);
          ctx.fillRect(5, -h / 2 + 20, 6, 4);
        }
      } else {
        ctx.fillRect(-7, -h / 2 + 21, 6, 4);
        ctx.fillRect(2, -h / 2 + 21, 6, 4);
      }
    } else {
      // SUPER / FIRE MARIO (Taller, 18x36 approx)
      // Cap
      ctx.fillStyle = capColor;
      ctx.fillRect(-9, -h / 2, 18, 8);
      ctx.fillRect(-5, -h / 2 + 4, 18, 5);

      // Face & hair
      ctx.fillStyle = hairColor;
      ctx.fillRect(-11, -h / 2 + 8, 6, 8);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-5, -h / 2 + 8, 14, 10);
      // Eye & Mustache
      ctx.fillStyle = '#000000';
      ctx.fillRect(3, -h / 2 + 9, 3, 4);
      ctx.fillRect(0, -h / 2 + 15, 10, 4);

      // Shirt / Suspenders
      ctx.fillStyle = shirtColor;
      ctx.fillRect(-8, -h / 2 + 18, 16, 10);
      ctx.fillStyle = overallsColor;
      ctx.fillRect(-7, -h / 2 + 24, 14, 10);
      // Gold Buttons
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, -h / 2 + 26, 2, 3);
      ctx.fillRect(3, -h / 2 + 26, 2, 3);

      // Legs / Shoes
      ctx.fillStyle = shoeColor;
      if (!player.isGrounded) {
        ctx.fillRect(-10, -h / 2 + 32, 8, 6);
        ctx.fillRect(3, -h / 2 + 29, 9, 6);
      } else if (Math.abs(player.vx) > 0.3) {
        const walkCycle = Math.floor(player.animFrame) % 3;
        if (walkCycle === 0) {
          ctx.fillRect(-9, -h / 2 + 33, 7, 5);
          ctx.fillRect(2, -h / 2 + 33, 7, 5);
        } else if (walkCycle === 1) {
          ctx.fillRect(-12, -h / 2 + 31, 8, 5);
          ctx.fillRect(4, -h / 2 + 34, 8, 5);
        } else {
          ctx.fillRect(-6, -h / 2 + 34, 8, 5);
          ctx.fillRect(6, -h / 2 + 31, 8, 5);
        }
      } else {
        ctx.fillRect(-8, -h / 2 + 33, 7, 5);
        ctx.fillRect(2, -h / 2 + 33, 7, 5);
      }
    }

    ctx.restore();
  }

  // Render Enemies
  public renderEnemies(enemies: Enemy[], cameraX: number, animTick: number) {
    const ctx = this.ctx;
    const w = this.canvasWidth;

    enemies.forEach((e) => {
      if (!e.isAlive && !e.isSquished) return;

      const screenX = e.x - cameraX;
      if (screenX + e.width < -100 || screenX > w + 100) return;

      ctx.save();
      ctx.translate(screenX + e.width / 2, e.y + e.height / 2);
      if (e.facing === 'right') {
        ctx.scale(-1, 1);
      }

      switch (e.type) {
        case 'goomba': {
          if (e.isSquished) {
            // Squished flat goomba
            ctx.fillStyle = '#8b4513';
            ctx.beginPath();
            ctx.ellipse(0, 8, 15, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(-6, 6, 4, 2);
            ctx.fillRect(2, 6, 4, 2);
          } else {
            // Mushroom head
            ctx.fillStyle = '#a0522d';
            ctx.beginPath();
            ctx.ellipse(0, -3, 14, 12, 0, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(-6, -6, 4, 7);
            ctx.fillRect(2, -6, 4, 7);
            ctx.fillStyle = '#000';
            ctx.fillRect(-4, -4, 2, 4);
            ctx.fillRect(2, -4, 2, 4);
            // Stem
            ctx.fillStyle = '#f5deb3';
            ctx.fillRect(-7, 4, 14, 6);
            // Feet waddle
            const step = Math.floor(animTick * 0.1) % 2;
            ctx.fillStyle = '#000';
            if (step === 0) {
              ctx.fillRect(-12, 8, 9, 5);
              ctx.fillRect(3, 8, 8, 4);
            } else {
              ctx.fillRect(-11, 8, 8, 4);
              ctx.fillRect(3, 8, 9, 5);
            }
          }
          break;
        }

        case 'koopa': {
          if (e.isShell) {
            // Spinning or stationary shell
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-10, -2, 20, 5);
            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            // Green shell & turtle body
            // Shell
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.ellipse(-2, 2, 12, 14, 0, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = '#facc15';
            ctx.beginPath();
            ctx.arc(-8, -10, 8, 0, Math.PI * 2);
            ctx.fill();
            // Beak & eye
            ctx.fillStyle = '#000';
            ctx.fillRect(-12, -12, 2, 4);
            // Walking legs
            const step = Math.floor(animTick * 0.1) % 2;
            ctx.fillStyle = '#eab308';
            if (step === 0) {
              ctx.fillRect(-10, 12, 7, 6);
              ctx.fillRect(2, 12, 7, 5);
            } else {
              ctx.fillRect(-9, 12, 7, 5);
              ctx.fillRect(3, 12, 7, 6);
            }
          }
          break;
        }

        case 'piranha': {
          // Sharp teeth snapping plant
          const bite = Math.sin(animTick * 0.2) > 0;
          // Stem
          ctx.fillStyle = '#15803d';
          ctx.fillRect(-4, 0, 8, 18);
          // Head
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(0, -6, 14, 0, Math.PI * 2);
          ctx.fill();
          // White dots
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-8, -12, 4, 4);
          ctx.fillRect(4, -8, 3, 3);
          // Mouth & sharp teeth
          ctx.fillStyle = '#000000';
          ctx.fillRect(-10, bite ? -5 : -3, 20, bite ? 7 : 4);
          ctx.fillStyle = '#ffffff';
          // Teeth
          for (let tx = -8; tx <= 6; tx += 4) {
            ctx.fillRect(tx, -4, 2, 3);
          }
          break;
        }

        case 'podoboo': {
          // Lava fireball jumping up
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(0, 0, 11, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          // Flame tail
          ctx.fillStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(-6, 6);
          ctx.lineTo(0, 16);
          ctx.lineTo(6, 6);
          ctx.fill();
          break;
        }

        case 'bowser': {
          // KING BOWSER! (Great 64x68 boss pixel art)
          const breatheFlame = (e.attackTimer || 0) > 40;
          const healthPct = (e.health || 1) / (e.maxHealth || 4);

          // Health bar above Bowser
          ctx.fillStyle = 'rgba(0,0,0,0.7)';
          ctx.fillRect(-32, -48, 64, 8);
          ctx.fillStyle = healthPct > 0.5 ? '#22c55e' : healthPct > 0.25 ? '#eab308' : '#ef4444';
          ctx.fillRect(-30, -46, 60 * healthPct, 4);

          // Green Spiked Shell on back
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.ellipse(12, -4, 22, 26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f97316';
          ctx.lineWidth = 3;
          ctx.stroke();

          // Spikes on shell
          ctx.fillStyle = '#fef08a';
          const spikes = [
            { x: 22, y: -20 },
            { x: 30, y: -4 },
            { x: 20, y: 12 }
          ];
          spikes.forEach((s) => {
            ctx.beginPath();
            ctx.moveTo(s.x, s.y - 4);
            ctx.lineTo(s.x + 8, s.y);
            ctx.lineTo(s.x, s.y + 4);
            ctx.fill();
          });

          // Body (Yellow scaly skin)
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.ellipse(-6, 2, 20, 24, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head & Snout
          ctx.fillStyle = '#ca8a04';
          ctx.beginPath();
          ctx.arc(-18, -14, 16, 0, Math.PI * 2);
          ctx.fill();

          // Red Hair / Mane
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.moveTo(-16, -28);
          ctx.lineTo(-4, -38);
          ctx.lineTo(-2, -26);
          ctx.lineTo(8, -34);
          ctx.lineTo(6, -20);
          ctx.fill();

          // Horns
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.moveTo(-14, -26);
          ctx.lineTo(-20, -36);
          ctx.lineTo(-8, -26);
          ctx.fill();

          // Glowing Eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-24, -20, 6, 6);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-22, -18, 2, 2);

          // Mouth & Sharp Fangs
          ctx.fillStyle = '#450a0a';
          ctx.fillRect(-30, -10, 16, breatheFlame ? 14 : 7);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-28, -10, 4, 4); // upper fang
          ctx.fillRect(-20, -10, 4, 4);
          ctx.fillRect(-26, breatheFlame ? -2 : -6, 4, 4); // lower fang

          // Flame breath particle if attacking
          if (breatheFlame) {
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.arc(-38, -5, 10 + Math.sin(animTick * 0.3) * 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffea00';
            ctx.beginPath();
            ctx.arc(-36, -5, 5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Heavy Claws / Feet
          ctx.fillStyle = '#ca8a04';
          ctx.fillRect(-22, 22, 16, 12);
          ctx.fillRect(4, 22, 16, 12);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-24, 30, 4, 4);
          ctx.fillRect(-18, 30, 4, 4);
          ctx.fillRect(4, 30, 4, 4);
          ctx.fillRect(10, 30, 4, 4);
          break;
        }
      }

      ctx.restore();
    });
  }

  // Render Princess Peach!
  public renderPrincess(princess: Princess | undefined, cameraX: number, animTick: number) {
    if (!princess) return;
    const ctx = this.ctx;
    const screenX = princess.x - cameraX;
    const screenY = princess.y;

    ctx.save();
    ctx.translate(screenX + princess.width / 2, screenY + princess.height / 2);

    // Heart sparkle animation if rescued
    if (princess.isRescued) {
      const heartY = -40 + Math.sin(animTick * 0.1) * 6;
      ctx.fillStyle = '#ec4899';
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💖', 0, heartY);
      ctx.fillText('✨', -24, heartY + 12);
      ctx.fillText('✨', 24, heartY + 12);
    }

    // Blonde Hair
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(0, -10, 14, 0, Math.PI * 2);
    ctx.fill();
    // Long locks falling behind
    ctx.fillRect(-14, -8, 28, 24);

    // Golden Crown with Cyan Jewels
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(-10, -22);
    ctx.lineTo(-6, -29);
    ctx.lineTo(0, -24);
    ctx.lineTo(6, -29);
    ctx.lineTo(10, -22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-1, -25, 3, 3);

    // Face
    ctx.fillStyle = '#fcd0a1';
    ctx.beginPath();
    ctx.arc(0, -6, 9, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (blue and bright)
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-4, -8, 2, 3);
    ctx.fillRect(2, -8, 2, 3);

    // Blushing cheeks
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-6, -4, 3, 2);
    ctx.fillRect(3, -4, 3, 2);

    // Smile
    ctx.fillStyle = '#be185d';
    ctx.fillRect(-2, -3, 4, 1);

    // Pink Royal Dress
    ctx.fillStyle = '#f472b6';
    ctx.beginPath();
    ctx.moveTo(-7, 2);
    ctx.lineTo(7, 2);
    ctx.lineTo(15, 24);
    ctx.lineTo(-15, 24);
    ctx.closePath();
    ctx.fill();

    // Dark pink skirt accents
    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.ellipse(0, 14, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue brooch on chest
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    ctx.arc(0, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    // White Gloves
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12, 6, 4, 8);
    ctx.fillRect(8, 6, 4, 8);

    ctx.restore();
  }

  // Render Items (Coins, Mushrooms, Fire Flowers)
  public renderItems(items: Item[], cameraX: number, animTick: number) {
    const ctx = this.ctx;

    items.forEach((item) => {
      if (item.collected) return;
      const screenX = item.x - cameraX;
      const screenY = item.y;

      switch (item.type) {
        case 'coin': {
          const spin = Math.sin(animTick * 0.15);
          ctx.fillStyle = '#eab308';
          ctx.beginPath();
          ctx.ellipse(screenX + item.width / 2, screenY + item.height / 2, Math.max(2, Math.abs(spin) * (item.width / 2)), item.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.ellipse(screenX + item.width / 2, screenY + item.height / 2, Math.max(1, Math.abs(spin) * (item.width / 4)), item.height / 4, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'mushroom': {
          // Red Super Mushroom with white dots
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(screenX + item.width / 2, screenY + 10, 14, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          // White dots
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(screenX + 5, screenY + 4, 5, 5);
          ctx.fillRect(screenX + item.width - 10, screenY + 4, 5, 5);
          ctx.fillRect(screenX + item.width / 2 - 2, screenY + 12, 5, 4);
          // Stem
          ctx.fillStyle = '#fcd0a1';
          ctx.fillRect(screenX + 8, screenY + 16, item.width - 16, 12);
          ctx.fillStyle = '#000000';
          ctx.fillRect(screenX + 10, screenY + 18, 2, 4);
          ctx.fillRect(screenX + item.width - 12, screenY + 18, 2, 4);
          break;
        }

        case 'fireflower': {
          // Fire Flower powerup
          // Stem & green leaves
          ctx.fillStyle = '#16a34a';
          ctx.fillRect(screenX + 13, screenY + 14, 4, 14);
          ctx.fillRect(screenX + 6, screenY + 20, 6, 4);
          ctx.fillRect(screenX + 18, screenY + 20, 6, 4);
          // Flower petals (red, yellow, white concentric)
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.arc(screenX + 15, screenY + 10, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(screenX + 15, screenY + 10, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(screenX + 15, screenY + 10, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    });
  }

  // Render Fireballs & Projectiles
  public renderProjectiles(projectiles: Projectile[], cameraX: number, animTick: number) {
    const ctx = this.ctx;
    projectiles.forEach((p) => {
      const screenX = p.x - cameraX;
      const pulse = Math.sin(animTick * 0.3) * 2;

      ctx.fillStyle = p.fromPlayer ? '#f97316' : '#ef4444';
      ctx.beginPath();
      ctx.arc(screenX, p.y, p.radius + pulse * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(screenX, p.y, p.radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Render Particles (Explosions, Confetti, Bricks)
  public renderParticles(particles: Particle[], cameraX: number) {
    const ctx = this.ctx;
    particles.forEach((pt) => {
      const screenX = pt.x - cameraX;
      const alpha = pt.life / pt.maxLife;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = pt.color;
      ctx.fillRect(screenX, pt.y, pt.size, pt.size);
      ctx.restore();
    });
  }

  // Render Floating Score / Text (e.g. +100, +1000)
  public renderFloatingTexts(texts: FloatingText[], cameraX: number) {
    const ctx = this.ctx;
    texts.forEach((ft) => {
      const screenX = ft.x - cameraX;
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.opacity);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Press Start 2P", monospace';
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, screenX, ft.y);
      ctx.restore();
    });
  }
}
