/**
 * Atmosphere.js - 氛围粒子系统
 * 三关不同的轻量级氛围效果（增强版）
 */
class Atmosphere {
    constructor() {
        this.particles = [];
        this.level = 1;
        this.lowFX = false;
    }

    initLevel(level, mapWidth, battleYMin, battleYMax) {
        this.level = level;
        this.particles = [];
        let count;
        switch (level) {
            case 1: count = this.lowFX ? 8 : 35; break;
            case 2: count = this.lowFX ? 8 : 30; break;
            case 3: count = this.lowFX ? 8 : 40; break;
            default: count = this.lowFX ? 8 : 25; break;
        }
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(mapWidth, battleYMin, battleYMax, true));
        }
    }

    createParticle(mapWidth, byMin, byMax, randomY) {
        const p = {
            x: Math.random() * mapWidth,
            y: randomY ? byMin - 50 + Math.random() * (byMax - byMin + 100) : byMin - 50,
            vx: 0, vy: 0, size: 1, alpha: 0.3, life: 999, maxLife: 999, type: 'dust',
            fadeAlpha: 1, flickerSpeed: 0.05, flickerOffset: 0
        };
        switch (this.level) {
            case 1: // 城市街头：霓虹光点 + 尘点 + 车灯光点
                const r1 = Math.random();
                if (r1 > 0.7) {
                    p.type = 'carLight';
                } else if (r1 > 0.35) {
                    p.type = 'neon';
                } else {
                    p.type = 'dust';
                }

                if (p.type === 'neon') {
                    p.vx = (Math.random() - 0.5) * 0.3;
                    p.vy = (Math.random() - 0.5) * 0.2;
                    p.size = 2 + Math.random() * 2;
                    p.alpha = 0.15 + Math.random() * 0.15;
                    p.color = ['#ff6644', '#44aaff', '#ff44aa', '#44ffaa', '#44ff44', '#ffff44'][Math.floor(Math.random() * 6)];
                    p.flickerSpeed = 0.03 + Math.random() * 0.07;
                    p.flickerOffset = Math.random() * Math.PI * 2;
                    p.maxLife = 300 + Math.random() * 400;
                } else if (p.type === 'carLight') {
                    // 远处车灯光点：缓慢横向移动
                    const fromLeft = Math.random() > 0.5;
                    p.vx = fromLeft ? (0.3 + Math.random() * 0.5) : -(0.3 + Math.random() * 0.5);
                    p.vy = (Math.random() - 0.5) * 0.05;
                    p.size = 2 + Math.random() * 3;
                    p.alpha = 0.1 + Math.random() * 0.12;
                    p.color = fromLeft ? '#ffffee' : '#ff4444'; // 白色前灯 / 红色尾灯
                    p.maxLife = 200 + Math.random() * 300;
                    // 车灯从边缘出发
                    p.x = fromLeft ? -20 : mapWidth + 20;
                    p.y = byMin + Math.random() * (byMax - byMin) * 0.3;
                } else {
                    // 漂浮尘点：不同大小和速度
                    p.vx = (Math.random() - 0.5) * 0.3;
                    p.vy = Math.random() > 0.5 ? -0.15 : 0.1;
                    p.size = 0.5 + Math.random() * 2;
                    p.alpha = 0.08 + Math.random() * 0.12;
                    p.color = '#aaa';
                    p.maxLife = 400 + Math.random() * 500;
                }
                break;

            case 2: // 废弃仓库：灰尘 + 吊灯颗粒 + 火花
                const r2 = Math.random();
                if (r2 > 0.85) {
                    p.type = 'spark';
                } else if (r2 > 0.5) {
                    p.type = 'lightMote';
                } else {
                    p.type = 'dust';
                }

                if (p.type === 'spark') {
                    // 偶尔火花：从天花板掉落的细小橙色火花
                    p.vx = (Math.random() - 0.5) * 0.5;
                    p.vy = 0.5 + Math.random() * 1.0;
                    p.size = 1 + Math.random() * 1.5;
                    p.alpha = 0.5 + Math.random() * 0.4;
                    p.color = '#ff8822';
                    p.maxLife = 40 + Math.random() * 60;
                    p.y = byMin - 30 + Math.random() * 20;
                } else if (p.type === 'lightMote') {
                    // 吊灯颗粒：沿光束方向缓慢飘落
                    p.vx = (Math.random() - 0.5) * 0.15;
                    p.vy = 0.1 + Math.random() * 0.2; // 向下飘落
                    p.size = 1.5 + Math.random() * 1.5;
                    p.alpha = 0.2 + Math.random() * 0.15;
                    p.color = '#ffddaa';
                    p.maxLife = 250 + Math.random() * 300;
                } else {
                    // 灰尘：更多不同大小
                    p.vx = (Math.random() - 0.5) * 0.2;
                    p.vy = -0.05 + Math.random() * 0.1;
                    p.size = 0.5 + Math.random() * 2;
                    p.alpha = 0.06 + Math.random() * 0.08;
                    p.color = '#888';
                    p.maxLife = 500 + Math.random() * 500;
                }
                break;

            case 3: // 码头夜战：海雾 + 水汽 + 远处灯光 + 海风
                const r3 = Math.random();
                if (r3 > 0.85) {
                    p.type = 'seaWind';
                } else if (r3 > 0.72) {
                    p.type = 'distantLight';
                } else if (r3 > 0.45) {
                    p.type = 'fog';
                } else {
                    p.type = 'mist';
                }

                if (p.type === 'seaWind') {
                    // 海风粒子：快速横向移动的细线
                    p.vx = 2 + Math.random() * 3;
                    p.vy = (Math.random() - 0.5) * 0.5;
                    p.size = 1;
                    p.length = 8 + Math.random() * 15;
                    p.alpha = 0.08 + Math.random() * 0.08;
                    p.color = '#aabbcc';
                    p.maxLife = 60 + Math.random() * 80;
                    p.y = byMin + Math.random() * (byMax - byMin);
                    p.x = -30;
                } else if (p.type === 'distantLight') {
                    // 远处灯光闪烁：模拟远处码头灯光的缓慢明灭
                    p.vx = 0;
                    p.vy = 0;
                    p.size = 3 + Math.random() * 4;
                    p.alpha = 0.06 + Math.random() * 0.06;
                    p.color = '#ffdd88';
                    p.flickerSpeed = 0.008 + Math.random() * 0.015;
                    p.flickerOffset = Math.random() * Math.PI * 2;
                    p.maxLife = 600 + Math.random() * 600;
                    p.y = byMin - 20 + Math.random() * 40;
                } else if (p.type === 'fog') {
                    // 海雾：更大范围的雾气团，缓慢移动
                    p.vx = 0.1 + Math.random() * 0.3;
                    p.vy = (Math.random() - 0.5) * 0.1;
                    p.size = 30 + Math.random() * 50;
                    p.alpha = 0.025 + Math.random() * 0.035;
                    p.color = '#4466aa';
                    p.maxLife = 500 + Math.random() * 500;
                } else {
                    // 水汽：更多细小水汽粒子
                    p.vx = 0.1 + Math.random() * 0.4;
                    p.vy = (Math.random() - 0.5) * 0.2;
                    p.size = 1.5 + Math.random() * 3;
                    p.alpha = 0.06 + Math.random() * 0.1;
                    p.color = '#6688bb';
                    p.maxLife = 300 + Math.random() * 400;
                }
                break;
        }
        p.life = p.maxLife;
        return p;
    }

    update(mapWidth, byMin, byMax) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;

            // 生命周期淡出
            const lifeRatio = p.life / p.maxLife;
            if (lifeRatio < 0.2) {
                p.fadeAlpha = lifeRatio / 0.2;
            } else if (lifeRatio > 0.9) {
                p.fadeAlpha = (1 - lifeRatio) / 0.1;
            } else {
                p.fadeAlpha = 1;
            }

            // 火花受重力影响
            if (p.type === 'spark') {
                p.vy += 0.03;
            }

            // 生命耗尽或超出边界，淡出后重新生成
            if (p.life <= 0 || p.x > mapWidth + 80 || p.x < -80 || p.y < byMin - 100 || p.y > byMax + 80) {
                this.particles[i] = this.createParticle(mapWidth, byMin, byMax, false);
            }
        }
    }

    render(ctx, cameraX, frame) {
        this.particles.forEach(p => {
            const sx = p.x - cameraX;
            if (sx < -60 || sx > 1380) return;
            ctx.save();
            const baseAlpha = p.alpha * p.fadeAlpha;

            if (p.type === 'neon') {
                const flicker = 0.6 + Math.sin(frame * p.flickerSpeed + p.flickerOffset) * 0.4;
                ctx.globalAlpha = baseAlpha * flicker;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                // 霓虹光晕
                ctx.globalAlpha = baseAlpha * flicker * 0.3;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'carLight') {
                const flicker = 0.8 + Math.sin(frame * 0.03 + p.x * 0.05) * 0.2;
                ctx.globalAlpha = baseAlpha * flicker;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                // 车灯光晕
                ctx.globalAlpha = baseAlpha * flicker * 0.2;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'fog') {
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'mist') {
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'lightMote') {
                const drift = Math.sin(frame * 0.02 + p.x * 0.05) * 0.5;
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx + drift, p.y, p.size, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'spark') {
                // 火花：小亮点带拖尾
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                // 拖尾
                ctx.globalAlpha = baseAlpha * 0.4;
                ctx.fillRect(sx - p.vx * 3, p.y - p.vy * 3, p.size * 0.8, p.size * 0.8);
            } else if (p.type === 'distantLight') {
                // 远处灯光：缓慢明灭
                const flicker = 0.3 + (Math.sin(frame * p.flickerSpeed + p.flickerOffset) * 0.5 + 0.5) * 0.7;
                ctx.globalAlpha = baseAlpha * flicker;
                ctx.fillStyle = p.color;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size, 0, Math.PI * 2); ctx.fill();
                // 光晕
                ctx.globalAlpha = baseAlpha * flicker * 0.15;
                ctx.beginPath(); ctx.arc(sx, p.y, p.size * 4, 0, Math.PI * 2); ctx.fill();
            } else if (p.type === 'seaWind') {
                // 海风：横向细线
                ctx.globalAlpha = baseAlpha;
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(sx, p.y);
                ctx.lineTo(sx + p.length, p.y + p.vy * 2);
                ctx.stroke();
            } else {
                ctx.globalAlpha = baseAlpha;
                ctx.fillStyle = p.color;
                ctx.fillRect(sx, p.y, p.size, p.size);
            }
            ctx.restore();
        });
    }

    clear() { this.particles = []; }

    setLowFX(low) {
        this.lowFX = low;
    }

    get particleCount() { return this.particles.length; }
}
