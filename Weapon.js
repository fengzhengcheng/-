/**
 * Weapon.js - 武器类
 * 定义4种武器配置、地面武器绘制、手持武器绘制
 */
class Weapon {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.alive = true;
        this.onGround = true;
        const cfg = Weapon.CONFIGS[type] || Weapon.CONFIGS.stick;
        this.name = cfg.name;
        this.damageBonus = cfg.damageBonus;
        this.rangeBonus = cfg.rangeBonus;
        this.speedMultiplier = cfg.speedMultiplier;
        this.maxDurability = cfg.maxDurability;
        this.durability = cfg.maxDurability;
        this.knockbackBonus = cfg.knockbackBonus;
        this.heavyDamageMultiplier = cfg.heavyDamageMultiplier;
        this.color = cfg.color;
        this.groundBobTimer = Math.random() * Math.PI * 2;
    }

    /** 命中后减少耐久 */
    useDurability() {
        this.durability--;
        if (this.durability <= 0) {
            this.durability = 0;
            return true; // 武器损坏
        }
        return false;
    }

    /** 获取地面拾取范围 */
    getPickupBox() {
        return { x: this.x - 20, y: this.y - 20, width: 40, height: 40 };
    }

    /** 地面武器更新 */
    update() {
        this.groundBobTimer += 0.05;
    }

    /** 绘制地面上的武器 */
    renderOnGround(ctx, cameraX) {
        if (!this.alive || !this.onGround) return;
        const sx = this.x - cameraX;
        const bob = Math.sin(this.groundBobTimer) * 2;
        ctx.save();
        ctx.translate(sx, this.y - 10 + bob);
        // 光圈提示
        ctx.fillStyle = 'rgba(255,255,200,0.08)';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        Weapon.drawWeaponShape(ctx, this.type, 0, 0, 1, false);
        ctx.restore();
    }

    /** 绘制手持武器（在角色手上） */
    static drawHeldWeapon(ctx, type, handX, handY, facing, swingAngle) {
        ctx.save();
        ctx.translate(handX, handY);
        if (facing === -1) ctx.scale(-1, 1);
        ctx.rotate(swingAngle || 0);
        Weapon.drawWeaponShape(ctx, type, 0, 0, 1, true);
        ctx.restore();
    }

    /** 绘制武器形状 */
    static drawWeaponShape(ctx, type, x, y, scale, isHeld) {
        ctx.save();
        ctx.translate(x, y);
        const s = isHeld ? scale * 1.3 : scale;
        ctx.scale(s, s);
        switch (type) {
            case 'stick': this.drawStick(ctx); break;
            case 'pipe': this.drawPipe(ctx); break;
            case 'bottle': this.drawBottle(ctx); break;
            case 'hammer': this.drawHammer(ctx); break;
        }
        ctx.restore();
    }

    /** 木棍 - 棕色长棍 */
    static drawStick(ctx) {
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(-2, -22, 4, 28);
        ctx.fillStyle = '#A0781E';
        ctx.fillRect(-2, -22, 4, 4);
        ctx.fillStyle = '#6B4904';
        ctx.fillRect(-2, 4, 4, 3);
        // 木纹细节 - 更多纹理线
        ctx.strokeStyle = '#5B3900';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-1, -18); ctx.lineTo(1, -17);
        ctx.moveTo(-1, -15); ctx.lineTo(1, -14);
        ctx.moveTo(-1, -8); ctx.lineTo(1, -7);
        ctx.moveTo(-1, -3); ctx.lineTo(1, -2);
        ctx.moveTo(-1, 1); ctx.lineTo(1, 2);
        ctx.stroke();
        // 木纹深色节疤
        ctx.fillStyle = '#5B3900';
        ctx.beginPath();
        ctx.arc(0, -12, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1, -1, 1, 0, Math.PI * 2);
        ctx.fill();
        // 木棍高光
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(0, -22, 2, 28);
    }

    /** 钢管 - 灰色金属管 */
    static drawPipe(ctx) {
        ctx.fillStyle = '#8899AA';
        ctx.fillRect(-3, -26, 6, 32);
        // 高光
        ctx.fillStyle = '#AABBCC';
        ctx.fillRect(-1, -26, 2, 32);
        // 管口
        ctx.fillStyle = '#556677';
        ctx.fillRect(-3, -26, 6, 3);
        ctx.fillRect(-3, 3, 6, 3);
        // 反光
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(-2, -20, 1, 18);
        // 更多金属反光细节
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-1, -18, 1, 6);
        ctx.fillRect(-1, -4, 1, 4);
        // 金属环境光反射
        ctx.fillStyle = 'rgba(200,220,255,0.12)';
        ctx.fillRect(-2, -12, 4, 2);
        ctx.fillRect(-2, 0, 4, 2);
        // 管身暗面
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-3, -23, 1, 24);
        // 管口内壁阴影
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-2, -25, 4, 1);
        ctx.fillRect(-2, 4, 4, 1);
    }

    /** 破瓶子 - 绿色碎玻璃瓶 */
    static drawBottle(ctx) {
        // 瓶身
        ctx.fillStyle = '#44AA55';
        ctx.fillRect(-4, -14, 8, 16);
        // 瓶颈
        ctx.fillStyle = '#55BB66';
        ctx.fillRect(-2, -20, 4, 7);
        // 瓶口
        ctx.fillStyle = '#338844';
        ctx.fillRect(-3, -22, 6, 3);
        // 碎裂尖端（底部锯齿）
        ctx.fillStyle = '#44AA55';
        ctx.beginPath();
        ctx.moveTo(-4, 2);
        ctx.lineTo(-3, 6);
        ctx.lineTo(-1, 2);
        ctx.lineTo(1, 7);
        ctx.lineTo(3, 3);
        ctx.lineTo(4, 2);
        ctx.closePath();
        ctx.fill();
        // 碎裂纹理 - 更多裂纹
        ctx.strokeStyle = '#227733';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-2, -10); ctx.lineTo(1, -5);
        ctx.moveTo(2, -8); ctx.lineTo(0, -2);
        ctx.moveTo(-3, -6); ctx.lineTo(0, -3);
        ctx.moveTo(1, -12); ctx.lineTo(3, -7);
        ctx.moveTo(-1, 0); ctx.lineTo(2, 1);
        ctx.stroke();
        // 碎裂闪光点
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath();
        ctx.arc(-2, -8, 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(2, -4, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 1, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // 玻璃高光
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(-3, -13, 2, 10);
        // 尖端闪光
        ctx.fillStyle = 'rgba(255,255,200,0.5)';
        ctx.beginPath();
        ctx.arc(-3, 5, 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(1, 6, 0.8, 0, Math.PI * 2);
        ctx.fill();
    }

    /** 铁锤 - 大头锤 */
    static drawHammer(ctx) {
        // 锤柄
        ctx.fillStyle = '#7B5B2A';
        ctx.fillRect(-2, -8, 4, 24);
        // 锤柄暗面
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(-2, -8, 1, 24);
        // 锤柄高光
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(1, -8, 1, 24);
        // 锤柄缠绕（握把细节）
        ctx.fillStyle = '#5B3B1A';
        ctx.fillRect(-3, 2, 6, 2);
        ctx.fillRect(-3, 8, 6, 2);
        // 锤头
        ctx.fillStyle = '#667788';
        ctx.fillRect(-8, -18, 16, 12);
        // 锤头高光
        ctx.fillStyle = '#8899AA';
        ctx.fillRect(-7, -17, 14, 3);
        // 锤头暗面
        ctx.fillStyle = '#556677';
        ctx.fillRect(-8, -8, 16, 2);
        // 锤头边框
        ctx.strokeStyle = '#445566';
        ctx.lineWidth = 1;
        ctx.strokeRect(-8, -18, 16, 12);
        // 锤头金属反光
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(-5, -16, 3, 8);
        // 锤头铆钉
        ctx.fillStyle = '#99AABB';
        ctx.beginPath();
        ctx.arc(-5, -12, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -12, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // 锤头底部重量感阴影
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(-8, -9, 16, 3);
    }

    /** 获取武器配置 */
    static getConfig(type) {
        return Weapon.CONFIGS[type] || Weapon.CONFIGS.stick;
    }

    /** 随机武器类型（按权重） */
    static randomType(weights) {
        const w = weights || { stick: 30, pipe: 25, bottle: 25, hammer: 20 };
        const total = Object.values(w).reduce((s, v) => s + v, 0);
        let r = Math.random() * total;
        for (const [type, weight] of Object.entries(w)) {
            r -= weight;
            if (r <= 0) return type;
        }
        return 'stick';
    }
}

Weapon.CONFIGS = {
    stick: {
        name: '木棍',
        damageBonus: 6,
        rangeBonus: 10,
        speedMultiplier: 1.0,
        maxDurability: 12,
        knockbackBonus: 0,
        heavyDamageMultiplier: 1.3,
        color: '#8B6914',
        trailColor: '#A0781E',
        hitParticleType: 'weaponStick'
    },
    pipe: {
        name: '钢管',
        damageBonus: 10,
        rangeBonus: 15,
        speedMultiplier: 0.9,
        maxDurability: 15,
        knockbackBonus: 3,
        heavyDamageMultiplier: 1.5,
        color: '#8899AA',
        trailColor: '#AABBCC',
        hitParticleType: 'weaponPipe'
    },
    bottle: {
        name: '破瓶子',
        damageBonus: 14,
        rangeBonus: -5,
        speedMultiplier: 1.15,
        maxDurability: 6,
        knockbackBonus: -1,
        heavyDamageMultiplier: 1.2,
        color: '#44AA55',
        trailColor: '#66DD77',
        hitParticleType: 'weaponBottle'
    },
    hammer: {
        name: '铁锤',
        damageBonus: 18,
        rangeBonus: -5,
        speedMultiplier: 0.75,
        maxDurability: 8,
        knockbackBonus: 5,
        heavyDamageMultiplier: 2.0,
        color: '#667788',
        trailColor: '#FF8844',
        hitParticleType: 'weaponHammer'
    }
};

/** 武器挥动轨迹绘制 */
Weapon.drawSwingTrail = function(ctx, x, y, facing, progress, weaponType, isHeavy) {
    const cfg = Weapon.CONFIGS[weaponType];
    if (!cfg) return;
    const trailColor = cfg.trailColor;
    const alpha = Math.sin(progress * Math.PI) * (isHeavy ? 0.6 : 0.4);

    ctx.save();
    ctx.globalAlpha = alpha;

    switch (weaponType) {
        case 'stick': { // 棕色弧线 + 3条递减透明度拖尾
            const sAngle = facing === 1 ? -1.2 : Math.PI - 0.3;
            const eAngle = facing === 1 ? 0.3 : Math.PI + 1.2;
            const radius = 25 + progress * 10;
            // 3条递减透明度拖尾弧线
            for (let i = 0; i < 3; i++) {
                ctx.globalAlpha = alpha * (0.8 - i * 0.25);
                ctx.strokeStyle = trailColor;
                ctx.lineWidth = (isHeavy ? 4 : 2.5) - i * 0.5;
                ctx.beginPath();
                ctx.arc(x, y - 10, radius + i * 3, sAngle, eAngle);
                ctx.stroke();
            }
            break;
        }
        case 'pipe': { // 银色金属弧线 + 闪光点
            const psAngle = facing === 1 ? -1.0 : Math.PI - 0.5;
            const peAngle = facing === 1 ? 0.5 : Math.PI + 1.0;
            const pRadius = 28 + progress * 12;
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = isHeavy ? 5 : 3;
            ctx.beginPath();
            ctx.arc(x, y - 10, pRadius, psAngle, peAngle);
            ctx.stroke();
            // 金属闪光
            ctx.globalAlpha = alpha * 0.5;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(x, y - 10, pRadius, psAngle, peAngle);
            ctx.stroke();
            // 沿弧线分布的小亮点
            ctx.fillStyle = '#fff';
            const sparkCount = isHeavy ? 6 : 4;
            for (let i = 0; i < sparkCount; i++) {
                const t = (i + 0.5) / sparkCount;
                const angle = psAngle + (peAngle - psAngle) * t;
                const sx = x + Math.cos(angle) * pRadius;
                const sy = y - 10 + Math.sin(angle) * pRadius;
                ctx.globalAlpha = alpha * (0.6 + Math.sin(progress * Math.PI * 3 + i) * 0.4);
                ctx.beginPath();
                ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }
        case 'bottle': { // 碎片闪光 - 更多碎片和闪光
            const fragCount = isHeavy ? 10 : 7;
            for (let i = 0; i < fragCount; i++) {
                const angle = (facing === 1 ? -0.8 : Math.PI - 0.2) + i * 0.25 * (facing === 1 ? 1 : -1);
                const dist = 12 + progress * 22 + (i % 3) * 5;
                const fx = x + Math.cos(angle) * dist;
                const fy = y - 10 + Math.sin(angle) * dist;
                // 碎片
                ctx.fillStyle = trailColor;
                ctx.globalAlpha = alpha * (0.8 - i * 0.05);
                ctx.save();
                ctx.translate(fx, fy);
                ctx.rotate(i * 1.2);
                ctx.fillRect(-2, -1, 4, 2);
                ctx.restore();
                // 闪光点
                if (i % 2 === 0) {
                    ctx.fillStyle = 'rgba(255,255,255,0.6)';
                    ctx.globalAlpha = alpha * (0.5 + Math.sin(progress * Math.PI * 4 + i) * 0.3);
                    ctx.beginPath();
                    ctx.arc(fx, fy, 1, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            break;
        }
        case 'hammer': { // 厚重橙色冲击线 + 冲击波纹和地面裂纹
            const hsAngle = facing === 1 ? -0.8 : Math.PI - 0.6;
            const heAngle = facing === 1 ? 0.6 : Math.PI + 0.8;
            const hRadius = 22 + progress * 15;
            ctx.strokeStyle = trailColor;
            ctx.lineWidth = isHeavy ? 7 : 4;
            ctx.beginPath();
            ctx.arc(x, y - 10, hRadius, hsAngle, heAngle);
            ctx.stroke();
            // 冲击波纹
            ctx.globalAlpha = alpha * 0.3;
            ctx.strokeStyle = '#ffaa44';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x + facing * 20, y - 10, 15 + progress * 20, 0, Math.PI * 2);
            ctx.stroke();
            // 第二层冲击波纹
            if (isHeavy) {
                ctx.globalAlpha = alpha * 0.2;
                ctx.beginPath();
                ctx.arc(x + facing * 20, y - 10, 25 + progress * 25, 0, Math.PI * 2);
                ctx.stroke();
            }
            // 地面裂纹效果
            if (progress > 0.4) {
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = '#ff6633';
                ctx.lineWidth = 1.5;
                const crackX = x + facing * (20 + progress * 15);
                const crackY = y;
                // 主裂纹
                ctx.beginPath();
                ctx.moveTo(crackX, crackY);
                ctx.lineTo(crackX + facing * 8, crackY + 3);
                ctx.lineTo(crackX + facing * 15, crackY - 1);
                ctx.stroke();
                // 分支裂纹
                ctx.beginPath();
                ctx.moveTo(crackX + facing * 5, crackY + 2);
                ctx.lineTo(crackX + facing * 3, crackY + 8);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(crackX + facing * 10, crackY + 1);
                ctx.lineTo(crackX + facing * 12, crackY + 7);
                ctx.stroke();
            }
            break;
        }
    }
    ctx.restore();
};
