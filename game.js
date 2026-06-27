/**
 * NEON ARCADE - DODGE MASTER (UPGRADED)
 * Advanced futuristic reflex-based dodging game
 * Features: Wave system, health system, combo multiplier, rankings
 */

class NeonArcadeGameUpgraded {
    constructor() {
        // Canvas Setup
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());

        // Game States
        this.gameState = 'start'; // start, playing, paused, gameOver
        this.isPaused = false;

        // Difficulty Levels
        this.difficulties = {
            easy: { speedMult: 0.6, obstacleFreq: 1.4, scale: 0.8, health: 3, waveInterval: 2500 },
            normal: { speedMult: 1.0, obstacleFreq: 1.0, scale: 1.0, health: 2, waveInterval: 2000 },
            hard: { speedMult: 1.5, obstacleFreq: 0.6, scale: 1.2, health: 1, waveInterval: 1500 }
        };
        this.currentDifficulty = 'normal';

        // Player
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 80,
            width: 30,
            height: 30,
            velocity: { x: 0, y: 0 },
            speed: 10,
            color: '#00ff88',
            trail: [],
            maxTrail: 20,
            health: 2,
            maxHealth: 2,
            shield: true,
            shieldDuration: 0,
            maxShieldDuration: 300
        };

        // Game Variables
        this.gameTime = 0;
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.gameSpeed = 1.0;
        this.maxGameSpeed = 4.0;
        this.speedIncreaseRate = 0.002;
        this.obstacles = [];
        this.obstacleSpawnRate = 0.04;
        this.obstacleCounter = 0;
        this.obstaclesDodged = 0;
        this.wave = 1;
        this.waveStartTime = 0;
        this.waveInterval = this.difficulties[this.currentDifficulty].waveInterval;
        this.maxSpeed = 1.0;

        // Controls
        this.keys = {};
        this.setupControls();

        // UI Elements
        this.setupUIElements();

        // High Score
        this.highScore = parseInt(localStorage.getItem('neonArcadeHighScore')) || 0;
        this.updateHighScoreDisplay();

        // Sound System
        this.soundEnabled = true;
        this.initSounds();

        // Particles
        this.particles = [];
        this.effects = [];

        // Performance
        this.frameCount = 0;
        this.fps = 60;
        this.lastFrameTime = 0;

        // Start Game Loop
        this.startGameLoop();
    }

    /**
     * CANVAS MANAGEMENT
     */
    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    /**
     * UI SETUP
     */
    setupUIElements() {
        // Screen Elements
        this.startScreen = document.getElementById('startScreen');
        this.gameScreen = document.getElementById('gameScreen');
        this.pauseScreen = document.getElementById('pauseScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');

        // Buttons
        document.getElementById('playButton').addEventListener('click', () => this.startGame());
        document.getElementById('pauseButton').addEventListener('click', () => this.togglePause());
        document.getElementById('resumeButton').addEventListener('click', () => this.togglePause());
        document.getElementById('quitButton').addEventListener('click', () => this.goToMenu());
        document.getElementById('retryButton').addEventListener('click', () => this.startGame());
        document.getElementById('menuButton').addEventListener('click', () => this.goToMenu());

        // Difficulty Selection
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentDifficulty = btn.dataset.difficulty;
                const diff = this.difficulties[this.currentDifficulty];
                this.player.maxHealth = diff.health;
                this.waveInterval = diff.waveInterval;
            });
        });

        // Mobile Controls
        document.getElementById('leftBtn').addEventListener('touchstart', () => this.keys['Left'] = true, { passive: true });
        document.getElementById('leftBtn').addEventListener('touchend', () => this.keys['Left'] = false, { passive: true });
        document.getElementById('rightBtn').addEventListener('touchstart', () => this.keys['Right'] = true, { passive: true });
        document.getElementById('rightBtn').addEventListener('touchend', () => this.keys['Right'] = false, { passive: true });

        // HUD Elements
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.speedDisplay = document.getElementById('speedDisplay');
        this.multiplierDisplay = document.querySelectorAll('[id*="multiplier"], [id*="Combo"]');
        this.timeDisplay = document.getElementById('timeDisplay');
        this.waveDisplay = document.getElementById('waveDisplay');
        this.dodgedCountDisplay = document.getElementById('dodgedCount');
        this.comboDisplay = document.getElementById('comboDisplay');
        this.healthDisplay = document.getElementById('healthDisplay');
        this.dangerIndicator = document.getElementById('dangerIndicator');

        // Game Over Elements
        this.finalScore = document.getElementById('finalScore');
        this.survivalTime = document.getElementById('survivalTime');
        this.highScoreCheck = document.getElementById('highScoreCheck');
        this.obstaclesDodgedDisplay = document.getElementById('obstaclesDodged');
        this.maxSpeedDisplay = document.getElementById('maxSpeed');
        this.wavesSurvivedDisplay = document.getElementById('wavesSurvived');
        this.maxComboDisplay = document.getElementById('maxCombo');
        this.rankingDisplay = document.getElementById('rankingDisplay');

        // Pause Elements
        this.pauseScore = document.getElementById('pauseScore');
        this.pauseTime = document.getElementById('pauseTime');
    }

    /**
     * CONTROL SETUP
     */
    setupControls() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === 'Escape' && this.gameState === 'playing') {
                this.togglePause();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Touch support
        document.addEventListener('touchmove', (e) => {
            if (this.gameState === 'playing' && !this.isPaused) {
                const touch = e.touches[0];
                const centerX = this.canvas.width / 2;
                this.keys['Left'] = touch.clientX < centerX;
                this.keys['Right'] = touch.clientX >= centerX;
            }
        }, { passive: true });

        document.addEventListener('touchend', () => {
            this.keys['Left'] = false;
            this.keys['Right'] = false;
        }, { passive: true });
    }

    /**
     * SOUND SYSTEM
     */
    initSounds() {
        this.sounds = {
            hit: { frequency: 150, duration: 0.15 },
            collect: { frequency: 800, duration: 0.1 },
            click: { frequency: 400, duration: 0.08 },
            wave: { frequency: 600, duration: 0.2 },
            combo: { frequency: 1000, duration: 0.12 }
        };
    }

    playSound(soundName) {
        if (!this.soundEnabled || !this.sounds[soundName]) return;
        const sound = this.sounds[soundName];
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioContext.createOscillator();
            const gain = audioContext.createGain();
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.frequency.value = sound.frequency;
            gain.gain.setValueAtTime(0.2, audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + sound.duration);
            osc.start(audioContext.currentTime);
            osc.stop(audioContext.currentTime + sound.duration);
        } catch (e) {
            // Audio context error - continue silently
        }
    }

    /**
     * GAME STATE MANAGEMENT
     */
    startGame() {
        const diff = this.difficulties[this.currentDifficulty];
        
        this.gameState = 'playing';
        this.isPaused = false;
        this.gameTime = 0;
        this.score = 0;
        this.combo = 1;
        this.maxCombo = 1;
        this.gameSpeed = 1.0;
        this.maxSpeed = 1.0;
        this.wave = 1;
        this.obstacles = [];
        this.obstaclesDodged = 0;
        this.particles = [];
        this.effects = [];
        this.waveStartTime = 0;

        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height - 80;
        this.player.velocity = { x: 0, y: 0 };
        this.player.trail = [];
        this.player.health = diff.health;
        this.player.maxHealth = diff.health;
        this.player.shield = true;
        this.player.shieldDuration = 0;

        this.switchScreen('gameScreen');
        this.playSound('click');
    }

    togglePause() {
        if (this.gameState !== 'playing') return;

        this.isPaused = !this.isPaused;
        const pauseScreen = document.getElementById('pauseScreen');

        if (this.isPaused) {
            this.pauseScore.textContent = this.score;
            this.pauseTime.textContent = this.formatTime(this.gameTime);
            pauseScreen.classList.add('active');
        } else {
            pauseScreen.classList.remove('active');
            this.playSound('click');
        }
    }

    goToMenu() {
        this.gameState = 'start';
        this.isPaused = false;
        this.switchScreen('startScreen');
        document.getElementById('pauseScreen').classList.remove('active');
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateHighScoreDisplay() {
        document.getElementById('startHighScore').textContent = this.highScore;
    }

    /**
     * TIME FORMATTING
     */
    formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * WAVE SYSTEM
     */
    updateWave() {
        if (this.waveStartTime === 0) {
            this.waveStartTime = this.gameTime;
        }

        const timeSinceWaveStart = this.gameTime - this.waveStartTime;

        if (timeSinceWaveStart > this.waveInterval) {
            this.wave++;
            this.waveStartTime = this.gameTime;
            this.playSound('wave');
            this.createWaveEffect();
        }

        this.waveDisplay.textContent = this.wave;
    }

    createWaveEffect() {
        // Screen shake effect
        this.canvas.style.animation = 'none';
        setTimeout(() => {
            this.canvas.style.animation = 'screen-shake 0.4s cubic-bezier(0.36, 0, 0.66, -0.56)';
        }, 10);

        // Burst particles
        for (let i = 0; i < 15; i++) {
            const angle = (Math.PI * 2 * i) / 15;
            const velocity = {
                x: Math.cos(angle) * 6,
                y: Math.sin(angle) * 6
            };
            this.particles.push({
                x: this.canvas.width / 2,
                y: this.canvas.height / 2,
                vx: velocity.x,
                vy: velocity.y,
                life: 1,
                color: '#ffbe0b',
                size: Math.random() * 5 + 3
            });
        }
    }

    /**
     * PLAYER MANAGEMENT
     */
    updatePlayer() {
        // Handle input
        if (this.keys['ArrowLeft'] || this.keys['Left'] || this.keys['a'] || this.keys['A']) {
            this.player.velocity.x = -this.player.speed;
        } else if (this.keys['ArrowRight'] || this.keys['Right'] || this.keys['d'] || this.keys['D']) {
            this.player.velocity.x = this.player.speed;
        } else {
            this.player.velocity.x = 0;
        }

        // Update position
        this.player.x += this.player.velocity.x;

        // Boundary collision
        if (this.player.x - this.player.width / 2 < 0) {
            this.player.x = this.player.width / 2;
        }
        if (this.player.x + this.player.width / 2 > this.canvas.width) {
            this.player.x = this.canvas.width - this.player.width / 2;
        }

        // Shield system
        if (this.player.shield) {
            this.player.shieldDuration--;
            if (this.player.shieldDuration <= 0) {
                this.player.shield = false;
                this.player.shieldDuration = 0;
            }
        }

        // Trail effect
        this.player.trail.push({
            x: this.player.x,
            y: this.player.y,
            life: 1,
            size: this.player.width / 2
        });
        if (this.player.trail.length > this.player.maxTrail) {
            this.player.trail.shift();
        }

        // Create particles
        if (Math.random() > 0.4) {
            this.particles.push({
                x: this.player.x,
                y: this.player.y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 0.7,
                color: this.player.color,
                size: Math.random() * 2 + 1
            });
        }

        // Danger zone
        if (this.player.y < 200 && this.obstacles.some(o => o.y > this.canvas.height * 0.6)) {
            this.dangerIndicator.classList.add('active');
        } else {
            this.dangerIndicator.classList.remove('active');
        }
    }

    drawPlayer() {
        // Trail
        this.player.trail.forEach((point, index) => {
            const alpha = (index / this.player.trail.length) * 0.7;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = this.player.color;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, point.size * ((index / this.player.trail.length) * 0.5 + 0.5), 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalAlpha = 1;

        // Shield
        if (this.player.shield) {
            const shieldAlpha = (this.player.shieldDuration / this.player.maxShieldDuration) * 0.6;
            this.ctx.globalAlpha = shieldAlpha;
            this.ctx.strokeStyle = '#00d4ff';
            this.ctx.lineWidth = 3;
            this.ctx.shadowColor = '#00d4ff';
            this.ctx.shadowBlur = 20;
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.width, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
            this.ctx.shadowColor = 'transparent';
        }

        // Main player
        this.ctx.fillStyle = this.player.color;
        this.ctx.shadowColor = this.player.color;
        this.ctx.shadowBlur = 25;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.width / 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner glow
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(this.player.x - 4, this.player.y - 4, this.player.width / 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.shadowColor = 'transparent';

        // Health indicator (small circles)
        const healthSize = 4;
        for (let i = 0; i < this.player.maxHealth; i++) {
            const x = this.player.x - (this.player.maxHealth - 1) * healthSize + i * healthSize * 2;
            const y = this.player.y + this.player.width / 2 + 15;
            
            if (i < this.player.health) {
                this.ctx.fillStyle = '#ff006e';
                this.ctx.shadowColor = '#ff006e';
                this.ctx.shadowBlur = 10;
            } else {
                this.ctx.fillStyle = 'rgba(255, 0, 110, 0.2)';
                this.ctx.shadowColor = 'transparent';
            }
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, healthSize, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.shadowColor = 'transparent';
    }

    /**
     * OBSTACLE MANAGEMENT
     */
    spawnObstacle() {
        const diff = this.difficulties[this.currentDifficulty];
        const width = 50 * diff.scale;
        const height = 50 * diff.scale;
        const x = Math.random() * (this.canvas.width - width);
        const type = Math.random();

        let obstacleType;
        if (type < 0.6) obstacleType = 'box';
        else if (type < 0.85) obstacleType = 'spike';
        else obstacleType = 'circle';

        this.obstacles.push({
            x,
            y: -height,
            width,
            height,
            speed: (3 + (this.wave - 1) * 0.5) * this.gameSpeed * diff.speedMult,
            color: this.getRandomObstacleColor(),
            type: obstacleType,
            rotation: 0
        });
    }

    getRandomObstacleColor() {
        const colors = ['#ff006e', '#ffbe0b', '#a855f7', '#00d4ff'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    updateObstacles() {
        this.obstacles = this.obstacles.filter(obs => {
            obs.y += obs.speed;
            obs.rotation += 0.05;

            if (obs.y > this.canvas.height) {
                this.obstaclesDodged++;
                this.combo = Math.floor(this.obstaclesDodged / 5) + 1;
                if (this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                    this.playSound('combo');
                }
                this.updateComboDisplay();
                return false;
            }
            return true;
        });

        // Spawn new obstacles
        const diff = this.difficulties[this.currentDifficulty];
        this.obstacleCounter += (this.obstacleSpawnRate * diff.obstacleFreq * (1 + (this.wave - 1) * 0.1));
        if (this.obstacleCounter > 1) {
            this.spawnObstacle();
            this.obstacleCounter = 0;
        }
    }

    drawObstacles() {
        this.obstacles.forEach(obs => {
            this.ctx.save();
            this.ctx.translate(obs.x + obs.width / 2, obs.y + obs.height / 2);
            this.ctx.rotate(obs.rotation);

            this.ctx.fillStyle = obs.color;
            this.ctx.shadowColor = obs.color;
            this.ctx.shadowBlur = 20;

            if (obs.type === 'spike') {
                this.ctx.beginPath();
                this.ctx.moveTo(0, -obs.height / 2);
                this.ctx.lineTo(obs.width / 2, obs.height / 2);
                this.ctx.lineTo(-obs.width / 2, obs.height / 2);
                this.ctx.closePath();
                this.ctx.fill();
            } else if (obs.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, obs.width / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-obs.width / 2, -obs.height / 2, obs.width, obs.height);
            }

            this.ctx.shadowColor = 'transparent';
            this.ctx.restore();
        });
    }

    checkCollisions() {
        this.obstacles.forEach((obs, obsIndex) => {
            const dist = Math.hypot(
                this.player.x - (obs.x + obs.width / 2),
                this.player.y - (obs.y + obs.height / 2)
            );

            if (dist < (this.player.width / 2 + obs.width / 2)) {
                if (this.player.shield) {
                    this.player.shield = false;
                    this.createExplosion(this.player.x, this.player.y, 10);
                    this.obstacles.splice(obsIndex, 1);
                    this.combo = 1;
                    this.playSound('collect');
                } else {
                    this.player.health--;
                    if (this.player.health <= 0) {
                        this.endGame();
                    } else {
                        this.player.shield = true;
                        this.player.shieldDuration = this.player.maxShieldDuration;
                        this.createExplosion(this.player.x, this.player.y, 8);
                        this.playSound('hit');
                    }
                }
            }
        });
    }

    /**
     * SCORING SYSTEM
     */
    updateScore() {
        this.gameTime += 16.67;
        const baseScore = Math.floor((this.gameTime / 1000) * 10);
        this.score = Math.floor(baseScore * this.combo * (1 + (this.wave - 1) * 0.1));
        this.maxSpeed = this.gameSpeed;
    }

    updateDifficulty() {
        if (this.gameSpeed < this.maxGameSpeed) {
            this.gameSpeed += this.speedIncreaseRate;
        }
    }

    /**
     * PARTICLE SYSTEM
     */
    createExplosion(x, y, count) {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const velocity = {
                x: Math.cos(angle) * 5,
                y: Math.sin(angle) * 5
            };
            const colors = ['#00ff88', '#00d4ff', '#ff006e', '#ffbe0b'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.particles.push({
                x,
                y,
                vx: velocity.x,
                vy: velocity.y,
                life: 1,
                color,
                size: Math.random() * 5 + 2
            });
        }
    }

    updateParticles() {
        this.particles = this.particles.filter(p => {
            p.life -= 0.025;
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.12;
            return p.life > 0;
        });
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.globalAlpha = Math.max(0, p.life);
            this.ctx.fillStyle = p.color;
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 15;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
        this.ctx.globalAlpha = 1;
        this.ctx.shadowColor = 'transparent';
    }

    /**
     * HUD UPDATES
     */
    updateComboDisplay() {
        const comboDisplay = document.querySelector('.combo-value');
        if (comboDisplay) {
            comboDisplay.textContent = `x${this.combo}`;
            comboDisplay.style.animation = 'none';
            setTimeout(() => {
                comboDisplay.style.animation = 'pulse-glow 0.4s ease-out';
            }, 10);
        }
    }

    updateHUD() {
        this.scoreDisplay.textContent = this.score;
        this.speedDisplay.textContent = this.gameSpeed.toFixed(2) + 'x';
        this.timeDisplay.textContent = this.formatTime(this.gameTime);
        this.dodgedCountDisplay.textContent = this.obstaclesDodged;
        this.healthDisplay.textContent = this.player.health;

        // Wave display with color change
        this.waveDisplay.textContent = this.wave;
        if (this.wave % 5 === 0) {
            this.waveDisplay.style.color = '#ffbe0b';
        } else {
            this.waveDisplay.style.color = '#00ff88';
        }
    }

    /**
     * GAME OVER
     */
    endGame() {
        this.gameState = 'gameOver';
        this.playSound('hit');

        // Stats
        this.finalScore.textContent = this.score;
        this.survivalTime.textContent = this.formatTime(this.gameTime);
        this.obstaclesDodgedDisplay.textContent = this.obstaclesDodged;
        this.maxSpeedDisplay.textContent = this.gameSpeed.toFixed(2) + 'x';
        this.wavesSurvivedDisplay.textContent = this.wave;
        this.maxComboDisplay.textContent = `${this.maxCombo}x`;

        // High Score Check
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('neonArcadeHighScore', this.highScore);
            this.highScoreCheck.innerHTML = '🎉 NEW HIGH SCORE! 🎉';
            this.highScoreCheck.style.background = 'linear-gradient(135deg, rgba(255, 190, 11, 0.3), rgba(0, 255, 136, 0.3))';
            this.highScoreCheck.style.borderColor = '#00ff88';
            this.playSound('collect');
        } else {
            this.highScoreCheck.textContent = `HIGH SCORE: ${this.highScore}`;
            this.highScoreCheck.style.background = 'linear-gradient(135deg, rgba(0, 212, 255, 0.1), rgba(0, 255, 136, 0.1))';
            this.highScoreCheck.style.borderColor = '#00d4ff';
        }

        // Ranking
        this.updateRanking();
        this.updateHighScoreDisplay();
        this.switchScreen('gameOverScreen');

        // Explosion
        this.createExplosion(this.player.x, this.player.y, 25);
    }

    updateRanking() {
        let rank, message, icon;

        if (this.score > 50000) {
            rank = 'S';
            message = 'LEGENDARY PERFORMANCE';
            icon = '👑';
        } else if (this.score > 30000) {
            rank = 'A';
            message = 'EXCELLENT SURVIVAL';
            icon = '⭐';
        } else if (this.score > 15000) {
            rank = 'B';
            message = 'GOOD JOB';
            icon = '🔥';
        } else if (this.score > 5000) {
            rank = 'C';
            message = 'NOT BAD';
            icon = '💪';
        } else if (this.score > 1000) {
            rank = 'D';
            message = 'KEEP PRACTICING';
            icon = '🎮';
        } else {
            rank = 'F';
            message = 'BETTER LUCK NEXT TIME';
            icon = '😅';
        }

        this.rankingDisplay.innerHTML = `<span style="font-size: 2.5rem; margin-right: 10px;">${icon}</span>RANK <span style="color: #ffbe0b; text-shadow: 0 0 15px #ffbe0b;">${rank}</span> - ${message}`;
    }

    /**
     * GAME LOOP
     */
    startGameLoop() {
        const gameLoop = (timestamp) => {
            if (this.lastFrameTime) {
                this.fps = Math.round(1000 / (timestamp - this.lastFrameTime));
            }
            this.lastFrameTime = timestamp;

            // Clear canvas
            this.ctx.fillStyle = 'rgba(10, 14, 39, 0.08)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Background gradient
            const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
            gradient.addColorStop(0, 'rgba(10, 14, 39, 0)');
            gradient.addColorStop(0.5, 'rgba(26, 0, 51, 0.08)');
            gradient.addColorStop(1, 'rgba(10, 14, 39, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            if (this.gameState === 'playing' && !this.isPaused) {
                this.updateWave();
                this.updatePlayer();
                this.updateObstacles();
                this.updateScore();
                this.updateDifficulty();
                this.checkCollisions();
                this.updateParticles();

                this.drawObstacles();
                this.drawPlayer();
                this.drawParticles();

                this.updateHUD();
            } else if (this.gameState === 'gameOver' || this.gameState === 'start') {
                this.updateParticles();
                this.drawParticles();
            }

            requestAnimationFrame(gameLoop);
        };

        requestAnimationFrame(gameLoop);
    }
}

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    window.game = new NeonArcadeGameUpgraded();
});