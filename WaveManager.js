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

        if (level === 1) {
            this.waves = [
                [{ type: 'normal', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'normal', offset: 100 }],
                [{ type: 'fast', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'normal', offset: 100 }],
                [{ type: 'tank', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'normal', offset: 100 }]
            ];
        } else if (level === 2) {
            this.waves = [
                [{ type: 'fast', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'normal', offset: 100 }],
                [{ type: 'normal', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'tank', offset: 100 }, { type: 'fast', offset: 150 }],
                [{ type: 'tank', offset: 0 }, { type: 'tank', offset: 60 }, { type: 'fast', offset: 120 }]
            ];
        } else {
            this.waves = [
                [{ type: 'normal', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'normal', offset: 100 }]
            ];
        }
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
        // 在玩家前方生成，但确保在地图范围内
        let spawnBaseX = playerX + logicalWidth * 0.4;

        // 确保不会超出地图右边界
        if (spawnBaseX > mapWidth - 100) {
            spawnBaseX = mapWidth - 100;
        }
        // 如果玩家在地图右端，从左前方生成
        if (playerX > mapWidth - logicalWidth) {
            spawnBaseX = playerX + 150;
            if (spawnBaseX > mapWidth - 50) {
                spawnBaseX = playerX - 300;
            }
        }

        wave.forEach((cfg, i) => {
            const x = spawnBaseX + cfg.offset + i * 40;
            // 确保在地图范围内
            const clampedX = Math.max(50, Math.min(x, mapWidth - 50));
            const y = yMin + 20 + Math.random() * (yMax - yMin - 40);
            enemies.push(new Enemy(clampedX, y, cfg.type));
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
