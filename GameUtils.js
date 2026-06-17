/**
 * GameUtils.js - 游戏通用工具
 * 统一攻击判定、边界限制、walkArea 管理
 */
class GameUtils {
    /**
     * 统一的攻击命中判定
     * @param {Object} attacker - 攻击者（需要 x, y, jumpHeight）
     * @param {Object} target - 目标（需要 x, y, jumpHeight）
     * @param {number} attackRangeX - 横向攻击范围
     * @param {number} attackRangeY - 纵深攻击范围（Y轴容差）
     * @param {boolean} isGroundAttack - 是否为地面攻击（默认true）
     * @returns {boolean} 是否命中
     */
    static canHit(attacker, target, attackBoxOrRangeX, attackRangeY, isGroundAttack = true) {
        const attackBox = typeof attackBoxOrRangeX === 'object' && attackBoxOrRangeX
            ? attackBoxOrRangeX
            : null;
        const targetHitBox = typeof target.getHitBox === 'function'
            ? target.getHitBox()
            : {
                x: target.x - (target.width || 0) / 2,
                y: target.y - (target.height || 0),
                width: target.width || 0,
                height: target.height || 0,
                centerY: target.y,
                yRange: Math.max(18, Math.floor((target.height || 40) * 0.25))
            };

        if (attackBox) {
            const targetCenterX = targetHitBox.x + targetHitBox.width / 2;
            if (targetCenterX < attackBox.x || targetCenterX > attackBox.x + attackBox.width) {
                return false;
            }
            if (!this.sameLane(attackBox, targetHitBox)) return false;
        } else {
            const dx = Math.abs(attacker.x - target.x);
            if (dx > attackBoxOrRangeX) return false;
            if (!this.sameLane(
                { centerY: attacker.y, yRange: attackRangeY },
                targetHitBox
            )) {
                return false;
            }
        }

        // 地面攻击判定：目标 jumpHeight > 15（空中）时不能命中
        if (isGroundAttack && target.jumpHeight > 15) return false;

        // 地面攻击判定：攻击者 jumpHeight > 15（空中）时不能命中地面目标
        if (isGroundAttack && attacker.jumpHeight > 15 && target.jumpHeight <= 15) return false;

        return true;
    }

    /**
     * 判断两个实体是否在同一轨道/行
     * @param {Object} a - 实体A
     * @param {Object} b - 实体B
     * @returns {boolean} 是否在同一轨道
     */
    static sameLane(a, b) {
        const centerAY = a.centerY ?? a.y ?? 0;
        const centerBY = b.centerY ?? b.y ?? 0;
        const rangeA = Math.max(12, a.yRange ?? 20);
        const rangeB = Math.max(12, b.yRange ?? 20);
        return Math.abs(centerAY - centerBY) <= Math.min(rangeA, rangeB, 18);
    }

    /**
     * 将实体限制在可行走区域内
     * @param {Object} entity - 实体（需要有 x, y, width, height 属性）
     * @param {Object} walkArea - 可行走区域 { xMin, xMax, yMin, yMax }
     */
    static clampToWalkArea(entity, walkArea) {
        if (!walkArea || !entity || entity.x === undefined || entity.y === undefined) return;
        if (entity.x < walkArea.xMin) entity.x = walkArea.xMin;
        if (entity.x > walkArea.xMax) entity.x = walkArea.xMax;
        if (entity.y < walkArea.yMin) entity.y = walkArea.yMin;
        if (entity.y > walkArea.yMax) entity.y = walkArea.yMax;
    }

    /**
     * 将道具/武器位置限制在 walkArea 内（不贴边太近）
     */
    static clampItemToWalkArea(x, y, walkArea, padding = 20) {
        const clampedX = Math.max(walkArea.xMin + padding, Math.min(walkArea.xMax - padding, x));
        const clampedY = Math.max(walkArea.yMin + padding, Math.min(walkArea.yMax - padding, y));
        return { x: clampedX, y: clampedY };
    }

    /**
     * 生成 walkArea 内的随机坐标
     */
    static randomInWalkArea(walkArea, padding = 30) {
        const x = walkArea.xMin + padding + Math.random() * (walkArea.xMax - walkArea.xMin - padding * 2);
        const y = walkArea.yMin + padding + Math.random() * (walkArea.yMax - walkArea.yMin - padding * 2);
        return { x, y };
    }

    /**
     * 检测实体与固体箱子的碰撞并解决
     * @param {Object} entity - 实体（玩家或敌人）
     * @param {Array} props - 道具数组
     */
    static resolveSolidPropsCollision(entity, props) {
        if (!entity || !props) return;

        const entityBox = {
            x: entity.x - entity.width / 2,
            y: entity.y - entity.height,
            width: entity.width,
            height: entity.height
        };

        for (const prop of props) {
            if (!prop.alive || !prop.solid) continue;

            const propBox = prop.getCollisionBox();

            // 检测碰撞
            if (this.boxOverlap(entityBox, propBox)) {
                // 计算重叠量
                const overlapX = Math.min(entityBox.x + entityBox.width, propBox.x + propBox.width) - Math.max(entityBox.x, propBox.x);
                const overlapY = Math.min(entityBox.y + entityBox.height, propBox.y + propBox.height) - Math.max(entityBox.y, propBox.y);

                // 选择较小的重叠方向推开
                if (overlapX < overlapY) {
                    // 水平推开
                    if (entity.x < prop.x) {
                        entity.x -= overlapX;
                    } else {
                        entity.x += overlapX;
                    }
                } else {
                    // 垂直推开
                    if (entity.y < prop.y) {
                        entity.y -= overlapY;
                    } else {
                        entity.y += overlapY;
                    }
                }

                // 更新 entityBox
                entityBox.x = entity.x - entity.width / 2;
                entityBox.y = entity.y - entity.height;
            }
        }
    }

    /**
     * 检测两个矩形是否重叠
     */
    static boxOverlap(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
}
