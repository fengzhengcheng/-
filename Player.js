/**
 * Player.js - 玩家角色模块（配置化）
 * 根据角色配置创建不同属性和技能的玩家
 */
class Player {
    constructor(x, y, charConfig) {
        this.x = x;
        this.y = y;
        this.config = charConfig || CharacterConfig.along;
        this.width = 32;
        this.height = 64;
        this.hp = this.config.maxHp;
        this.maxHp = this.config.maxHp;
        this.energy = this.config.maxEp;
        this.maxEnergy = this.config.maxEp;
        this.speed = this.config.moveSpeed;
        this.facing = 1;
        this.alive = true;
        this.state = 'idle';
        this.moving = false;
        this.animFrame = 0;
        this.animTimer = 0;
        this.flashWhiteTimer = 0;
        this.jumpHeight = 0;
        this.jumpVelocity = 0;
        this.isJumping = false;
        this.yMin = 0;
        this.yMax = 600;
        // 攻击
        this.attackTimer = 0;
        this.attackDuration = Math.floor(22 * this.config.attackSpeed);
        this.attackHit = false;
        this.attackType = 'normal';
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimeout = 25;
        // 技能
        this.skillActive = false;
        this.skillTimer = 0;
        this.skillDuration = Math.floor(28 * this.config.attackSpeed);
        this.laserSkillActive = false;
        this.isLaserCasting = false;
        this.laserTarget = null;
        this.laserTargetId = null;
        this.laserHasTarget = false;
        this.laserDistance = 0;
        this.laserDamageCooldown = 0;
        this.laserStartTime = 0;
        this.laserLastDamageAt = 0;
        this.laserLastUpdateAt = 0;
        this.laserOrigin = null;
        this.laserEnd = null;
        this.laserCooldownRemaining = 0;
        // 疾风踢（小影专属）
        this.dashSpeed = 0;
        this.dashDir = 0;
        this.dashTimer = 0;
        // 震地拳（铁山专属）
        this.groundPoundPhase = 0;
        // 技能命中追踪（防止同一次技能对同一目标重复伤害）
        this.skillHitEnemies = new Set();
        this.skillHitProps = new Set();
        // 残影系统
        this.afterImages = [];
        // 技能音效标记
        this.skillSoundPlayed = false;
        // 受伤
        this.hurtTimer = 0;
        this.hurtDuration = 18;
        this.invincibleTimer = 0;
        this.invincibleDuration = 48; // 约 0.8 秒（60fps）
        this.knockbackX = 0;
        this.epWarningTimer = 0;
        // 角色外观
        this.charConfig = CharacterRenderer.getPlayerConfigByType(this.config.charType);
        // 武器系统
        this.weapon = null; // 当前持有的武器对象
        // 跳跃高度（jumpHeight = 0 在地面，jumpHeight > 0 在空中）
        this.jumpHeight = 0;
        // 动画状态机
        this.animStateMachine = new AnimationStateMachine(this);
        this.animStateMachine.init(this.config.charType);
        this.useSpriteRenderer = true;
    }

    update(input, mapWidth, yMin, yMax, walkArea) {
        if (this.state === 'dead') {
            this.moving = false;
            return;
        }
        const prevX = this.x;
        const prevY = this.y;
        this.yMin = yMin; this.yMax = yMax;
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.epWarningTimer > 0) this.epWarningTimer--;
        if (this.laserCooldownRemaining > 0) {
            this.laserCooldownRemaining = Math.max(0, this.laserCooldownRemaining - 16.67);
        }
        if (this.isLaserCharacter && this.isLaserCasting && !input.isDown('KeyL')) {
            this.endLaserCast();
        }

        // 更新残影（始终更新，不受状态影响）
        this.afterImages = this.afterImages.filter(ai => {
            ai.timer--;
            ai.alpha *= 0.88;
            return ai.timer > 0;
        });

