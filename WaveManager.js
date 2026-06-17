/**
 * WaveManager.js - 敌人波次管理模块
 * 修复：敌人出生位置安全、不超出地图边界
 */
class WaveManager {
    constructor() {
        this.waves = [];
        this.currentWaveIndex = 0;
        this.allCleared = false;
        this.waveAnnounceTimer = 0;
        this.waveAnnounceDuration = 90;
        this.waveAnnounceText = '';
    }

    initLevel(level) {
        this.currentWaveIndex = 0;
        this.allCleared = false;
        this.waveAnnounceTimer = 0;

        this.waves = this.createFiveDoublingWaves(level);
    }

    createFiveDoublingWaves(level) {
        const baseCount = Math.max(2, Math.min(4, level + 1));
        const waves = [];
        for (let waveIndex = 0; waveIndex < 5; waveIndex++) {
            const count = baseCount * Math.pow(2, waveIndex);
            const wave = [];
            for (let i = 0; i < count; i++) {
                wave.push({
                    type: this.pickEnemyType(level, waveIndex, i),
                    offset: i * 18,
                    side: i % 4
                });
            }
            waves.push(wave);
        }
        return waves;
    }

    pickEnemyType(level, waveIndex, index) {
        if (level >= 3 && waveIndex >= 2 && index % 5 === 0) return 'tank';
        if (level >= 2 && waveIndex >= 1 && index % 4 === 0) return 'tank';
        if (waveIndex >= 1 && index % 3 === 0) return 'fast';
        return 'normal';
    }

    getCurrentWave() {
        if (this.currentWaveIndex >= this.waves.length) return null;
        return this.waves[this.currentWaveIndex];
    }

    getCurrentWaveNumber() { return this.currentWaveIndex + 1; }
    getTotalWaves() { return this.waves.length; }

    /** 生成当前波次的敌人 - 确保出生位置安全 */
    spawnCurrentWave(playerX, cameraX, logicalWidth, groundY, yMin, yMax, mapWidth) {
        const wave = this.getCurrentWave();
        if (!wave) return [];

        const enemies = [];
        const minX = 50;
        const maxX = mapWidth - 50;
        const viewLeft = Math.max(minX, cameraX + 40);
        const viewRight = Math.min(maxX, cameraX + logicalWidth - 40);
        const spreadRadiusX = Math.min(360, logicalWidth * 0.42);
        const spreadRadiusY = Math.max(70, (yMax - yMin) * 0.45);

        wave.forEach((cfg, i) => {
            const angle = ((cfg.side ?? i) % 4) * Math.PI / 2 + (Math.random() - 0.5) * 0.65;
            const distanceX = spreadRadiusX + Math.random() * 140;
            const distanceY = spreadRadiusY + Math.random() * 80;
            let x = playerX + Math.cos(angle) * distanceX + (Math.random() - 0.5) * 80;
            let y = groundY + Math.sin(angle) * distanceY + (Math.random() - 0.5) * 50;

            if (i % 4 === 0) x = Math.min(viewRight, playerX + distanceX);
            else if (i % 4 === 2) x = Math.max(viewLeft, playerX - distanceX);

            const clampedX = Math.max(minX, Math.min(x, maxX));
            const clampedY = Math.max(yMin + 20, Math.min(y, yMax - 20));
            const enemy = new Enemy(clampedX, clampedY, cfg.type);
            if (typeof enemy.setSurroundSlot === 'function') enemy.setSurroundSlot(i, wave.length);
            enemies.push(enemy);
        });

        this.waveAnnounceText = `第 ${this.getCurrentWaveNumber()} 波`;
        this.waveAnnounceTimer = this.waveAnnounceDuration;

        return enemies;
    }

    /** 检查当前波次是否已清空 */
    checkWaveCleared(enemies) {
        const aliveEnemies = enemies.filter(e => e.alive);
        return aliveEnemies.length === 0 && !this.allCleared;
    }

    advanceWave() {
        this.currentWaveIndex++;
        if (this.currentWaveIndex >= this.waves.length) {
            this.allCleared = true;
            return false;
        }
        return true;
    }

    update() {
        if (this.waveAnnounceTimer > 0) this.waveAnnounceTimer--;
    }

    renderAnnounce(ctx, canvasWidth, canvasHeight) {
        if (this.waveAnnounceTimer <= 0) return;
        const alpha = Math.min(1, this.waveAnnounceTimer / 30);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ffcc00';
        ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 15;
        ctx.fillText(this.waveAnnounceText, canvasWidth / 2, canvasHeight / 2 - 40);
        ctx.restore();
    }
}
