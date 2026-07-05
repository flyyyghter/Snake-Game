/**
 * Hebi Run! 蛇 - Anime Snake Game
 * Core Game Logic, Graphics Renderer & Audio Synthesizer
 */

// Web Audio API Synthesizer
const SoundFX = {
    ctx: null,

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    playSelect() {
        if (!this.ctx) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    },

    playEat() {
        if (!this.ctx) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, this.ctx.currentTime);
        // Happy ascending dual tones
        osc.frequency.setValueAtTime(330, this.ctx.currentTime);
        osc.frequency.setValueAtTime(440, this.ctx.currentTime + 0.05);
        osc.frequency.setValueAtTime(660, this.ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    },

    playPowerup() {
        if (!this.ctx) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        
        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + index * 0.06);
            
            gain.gain.setValueAtTime(0.15, now + index * 0.06);
            gain.gain.linearRampToValueAtTime(0.01, now + index * 0.06 + 0.2);
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.start(now + index * 0.06);
            osc.stop(now + index * 0.06 + 0.2);
        });
    },

    playDash() {
        if (!this.ctx) return;
        this.init();
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        
        // Lowpass filter for sweeping whoosh effect
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.25);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    },

    playCrash() {
        if (!this.ctx) return;
        this.init();
        
        const now = this.ctx.currentTime;
        
        // Lower dramatic boom note
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.5);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(now + 0.5);

        // Noise buffer for explosion crunch
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(300, now);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.2, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
        
        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noiseNode.start();
        noiseNode.stop(now + 0.4);
    }
};

// Game Configuration & Characters
const CHARACTERS = {
    sakura: {
        id: 'sakura',
        name: 'Mochi',
        fullName: 'Mochi (Sakura Spirit)',
        avatar: '🌸',
        speed: 130, // update rate in ms
        dashCooldown: 3000, // ms
        themeColor: '#ff7eb9',
        secondaryColor: '#ffd3e8',
        trail: 'sakura',
        dialogueWin: 'Вау, Сэмпай! Это потрясающий счет! Сакура цветет в твою честь! 🌸✨',
        dialogueLose: 'О нет, Сэмпай! Мы врезались! Давай попробуем еще раз? 🥺🌸',
        foodList: ['🍡', '🍣', '🍙', '🍦']
    },
    cyber: {
        id: 'cyber',
        name: 'Ryu',
        fullName: 'Ryu (Cyber Ninja)',
        avatar: '⚡',
        speed: 90, // faster
        dashCooldown: 1200, // half cooldown
        themeColor: '#00f0ff',
        secondaryColor: '#7000ff',
        trail: 'cyber',
        dialogueWin: 'Превосходно! Взлом системы прошел успешно, Сэмпай! Новый рекорд! ⚡😎',
        dialogueLose: 'Системный сбой! Перезагрузка... Сэмпай, соберись! ⚡🤖',
        foodList: ['🍜', '🥤', '🍙', '🔋']
    },
    magic: {
        id: 'magic',
        name: 'Piko',
        fullName: 'Piko (Magical Mascot)',
        avatar: '⭐',
        speed: 110,
        dashCooldown: 2200,
        themeColor: '#b624ff',
        secondaryColor: '#ffda79',
        trail: 'magic',
        dialogueWin: 'Ура-а! Это самая настоящая магия, Сэмпай! Ты лучший! ⭐🍭',
        dialogueLose: 'Упс! Волшебство закончилось... Но мы можем начать сначала! ✨🐱',
        foodList: ['🍰', '🍩', '🍡', '🍭']
    }
};

