/**
 * Boss.js - Boss 角色模块（配置化）
 * 不同关卡使用不同 Boss 配置
 */
class Boss {
    constructor(x, y, config) {
        this.x = x;
        this.y = y;
        this.name = config.name || 'Boss';
        this.width = 56;
        this.height = 90;
        this.hp = config.hp || 300;
        this.maxHp = config.hp || 300;
        this.speed = config.speed || 1.2;
        this.verticalSpeed = config.verticalSpeed || 0.8;
        this.facing = -1;
        this.alive = true;
        this.state = 'entrance';
        this.animFrame = 0;
        this.animTimer = 0;
        this.flashWhiteTimer = 0;
        this.yMin = 0;
        this.yMax = 600;

        // 出场
        this.entranceTargetX = 0;
        this.entranceComplete = false;

        // 攻击系统
        this.attackTimer = 0;
        this.attackDuration = 0;
        this.attackHit = false;
        this.attackCooldown = 0;
        this.attackCooldownMax = config.attackCooldownMax || 50;
        this.attackYRange = 35;

        // 攻击属性（从配置读取）
        this.punchDamage = config.punchDamage || 12;
        this.heavyDamage = config.heavyDamage || 20;
        this.chargeDamage = config.chargeDamage || 25;
        this.slamDamage = config.slamDamage || 18;
        this.punchRange = config.punchRange || 55;
        this.heavyRange = config.heavyRange || 65;
        this.chargeRange = config.chargeRange || 80;
        this.slamRange = config.slamRange || 100;

        // 阶段提示文字
        this.phase2Text = config.phase2Text || 'Boss 进入强化状态！';
        this.phase3Text = config.phase3Text || 'Boss 进入狂暴状态！';

        // 冲撞
        this.chargeSpeed = 8;
        this.chargeDir = 0;
        this.chargeDistance = 0;
        this.chargeMaxDistance = 200;

        // 震地
        this.slamWaveTimer = 0;
        this.slamWaveDuration = 20;

        // 跳跃高度（jumpHeight = 0 在地面，jumpHeight > 0 在空中）
        this.jumpHeight = 0;

        // 受击
        this.hurtTimer = 0;
        this.hurtDuration = 10;
        this.knockbackX = 0;
        this.knockbackY = 0;

        // 阶段
        this.phase = 1;
        this.phase2Triggered = false;
        this.phase3Triggered = false;

        // 死亡
        this.deathTimer = 0;
        this.deathDuration = 60;

        // 角色外观（根据配置选择）
        this.charConfig = CharacterRenderer.getBossConfig(config.charConfig || 'boss1');
        this.spriteCharId = config.charConfig || 'boss1';
        // 动画状态机
        this.animStateMachine = new AnimationStateMachine(this);
        this.animStateMachine.init(config.charConfig || 'boss1');
        this.useSpriteRenderer = true;
    }

    update(player, walkArea) {
        if (!this.alive && this.state !== 'dead') return;

        if (this.state === 'dead') {
            this.deathTimer++;
            if (this.deathTimer >= this.deathDuration) this.alive = false;
            this.animStateMachine.update(this.state, this.deathTimer / this.deathDuration);
            return;
        }

        if (this.state === 'entrance') {
            if (this.x > this.entranceTargetX) {
                this.x -= 2;
                this.facing = -1;
            } else {
                this.entranceComplete = true;
                this.state = 'idle';
            }
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampY();
            this.updateAnim();
            this.animStateMachine.update(this.state, 0);
            return;
        }

        if (this.state === 'hurt') {
            this.hurtTimer--;
            this.x += this.knockbackX;
            this.y += this.knockbackY;
            this.knockbackX *= 0.85;
            this.knockbackY *= 0.85;
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampY();
            if (this.hurtTimer <= 0) this.state = 'chase';
            this.updateAnim();
            this.animStateMachine.update(this.state, 1 - this.hurtTimer / this.hurtDuration);
            return;
        }

        if (this.state === 'attack' || this.state === 'heavyAttack') {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.state = 'idle';
                this.attackHit = false;
                this.attackCooldown = this.attackCooldownMax;
            }
            this.updateAnim();
            this.animStateMachine.update(this.state, 1 - this.attackTimer / this.attackDuration);
            return;
        }

        if (this.state === 'charge') {
            this.x += this.chargeDir * this.chargeSpeed;
            this.chargeDistance += this.chargeSpeed;
            if (this.chargeDistance >= this.chargeMaxDistance) {
                this.state = 'idle';
                this.attackCooldown = this.attackCooldownMax + 20;
            }
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampPosition();
            this.updateAnim();
            this.animStateMachine.update(this.state, this.chargeDistance / this.chargeMaxDistance);
            return;
        }

