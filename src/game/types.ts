/**
 * Game Types and Interfaces for 3-Level Mario Princess Rescue
 */

export type GameState = 'title' | 'playing' | 'paused' | 'levelClear' | 'gameOver' | 'gameVictory';

export type MarioForm = 'small' | 'super' | 'fire';

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  facing: 'left' | 'right';
  form: MarioForm;
  isInvincible: boolean;
  invincibleTimer: number;
  isJumping: boolean;
  animFrame: number;
  animTimer: number;
  crouching: boolean;
}

export type EnemyType = 'goomba' | 'koopa' | 'piranha' | 'bowser' | 'podoboo';

export interface Enemy {
  id: number;
  type: EnemyType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isAlive: boolean;
  isSquished?: boolean;
  squishTimer?: number;
  isShell?: boolean;
  shellSpeed?: number;
  facing: 'left' | 'right';
  animTimer: number;
  animFrame: number;
  // Specific properties
  startY?: number; // for piranha/podoboo
  targetY?: number;
  health?: number; // for Bowser (3 hits)
  maxHealth?: number;
  attackTimer?: number;
  jumpTimer?: number;
}

export type BlockType = 
  | 'ground' 
  | 'brick' 
  | 'question_coin' 
  | 'question_mushroom' 
  | 'question_flower'
  | 'empty' 
  | 'pipe_left' 
  | 'pipe_right' 
  | 'pipe_top_left' 
  | 'pipe_top_right'
  | 'moving_platform'
  | 'castle_brick'
  | 'axe'
  | 'bridge_chain'
  | 'bridge_tile'
  | 'lava';

export interface Block {
  x: number;
  y: number;
  width: number;
  height: number;
  type: BlockType;
  bumpOffset?: number;
  bumpDir?: number;
  isHit?: boolean;
  // Moving platform
  startX?: number;
  endX?: number;
  moveSpeed?: number;
  moveDir?: number;
  isVertical?: boolean;
  startY?: number;
  endY?: number;
}

export type ItemType = 'coin' | 'mushroom' | 'fireflower' | 'life';

export interface Item {
  id: number;
  type: ItemType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  collected: boolean;
  isEmerging?: boolean;
  emergeY?: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  fromPlayer: boolean;
  life: number;
}

export interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  opacity: number;
  vy: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface Princess {
  x: number;
  y: number;
  width: number;
  height: number;
  isRescued: boolean;
  animTimer: number;
  animFrame: number;
}

export interface FlagPole {
  x: number;
  y: number;
  height: number;
  flagY: number;
  isTriggered: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  difficulty: string;
  theme: 'overworld' | 'underground' | 'castle';
  width: number;
  height: number;
  skyColor: string;
  groundColor: string;
  blocks: Block[];
  enemies: Enemy[];
  flagPole?: FlagPole;
  princess?: Princess;
  castleX: number;
  startX: number;
  startY: number;
  timeLimit: number;
}
