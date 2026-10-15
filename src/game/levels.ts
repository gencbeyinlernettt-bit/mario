/**
 * Level Configurations for 3-Level Progressive Mario Game
 */

import { LevelConfig, Block, Enemy } from './types';

export function createLevel(levelNum: number): LevelConfig {
  switch (levelNum) {
    case 1:
      return createLevel1();
    case 2:
      return createLevel2();
    case 3:
      return createLevel3();
    default:
      return createLevel1();
  }
}

// ----------------------------------------------------
// BÖLÜM 1: Mantar Krallığı Çayırı (Giriş & Klasik)
// ----------------------------------------------------
function createLevel1(): LevelConfig {
  const blocks: Block[] = [];
  const enemies: Enemy[] = [];
  const groundY = 380;
  const levelWidth = 2400;

  // Ground segments with 2 small pits
  const groundSegments = [
    { start: 0, end: 750 },
    { start: 830, end: 1400 },
    { start: 1480, end: 2400 }
  ];

  groundSegments.forEach((seg) => {
    for (let x = seg.start; x < seg.end; x += 32) {
      blocks.push({ x, y: groundY, width: 32, height: 32, type: 'ground' });
      blocks.push({ x, y: groundY + 32, width: 32, height: 48, type: 'ground' });
    }
  });

  // ? Blocks and Bricks
  // First cluster
  blocks.push({ x: 260, y: groundY - 96, width: 32, height: 32, type: 'question_coin' });
  blocks.push({ x: 340, y: groundY - 96, width: 32, height: 32, type: 'brick' });
  blocks.push({ x: 372, y: groundY - 96, width: 32, height: 32, type: 'question_mushroom' });
  blocks.push({ x: 404, y: groundY - 96, width: 32, height: 32, type: 'brick' });
  blocks.push({ x: 436, y: groundY - 96, width: 32, height: 32, type: 'question_coin' });

  // Pipes
  const addPipe = (x: number, height: number) => {
    blocks.push({ x, y: groundY - height, width: 24, height: 16, type: 'pipe_top_left' });
    blocks.push({ x: x + 24, y: groundY - height, width: 24, height: 16, type: 'pipe_top_right' });
    for (let y = groundY - height + 16; y < groundY; y += 16) {
      blocks.push({ x, y, width: 24, height: 16, type: 'pipe_left' });
      blocks.push({ x: x + 24, y, width: 24, height: 16, type: 'pipe_right' });
    }
  };

  addPipe(540, 48);
  addPipe(680, 64);
  addPipe(1050, 48);
  addPipe(1280, 80);

  // Mid-level elevated bricks & question blocks
  for (let i = 0; i < 5; i++) {
    blocks.push({ x: 880 + i * 32, y: groundY - 110, width: 32, height: 32, type: i === 2 ? 'question_coin' : 'brick' });
  }

  // Higher secret platform
  blocks.push({ x: 920, y: groundY - 190, width: 32, height: 32, type: 'question_coin' });
  blocks.push({ x: 952, y: groundY - 190, width: 32, height: 32, type: 'question_mushroom' });

  // Staircase before flagpole
  const stairBaseX = 1650;
  for (let step = 1; step <= 5; step++) {
    for (let h = 1; h <= step; h++) {
      blocks.push({
        x: stairBaseX + (step - 1) * 32,
        y: groundY - h * 32,
        width: 32,
        height: 32,
        type: 'brick'
      });
    }
  }

  // Flagpole platform
  for (let x = 1880; x <= 2000; x += 32) {
    blocks.push({ x, y: groundY - 32, width: 32, height: 32, type: 'brick' });
  }

  // Enemies (Goombas)
  let enemyId = 1;
  const goombaXPositions = [420, 600, 930, 1140, 1200, 1550];
  goombaXPositions.forEach((x) => {
    enemies.push({
      id: enemyId++,
      type: 'goomba',
      x,
      y: groundY - 32,
      vx: -1.2,
      vy: 0,
      width: 30,
      height: 30,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0
    });
  });

  return {
    id: 1,
    name: 'Bölüm 1: Yeşil Vadi',
    subtitle: 'Mantar Krallığı Yolculuğu Başlıyor!',
    difficulty: 'Kolay',
    theme: 'overworld',
    width: levelWidth,
    height: 460,
    skyColor: '#5c94fc',
    groundColor: '#d0812b',
    blocks,
    enemies,
    flagPole: {
      x: 1980,
      y: groundY - 260,
      height: 230,
      flagY: groundY - 250,
      isTriggered: false
    },
    castleX: 2090,
    startX: 60,
    startY: groundY - 40,
    timeLimit: 300
  };
}

