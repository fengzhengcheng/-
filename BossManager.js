/**
 * BossManager.js - Boss 出场、阶段、死亡管理
 * 支持不同关卡的 Boss 配置
 */
class BossManager {
    constructor() {
        this.boss = null;
        this.bossActive = false;
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.entranceAnnounceTimer = 0;
        this.entranceAnnounceDuration = 100;
        this.phaseAnnounceTimer = 0;
        this.phaseAnnounceDuration = 80;
        this.phaseAnnounceText = '';
        this.phase2Announced = false;
        this.phase3Announced = false;
    }

    reset() {
        this.boss = null;
        this.bossActive = false;
        this.bossSpawned = false;
        this.bossDefeated = false;
        this.entranceAnnounceTimer = 0;
        this.phaseAnnounceTimer = 0;
        this.phase2Announced = false;
        this.phase3Announced = false;
    }

    /** 触发 Boss 出场，传入 Boss 配置 */
    triggerBossEntrance(playerX, cameraX, logicalWidth, groundY, yMin, yMax, mapWidth, bossConfig) {
        if (this.bossSpawned) return;
        this.bossSpawned = true;

        const spawnX = Math.min(cameraX + logicalWidth + 80, mapWidth - 60);
        const spawnY = yMin + (yMax - yMin) * 0.5;

        this.boss = new Boss(spawnX, spawnY, bossConfig);
        this.boss.yMin = yMin;
        this.boss.yMax = yMax;
        this.boss.entranceTargetX = Math.min(playerX + 250, mapWidth - 200);

        this.entranceAnnounceTimer = this.entranceAnnounceDuration;
    }

    update() {
        if (this.entranceAnnounceTimer > 0) this.entranceAnnounceTimer--;
        if (this.phaseAnnounceTimer > 0) this.phaseAnnounceTimer--;

        if (this.boss && this.boss.entranceComplete && !this.bossActive) {
            this.bossActive = true;
        }

        if (this.boss && this.boss.alive) {
            if (this.boss.phase === 2 && !this.phase2Announced) {
                this.phase2Announced = true;
                this.phaseAnnounceText = this.boss.phase2Text;
                this.phaseAnnounceTimer = this.phaseAnnounceDuration;
            }
            if (this.boss.phase === 3 && !this.phase3Announced) {
                this.phase3Announced = true;
                this.phaseAnnounceText = this.boss.phase3Text;
                this.phaseAnnounceTimer = this.phaseAnnounceDuration;
            }
        }

        if (this.boss && this.boss.state === 'dead' && !this.bossDefeated) {
            this.bossDefeated = true;
            this.bossActive = false;
        }
    }

    renderEntranceAnnounce(ctx, W, H) {
        if (this.entranceAnnounceTimer <= 0) return;
        const alpha = Math.min(1, this.entranceAnnounceTimer / 30);
        ctx.save(); ctx.globalAlpha = alpha; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff2200'; ctx.font = 'bold 52px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('BOSS 登场', W / 2, H / 2 - 50);
        ctx.restore();
    }

    renderPhaseAnnounce(ctx, W, H) {
        if (this.phaseAnnounceTimer <= 0) return;
        const alpha = Math.min(1, this.phaseAnnounceTimer / 20);
        ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ff6600'; ctx.font = 'bold 32px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 10;
        ctx.fillText(this.phaseAnnounceText, W / 2, H / 2 - 30);
        ctx.restore();
    }

    renderBossHP(ctx, W) {
        if (!this.boss || !this.bossActive || this.boss.state === 'dead') return;
        UITheme.drawBossHPBar(ctx, W, this.boss.name, this.boss.hp, this.boss.maxHp);
    }
}
