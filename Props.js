/**
 * Props.js - 可破坏场景道具模块
 * 木箱、垃圾桶等可被攻击打碎的道具
 */
class Prop {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type; // 'crate', 'trashcan'
        this.alive = true;

        const configs = {
            crate: { hp: 20, width: 24, height: 24, color: '#8B7355', borderColor: '#6B5335' },
            trashcan: { hp: 30, width: 18, height: 26, color: '#556655', borderColor: '#445544' }
        };
        const cfg = configs[type] || configs.crate;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.width = cfg.width;
        this.height = cfg.height;
        this.color = cfg.color;
        this.borderColor = cfg.borderColor;

        // 受击闪白
        this.flashTimer = 0;
        // 破碎动画
        this.breakTimer = 0;
        this.breaking = false;
    }

    /** 受击 */
    takeDamage(damage, knockbackDir) {
        if (!this.alive) return;
        this.hp -= damage;
        this.flashTimer = 4;

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
            this.breaking = true;
            this.breakTimer = 15;
        }
    }

    /** 获取碰撞盒 */
    getHitBox() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height,
            width: this.width,
            height: this.height,
            centerY: this.y - this.height / 2,
            yRange: 25
        };
    }

    /** 更新 */
    update() {
        if (this.flashTimer > 0) this.flashTimer--;
        if (this.breaking) {
            this.breakTimer--;
            if (this.breakTimer <= 0) {
                this.breaking = false;
            }
        }
    }

    /** 渲染 */
    render(ctx, cameraX) {
        if (!this.alive && !this.breaking) return;

        const screenX = this.x - cameraX;
        const screenY = this.y;

        ctx.save();

        // 破碎动画
        if (this.breaking) {
            ctx.globalAlpha = this.breakTimer / 15;
        }

        // 闪白
        const isFlash = this.flashTimer > 0;

        if (this.type === 'crate') {
            ctx.fillStyle = isFlash ? '#fff' : this.color;
            ctx.fillRect(screenX - this.width / 2, screenY - this.height, this.width, this.height);
            ctx.strokeStyle = isFlash ? '#fff' : this.borderColor;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(screenX - this.width / 2, screenY - this.height, this.width, this.height);
            // 十字绑带
            if (!isFlash) {
                ctx.beginPath();
                ctx.moveTo(screenX - this.width / 2, screenY - this.height / 2);
                ctx.lineTo(screenX + this.width / 2, screenY - this.height / 2);
                ctx.moveTo(screenX, screenY - this.height);
                ctx.lineTo(screenX, screenY);
                ctx.stroke();
            }
        } else if (this.type === 'trashcan') {
            ctx.fillStyle = isFlash ? '#fff' : this.color;
            ctx.fillRect(screenX - 9, screenY - 24, 18, 24);
            // 桶沿
            ctx.fillStyle = isFlash ? '#fff' : '#667766';
            ctx.fillRect(screenX - 11, screenY - 26, 22, 4);
            // 桶盖
            ctx.fillRect(screenX - 10, screenY - 28, 20, 3);
            // 条纹
            if (!isFlash) {
                ctx.strokeStyle = '#445544';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(screenX - 9, screenY - 16);
                ctx.lineTo(screenX + 9, screenY - 16);
                ctx.moveTo(screenX - 9, screenY - 8);
                ctx.lineTo(screenX + 9, screenY - 8);
                ctx.stroke();
            }
        }

        // 血量条（被攻击后显示）
        if (this.hp < this.maxHp && this.alive) {
            const barW = 24;
            const barH = 3;
            const barX = screenX - barW / 2;
            const barY = screenY - this.height - 8;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#cc8833';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }

        ctx.restore();
    }
}