// Main Game Controller
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Dimensions
        this.gridSize = 20; // 20x20 grid
        this.cellSize = this.canvas.width / this.gridSize; // 30px per cell
        
        // Navigation / Controls mapping
        this.activeChar = CHARACTERS.sakura;
        this.activeTheme = 'sakura';
        this.gameState = 'START'; // START, PLAYING, PAUSED, GAMEOVER
        
        // Game stats
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('hebi_high_score')) || 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.maxComboTimer = 3000; // 3 seconds to chain food
        this.maxComboAchieved = 1;
        this.highScoreBeaten = false;
        
        // Snake State
        this.snake = [];
        this.dir = { x: 0, y: 0 };
        this.nextDir = { x: 0, y: 0 };
        this.growing = 0;
        
        // Food State
        this.food = { x: 0, y: 0, emoji: '🍡', type: 'normal' };
        this.powerupActive = null; // 'spicy', 'tea', 'star'
        this.powerupTimeLeft = 0; // ms
        
        // Dash mechanics
        this.dashCharge = 1.0; // 0.0 to 1.0
        this.dashCooldownActive = false;
        this.dashing = false;
        this.dashDuration = 0; // remaining dash ticks
        
        // Particle Engine
        this.particles = [];
        this.floatingTexts = [];
        
        // Cam shake effect
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        
        // Timing loops
        this.lastTickTime = 0;
        
        this.initUI();
        this.initControls();
        this.setStageBackground('start');
        
        // Render loop
        requestAnimationFrame((t) => this.loop(t));
    }

    initUI() {
        // High scores loaded
        document.getElementById('high-score').textContent = this.formatScore(this.highScore);
        
        // Setup character clicks
        const cards = document.querySelectorAll('.character-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                SoundFX.playSelect();
                cards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                const charType = card.dataset.char;
                this.activeChar = CHARACTERS[charType];
            });
        });

        // Setup theme clicks
        const themeCards = document.querySelectorAll('.theme-card');
        themeCards.forEach(tCard => {
            tCard.addEventListener('click', () => {
                SoundFX.playSelect();
                themeCards.forEach(c => c.classList.remove('active'));
                tCard.classList.add('active');
                this.activeTheme = tCard.dataset.theme;
            });
        });

        // Start button click
        document.getElementById('start-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.startGame();
        });

        // Resume, Restart, Menu buttons
        document.getElementById('resume-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.resumeGame();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.startGame();
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.exitToMenu();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.startGame();
        });

        document.getElementById('go-menu-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            this.exitToMenu();
        });

        // Touch Pause Button
        document.getElementById('touch-pause-btn').addEventListener('click', () => {
            SoundFX.playSelect();
            if (this.gameState === 'PLAYING') {
                this.pauseGame();
            }
        });
    }

    initControls() {
        // Keyboard Listener
        window.addEventListener('keydown', (e) => {
            if (this.gameState === 'PLAYING') {
                switch(e.key.toLowerCase()) {
                    case 'w':
                    case 'arrowup':
                        if (this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
                        break;
                    case 's':
                    case 'arrowdown':
                        if (this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
                        break;
                    case 'a':
                    case 'arrowleft':
                        if (this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
                        break;
                    case 'd':
                    case 'arrowright':
                        if (this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
                        break;
                    case ' ':
                        this.triggerDash();
                        e.preventDefault();
                        break;
                    case 'escape':
                    case 'p':
                        this.pauseGame();
                        break;
                }
            } else if (this.gameState === 'PAUSED' && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) {
                this.resumeGame();
            }
        });

        // Mobile D-Pad listeners
        const dpadMap = {
            'ctrl-up': { x: 0, y: -1, restrict: 'y' },
            'ctrl-down': { x: 0, y: 1, restrict: 'y' },
            'ctrl-left': { x: -1, y: 0, restrict: 'x' },
            'ctrl-right': { x: 1, y: 0, restrict: 'x' }
        };

        Object.entries(dpadMap).forEach(([id, move]) => {
            const btn = document.getElementById(id);
            const handleDirection = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                if (this.gameState !== 'PLAYING') return;
                
                // Block moving back on itself
                if (move.restrict === 'y' && this.dir.y !== 0) return;
                if (move.restrict === 'x' && this.dir.x !== 0) return;
                
                this.nextDir = { x: move.x, y: move.y };
            };
            btn.addEventListener('touchstart', handleDirection);
            btn.addEventListener('mousedown', handleDirection);
        });

        // Touch Dash Button
        const dashBtn = document.getElementById('ctrl-dash');
        const handleDash = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.triggerDash();
        };
        dashBtn.addEventListener('touchstart', handleDash);
        dashBtn.addEventListener('mousedown', handleDash);
    }

    setStageBackground(stage) {
        document.body.className = '';
        document.body.classList.add(`stage-${stage}`);
    }

    formatScore(val) {
        return String(val).padStart(5, '0');
    }

    triggerDash() {
        if (this.dashCharge >= 1.0 && !this.dashing && !this.dashCooldownActive) {
            this.dashing = true;
            this.dashDuration = 6; // dash lasts 6 game loops
            this.dashCharge = 0.0;
            SoundFX.playDash();
            this.shakeScreen(3, 100);
        }
    }

    shakeScreen(intensity, durationMs) {
        this.shakeIntensity = intensity;
        this.shakeTimer = durationMs;
    }

    startGame() {
        // Start screen transition
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('game-over-overlay').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');
        
        this.setStageBackground(this.activeTheme);
        
        // Reset Variables
        this.score = 0;
        this.combo = 1;
        this.comboTimer = 0;
        this.maxComboAchieved = 1;
        this.highScoreBeaten = false;
        this.growing = 0;
        this.particles = [];
        this.floatingTexts = [];
        this.powerupActive = null;
        this.powerupTimeLeft = 0;
        this.dashCharge = 1.0;
        this.dashing = false;
        
        // D-Pad and pause visual initialization
        document.getElementById('current-score').textContent = this.formatScore(0);
        document.getElementById('combo-bar').style.width = '0%';
        document.getElementById('combo-multiplier').textContent = 'x1';
        document.getElementById('powerup-display').classList.remove('active');
        
        // Initialize Snake positioning (center, moving right)
        this.snake = [
            { x: 10, y: 10 },
            { x: 9, y: 10 },
            { x: 8, y: 10 }
        ];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        
        this.spawnFood();
        
        this.gameState = 'PLAYING';
        this.lastTickTime = performance.now();
        
        // Warm up sound context on interaction
        SoundFX.init();
    }

    pauseGame() {
        if (this.gameState !== 'PLAYING') return;
        this.gameState = 'PAUSED';
        document.getElementById('pause-overlay').classList.add('active');
    }

    resumeGame() {
        if (this.gameState !== 'PAUSED') return;
        document.getElementById('pause-overlay').classList.remove('active');
        this.gameState = 'PLAYING';
        this.lastTickTime = performance.now();
    }

    exitToMenu() {
        document.getElementById('pause-overlay').classList.remove('active');
        document.getElementById('game-over-overlay').classList.remove('active');
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('active');
        this.setStageBackground('start');
        this.gameState = 'START';
    }

    spawnFood() {
        let attempts = 0;
        let validPos = false;
        let rx = 0, ry = 0;
        
        while (!validPos && attempts < 100) {
            rx = Math.floor(Math.random() * this.gridSize);
            ry = Math.floor(Math.random() * this.gridSize);
            
            // Check snake overlap
            validPos = true;
            for (let segment of this.snake) {
                if (segment.x === rx && segment.y === ry) {
                    validPos = false;
                    break;
                }
            }
            attempts++;
        }
        
        // Select food type
        let foodType = 'normal';
        let roll = Math.random();
        let emoji = '';
        
        // Powerup roll (12% chance for powerup)
        if (roll < 0.12) {
            const powerups = [
                { type: 'spicy', emoji: '🌶️' },
                { type: 'tea', emoji: '🍵' },
                { type: 'star', emoji: '⭐' }
            ];
            const p = powerups[Math.floor(Math.random() * powerups.length)];
            foodType = p.type;
            emoji = p.emoji;
        } else {
            // Get character specific anime food
            const fl = this.activeChar.foodList;
            emoji = fl[Math.floor(Math.random() * fl.length)];
        }
        
        this.food = { x: rx, y: ry, emoji, type: foodType };
    }

    triggerGameOver() {
        this.gameState = 'GAMEOVER';
        SoundFX.playCrash();
        this.shakeScreen(10, 400);
        
        // Generate splash particles
        const head = this.snake[0];
        this.spawnExplosion(head.x * this.cellSize + this.cellSize/2, head.y * this.cellSize + this.cellSize/2, this.activeChar.themeColor, 40);
        
        // Save High Score
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('hebi_high_score', this.highScore);
            document.getElementById('high-score').textContent = this.formatScore(this.highScore);
            this.highScoreBeaten = true;
        } else {
            this.highScoreBeaten = false;
        }
        
        // Update DOM elements on VN panel
        document.getElementById('vn-chibi').textContent = this.activeChar.avatar;
        document.getElementById('vn-name').textContent = this.activeChar.name;
        
        const dialogueBox = document.getElementById('vn-dialogue');
        if (this.highScoreBeaten) {
            dialogueBox.textContent = this.activeChar.dialogueWin;
            document.getElementById('new-record-badge').style.display = 'inline-block';
        } else {
            dialogueBox.textContent = this.activeChar.dialogueLose;
            document.getElementById('new-record-badge').style.display = 'none';
        }
        
        document.getElementById('final-score').textContent = this.formatScore(this.score);
        document.getElementById('final-combo').textContent = `x${this.maxComboAchieved}`;
        
        // Show Overlay
        setTimeout(() => {
            document.getElementById('game-over-overlay').classList.add('active');
        }, 500);
    }

    spawnExplosion(cx, cy, color, count) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 4 + 2;
            this.particles.push({
                x: cx,
                y: cy,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Math.random() * 6 + 3,
                color: color,
                opacity: 1.0,
                decay: Math.random() * 0.03 + 0.015,
                shape: Math.random() < 0.3 ? 'blossom' : 'circle'
            });
        }
    }

    spawnFloatingText(text, cx, cy, color) {
        this.floatingTexts.push({
            text,
            x: cx,
            y: cy,
            vy: -1.2,
            opacity: 1.0,
            color,
            font: 'Fredoka'
        });
    }

    loop(currentTime) {
        requestAnimationFrame((t) => this.loop(t));
        
        // Calculate dynamic delta time for visual smooth interpolation (like floating text & particles)
        const dt = currentTime - (this.lastTickTime || currentTime);
        
        // Handle Game Tick speed
        let speed = this.activeChar.speed;
        
        // Spicy speed multiplier
        if (this.powerupActive === 'spicy') {
            speed *= 0.6; // 40% faster speed
        }
        // Tea slow down
        if (this.powerupActive === 'tea') {
            speed *= 1.4; // 40% slower speed
        }
        // Dashing speed boost
        if (this.dashing) {
            speed *= 0.35; // ultra fast while dashing
        }
        
        if (this.gameState === 'PLAYING') {
            // Check tick timer
            if (currentTime - this.lastTickTime >= speed) {
                this.tick();
                this.lastTickTime = currentTime;
            }
            
            // Decrement combo bar
            if (this.combo > 1) {
                this.comboTimer -= dt;
                if (this.comboTimer <= 0) {
                    this.combo = 1;
                    document.getElementById('combo-multiplier').textContent = 'x1';
                    document.getElementById('combo-bar').style.width = '0%';
                } else {
                    const pct = (this.comboTimer / this.maxComboTimer) * 100;
                    document.getElementById('combo-bar').style.width = `${pct}%`;
                }
            }
            
            // Active powerups timers
            if (this.powerupActive) {
                this.powerupTimeLeft -= dt;
                if (this.powerupTimeLeft <= 0) {
                    this.powerupActive = null;
                    document.getElementById('powerup-display').classList.remove('active');
                } else {
                    document.getElementById('powerup-timer').textContent = `${Math.ceil(this.powerupTimeLeft / 1000)}s`;
                }
            }
            
            // Dash charge recovery
            if (!this.dashing) {
                let recovery = 0.0003 * dt;
                if (this.activeChar.id === 'cyber') recovery *= 2.2; // faster dash recovery
                this.dashCharge = Math.min(1.0, this.dashCharge + recovery);
                document.getElementById('dash-bar').style.width = `${this.dashCharge * 100}%`;
                
                // Toggle glowing class on HUD dash
                if (this.dashCharge >= 1.0) {
                    document.getElementById('dash-bar').style.background = `linear-gradient(90deg, #7000ff, ${this.activeChar.themeColor})`;
                } else {
                    document.getElementById('dash-bar').style.background = '#444';
                }
            }
        }
        
        // Frame Screen shake calculation
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
            if (this.shakeTimer <= 0) {
                this.shakeIntensity = 0;
            }
        }

        // Draw Canvas Frame
        this.render();
        
        // Update graphics assets (particles, text)
        this.updateVisuals(dt);
    }

    tick() {
        // Snake movement vector
        this.dir = this.nextDir;
        
        // Calculate new head
        const head = this.snake[0];
        const newHead = {
            x: head.x + this.dir.x,
            y: head.y + this.dir.y
        };
        
        // Wall collisions
        if (newHead.x < 0 || newHead.x >= this.gridSize || newHead.y < 0 || newHead.y >= this.gridSize) {
            this.triggerGameOver();
            return;
        }
        
        // Tail collisions (except last segment if snake is not growing)
        for (let i = 0; i < this.snake.length - 1; i++) {
            if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
                this.triggerGameOver();
                return;
            }
        }
        
        // Push head to front
        this.snake.unshift(newHead);
        
        // Food check collision
        if (newHead.x === this.food.x && newHead.y === this.food.y) {
            this.handleFoodEaten();
            this.spawnFood();
        } else {
            if (this.growing > 0) {
                this.growing--;
            } else {
                this.snake.pop(); // remove tail
            }
        }
        
        // Dash duration ticking
        if (this.dashing) {
            this.dashDuration--;
            
            // Spawn trail particles
            const tail = this.snake[this.snake.length - 1];
            this.spawnExplosion(newHead.x * this.cellSize + this.cellSize/2, newHead.y * this.cellSize + this.cellSize/2, this.activeChar.themeColor, 2);
            
            if (this.dashDuration <= 0) {
                this.dashing = false;
            }
        }
    }

    handleFoodEaten() {
        let pts = 10;
        let color = this.activeChar.themeColor;
        let isSpecial = false;
        
        SoundFX.playEat();
        
        // Scale body growth
        this.growing += 1;
        
        // Base food settings
        switch (this.food.type) {
            case 'spicy':
                this.powerupActive = 'spicy';
                this.powerupTimeLeft = 8000;
                document.getElementById('powerup-display').classList.add('active');
                document.querySelector('.powerup-icon').textContent = '🌶️';
                document.querySelector('.powerup-timer').textContent = '8s';
                pts = 25;
                isSpecial = true;
                color = '#ff3c00';
                SoundFX.playPowerup();
                this.shakeScreen(3, 200);
                break;
            case 'tea':
                this.powerupActive = 'tea';
                this.powerupTimeLeft = 8000;
                document.getElementById('powerup-display').classList.add('active');
                document.querySelector('.powerup-icon').textContent = '🍵';
                document.querySelector('.powerup-timer').textContent = '8s';
                pts = 20;
                isSpecial = true;
                color = '#00ff66';
                SoundFX.playPowerup();
                break;
            case 'star':
                this.powerupActive = 'star';
                this.powerupTimeLeft = 8000;
                document.getElementById('powerup-display').classList.add('active');
                document.querySelector('.powerup-icon').textContent = '⭐';
                document.querySelector('.powerup-timer').textContent = '8s';
                pts = 40;
                isSpecial = true;
                color = '#ffda79';
                SoundFX.playPowerup();
                this.shakeScreen(4, 250);
                break;
            default:
                pts = 10;
        }

        // Apply double score logic under golden star active status
        if (this.powerupActive === 'star') {
            pts *= 2;
        }
        
        // Calculate Combo Multiplier
        let comboLimit = this.maxComboTimer;
        if (this.activeChar.id === 'magic') comboLimit = 5000; // Piko gets 5 seconds combos
        
        this.score += pts * this.combo;
        
        // Floating combo text indicators
        let floatingLabel = `+${pts * this.combo}`;
        if (this.combo > 1) {
            floatingLabel += ` (x${this.combo})`;
        }
        
        this.spawnFloatingText(
            floatingLabel, 
            this.food.x * this.cellSize + this.cellSize/2, 
            this.food.y * this.cellSize, 
            color
        );
        
        // Trigger extra aesthetic words on higher combo rates
        if (this.combo >= 3) {
            const animes = ['SUGOI!', 'OISHI!', 'KAWAII!', 'GENKI!', 'SENPAI!'];
            const randomMsg = animes[Math.floor(Math.random() * animes.length)];
            setTimeout(() => {
                this.spawnFloatingText(
                    randomMsg, 
                    this.food.x * this.cellSize + this.cellSize/2, 
                    this.food.y * this.cellSize - 15, 
                    '#ffffff'
                );
            }, 150);
        }
        
        // Update DOM Score & Combo bars
        document.getElementById('current-score').textContent = this.formatScore(this.score);
        
        // Advance combo rating
        this.combo++;
        this.maxComboAchieved = Math.max(this.maxComboAchieved, this.combo - 1);
        this.comboTimer = comboLimit;
        document.getElementById('combo-multiplier').textContent = `x${this.combo}`;
        
        // Particles explosion
        this.spawnExplosion(
            this.food.x * this.cellSize + this.cellSize/2, 
            this.food.y * this.cellSize + this.cellSize/2, 
            color, 
            isSpecial ? 25 : 12
        );
    }

    updateVisuals(dt) {
        // Particle loops
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.opacity -= p.decay;
            if (p.opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Floating text loops
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.opacity -= 0.015;
            if (ft.opacity <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.save();
        
        // Camera shake translation
        if (this.shakeTimer > 0) {
            const dx = (Math.random() * 2 - 1) * this.shakeIntensity;
            const dy = (Math.random() * 2 - 1) * this.shakeIntensity;
            this.ctx.translate(dx, dy);
        }
        
        // Grid pattern drawing (Neon overlay)
        this.drawGrid();
        
        if (this.gameState === 'PLAYING' || this.gameState === 'PAUSED' || this.gameState === 'GAMEOVER') {
            // Draw Food
            this.drawFood();
            
            // Draw Snake
            this.drawSnake();
            
            // Draw Particle effects
            this.drawParticles();
            
            // Draw Floating texts
            this.drawFloatingTexts();
        }
        
        this.ctx.restore();
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        this.ctx.lineWidth = 1;
        
        // Apply glowing grid accent colors according to theme selection
        if (this.activeTheme === 'tokyo') {
            this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
        } else if (this.activeTheme === 'sakura') {
            this.ctx.strokeStyle = 'rgba(255, 126, 185, 0.05)';
        } else if (this.activeTheme === 'magic') {
            this.ctx.strokeStyle = 'rgba(182, 36, 255, 0.05)';
        }

        for (let i = 0; i <= this.gridSize; i++) {
            // Verticals
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
            
            // Horizontals
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawSnake() {
        const themeCol = this.activeChar.themeColor;
        const secCol = this.activeChar.secondaryColor;
        
        // Trail Drawing / Glow setups
        this.ctx.shadowBlur = this.dashing ? 15 : 8;
        this.ctx.shadowColor = themeCol;
        
        this.snake.forEach((seg, index) => {
            const cx = seg.x * this.cellSize + this.cellSize/2;
            const cy = seg.y * this.cellSize + this.cellSize/2;
            
            // Calculate size tapering towards tail
            const progress = index / this.snake.length;
            const radius = (this.cellSize / 2) * (1 - progress * 0.45);
            
            if (index === 0) {
                // DRAW HEAD
                this.ctx.fillStyle = themeCol;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, this.cellSize/2 - 1, 0, Math.PI*2);
                this.ctx.fill();
                
                // Draw blush cheek markers for super cute anime feel
                this.ctx.shadowBlur = 0; // turn off shadow blur for cheeks/eyes
                this.ctx.fillStyle = 'rgba(255, 100, 150, 0.6)';
                
                // Position offset depending on move vector direction
                let cheekOffsetLeft = { x: -6, y: 0 };
                let cheekOffsetRight = { x: 6, y: 0 };
                
                if (this.dir.x !== 0) {
                    cheekOffsetLeft = { x: this.dir.x * 4, y: -6 };
                    cheekOffsetRight = { x: this.dir.x * 4, y: 6 };
                } else if (this.dir.y !== 0) {
                    cheekOffsetLeft = { x: -6, y: this.dir.y * 4 };
                    cheekOffsetRight = { x: 6, y: this.dir.y * 4 };
                }
                
                this.ctx.beginPath();
                this.ctx.arc(cx + cheekOffsetLeft.x, cy + cheekOffsetLeft.y, 3, 0, Math.PI*2);
                this.ctx.arc(cx + cheekOffsetRight.x, cy + cheekOffsetRight.y, 3, 0, Math.PI*2);
                this.ctx.fill();
                
                // Draw cute anime eye sparkles
                this.ctx.fillStyle = '#ffffff';
                let eyeOffsetLeft = { x: -4, y: -3 };
                let eyeOffsetRight = { x: 4, y: -3 };
                
                if (this.dir.x > 0) { // Right
                    eyeOffsetLeft = { x: 6, y: -4 };
                    eyeOffsetRight = { x: 6, y: 3 };
                } else if (this.dir.x < 0) { // Left
                    eyeOffsetLeft = { x: -6, y: -4 };
                    eyeOffsetRight = { x: -6, y: 3 };
                } else if (this.dir.y > 0) { // Down
                    eyeOffsetLeft = { x: -4, y: 6 };
                    eyeOffsetRight = { x: 4, y: 6 };
                } else if (this.dir.y < 0) { // Up
                    eyeOffsetLeft = { x: -4, y: -6 };
                    eyeOffsetRight = { x: 4, y: -6 };
                }
                
                this.ctx.beginPath();
                this.ctx.arc(cx + eyeOffsetLeft.x, cy + eyeOffsetLeft.y, 2, 0, Math.PI*2);
                this.ctx.arc(cx + eyeOffsetRight.x, cy + eyeOffsetRight.y, 2, 0, Math.PI*2);
                this.ctx.fill();
                
            } else {
                // DRAW BODY SEGMENTS
                this.ctx.fillStyle = index % 2 === 0 ? themeCol : secCol;
                
                this.ctx.shadowBlur = this.dashing ? 12 : 4;
                this.ctx.shadowColor = themeCol;
                
                // Distinct styles depending on selected character custom themes
                if (this.activeChar.trail === 'sakura') {
                    // Petal shapes
                    this.drawFlowerPetal(cx, cy, radius);
                } else if (this.activeChar.trail === 'cyber') {
                    // Neon blocks
                    this.ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
                } else {
                    // Star shape / Bubbles
                    this.drawStar(cx, cy, 5, radius, radius/2);
                }
            }
        });
        
        // Reset Shadow Glows
        this.ctx.shadowBlur = 0;
    }

    drawFlowerPetal(cx, cy, r) {
        this.ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * Math.PI * 2) / 5;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            this.ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
        }
        this.ctx.fill();
    }

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
    }

    drawFood() {
        const x = this.food.x * this.cellSize + this.cellSize/2;
        const y = this.food.y * this.cellSize + this.cellSize/2 + 2; // minor emoji offset adjust
        
        this.ctx.save();
        
        // Food floating animation
        const floatOffset = Math.sin(performance.now() / 150) * 3;
        
        // Glow effect
        if (this.food.type !== 'normal') {
            this.ctx.shadowBlur = 18;
            if (this.food.type === 'spicy') this.ctx.shadowColor = '#ff3c00';
            else if (this.food.type === 'tea') this.ctx.shadowColor = '#00ff66';
            else if (this.food.type === 'star') this.ctx.shadowColor = '#ffda79';
        } else {
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = 'rgba(255,255,255,0.4)';
        }
        
        this.ctx.font = `${this.cellSize * 0.85}px Outfit`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        
        // Draw emoji
        this.ctx.fillText(this.food.emoji, x, y + floatOffset);
        
        this.ctx.restore();
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.fillStyle = p.color;
            this.ctx.shadowBlur = 4;
            this.ctx.shadowColor = p.color;
            
            this.ctx.beginPath();
            if (p.shape === 'blossom') {
                // Sakura small flower petals
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            } else {
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            }
            this.ctx.fill();
            this.ctx.restore();
        });
    }

    drawFloatingTexts() {
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = ft.opacity;
            this.ctx.fillStyle = ft.color;
            
            // Neon Text Glow Outline
            this.ctx.shadowBlur = 6;
            this.ctx.shadowColor = ft.color;
            
            this.ctx.font = `bold 14px '${ft.font}', sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });
    }
}

// Instantiate game on load
window.addEventListener('DOMContentLoaded', () => {
    window.gameEngine = new Game();
});
