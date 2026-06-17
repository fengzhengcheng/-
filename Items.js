/**
 * Items.js - 拾取物模块
 * 血包、能量球、金币等可拾取物品
 */
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'health', 'energy', 'coin'
        this.alive = true;
        this.pickupRadius = 25; // 拾取范围

        // 动画
        this.animTimer = Math.random() * Math.PI * 2;
        this.spawnTimer = 0;
        this.spawnDuration = 10;

        // 配置
        const configs = {
            health: { color: '#ff4444', label: '+20 HP', value: 20 },
            energy: { color: '#44aaff', label: '+15 EP', value: 15 },
            coin: { color: '#ffcc00', label: '+50 分', value: 50 }
        };
        const cfg = configs[type] || configs.coin;
        this.color = cfg.color;
        this.label = cfg.label;
        this.value = cfg.value;
    }

    /** 更新 */
    update() {
        this.animTimer += 0.08;
        if (this.spawnTimer < this.spawnDuration) {
            this.spawnTimer++;
        }
    }

    /** 检查玩家是否在拾取范围内 */
    checkPickup(playerX, playerY) {
        if (!this.alive || this.spawnTimer < this.spawnDuration) return false;
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        return Math.sqrt(dx * dx + dy * dy) < this.pickupRadius;
    }

    /** 拾取 */
    pickup() {
        this.alive = false;
    }

    /** 渲染 */
    render(ctx, cameraX) {
        if (!this.alive) return;

        const screenX = this.x - cameraX;
        const screenY = this.y + Math.sin(this.animTimer) * 3; // 上下浮动

        ctx.save();

        // 出现动画
        const spawnScale = Math.min(1, this.spawnTimer / this.spawnDuration);
        ctx.translate(screenX, screenY);
        ctx.scale(spawnScale, spawnScale);

        // 光晕
        ctx.fillStyle = this.color + '33';
        ctx.beginPath();
        ctx.arc(0, -8, 14, 0, Math.PI * 2);
        ctx.fill();

        if (this.type === 'health') {
            // 血包：红十字
            ctx.fillStyle = this.color;
            ctx.fillRect(-5, -13, 10, 10);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-1, -11, 2, 6);
            ctx.fillRect(-3, -9, 6, 2);
        } else if (this.type === 'energy') {
            // 能量球：蓝色发光球
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, -8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aaddff';
            ctx.beginPath();
            ctx.arc(0, -8, 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'coin') {
            // 金币：黄色圆形
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, -8, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#aa8800';
            ctx.beginPath();
            ctx.arc(0, -8, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = this.color;
            ctx.font = 'bold 8px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('$', 0, -5);
        }

        ctx.restore();
    }
}
