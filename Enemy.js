/**
 * Enemy.js - 敌人模块
 * 使用 CharacterRenderer 绘制程序化角色
 * 支持上下纵深追击和 Y 轴攻击判定
 */
class Enemy {
    constructor(x, y, type = 'normal') {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.width = 38;
        this.height = 68;
        this.type = type;
        const configs = {
            normal: { speed: 1.3, hp: 40, damage: 8, attackRange: 45, attackCooldown: 90, verticalSpeed: 0.5 },
            fast: { speed: 1.8, hp: 25, damage: 5, attackRange: 38, attackCooldown: 60, verticalSpeed: 0.7 },
            tank: { speed: 0.8, hp: 80, damage: 15, attackRange: 50, attackCooldown: 120, verticalSpeed: 0.4 }
        };
        const cfg = configs[type] || configs.normal;
        this.speed = cfg.speed;
        this.verticalSpeed = cfg.verticalSpeed;
        this.hp = cfg.hp;
        this.maxHp = cfg.hp;
        this.damage = cfg.damage;
        this.attackRange = cfg.attackRange;
        this.attackCooldownMax = cfg.attackCooldown;
        this.attackCooldown = Math.random() * 30;
        this.facing = -1;
        this.state = 'idle';
        this.attackTimer = 0;
        this.attackDuration = 22;
        this.attackHit = false;
        // 攻击状态标记（用于攻击名额机制）
        this.isAttacking = false;
        this.attackYRange = 30; // normal default, overridden per type below
        // 攻击Y范围按类型区分
        if (type === 'fast') this.attackYRange = 35;
        else if (type === 'tank') this.attackYRange = 35;
        this.hurtTimer = 0;
        this.hurtDuration = 15;
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.chaseRange = 500;
        this.animFrame = 0;
        this.animTimer = 0;
        this.alive = true;
        this.deathTimer = 0;
        this.deathDuration = 30;
        this.flashWhiteTimer = 0;
        this.yMin = 0;
        this.yMax = 600;
        this.idleTimer = 0;
        // 跳跃高度（jumpHeight = 0 在地面，jumpHeight > 0 在空中）
        this.jumpHeight = 0;
        // 角色外观
        this.charConfig = CharacterRenderer.getEnemyConfig(type);
        this.spriteCharId = type;
        // 动画状态机
        this.animStateMachine = new AnimationStateMachine(this);
        this.animStateMachine.init(type);
        this.useSpriteRenderer = true;
    }

    update(player, walkArea) {
        if (!this.alive) return;

        if (this.state === 'dead') {
            this.deathTimer++;
            if (this.deathTimer >= this.deathDuration) this.alive = false;
            this.animStateMachine.update(this.state, this.deathTimer / this.deathDuration);
            return;
        }

        if (this.state === 'hurt') {
            this.hurtTimer--;
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= 0.82;
            this.knockbackY *= 0.82;
            // 统一使用 walkArea 限制
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampY();
            if (this.hurtTimer <= 0) this.state = 'chase';
            this.updateAnim();
            this.animStateMachine.update(this.state, 1 - this.hurtTimer / this.hurtDuration);
            return;
        }

        if (this.state === 'attack') {
            this.isAttacking = true;
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.isAttacking = false;
                this.state = 'idle';
                this.idleTimer = 0;
                this.attackHit = false;
            }
            this.updateAnim();
            this.animStateMachine.update(this.state, 1 - this.attackTimer / this.attackDuration);
            return;
        }

        // AI
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distX = Math.abs(dx);
        const distY = Math.abs(dy);

        if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
        if (this.attackCooldown > 0) this.attackCooldown--;

        if (this.state === 'idle') {
            this.idleTimer++;
            if (this.idleTimer > 30) { // 反应延迟
                if (distX < 400) {
                    this.state = 'chase';
                    this.idleTimer = 0;
                }
            }
            this.updateAnim();
            this.animStateMachine.update(this.state, 0);
            return;
        }