        if (this.state === 'hurt') {
            this.hurtTimer--;
            this.x += this.knockbackX;
            this.knockbackX *= 0.85;
            if (this.hurtTimer <= 0) this.state = 'idle';
            // 统一使用 walkArea 限制
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampPosition(mapWidth);
            this.moving = this.x !== prevX || this.y !== prevY;
            this.updateAnim();
            this.animStateMachine.update(this.state, 0);
            return;
        }

        if (this.isLaserCharacter && this.isLaserCasting) {
            if (this.controlEnabled !== false) {
                this.applyDirectionalMovement(input, mapWidth, walkArea);
            }
            this.state = 'skill';
            this.attackType = 'skill';
            this.skillActive = true;
            this.moving = this.x !== prevX || this.y !== prevY;
            this.updateAnim();
            this.animStateMachine.update(this.state, 0);
            return;
        }

        // 跳跃
        if (this.isJumping) {
            this.jumpVelocity += 0.8; // 重力
            this.jumpHeight -= this.jumpVelocity;
            if (this.jumpHeight <= 0) {
                this.jumpHeight = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        }

        // 技能执行（包含疾风踢突进逻辑）
        if (this.state === 'skill') {
            this.updateSkill(mapWidth);
            if (this.controlEnabled !== false && this.canMoveDuringCurrentSkill()) {
                this.applyDirectionalMovement(input, mapWidth, walkArea);
            }
            this.moving = this.x !== prevX || this.y !== prevY;
            this.updateAnim();
            const progress = 1 - this.skillTimer / this.skillDuration;
            this.animStateMachine.update(this.state, progress);
            return;
        }

        // 攻击
        if (this.state === 'attack' || this.state === 'heavy') {
            if (this.controlEnabled !== false) {
                this.applyDirectionalMovement(input, mapWidth, walkArea);
                if (this.config.id === 'chifeng') {
                    if (input.isJustPressed('KeyK') || input.isDown('KeyK')) {
                        if (this.state !== 'heavy' || input.isJustPressed('KeyK')) this.startAttack('heavy');
                    } else if (input.isJustPressed('KeyJ') || input.isDown('KeyJ')) {
                        if (this.state !== 'attack' || input.isJustPressed('KeyJ')) this.startAttack('normal');
                    } else {
                        this.state = this.moving ? 'walk' : 'idle';
                        this.attackHit = false;
                    }
                    this.attackTimer = Math.max(this.attackTimer - 1, 1);
                } else if (input.isJustPressed('KeyJ')) {
                    this.startAttack('normal');
                } else if (input.isJustPressed('KeyK')) {
                    this.startAttack('heavy');
                } else {
                    this.attackTimer--;
                }
            } else {
                this.attackTimer--;
            }
            this.moving = this.x !== prevX || this.y !== prevY;
            if (this.attackTimer <= 0) { this.state = this.moving ? 'walk' : 'idle'; this.attackHit = false; }
            this.updateAnim();
            const progress = 1 - this.attackTimer / this.attackDuration;
            this.animStateMachine.update(this.state, progress);
            return;
        }

        // 连击超时
        if (this.comboTimer > 0) { this.comboTimer--; if (this.comboTimer <= 0) this.comboCount = 0; }

        // EP 自然恢复
        if (!this.isLaserCasting) {
            this.energy = Math.min(this.maxEnergy, this.energy + 0.05);
        }

        // 输入（playerControlEnabled 由 Game 控制）
        if (this.controlEnabled !== false) {
            if (input.isDown('KeyA')) { this.x -= this.speed; this.facing = -1; }
            if (input.isDown('KeyD')) { this.x += this.speed; this.facing = 1; }
            if (input.isDown('KeyW') && this.y > this.yMin) { this.y -= this.speed * 0.7; }
            if (input.isDown('KeyS') && this.y < this.yMax) { this.y += this.speed * 0.7; }
            this.clampPosition(mapWidth);
            const moving = this.x !== prevX || this.y !== prevY;
            this.moving = moving;

            // 跳跃
            if (input.isJustPressed('Space') && !this.isJumping) {
                this.isJumping = true; this.jumpVelocity = -12;
            }

            // 普攻
            if (input.isJustPressed('KeyJ')) {
                this.startAttack('normal');
                return;
            }
            // 重击
            if (input.isJustPressed('KeyK')) {
                this.startAttack('heavy');
                return;
            }
            // 技能
            if (this.isLaserCharacter) {
                if (input.isDown('KeyL')) {
                    this.beginLaserCast();
                    return;
                }
            } else if (input.isJustPressed('KeyL')) {
                this.startSkill();
                return;
            }

            this.state = moving ? 'walk' : 'idle';
        } else {
            this.moving = this.x !== prevX || this.y !== prevY;
        }
        this.updateAnim();
        this.animStateMachine.update(this.state, 0);
    }