// ----------------------------------------------------
// BÖLÜM 2: Yeraltı Mağarası & Koopa Tehlikesi (Orta Zorluk)
// ----------------------------------------------------
function createLevel2(): LevelConfig {
  const blocks: Block[] = [];
  const enemies: Enemy[] = [];
  const groundY = 380;
  const levelWidth = 2700;

  // Broken cavern ground with deep chasms
  const groundSegments = [
    { start: 0, end: 500 },
    { start: 680, end: 1100 },
    { start: 1300, end: 1750 },
    { start: 1950, end: 2700 }
  ];

  groundSegments.forEach((seg) => {
    for (let x = seg.start; x < seg.end; x += 32) {
      blocks.push({ x, y: groundY, width: 32, height: 32, type: 'ground' });
      blocks.push({ x, y: groundY + 32, width: 32, height: 48, type: 'ground' });
    }
  });

  // Ceiling cavern blocks
  for (let x = 0; x < levelWidth; x += 64) {
    if (x % 192 !== 0) {
      blocks.push({ x, y: 0, width: 64, height: 32, type: 'ground' });
    }
  }

  // Moving Platforms over chasms!
  // Horizontal moving platform in first chasm (500 to 680)
  blocks.push({
    x: 520,
    y: groundY - 40,
    width: 64,
    height: 18,
    type: 'moving_platform',
    startX: 510,
    endX: 650,
    moveSpeed: 1.5,
    moveDir: 1,
    isVertical: false
  });

  // Vertical moving platform in second chasm (1100 to 1300)
  blocks.push({
    x: 1180,
    y: groundY - 30,
    width: 64,
    height: 18,
    type: 'moving_platform',
    startY: groundY - 140,
    endY: groundY - 20,
    moveSpeed: 1.4,
    moveDir: -1,
    isVertical: true
  });

  // Another horizontal platform in third chasm (1750 to 1950)
  blocks.push({
    x: 1800,
    y: groundY - 60,
    width: 64,
    height: 18,
    type: 'moving_platform',
    startX: 1770,
    endX: 1920,
    moveSpeed: 1.8,
    moveDir: 1,
    isVertical: false
  });

  // Underground blocks, mystery blocks with Fire Flower!
  blocks.push({ x: 260, y: groundY - 96, width: 32, height: 32, type: 'brick' });
  blocks.push({ x: 292, y: groundY - 96, width: 32, height: 32, type: 'question_flower' }); // FIRE FLOWER!
  blocks.push({ x: 324, y: groundY - 96, width: 32, height: 32, type: 'brick' });

  // Floating brick bridge
  for (let i = 0; i < 7; i++) {
    blocks.push({
      x: 820 + i * 32,
      y: groundY - 110,
      width: 32,
      height: 32,
      type: i === 3 ? 'question_coin' : 'brick'
    });
  }

  // Underground Pipes with Piranha plants
  const addPipeWithPiranha = (x: number, height: number, piranhaId: number) => {
    blocks.push({ x, y: groundY - height, width: 24, height: 16, type: 'pipe_top_left' });
    blocks.push({ x: x + 24, y: groundY - height, width: 24, height: 16, type: 'pipe_top_right' });
    for (let y = groundY - height + 16; y < groundY; y += 16) {
      blocks.push({ x, y, width: 24, height: 16, type: 'pipe_left' });
      blocks.push({ x: x + 24, y, width: 24, height: 16, type: 'pipe_right' });
    }
    // Add snapping Piranha Plant
    enemies.push({
      id: piranhaId,
      type: 'piranha',
      x: x + 8,
      y: groundY - height + 10,
      vx: 0,
      vy: 0,
      width: 32,
      height: 36,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0,
      startY: groundY - height + 15,
      targetY: groundY - height - 32
    });
  };

  addPipeWithPiranha(420, 50, 101);
  addPipeWithPiranha(1000, 64, 102);
  addPipeWithPiranha(1620, 56, 103);

  // Enemies: Koopa Troopas & Goombas
  let enemyId = 10;
  // Green & Red Koopas
  const koopaPos = [760, 940, 1420, 1540, 2060];
  koopaPos.forEach((x) => {
    enemies.push({
      id: enemyId++,
      type: 'koopa',
      x,
      y: groundY - 38,
      vx: -1.3,
      vy: 0,
      width: 30,
      height: 38,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0
    });
  });

  // A couple of fast goombas
  [850, 1370, 2180].forEach((x) => {
    enemies.push({
      id: enemyId++,
      type: 'goomba',
      x,
      y: groundY - 32,
      vx: -1.4,
      vy: 0,
      width: 30,
      height: 30,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0
    });
  });

  return {
    id: 2,
    name: 'Bölüm 2: Yeraltı Mağarası',
    subtitle: 'Hareketli Platformlar & Koopa Kabukları!',
    difficulty: 'Orta',
    theme: 'underground',
    width: levelWidth,
    height: 460,
    skyColor: '#0a0a16',
    groundColor: '#305890',
    blocks,
    enemies,
    flagPole: {
      x: 2350,
      y: groundY - 260,
      height: 230,
      flagY: groundY - 250,
      isTriggered: false
    },
    castleX: 2460,
    startX: 50,
    startY: groundY - 40,
    timeLimit: 280
  };
}

