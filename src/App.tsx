/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Play, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Music, 
  Download, 
  FileCode, 
  Copy, 
  Check, 
  X, 
  Tv, 
  Heart, 
  Sparkles, 
  Award,
  Crown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { MarioGameEngine } from './game/gameEngine';
import { GameRenderer } from './game/renderer';
import { audio } from './game/audioEngine';
import { GameState } from './game/types';
import { 
  downloadStandaloneZip, 
  downloadSingleFileHtml, 
  getStandaloneHtml, 
  getStandaloneCss, 
  getStandaloneJs 
} from './game/standaloneExport';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<MarioGameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // React State for HUD & UI
  const [gameState, setGameState] = useState<GameState>('title');
  const [score, setScore] = useState<number>(0);
  const [coins, setCoins] = useState<number>(0);
  const [lives, setLives] = useState<number>(3);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [levelNum, setLevelNum] = useState<number>(1);
  const [levelName, setLevelName] = useState<string>('Bölüm 1: Yeşil Vadi');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(true);
  const [scanlines, setScanlines] = useState<boolean>(true);

  // Download & Code Modal State
  const [showDownloadModal, setShowDownloadModal] = useState<boolean>(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'css' | 'js'>('html');
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  // Victory Confetti Trigger
  const triggerVictoryEffects = useCallback(() => {
    try {
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio)
        });
      };

      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });
      fire(0.2, {
        spread: 60,
      });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2
      });
      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    } catch {
      // Ignored if confetti fails
    }
  }, []);

  // Initialize Game Engine & Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create engine with state callbacks
    const engine = new MarioGameEngine({
      onScoreChange: (s) => setScore(s),
      onCoinsChange: (c) => setCoins(c),
      onLivesChange: (l) => setLives(l),
      onTimeChange: (t) => setTimeLeft(t),
      onLevelChange: (lvl, name) => {
        setLevelNum(lvl);
        setLevelName(name);
      },
      onStateChange: (st) => setGameState(st),
      onVictory: () => {
        triggerVictoryEffects();
      }
    });
    engineRef.current = engine;

    const renderer = new GameRenderer(ctx, canvas.width, canvas.height);
    rendererRef.current = renderer;

    // Render loop
    const renderLoop = () => {
      engine.update();

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderer.renderBackground(engine.level, engine.cameraX, engine.animTick);
      renderer.renderBlocks(engine.level.blocks, engine.cameraX, engine.animTick);
      renderer.renderFlagPole(engine.level.flagPole, engine.level.castleX, engine.cameraX, engine.animTick);
      renderer.renderItems(engine.items, engine.cameraX, engine.animTick);
      renderer.renderEnemies(engine.level.enemies, engine.cameraX, engine.animTick);
      renderer.renderPrincess(engine.level.princess, engine.cameraX, engine.animTick);
      renderer.renderProjectiles(engine.projectiles, engine.cameraX, engine.animTick);
      renderer.renderParticles(engine.particles, engine.cameraX);
      renderer.renderPlayer(engine.player, engine.cameraX);
      renderer.renderFloatingTexts(engine.floatingTexts, engine.cameraX);

      animFrameIdRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    // Keyboard Event Handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent page scrolling with space/arrow keys
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') engine.keys.jump = true;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.keys.down = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') {
        engine.keys.action = true;
        engine.shootFireball();
      }
      if (e.code === 'KeyP') {
        engine.pause();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') engine.keys.jump = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') engine.keys.down = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyX') engine.keys.action = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      audio.stopMusic();
    };
  }, [triggerVictoryEffects]);

  // Game control handlers
  const handleStartGame = () => {
    engineRef.current?.start();
  };

  const handleRestartGame = () => {
    engineRef.current?.restartGame();
  };

  const handleRestartLevel = () => {
    engineRef.current?.restartLevel();
  };

  const handleLevelJump = (lvl: number) => {
    engineRef.current?.warpToLevel(lvl);
  };

  const handleToggleSound = () => {
    const muted = audio.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMusic = () => {
    const musicActive = audio.toggleMusic();
    setIsMusicOn(musicActive);
    if (musicActive && engineRef.current) {
      audio.playTheme(engineRef.current.level.theme);
    }
  };

  // Copy code helper
  const handleCopyCode = (text: string, tab: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-2 sm:p-4 selection:bg-rose-500 selection:text-white">
      {/* Top Banner Navigation */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 shadow-lg mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 flex items-center justify-center shadow-md shadow-red-500/20 text-xl font-bold">
            🍄
          </div>
          <div>
            <h1 className="font-pixel text-xs sm:text-sm text-red-500 font-bold tracking-wider">
              SUPER MARIO
            </h1>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
              <span>Prenses Kurtarma Macerası</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-400 text-[11px] font-semibold">3 Bölümlü</span>
            </p>
          </div>
        </div>

        {/* Toolbar & Download Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs px-3.5 py-2 rounded-lg shadow-md shadow-emerald-700/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            title="Derleme gerektirmeyen HTML/CSS/JS dosyalarını indir"
          >
            <Download className="w-4 h-4" />
            <span className="font-bold">Projeyi İndir</span>
          </button>

          <button
            onClick={handleToggleSound}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            onClick={handleToggleMusic}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
            title={isMusicOn ? 'Müziği Kapat' : 'Müziği Aç'}
          >
            <Music className={`w-4 h-4 ${isMusicOn ? 'text-amber-400' : 'text-slate-500'}`} />
          </button>

          <button
            onClick={() => setScanlines(!scanlines)}
            className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition cursor-pointer ${
              scanlines ? 'text-cyan-400' : 'text-slate-500'
            }`}
            title="CRT Retro Çizgi Efekti"
          >
            <Tv className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Arcade Frame */}
      <div className="w-full max-w-4xl bg-slate-900 border-4 border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Retro Header HUD */}
        <div className="bg-slate-950 px-4 py-2.5 border-b-2 border-slate-800 flex items-center justify-between font-pixel text-[10px] sm:text-xs text-slate-200">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[9px]">MARIO</span>
            <span className="text-amber-400">{String(score).padStart(6, '0')}</span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[9px]">ALTIN</span>
            <span className="text-yellow-300 flex items-center gap-1">
              🪙 x{String(coins).padStart(2, '0')}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[9px]">BÖLÜM</span>
            <span className="text-sky-400">
              {levelNum === 3 ? '3-1 (BOSS)' : `${levelNum}-1`}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[9px]">SÜRE</span>
            <span className={timeLeft < 60 ? 'text-red-500 animate-pulse' : 'text-slate-200'}>
              {timeLeft}
            </span>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-slate-400 text-[9px]">CAN</span>
            <span className="text-rose-400 flex items-center gap-1">
              <Heart className="w-3 h-3 fill-rose-500 text-rose-500" /> x{lives}
            </span>
          </div>
        </div>

        {/* Level Title Ribbon */}
        <div className="bg-slate-800/80 px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-sky-900/60 text-sky-300 font-pixel text-[9px] border border-sky-700/50">
              {levelNum === 1 ? 'KOLAY' : levelNum === 2 ? 'ORTA' : 'ZOR / BOSS'}
            </span>
            <span className="text-slate-200 font-semibold text-xs sm:text-sm">
              {levelName}
            </span>
          </div>

          {/* Quick Level Selector */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-[11px] mr-1 hidden sm:inline">Bölüm:</span>
            {[1, 2, 3].map((lvl) => (
              <button
                key={lvl}
                onClick={() => handleLevelJump(lvl)}
                className={`px-2 py-0.5 rounded text-[10px] font-pixel transition cursor-pointer ${
                  levelNum === lvl
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {lvl === 3 ? '3 (Boss)' : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas Game Area */}
        <div className="relative w-full aspect-[800/460] bg-black overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={800}
            height={460}
            className="w-full h-full block"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* CRT Scanline Overlay */}
          {scanlines && (
            <div className="absolute inset-0 pointer-events-none scanlines opacity-40"></div>
          )}

          {/* START TITLE OVERLAY */}
          {gameState === 'title' && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500 rounded-xl p-6 shadow-2xl relative">
                <div className="text-3xl mb-1">👑 🏰 🍄</div>
                <h2 className="font-pixel text-xl sm:text-2xl text-red-500 mb-2 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  SUPER MARIO
                </h2>
                <h3 className="font-pixel text-xs sm:text-sm text-amber-400 mb-4 tracking-wider">
                  PRENSESİ KURTAR
                </h3>

                <div className="bg-slate-950/70 rounded-lg p-3 text-xs text-slate-300 mb-4 text-left border border-slate-800 space-y-1.5">
                  <p className="font-bold text-amber-400 mb-1">🎯 3 Bölümlü Macera:</p>
                  <p className="text-[11px] text-slate-300">
                    🟢 <strong className="text-slate-100">Bölüm 1:</strong> Yeşil Vadi & Mantar Krallığı (Giriş)
                  </p>
                  <p className="text-[11px] text-slate-300">
                    🟣 <strong className="text-slate-100">Bölüm 2:</strong> Yeraltı Mağarası & Hareketli Platformlar
                  </p>
                  <p className="text-[11px] text-slate-300">
                    🔴 <strong className="text-slate-100">Bölüm 3:</strong> Bowser'ın Lav Kalesi & Prenses Kurtarma!
                  </p>
                </div>

                <div className="bg-slate-950/50 rounded-lg p-2.5 text-[11px] text-slate-400 mb-5 border border-dashed border-slate-700">
                  <div className="font-medium text-slate-300 mb-1">🎮 Kontroller:</div>
                  <div>⬅️ ➡️ / A, D : Yürüme | ⬆️ / W / BOŞLUK : Zıpla</div>
                  <div>SHIFT / X : Hızlı Koş / Ateş Topu Fırlat</div>
                </div>

                <button
                  onClick={handleStartGame}
                  className="w-full py-3 px-6 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-slate-950 font-pixel text-xs tracking-wider font-bold shadow-lg shadow-emerald-500/30 transition transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  OYUNU BAŞLAT
                </button>
              </div>
            </div>
          )}

          {/* GAME OVER OVERLAY */}
          {gameState === 'gameOver' && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
              <div className="max-w-md w-full bg-slate-900 border-2 border-red-500 rounded-xl p-6 shadow-2xl">
                <div className="text-4xl mb-2">💀</div>
                <h2 className="font-pixel text-2xl text-red-500 mb-3 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
                  OYUN BİTTİ
                </h2>
                <p className="text-xs text-slate-300 mb-4">
                  Bowser'ın canavarları seni durdurdu... Ama Mantar Krallığı pes etmeyen kahramanları sever!
                </p>

                <div className="bg-slate-950 p-3 rounded-lg mb-5 border border-slate-800 font-pixel text-xs text-amber-400">
                  Skor: {score}
                </div>

                <button
                  onClick={handleRestartGame}
                  className="w-full py-3 px-6 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-pixel text-xs font-bold shadow-lg shadow-red-600/30 transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  YENİDEN BAŞLA
                </button>
              </div>
            </div>
          )}

          {/* GRAND VICTORY / PRINCESS RESCUED OVERLAY */}
          {gameState === 'gameVictory' && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-20 animate-fade-in">
              <div className="max-w-md w-full bg-slate-900 border-4 border-amber-400 rounded-2xl p-6 shadow-2xl relative">
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-amber-400 text-slate-950 px-4 py-1 rounded-full font-pixel text-[10px] font-bold flex items-center gap-1 shadow-md">
                  <Crown className="w-3.5 h-3.5" /> KRALLIK KURTARILDI!
                </div>

                <div className="text-4xl my-2 animate-bounce">💖 👑 💖</div>
                <h2 className="font-pixel text-lg sm:text-xl text-amber-300 mb-1">
                  TEBRİKLER MARIO!
                </h2>
                <h3 className="font-pixel text-xs text-rose-400 mb-3">
                  PRENSES PEACH KURTARILDI!
                </h3>

                <div className="bg-slate-950/80 rounded-xl p-4 border border-rose-500/30 mb-4 text-xs text-slate-200 text-left space-y-2">
                  <p className="text-rose-300 font-semibold italic">
                    "Oh Mario! Kahramanım! Bowser'ı lav gölüne düşürdün ve zindanın kapılarını açtın. Tüm Mantar Krallığı sana sonsuza dek minnettar!"
                  </p>
                  <div className="border-t border-slate-800 pt-2 flex justify-between font-pixel text-[10px] text-amber-400">
                    <span>Toplam Skor:</span>
                    <span>{score} PUAN</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRestartGame}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-pixel text-[11px] font-bold transition cursor-pointer"
                  >
                    BAŞTAN OYNA
                  </button>
                  <button
                    onClick={() => setShowDownloadModal(true)}
                    className="py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-pixel text-[11px] font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> İNDİR
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* LEVEL CLEAR BANNER */}
          {gameState === 'levelClear' && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border-2 border-emerald-500 rounded-xl px-6 py-4 text-center z-20 shadow-2xl">
              <div className="font-pixel text-emerald-400 text-base mb-1 flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                BÖLÜM TAMAMLANDI!
              </div>
              <p className="text-xs text-slate-300">
                Sıradaki bölüme geçiliyor...
              </p>
            </div>
          )}
        </div>

        {/* Mobile & Touch Controls Bar */}
        <div className="bg-slate-950 border-t-2 border-slate-800 p-3 flex sm:hidden justify-between items-center select-none">
          {/* D-Pad Buttons */}
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.left = true; }}
              onTouchEnd={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.left = false; }}
              onMouseDown={() => { if (engineRef.current) engineRef.current.keys.left = true; }}
              onMouseUp={() => { if (engineRef.current) engineRef.current.keys.left = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800 active:bg-blue-600 text-white border-2 border-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              ◀
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.right = true; }}
              onTouchEnd={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.right = false; }}
              onMouseDown={() => { if (engineRef.current) engineRef.current.keys.right = true; }}
              onMouseUp={() => { if (engineRef.current) engineRef.current.keys.right = false; }}
              className="w-12 h-12 rounded-xl bg-slate-800 active:bg-blue-600 text-white border-2 border-slate-700 flex items-center justify-center font-bold text-lg active:scale-95"
            >
              ▶
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { e.preventDefault(); if (engineRef.current) { engineRef.current.keys.action = true; engineRef.current.shootFireball(); } }}
              onTouchEnd={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.action = false; }}
              onMouseDown={() => { if (engineRef.current) { engineRef.current.keys.action = true; engineRef.current.shootFireball(); } }}
              onMouseUp={() => { if (engineRef.current) engineRef.current.keys.action = false; }}
              className="w-12 h-12 rounded-full bg-amber-600 active:bg-amber-500 text-white border-2 border-amber-400 flex flex-col items-center justify-center font-bold text-xs active:scale-95 shadow-md shadow-amber-600/30"
            >
              <span>B</span>
              <span className="text-[8px] font-normal">Ateş</span>
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.jump = true; }}
              onTouchEnd={(e) => { e.preventDefault(); if (engineRef.current) engineRef.current.keys.jump = false; }}
              onMouseDown={() => { if (engineRef.current) engineRef.current.keys.jump = true; }}
              onMouseUp={() => { if (engineRef.current) engineRef.current.keys.jump = false; }}
              className="w-12 h-12 rounded-full bg-red-600 active:bg-red-500 text-white border-2 border-red-400 flex flex-col items-center justify-center font-bold text-xs active:scale-95 shadow-md shadow-red-600/30"
            >
              <span>A</span>
              <span className="text-[8px] font-normal">Zıpla</span>
            </button>
          </div>
        </div>

        {/* Footer info & hotkeys */}
        <div className="bg-slate-950/90 px-4 py-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
          <div className="flex items-center gap-3">
            <span>🎮 Kontrol: <strong>A, D / Oklar</strong></span>
            <span>🚀 Zıplama: <strong>Boşluk / W</strong></span>
            <span>🔥 Ateş / Koşma: <strong>Shift / X</strong></span>
            <span>⏸️ Duraklat: <strong>P</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestartLevel}
              className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Bölümü Baştan Başlat
            </button>
          </div>
        </div>
      </div>

      {/* DOWNLOAD / EXPORT MODAL */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-100">
                    Mario Oyun Paketini İndir
                  </h3>
                  <p className="text-xs text-slate-400">
                    Derleme gerektirmeyen, doğrudan çalışan saf HTML, CSS ve JavaScript
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs sm:text-sm">
              <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-xl p-3.5 flex items-start gap-3">
                <Award className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-emerald-300 text-xs sm:text-sm">
                    Sıfır Kurulum, Sıfır Derleme Gereksinimi!
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    İndirdiğiniz paketteki <strong>index.html</strong> dosyasına çift tıklayarak Chrome, Edge, Safari, Firefox veya herhangi bir tarayıcıda hemen oynayabilirsiniz. Node.js veya sunucu gerekmez.
                  </p>
                </div>
              </div>

              {/* Download Buttons Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => downloadStandaloneZip()}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium shadow-lg shadow-emerald-900/30 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">ZIP Paketi İndir</div>
                    <div className="text-[11px] text-emerald-100">index.html, style.css, game.js</div>
                  </div>
                </button>

                <button
                  onClick={() => downloadSingleFileHtml()}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-900/30 transition text-left cursor-pointer group"
                >
                  <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm">Tek Dosya HTML İndir</div>
                    <div className="text-[11px] text-blue-100">Tümü tek dosyada gömülü</div>
                  </div>
                </button>
              </div>

              {/* Code Inspection Tabs */}
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
                  <div className="flex gap-1">
                    {(['html', 'css', 'js'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveCodeTab(tab)}
                        className={`px-3 py-1 rounded text-xs font-mono uppercase transition cursor-pointer ${
                          activeCodeTab === tab
                            ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tab === 'html' ? 'index.html' : tab === 'css' ? 'style.css' : 'game.js'}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const code =
                        activeCodeTab === 'html'
                          ? getStandaloneHtml()
                          : activeCodeTab === 'css'
                          ? getStandaloneCss()
                          : getStandaloneJs();
                      handleCopyCode(code, activeCodeTab);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                  >
                    {copiedTab === activeCodeTab ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-medium">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed bg-slate-950">
                  <pre className="whitespace-pre">
                    {activeCodeTab === 'html'
                      ? getStandaloneHtml().slice(0, 3000) + '\n... (tamamı indirilen dosyada)'
                      : activeCodeTab === 'css'
                      ? getStandaloneCss().slice(0, 3000) + '\n... (tamamı indirilen dosyada)'
                      : getStandaloneJs().slice(0, 3000) + '\n... (tamamı indirilen dosyada)'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