    getRenderState() {
        if (!this.alive || this.state === 'dead') return 'dead';
        if (this.state === 'hurt') return 'hurt';
        if (this.isLaserCasting || this.laserSkillActive) return 'skill';
        if (this.state === 'attack' || this.state === 'heavy' || this.state === 'skill') return this.state;
        if (this.state === 'walk' && this.moving) return 'walk';
        return 'idle';
    }

    get isLaserCharacter() {
        return this.config.id === 'chifeng' && this.config.skillType === 'laser_eye';
    }

    startAttack(type) {
        const weaponSpeedMul = this.weapon ? this.weapon.speedMultiplier : 1;
        if (type === 'normal') {
            this.state = 'attack';
            this.attackType = 'normal';
            this.attackDuration = Math.floor(22 * this.config.attackSpeed * weaponSpeedMul);
            this.attackTimer = this.attackDuration;
            this.attackHit = false;
        } else {
            this.state = 'heavy';
            this.attackType = 'heavy';
            this.attackDuration = Math.floor(30 * this.config.attackSpeed * weaponSpeedMul);
            this.attackTimer = this.attackDuration;
            this.attackHit = false;
            this.comboCount = 0;
        }
    }

    startSkill() {
        if (this.isLaserCharacter) {
            this.beginLaserCast();
            return;
        }
        if (this.energy < this.config.skillCost) {
            this.epWarningTimer = 40;
            return;
        }
        this.energy -= this.config.skillCost;
        this.state = 'skill';
        this.attackType = 'skill';
        this.attackHit = false;
        this.skillDuration = Math.floor(28 * this.config.attackSpeed);
        this.skillTimer = this.skillDuration;
        this.skillActive = true;
        this.skillSoundPlayed = false;
        this.skillHitEnemies.clear();
        this.skillHitProps.clear();
        this.afterImages = [];

        // 根据技能类型初始化
        if (this.config.skillType === 'dashKick') {
            this.dashDir = this.facing;
            this.dashSpeed = 10;
            this.dashTimer = 12;
        } else if (this.config.skillType === 'groundPound') {
            this.groundPoundPhase = 0;
        }
    }

    beginLaserCast() {
        if (!this.isLaserCharacter || !this.alive) return;
        if (this.state === 'hurt' || this.state === 'dead' || this.state === 'attack' || this.state === 'heavy') return;
        if (this.laserCooldownRemaining > 0) return;
        if (this.energy <= 0) {
            this.epWarningTimer = 40;
            return;
        }
        if (this.isLaserCasting) return;

        const now = performance.now();
        this.state = 'skill';
        this.attackType = 'skill';
        this.attackHit = false;
        this.skillActive = true;
        this.laserSkillActive = true;
        this.isLaserCasting = true;
        this.laserTarget = null;
        this.laserTargetId = null;
        this.laserHasTarget = false;
        this.laserDistance = 0;
        this.laserDamageCooldown = 0;
        this.laserStartTime = now;
        this.laserLastDamageAt = 0;
        this.laserLastUpdateAt = now;
        this.laserOrigin = null;
        this.laserEnd = null;
    }