        if (this.state === 'slam') {
            this.attackTimer--;
            if (this.attackTimer <= 0) {
                this.state = 'idle';
                this.attackCooldown = this.attackCooldownMax + 15;
            }
            this.updateAnim();
            this.animStateMachine.update(this.state, 1 - this.attackTimer / this.attackDuration);
            return;
        }

        this.updatePhase();

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distX = Math.abs(dx);
        const distY = Math.abs(dy);

        if (dx !== 0) this.facing = dx > 0 ? 1 : -1;
        if (this.attackCooldown > 0) this.attackCooldown--;

        if (this.attackCooldown <= 0) {
            if (this.phase >= 3 && distX > 150 && distX < 350 && Math.random() < 0.25) {
                this.startCharge(dx);
            } else if (this.phase >= 3 && distX < this.slamRange && distY < 40 && Math.random() < 0.2) {
                this.startSlam();
            } else if (this.phase >= 2 && distX < this.heavyRange && distY < this.attackYRange && Math.random() < 0.3) {
                this.startHeavyAttack();
            } else if (distX < this.punchRange && distY < this.attackYRange) {
                this.startPunch();
            } else if (distX < 400) {
                this.state = 'chase';
                if (distX > this.punchRange * 0.5) this.x += this.facing * this.speed;
                if (distY > 5) this.y += (dy > 0 ? 1 : -1) * this.verticalSpeed;
                if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
                else this.clampY();
            } else {
                this.state = 'idle';
            }
        } else {
            this.state = 'chase';
            if (distX > this.punchRange) this.x += this.facing * this.speed * 0.5;
            if (distY > 10) this.y += (dy > 0 ? 1 : -1) * this.verticalSpeed * 0.5;
            if (walkArea) GameUtils.clampToWalkArea(this, walkArea);
            else this.clampY();
        }

