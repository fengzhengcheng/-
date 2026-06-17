/**
 * Effects.js - 特效管理模块
 * 负责打击粒子、HIT 文字、受击闪烁、屏幕震动等视觉反馈
 */
class Effects {
    constructor() {
        // 粒子列表
        this.particles = [];
        // 飘字列表（HIT、伤害数字等）
        this.floatTexts = [];
        // 屏幕震动
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTimer = 0;
        // 受击闪白
        this.flashAlpha = 0;
    }

    /** 产生命中粒子 */
    spawnHitParticles(x, y, type) {
        const weaponCounts = { weaponStick: 10, weaponPipe: 12, weaponBottle: 14, weaponHammer: 12 };
        const count = weaponCounts[type] || (type === 'skill' ? 18 : type === 'heavy' ? 12 : 7);
        const configs = {
            normal: { colors: ['#aaddff', '#ffffff', '#88bbff'], speed: 6, size: 3 },
            heavy: { colors: ['#ffaa00', '#ff6600', '#ffcc44'], speed: 8, size: 4 },
            skill: { colors: ['#ff44ff', '#ffaaff', '#cc44cc'], speed: 10, size: 5 },
            enemyHit: { colors: ['#ff4444', '#ff8888', '#ffaaaa'], speed: 5, size: 3 },
            // 角色专属技能命中粒子
            skillAlong: { colors: ['#4488ff', '#88ccff', '#ff8844'], speed: 10, size: 5 },
            skillXiaoying: { colors: ['#aa66ff', '#44ddff', '#cc88ff'], speed: 12, size: 4 },
            skillTieshan: { colors: ['#ff6633', '#ffaa44', '#aa6622'], speed: 8, size: 6 },
            weaponBreak: { colors: ['#ff8844', '#ffcc44', '#ffffff'], speed: 8, size: 4 },
            weaponStick: { colors: ['#8B6914', '#A0781E', '#6B4904', '#C4A35A', '#5B3900'], speed: 5, size: 4, shape: 'rect' },
            weaponPipe: { colors: ['#ffffff', '#ffdd44', '#ffaa00', '#ffff88', '#ff8800'], speed: 10, size: 2, shape: 'spark' },
            weaponBottle: { colors: ['#44AA55', '#66DD77', '#88FFAA', '#33CC55', '#AAFFCC'], speed: 8, size: 3, shape: 'shard' },
            weaponHammer: { colors: ['#ff6633', '#ffaa44', '#aa6622', '#885522', '#cc8844'], speed: 7, size: 6, shape: 'dust' }
        };
        const cfg = configs[type] || configs.normal;

        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * cfg.speed * 2,
                vy: (Math.random() - 0.5) * cfg.speed * 2 - 2,
                life: 15 + Math.random() * 12,
                maxLife: 27,
                size: cfg.size + Math.random() * 3,
                color: cfg.colors[Math.floor(Math.random() * cfg.colors.length)],
                shape: cfg.shape || undefined
            });
        }
    }

    /** 产生 HIT 飘字 */
    spawnHitText(x, y, damage, type) {
        const text = type === 'skill' ? 'SKILL!' : type === 'heavy' ? 'HEAVY!' : 'HIT!';
        const color = type === 'skill' ? '#ff44ff' : type === 'heavy' ? '#ffaa00' : '#ffffff';
        const size = type === 'skill' ? 28 : type === 'heavy' ? 24 : 20;

        this.floatTexts.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y - 20,
            text: text,
            damage: damage,
            color: color,
            fontSize: size,
            life: 40,
            maxLife: 40,
            vy: -2
        });
    }

    /** 产生连击飘字 */
    spawnComboText(x, y, comboCount) {
        this.floatTexts.push({
            x: x,
            y: y - 50,
            text: `${comboCount} HIT`,
            damage: 0,
            color: '#ffcc00',
            fontSize: 18 + comboCount * 2,
            life: 35,
            maxLife: 35,
            vy: -1.5
        });
    }

    /** 产生拾取/掉落飘字 */
    spawnPickupText(x, y, text, color) {
        this.floatTexts.push({
            x: x,
            y: y - 20,
            text: text,
            damage: 0,
            color: color || '#ffcc44',
            fontSize: 16,
            life: 50,
            maxLife: 50,
            vy: -1.2
        });
    }

    /** 触发屏幕震动 */
    shake(intensity, duration) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTimer = duration;
    }

    /** 触发受击闪白 */
    flash() {
        this.flashAlpha = 0.3;
    }

    /** 更新所有特效 */
    update() {
        // 更新粒子
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15;
            p.vx *= 0.98;
            p.life--;
            if (p.life <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // 更新飘字
        for (let i = this.floatTexts.length - 1; i >= 0; i--) {
            const ft = this.floatTexts[i];
            ft.y += ft.vy;
            ft.vy *= 0.95;
            ft.life--;
            if (ft.life <= 0) {
                this.floatTexts.splice(i, 1);
            }
        }

        // 更新屏幕震动
        if (this.shakeTimer > 0) {
            this.shakeTimer--;
        }

        // 更新闪白
        if (this.flashAlpha > 0) {
            this.flashAlpha -= 0.03;
            if (this.flashAlpha < 0) this.flashAlpha = 0;
        }
    }

    /** 获取当前屏幕震动偏移 */
    getShakeOffset() {
        if (this.shakeTimer <= 0) return { x: 0, y: 0 };
        const intensity = this.shakeIntensity * (this.shakeTimer / this.shakeDuration);
        return {
            x: (Math.random() - 0.5) * intensity * 2,
            y: (Math.random() - 0.5) * intensity * 2
        };
    }

    /** 渲染粒子 */
    renderParticles(ctx, cameraX) {
        this.particles.forEach(p => {
            const screenX = p.x - cameraX;
            const alpha = p.life / p.maxLife;
            const sz = p.size * alpha;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = p.color;

            if (p.shape === 'rect') {
                // 方形碎片（旋转的矩形）
                ctx.translate(screenX, p.y);
                ctx.rotate(p.life * 0.3);
                ctx.fillRect(-sz, -sz * 0.5, sz * 2, sz);
            } else if (p.shape === 'spark') {
                // 火花（带拖尾的线段）
                ctx.strokeStyle = p.color;
                ctx.lineWidth = Math.max(1, sz * 0.5);
                ctx.beginPath();
                ctx.moveTo(screenX, p.y);
                ctx.lineTo(screenX - p.vx * 3, p.y - p.vy * 3);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(screenX, p.y, sz * 0.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.shape === 'shard') {
                // 碎片（三角形）
                ctx.translate(screenX, p.y);
                ctx.rotate(p.life * 0.2);
                ctx.beginPath();
                ctx.moveTo(0, -sz);
                ctx.lineTo(-sz * 0.7, sz * 0.5);
                ctx.lineTo(sz * 0.7, sz * 0.5);
                ctx.closePath();
                ctx.fill();
            } else if (p.shape === 'dust') {
                // 尘土（大圆形，低透明度）
                ctx.globalAlpha = alpha * 0.5;
                ctx.beginPath();
                ctx.arc(screenX, p.y, sz * 1.5, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 默认：圆形
                ctx.beginPath();
                ctx.arc(screenX, p.y, sz, 0, Math.PI * 2);
                ctx.fill();
            }

            ctx.restore();
        });
    }

    /** 渲染飘字 */
    renderFloatTexts(ctx, cameraX) {
        this.floatTexts.forEach(ft => {
            const screenX = ft.x - cameraX;
            const alpha = Math.min(1, ft.life / (ft.maxLife * 0.3));
            const scale = 1 + (1 - ft.life / ft.maxLife) * 0.3;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.font = `bold ${ft.fontSize * scale}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4;

            // HIT 文字
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, screenX, ft.y);

            // 伤害数字
            if (ft.damage > 0) {
                ctx.fillStyle = '#ffffff';
                ctx.font = `bold ${ft.fontSize * 0.8}px "Microsoft YaHei", sans-serif`;
                ctx.fillText(`-${ft.damage}`, screenX, ft.y + ft.fontSize * 0.8);
            }

            ctx.restore();
        });
    }

    /** 渲染全屏闪白效果 */
    renderFlash(ctx, canvasWidth, canvasHeight) {
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            ctx.restore();
        }
    }

    /** 产生道具碎片粒子 */
    spawnPropDebris(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x + (Math.random() - 0.5) * 20,
                y: y - 10 + (Math.random() - 0.5) * 20,
                vx: (Math.random() - 0.5) * 6,
                vy: -2 - Math.random() * 5,
                life: 20 + Math.random() * 15,
                maxLife: 35,
                size: 3 + Math.random() * 5,
                color: color
            });
        }
    }

    /** 产生拾取提示飘字 */
    spawnPickupText(x, y, text, color) {
        this.floatTexts.push({
            x: x,
            y: y - 20,
            text: text,
            damage: 0,
            color: color,
            fontSize: 18,
            life: 40,
            maxLife: 40,
            vy: -1.5
        });
    }

    /** 清空所有特效 */
    clear() {
        this.particles = [];
        this.floatTexts = [];
        this.shakeTimer = 0;
        this.flashAlpha = 0;
    }
}