// ----------------------------------------------------
// BÖLÜM 3: Bowser'ın Lav Kalesi & Prenses Kurtarma (Zor & Final Boss!)
// ----------------------------------------------------
function createLevel3(): LevelConfig {
  const blocks: Block[] = [];
  const enemies: Enemy[] = [];
  const groundY = 380;
  const levelWidth = 3100;

  // Castle Ground: Entrance platform, jumping stone pillars over lava, and the Great Boss Bridge
  // Segment 1: Castle entry
  for (let x = 0; x < 520; x += 32) {
    blocks.push({ x, y: groundY, width: 32, height: 32, type: 'castle_brick' });
    blocks.push({ x, y: groundY + 32, width: 32, height: 48, type: 'castle_brick' });
  }

  // Lava Lake spanning underneath everything from 520 to 2600!
  for (let x = 520; x < 2650; x += 32) {
    blocks.push({ x, y: groundY + 24, width: 32, height: 56, type: 'lava' });
  }

  // Castle ceiling
  for (let x = 0; x < levelWidth; x += 32) {
    blocks.push({ x, y: 0, width: 32, height: 32, type: 'castle_brick' });
    if (x % 96 === 0) {
      blocks.push({ x, y: 32, width: 32, height: 24, type: 'castle_brick' }); // hanging stalactite/pillar
    }
  }

  // Floating stone pillars over the lava
  const pillars = [
    { x: 570, y: groundY - 20, w: 70 },
    { x: 710, y: groundY - 60, w: 64 },
    { x: 840, y: groundY - 20, w: 80 },
    { x: 990, y: groundY - 70, w: 70 },
    { x: 1140, y: groundY - 40, w: 90 },
    { x: 1300, y: groundY - 80, w: 64 },
    { x: 1440, y: groundY - 30, w: 80 }
  ];

  pillars.forEach((p) => {
    for (let px = p.x; px < p.x + p.w; px += 32) {
      blocks.push({ x: px, y: p.y, width: 32, height: 32, type: 'castle_brick' });
    }
  });

  // Powerup platform containing Fire Flower for the boss fight!
  blocks.push({ x: 860, y: groundY - 140, width: 32, height: 32, type: 'brick' });
  blocks.push({ x: 892, y: groundY - 140, width: 32, height: 32, type: 'question_flower' }); // FIRE POWERUP!
  blocks.push({ x: 924, y: groundY - 140, width: 32, height: 32, type: 'brick' });

  // Moving platform over the second lava stretch (1560 to 1750)
  blocks.push({
    x: 1560,
    y: groundY - 40,
    width: 64,
    height: 18,
    type: 'moving_platform',
    startX: 1540,
    endX: 1720,
    moveSpeed: 1.6,
    moveDir: 1,
    isVertical: false
  });

  // Pre-Boss Platform (1780 to 1940)
  for (let x = 1780; x < 1940; x += 32) {
    blocks.push({ x, y: groundY, width: 32, height: 32, type: 'castle_brick' });
    blocks.push({ x, y: groundY + 32, width: 32, height: 48, type: 'castle_brick' });
  }

  // ----------------------------------------------------
  // THE GREAT COLLAPSIBLE BOSS BRIDGE (1940 to 2400)
  // ----------------------------------------------------
  for (let x = 1940; x < 2380; x += 30) {
    blocks.push({
      x,
      y: groundY,
      width: 30,
      height: 24,
      type: 'bridge_tile' // can collapse when axe is cut!
    });
  }

  // The Golden Axe on the chain post (at 2390)
  blocks.push({
    x: 2395,
    y: groundY - 40,
    width: 30,
    height: 38,
    type: 'axe'
  });

  // Post-Bridge Platform where Princess Chamber Begins (2430 to 3100)
  for (let x = 2430; x < levelWidth; x += 32) {
    blocks.push({ x, y: groundY, width: 32, height: 32, type: 'castle_brick' });
    blocks.push({ x, y: groundY + 32, width: 32, height: 48, type: 'castle_brick' });
  }

  // Decorative columns & stained glass in Princess Sanctuary
  for (let y = groundY - 140; y < groundY; y += 32) {
    blocks.push({ x: 2600, y, width: 24, height: 32, type: 'castle_brick' });
    blocks.push({ x: 2950, y, width: 24, height: 32, type: 'castle_brick' });
  }

  // Jumping Fireballs (Podoboos) from Lava
  const podobooX = [660, 1080, 1380, 1650];
  let enemyId = 50;
  podobooX.forEach((x) => {
    enemies.push({
      id: enemyId++,
      type: 'podoboo',
      x,
      y: groundY + 30,
      vx: 0,
      vy: -7.5,
      width: 22,
      height: 28,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0,
      startY: groundY + 40
    });
  });

  // Koopa guards in castle
  [340, 860, 1820].forEach((x) => {
    enemies.push({
      id: enemyId++,
      type: 'koopa',
      x,
      y: groundY - 38,
      vx: -1.4,
      vy: 0,
      width: 30,
      height: 38,
      isAlive: true,
      facing: 'left',
      animTimer: 0,
      animFrame: 0
    });
  });

  // ----------------------------------------------------
  // FINAL BOSS: KING BOWSER!
  // ----------------------------------------------------
  enemies.push({
    id: 999,
    type: 'bowser',
    x: 2200,
    y: groundY - 68,
    vx: -0.8,
    vy: 0,
    width: 64,
    height: 68,
    isAlive: true,
    facing: 'left',
    animTimer: 0,
    animFrame: 0,
    health: 4,
    maxHealth: 4,
    attackTimer: 0,
    jumpTimer: 0
  });

  // ----------------------------------------------------
  // PRINCESS PEACH IN THE SANCTUARY CHAMBER!
  // ----------------------------------------------------
  const princess = {
    x: 2750,
    y: groundY - 50,
    width: 32,
    height: 48,
    isRescued: false,
    animTimer: 0,
    animFrame: 0
  };

  return {
    id: 3,
    name: "Bölüm 3: Bowser'ın Lav Kalesi",
    subtitle: 'Büyük Final: Bowser ile Savaş ve Prensesi Kurtar!',
    difficulty: 'Zor / Boss',
    theme: 'castle',
    width: levelWidth,
    height: 460,
    skyColor: '#1a0505',
    groundColor: '#7c1c1c',
    blocks,
    enemies,
    princess,
    castleX: 2650,
    startX: 60,
    startY: groundY - 40,
    timeLimit: 250
  };
}