        if (distX < this.attackRange && distY < this.attackYRange && this.attackCooldown <= 0) {
            this.state = 'attack';
            this.attackTimer = this.attackDuration;
            this.attackHit = false;
            this.idleTimer = 0;
            this.attackCooldown = this.attackCooldownMax;
        } else if (distX < this.chaseRange || this.state === 'chase') {
            this.state = 'chase';
            if (distX > this.attackRange * 0.5) this.x += this.facing * this.speed;
            if (distY > 20) this.y += (dy > 0 ? 1 : -1) * this.verticalSpeed * 0.5;
            // 统一使用 walkArea 限制
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampY();
        } else {
            this.state = 'idle';
            this.idleTimer = 0;
        }

        this.updateAnim();
        if (this.flashWhiteTimer > 0) this.flashWhiteTimer--;
        this.animStateMachine.update(this.state, 0);
    }

    clampY() {
        if (this.y < this.yMin) this.y = this.yMin;
        if (this.y > this.yMax) this.y = this.yMax;
    }

    takeDamage(damage, knockbackDir, knockbackForce) {
        if (this.state === 'dead') return;
        this.hp -= damage;
        this.state = 'hurt';
        this.hurtTimer = this.hurtDuration;
        this.knockbackX = knockbackDir * knockbackForce;
        this.knockbackY = (Math.random() - 0.5) * 3;
        this.flashWhiteTimer = 5;
        if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.deathTimer = 0; }
    }

    updateAnim() {
        this.animTimer++;
        if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame++; }
    }

    getAttackBox() {
        if (this.state !== 'attack') return null;
        const progress = 1 - this.attackTimer / this.attackDuration;
        if (progress < 0.25 || progress > 0.55) return null;
        const boxX = this.facing === 1 ? this.x : this.x - this.attackRange;
        return { x: boxX, y: this.y - this.height + 10, width: this.attackRange, height: this.height - 20, centerY: this.y, yRange: this.attackYRange };
    }

    getHitBox() {
        return { x: this.x - this.width / 2, y: this.y - this.height, width: this.width, height: this.height, centerY: this.y, yRange: 20 };
    }

    render(ctx, cameraX) {
        if (!this.alive && this.deathTimer >= this.deathDuration) return;

        const screenX = this.x - cameraX;

        // 死亡淡出
        if (this.state === 'dead') {
            const alpha = 1 - this.deathTimer / this.deathDuration;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
        }

        let renderState = this.state;
        if (this.state === 'chase') renderState = 'walk';
        else if (this.state === 'idle') renderState = 'idle';
        else if (this.state === 'attack') renderState = 'attack';
        else if (this.state === 'hurt') renderState = 'hurt';
        else if (this.state === 'dead') renderState = 'dead';

        const attackProgress = this.state === 'attack' ? 1 - this.attackTimer / this.attackDuration : 0;

        // 尝试使用新精灵渲染器
        let rendered = false;
        if (this.useSpriteRenderer) {
            rendered = SpriteCharacterRenderer.draw(
                ctx, screenX, this.y, this.facing,
                renderState, this.charConfig,
                this.animFrame, attackProgress,
                0, this.flashWhiteTimer > 0, 0,
                null, null,
                this.animStateMachine,
                this.spriteCharId
            );
        }

        // 如果新渲染器失败，使用旧渲染器
        if (!rendered) {
            CharacterRenderer.draw(
                ctx, screenX, this.y, this.facing,
                renderState, this.charConfig,
                this.animFrame, attackProgress,
                0, this.flashWhiteTimer > 0, 0
            );
        }

        if (this.state === 'dead') {
            ctx.restore();
        }

        // 血量条
        if (this.hp < this.maxHp && this.state !== 'dead' && this.alive) {
            const barW = 30;
            const barH = 3;
            const barX = screenX - barW / 2;
            const barY = this.y - this.height - 18;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(barX, barY, barW * (this.hp / this.maxHp), barH);
        }
    }
}