        this.updateAnim();
        if (this.flashWhiteTimer > 0) this.flashWhiteTimer--;
        this.animStateMachine.update(this.state, 0);
    }

    updatePhase() {
        const hpPercent = this.hp / this.maxHp;
        if (hpPercent <= 0.7 && !this.phase2Triggered) {
            this.phase = 2;
            this.phase2Triggered = true;
            this.attackCooldownMax = Math.floor(this.attackCooldownMax * 0.9);
            this.speed *= 1.15;
        }
        if (hpPercent <= 0.35 && !this.phase3Triggered) {
            this.phase = 3;
            this.phase3Triggered = true;
            this.attackCooldownMax = Math.floor(this.attackCooldownMax * 0.85);
            this.speed *= 1.2;
        }
    }

    startPunch() { this.state = 'attack'; this.attackTimer = 20; this.attackDuration = 20; this.attackHit = false; }
    startHeavyAttack() { this.state = 'heavyAttack'; this.attackTimer = 35; this.attackDuration = 35; this.attackHit = false; }
    startCharge(dx) { this.state = 'charge'; this.chargeDir = dx > 0 ? 1 : -1; this.facing = this.chargeDir; this.chargeDistance = 0; this.attackHit = false; }
    startSlam() { this.state = 'slam'; this.attackTimer = 30; this.attackDuration = 30; this.attackHit = false; this.slamWaveTimer = 0; }

    takeDamage(damage, knockbackDir, knockbackForce) {
        if (this.state === 'dead') return;
        this.hp -= damage;
        this.state = 'hurt';
        this.hurtTimer = this.hurtDuration;
        this.knockbackX = knockbackDir * knockbackForce * 0.4;
        this.knockbackY = (Math.random() - 0.5) * 1.5;
        this.flashWhiteTimer = 4;
        if (this.hp <= 0) { this.hp = 0; this.state = 'dead'; this.deathTimer = 0; }
    }

    clampY() { if (this.y < this.yMin) this.y = this.yMin; if (this.y > this.yMax) this.y = this.yMax; }
    clampPosition() {
        if (this.x < this.width / 2) this.x = this.width / 2;
        if (this.x > 3500 - this.width / 2) this.x = 3500 - this.width / 2;
        this.clampY();
    }
    updateAnim() { this.animTimer++; if (this.animTimer >= 8) { this.animTimer = 0; this.animFrame++; } }

    getAttackBox() {
        if (this.state === 'attack') {
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress < 0.3 || progress > 0.6) return null;
            const boxX = this.facing === 1 ? this.x : this.x - this.punchRange;
            return { x: boxX, y: this.y - this.height + 10, width: this.punchRange, height: this.height - 20, centerY: this.y, yRange: this.attackYRange, damage: this.punchDamage, knockback: 6 };
        }
        if (this.state === 'heavyAttack') {
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress < 0.5 || progress > 0.7) return null;
            const boxX = this.facing === 1 ? this.x : this.x - this.heavyRange;
            return { x: boxX, y: this.y - this.height + 5, width: this.heavyRange, height: this.height - 10, centerY: this.y, yRange: this.attackYRange, damage: this.heavyDamage, knockback: 12 };
        }
        if (this.state === 'charge') {
            const boxX = this.facing === 1 ? this.x : this.x - this.chargeRange * 0.5;
            return { x: boxX, y: this.y - this.height + 10, width: this.chargeRange * 0.5, height: this.height - 20, centerY: this.y, yRange: this.attackYRange, damage: this.chargeDamage, knockback: 15 };
        }
        if (this.state === 'slam') {
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress < 0.5 || progress > 0.7) return null;
            return { x: this.x - this.slamRange, y: this.y - 30, width: this.slamRange * 2, height: 40, centerY: this.y, yRange: 50, damage: this.slamDamage, knockback: 10 };
        }
        return null;
    }

    getHitBox() {
        return { x: this.x - this.width / 2, y: this.y - this.height, width: this.width, height: this.height, centerY: this.y, yRange: 25 };
    }

    render(ctx, cameraX) {
        if (!this.alive && this.deathTimer >= this.deathDuration) return;
        const screenX = this.x - cameraX;

        if (this.state === 'dead') {
            const alpha = 1 - this.deathTimer / this.deathDuration;
            ctx.save();
            ctx.globalAlpha = Math.max(0, alpha);
        }

        const isEnraged = this.phase === 3 && this.state !== 'dead';
        const rageFlash = isEnraged && this.animFrame % 20 < 5;

        let renderState = this.state;
        if (this.state === 'chase') renderState = 'walk';
        else if (this.state === 'entrance') renderState = 'entrance';
        else if (this.state === 'attack') renderState = 'punch';
        else if (this.state === 'heavyAttack') renderState = 'heavy';
        else if (this.state === 'charge') renderState = 'charge';
        else if (this.state === 'slam') renderState = 'slam';
        else if (this.state === 'hurt') renderState = 'hurt';
        else if (this.state === 'dead') renderState = 'dead';

        const attackProgress = (this.state === 'attack' || this.state === 'heavyAttack' || this.state === 'slam')
            ? 1 - this.attackTimer / this.attackDuration : 0;

        // 尝试使用新精灵渲染器
        let rendered = false;
        if (this.useSpriteRenderer) {
            rendered = SpriteCharacterRenderer.draw(
                ctx, screenX, this.y, this.facing,
                renderState, this.charConfig,
                this.animFrame, attackProgress,
                0, this.flashWhiteTimer > 0 || rageFlash, 0,
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
                0, this.flashWhiteTimer > 0 || rageFlash, 0
            );
        }

        if (this.state === 'charge') {
            ctx.save(); ctx.globalAlpha = 0.4; ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 3;
            for (let i = 0; i < 3; i++) {
                const ox = -this.chargeDir * (10 + i * 15);
                ctx.beginPath(); ctx.moveTo(screenX + ox, this.y - 40 + i * 10); ctx.lineTo(screenX + ox - this.chargeDir * 20, this.y - 40 + i * 10); ctx.stroke();
            }
            ctx.restore();
        }

        if (this.state === 'slam') {
            const progress = 1 - this.attackTimer / this.attackDuration;
            if (progress >= 0.5 && progress <= 0.8) {
                const waveProgress = (progress - 0.5) / 0.3;
                ctx.save(); ctx.globalAlpha = 1 - waveProgress; ctx.strokeStyle = '#ff6633'; ctx.lineWidth = 3;
                const waveDist = waveProgress * this.slamRange;
                for (let dir = -1; dir <= 1; dir += 2) {
                    ctx.beginPath(); ctx.moveTo(screenX + dir * waveDist * 0.3, this.y); ctx.lineTo(screenX + dir * waveDist, this.y - 5); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(screenX + dir * waveDist * 0.3, this.y - 5); ctx.lineTo(screenX + dir * waveDist, this.y - 15); ctx.stroke();
                }
                ctx.restore();
            }
        }

        if (this.state === 'dead') ctx.restore();
    }
}