    endLaserCast(applyCooldown = true) {
        const wasCasting = this.isLaserCasting || this.laserSkillActive;
        this.laserSkillActive = false;
        this.isLaserCasting = false;
        this.laserTarget = null;
        this.laserTargetId = null;
        this.laserHasTarget = false;
        this.laserDistance = 0;
        this.laserDamageCooldown = 0;
        this.laserOrigin = null;
        this.laserEnd = null;
        this.skillActive = false;
        this.attackHit = false;
        if (wasCasting && applyCooldown && this.config.laserCooldown > 0) {
            this.laserCooldownRemaining = this.config.laserCooldown;
        }
        if (this.alive && this.state === 'skill') {
            this.state = 'idle';
        }
    }

    updateSkill(mapWidth) {
        this.skillTimer--;

        if (this.config.skillType === 'dashKick') {
            // 疾风踢：短暂蓄力后突进
            const windupFrames = 5;
            const elapsed = this.skillDuration - this.skillTimer;

            if (elapsed >= windupFrames && this.dashTimer > 0) {
                // 突进阶段：移动角色
                this.x += this.dashDir * this.dashSpeed;
                this.dashTimer--;
                // 记录残影位置
                if (this.dashTimer % 3 === 0) {
                    this.afterImages.push({
                        x: this.x, y: this.y, facing: this.facing,
                        alpha: 0.4, timer: 12, animFrame: this.animFrame,
                        pose: 'attack'
                    });
                }
                this.clampPosition(mapWidth);
            }

            // 技能结束条件：skillTimer 归零且 dashTimer 归零
            if (this.skillTimer <= 0 && this.dashTimer <= 0) {
                this.state = 'idle';
                this.skillActive = false;
                this.attackHit = false;
                this.skillHitEnemies.clear();
                this.skillHitProps.clear();
            }
            // 安全超时：如果 skillTimer 归零但 dashTimer 未归零，强制结束
            if (this.skillTimer <= 0 && this.dashTimer > 0) {
                this.dashTimer = 0;
                this.state = 'idle';
                this.skillActive = false;
                this.attackHit = false;
                this.skillHitEnemies.clear();
                this.skillHitProps.clear();
            }
        } else if (this.config.skillType === 'groundPound') {
            // 震地拳：前摇 → 砸地
            if (this.skillTimer <= this.skillDuration * 0.5 && this.groundPoundPhase === 0) {
                this.groundPoundPhase = 1; // 砸地
            }
            if (this.skillTimer <= 0) {
                this.state = 'idle';
                this.skillActive = false;
                this.attackHit = false;
                this.skillHitEnemies.clear();
                this.skillHitProps.clear();
            }
        } else {
            // 能量斩：标准技能
            if (this.skillTimer <= 0) {
                this.state = 'idle';
                this.skillActive = false;
                this.attackHit = false;
                this.skillHitEnemies.clear();
                this.skillHitProps.clear();
            }
        }
    }

    advanceCombo() {
        this.comboCount = (this.comboCount + 1) % 3;
        this.comboTimer = this.comboTimeout;
    }

    getCurrentDamage() {
        let base = 0;
        if (this.attackType === 'normal') base = this.config.normalDamage[this.comboCount] || this.config.normalDamage[0];
        else if (this.attackType === 'heavy') base = this.config.heavyDamage;
        else if (this.attackType === 'skill') return this.config.skillDamage; // 技能不受武器影响
        // 武器加成
        if (this.weapon && (this.attackType === 'normal' || this.attackType === 'heavy')) {
            base += this.weapon.damageBonus;
            if (this.attackType === 'heavy') {
                base = Math.floor(base * this.weapon.heavyDamageMultiplier);
            }
            // 角色与武器平衡
            if (this.config.charType === 'xiaoying') {
                base = Math.floor(base * 0.85); // 小影武器伤害略低
            } else if (this.config.charType === 'tieshan') {
                base = Math.floor(base * 1.1); // 铁山武器伤害略高
            }
        }
        return base;
    }

