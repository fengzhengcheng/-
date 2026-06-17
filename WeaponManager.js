/**
 * WeaponManager.js - 武器管理模块
 * 管理地图上的武器生成、拾取、丢弃、掉落
 */
class WeaponManager {
    constructor() {
        this.weapons = []; // 地面上的武器
    }

    /** 初始化关卡武器 */
    initLevel(level, mapWidth, battleYMin, battleYMax) {
        this.weapons = [];
        const config = WeaponManager.LEVEL_CONFIGS[level] || WeaponManager.LEVEL_CONFIGS[1];
        // 地图初始武器
        for (let i = 0; i < config.initialCount; i++) {
            this.spawnRandomWeapon(
                300 + Math.random() * (mapWidth - 600),
                battleYMin + 20 + Math.random() * (battleYMax - battleYMin - 40),
                config.weights
            );
        }
    }

    /** 在指定位置生成随机武器 */
    spawnRandomWeapon(x, y, weights) {
        const type = Weapon.randomType(weights);
        this.weapons.push(new Weapon(type, x, y));
    }

    /** 在指定位置生成指定类型武器 */
    spawnWeapon(type, x, y) {
        this.weapons.push(new Weapon(type, x, y));
    }

    /** 更新地面武器 */
    update() {
        this.weapons.forEach(w => w.update());
        this.weapons = this.weapons.filter(w => w.alive);
    }

    /** 渲染地面武器 */
    render(ctx, cameraX) {
        this.weapons.forEach(w => w.renderOnGround(ctx, cameraX));
    }

    /** 查找玩家附近可拾取的武器 */
    findNearbyWeapon(px, py, pickupRange) {
        let closest = null;
        let closestDist = pickupRange;
        this.weapons.forEach(w => {
            if (!w.alive || !w.onGround) return;
            const dx = w.x - px;
            const dy = w.y - py;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < closestDist) {
                closestDist = dist;
                closest = w;
            }
        });
        return closest;
    }

    /** 拾取武器：返回拾取到的武器对象，从地面移除 */
    pickupWeapon(weapon) {
        if (!weapon || !weapon.alive) return null;
        weapon.onGround = false;
        const idx = this.weapons.indexOf(weapon);
        if (idx >= 0) this.weapons.splice(idx, 1);
        return weapon;
    }

    /** 丢弃武器到地面 */
    dropWeapon(weapon, x, y, mapWidth) {
        weapon.x = Math.max(20, Math.min(mapWidth - 20, x));
        weapon.y = y;
        weapon.onGround = true;
        weapon.alive = true;
        weapon.groundBobTimer = 0;
        this.weapons.push(weapon);
    }

    /** 清理所有地面武器 */
    clear() {
        this.weapons = [];
    }

    /** 获取当前关卡武器配置 */
    static getLevelConfig(level) {
        return WeaponManager.LEVEL_CONFIGS[level] || WeaponManager.LEVEL_CONFIGS[1];
    }
}

WeaponManager.LEVEL_CONFIGS = {
    1: {
        initialCount: 2,
        propDropRate: 0.2,
        weights: { stick: 40, pipe: 15, bottle: 35, hammer: 10 }
    },
    2: {
        initialCount: 2,
        propDropRate: 0.25,
        weights: { stick: 30, pipe: 35, bottle: 20, hammer: 15 }
    },
    3: {
        initialCount: 3,
        propDropRate: 0.3,
        weights: { stick: 15, pipe: 35, bottle: 10, hammer: 40 }
    }
};