    getCurrentKnockback() {
        let base = 0;
        if (this.attackType === 'normal') base = this.config.knockback[this.comboCount] || this.config.knockback[0];
        else if (this.attackType === 'heavy') base = this.config.heavyKnockback;
        else if (this.attackType === 'skill') return this.config.skillKnockback;
        // 武器加成
        if (this.weapon && (this.attackType === 'normal' || this.attackType === 'heavy')) {
            base += this.weapon.knockbackBonus;
            if (this.config.charType === 'tieshan') base += 2; // 铁山击退更强
        }
        return base;
    }

    /** 是否为多段命中技能（疾风踢、震地拳可命中多个目标） */
    get isMultiHitSkill() {
        return this.attackType === 'skill' &&
            (this.config.skillType === 'dashKick' || this.config.skillType === 'groundPound');
    }

    getAttackBox() {
        if (this.attackHit && !this.isMultiHitSkill) return null;
        const rangeBonus = this.weapon ? this.weapon.rangeBonus : 0;
        if (this.state === 'attack') {
            if (this.config.id === 'chifeng') {
                const range = (this.config.attackRange[this.comboCount] || this.config.attackRange[0]) + rangeBonus;
                const boxX = this.facing === 1 ? this.x : this.x - range;
                return { x: boxX, y: this.y - this.height + 10, width: range, height: this.height - 20, centerY: this.y, yRange: 30 };
            }
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress < 0.2 || progress > 0.6) return null;
            const range = (this.config.attackRange[this.comboCount] || this.config.attackRange[0]) + rangeBonus;
            const boxX = this.facing === 1 ? this.x : this.x - range;
            return { x: boxX, y: this.y - this.height + 10, width: range, height: this.height - 20, centerY: this.y, yRange: 30 };
        }
        if (this.state === 'heavy') {
            if (this.config.id === 'chifeng') {
                const range = this.config.heavyRange + rangeBonus;
                const boxX = this.facing === 1 ? this.x : this.x - range;
                return { x: boxX, y: this.y - this.height + 5, width: range, height: this.height - 10, centerY: this.y, yRange: 30 };
            }
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress < 0.4 || progress > 0.7) return null;
            const range = this.config.heavyRange + rangeBonus;
            const boxX = this.facing === 1 ? this.x : this.x - range;
            return { x: boxX, y: this.y - this.height + 5, width: range, height: this.height - 10, centerY: this.y, yRange: 30 };
        }
        if (this.state === 'skill') {
            const progress = 1 - this.skillTimer / this.skillDuration;
            if (this.config.skillType === 'energySlash') {
                if (progress < 0.3 || progress > 0.7) return null;
                const range = this.config.skillRange;
                const dist = progress * 50;
                const boxX = this.facing === 1 ? this.x + dist : this.x - range - dist;
                return { x: boxX, y: this.y - this.height, width: range, height: this.height, centerY: this.y, yRange: 35 };
            }
            if (this.config.skillType === 'dashKick') {
                // 疾风踢：突进期间持续有攻击判定
                if (progress < 0.2) return null;
                const range = 55;
                const boxX = this.facing === 1 ? this.x : this.x - range;
                return { x: boxX, y: this.y - this.height + 5, width: range, height: this.height - 10, centerY: this.y, yRange: 30 };
            }
            if (this.config.skillType === 'groundPound') {
                if (this.groundPoundPhase < 1) return null;
                if (progress < 0.5 || progress > 0.8) return null;
                const range = this.config.skillRange;
                const boxX = this.facing === 1 ? this.x : this.x - range;
                return { x: boxX, y: this.y - 34, width: range, height: 48, centerY: this.y, yRange: 24 };
            }
        }
        return null;
    }

    getHitBox() {
        return { x: this.x - this.width / 2, y: this.y - this.height, width: this.width, height: this.height, centerY: this.y, yRange: 20 };
    }

    takeDamage(damage, knockbackDir) {
        if (this.state === 'dead' || this.state === 'hurt' || this.invincibleTimer > 0) return;
        this.hp -= damage;
        this.state = 'hurt';
        this.hurtTimer = this.hurtDuration;
        this.invincibleTimer = this.invincibleDuration;
        this.knockbackX = knockbackDir * 7;
        this.comboCount = 0;
        // 中断技能
        this.skillActive = false;
        this.endLaserCast(false);
        this.dashTimer = 0;
        this.groundPoundPhase = 0;
        this.skillHitEnemies.clear();
        this.skillHitProps.clear();
        if (this.hp <= 0) {
            this.hp = 0;
            this.state = 'dead';
            this.alive = false;
            this.afterImages = [];
            // 死亡时武器掉落（标记，由Game.js处理实际掉落）
            this.weaponDropOnDeath = this.weapon;
            this.weapon = null;
        }
    }

    clampPosition(mapWidth) {
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > mapWidth - this.width / 2) this.x = mapWidth - this.width / 2;
        if (this.y < this.yMin) this.y = this.yMin;
        if (this.y > this.yMax) this.y = this.yMax;
    }

    applyDirectionalMovement(input, mapWidth, walkArea) {
        if (!input) return;
        if (input.isDown('KeyA')) { this.x -= this.speed; this.facing = -1; }
        if (input.isDown('KeyD')) { this.x += this.speed; this.facing = 1; }
        if (input.isDown('KeyW') && this.y > this.yMin) { this.y -= this.speed * 0.7; }
        if (input.isDown('KeyS') && this.y < this.yMax) { this.y += this.speed * 0.7; }
        if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
        else this.clampPosition(mapWidth);
    }

    canMoveDuringCurrentSkill() {
        return this.config.skillType !== 'dashKick';
    }

    updateAnim() { this.animTimer++; if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame++; } }

    render(ctx, cameraX) {
        const screenX = this.x - cameraX;
        const attackProgress = (this.state === 'attack' || this.state === 'heavy')
            ? 1 - this.attackTimer / this.attackDuration : 0;
        const skillProgress = this.state === 'skill'
            ? 1 - this.skillTimer / this.skillDuration : 0;

        // 无敌闪烁
        if (this.invincibleTimer > 0 && this.animFrame % 4 < 2) return;

        // 绘制残影（在角色下方）
        if (this.afterImages.length > 0) {
            SkillEffects.drawSpeedAfterImages(ctx, cameraX, this.afterImages, this.charConfig);
        }

        // 确定渲染状态
        const renderState = this.getRenderState();

        // 尝试使用新精灵渲染器（优先使用真实PNG图片）
        let rendered = false;
        if (this.useSpriteRenderer) {
            rendered = SpriteCharacterRenderer.draw(
                ctx, screenX, this.y, this.facing,
                renderState, this.charConfig,
                this.animFrame, this.state === 'skill' ? skillProgress : attackProgress,
                this.comboCount, this.flashWhiteTimer > 0, this.jumpHeight,
                this.config.skillType,
                this.weapon ? this.weapon.type : null,
                this.animStateMachine,
                this.config.id  // ★ 关键：传递 charId (chifeng/qinglan)
            );
            if (!rendered) {
                console.log(`[CharSprite] SpriteCharacterRenderer returned false for ${this.config.id}, fallback to CharacterRenderer`);
            } else {
                console.log(`[CharSprite] render player with image: ${this.config.id}`);
            }
        }

        // 如果新渲染器失败，使用旧渲染器
        if (!rendered) {
            CharacterRenderer.draw(
                ctx, screenX, this.y, this.facing,
                renderState, this.charConfig,
                this.animFrame, this.state === 'skill' ? skillProgress : attackProgress,
                this.comboCount, this.flashWhiteTimer > 0, this.jumpHeight,
                this.config.skillType,
                this.weapon ? this.weapon.type : null
            );
        }

        // 手持武器叠加绘制（保证任何渲染路径下武器都可见）
        if (this.weapon && this.state !== 'dead') {
            this.renderHeldWeaponOverlay(ctx, screenX, this.y, this.facing, this.state, attackProgress, skillProgress);
        }

        // 技能特效
        if (this.state === 'skill') {
            this.renderSkillEffect(ctx, screenX, skillProgress);
        }

        // EP 不足提示
        if (this.epWarningTimer > 0) {
            const a = Math.min(1, this.epWarningTimer / 15);
            ctx.save(); ctx.globalAlpha = a;
            ctx.fillStyle = '#ff4444'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('能量不足', screenX, this.y - this.height - 10);
            ctx.restore();
        }
    }

    /** 手持武器叠加绘制（在角色渲染完成后，确保武器始终可见） */
    renderHeldWeaponOverlay(ctx, screenX, playerY, facing, state, attackProgress, skillProgress) {
        if (!this.weapon) return;

        // jumpHeight 为正值（地面是0，空中是正数）
        const screenY = playerY - this.jumpHeight;
        let handX, handY, swingAngle = 0;

        // 根据状态计算手部位置和武器角度
        switch (state) {
            case 'idle':
                handX = screenX + facing * 22;
                handY = screenY - 32;
                break;
            case 'walk':
                handX = screenX + facing * 22;
                handY = screenY - 32 + Math.sin(this.animFrame * 0.7) * 4;
                break;
            case 'jump':
                handX = screenX + facing * 24;
                handY = screenY - 40;
                swingAngle = facing * 0.6;
                break;
            case 'attack': {
                const extend = Math.sin(attackProgress * Math.PI);
                handX = screenX + facing * (14 + extend * 35);
                handY = screenY - 34;
                swingAngle = (this.comboCount === 1) ? -1.2 + attackProgress * 1.8 : facing * -0.3 + extend * 0.8;
                break;
            }
            case 'heavy': {
                const hExtend = Math.sin(attackProgress * Math.PI);
                if (attackProgress < 0.3) {
                    handX = screenX + facing * 10;
                    handY = screenY - 34;
                    swingAngle = facing * -0.8;
                } else {
                    handX = screenX + facing * (14 + hExtend * 45);
                    handY = screenY - 36;
                    swingAngle = facing * 0.3;
                }
                break;
            }
            case 'skill': {
                handX = screenX + facing * 20;
                handY = screenY - 34;
                break;
            }
            case 'hurt':
                handX = screenX + facing * 8;
                handY = screenY - 32;
                break;
            default:
                handX = screenX + facing * 22;
                handY = screenY - 32;
        }

        Weapon.drawHeldWeapon(ctx, this.weapon.type, handX, handY, facing, swingAngle);
    }

    renderSkillEffect(ctx, screenX, progress) {
        if (this.config.skillType === 'laser_eye') {
            return;
        } else if (this.config.skillType === 'energySlash') {
            SkillEffects.drawAlongEnergySlash(ctx, screenX, this.y, this.facing, progress);
        } else if (this.config.skillType === 'dashKick') {
            SkillEffects.drawXiaoyingDashKick(ctx, screenX, this.y, this.facing, progress);
        } else if (this.config.skillType === 'groundPound') {
            SkillEffects.drawTieshanGroundSlam(ctx, screenX, this.y, this.facing, progress, this.groundPoundPhase);
        }
    }

    /** 清理技能相关状态（用于重开/返回主菜单） */
    clearSkillState() {
        this.skillActive = false;
        this.endLaserCast(false);
        this.dashTimer = 0;
        this.dashDir = 0;
        this.dashSpeed = 0;
        this.groundPoundPhase = 0;
        this.skillHitEnemies.clear();
        this.skillHitProps.clear();
        this.afterImages = [];
        this.skillSoundPlayed = false;
        this.jumpHeight = 0;
        this.isJumping = false;
        this.jumpVelocity = 0;
    }

    /** 重置动画状态机 */
    resetAnimationState() {
        if (this.animStateMachine) {
            this.animStateMachine.reset();
        }
    }
}
