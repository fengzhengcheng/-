/**
 * CharacterRenderer.js - 程序化角色绘制模块
 * 负责用 Canvas 绘制有头、身体、手臂、腿部的人物角色
 * 攻击动作以肢体动作为主，特效为辅
 * 不同角色有不同的技能姿势和攻击轨迹颜色
 */
class CharacterRenderer {

    static draw(ctx, x, y, facing, state, config, animFrame, attackProgress = 0, comboCount = 0, flashWhite = false, jumpY = 0, skillType, weaponType) {
        // jumpY 即 jumpHeight，正值表示在空中，绘制时往上偏移
        const screenY = y - jumpY;
        ctx.save();

        if (facing === -1) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }

        if (flashWhite) ctx.globalAlpha = 1;

        const c = config;
        const breathOffset = state === 'idle' ? Math.sin(animFrame * 0.15) * 1.5 : 0;

        // 地面阴影（始终绘制在地面 y 处）
        if (jumpY > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath();
            ctx.ellipse(x, y + 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        switch (state) {
            case 'idle': this.drawIdle(ctx, x, screenY, c, breathOffset, flashWhite, weaponType); break;
            case 'walk': this.drawWalk(ctx, x, screenY, c, animFrame, flashWhite, weaponType); break;
            case 'jump': this.drawJump(ctx, x, screenY, c, flashWhite, weaponType); break;
            case 'attack': this.drawAttack(ctx, x, screenY, c, attackProgress, comboCount, flashWhite, weaponType); break;
            case 'heavy': this.drawHeavy(ctx, x, screenY, c, attackProgress, flashWhite, weaponType); break;
            case 'skill': this.drawSkillByType(ctx, x, screenY, c, attackProgress, flashWhite, skillType); break;
            case 'hurt': this.drawHurt(ctx, x, screenY, c, flashWhite); break;
            case 'dead': this.drawDead(ctx, x, screenY, c, facing); break;
            default: this.drawIdle(ctx, x, screenY, c, 0, flashWhite, weaponType);
        }

        // 敌人和Boss轮廓描边
        if (c.outline) {
            const isBoss = c.headRadius >= 14;
            ctx.strokeStyle = isBoss ? 'rgba(80,0,0,0.6)' : 'rgba(0,0,0,0.5)';
            ctx.lineWidth = isBoss ? 2.5 : 1.5;
            // 简化轮廓：头部 + 身体 + 腿部的外框
            const bodyY = screenY - 40;
            const headR = c.headRadius;
            const bw = c.bodyWidth;
            const bh = c.bodyHeight;
            const ll = c.legLength;
            // 头部轮廓
            ctx.beginPath();
            ctx.arc(x, bodyY - 18, headR + 1, 0, Math.PI * 2);
            ctx.stroke();
            // 身体轮廓
            ctx.strokeRect(x - bw / 2 - 1, bodyY - bh / 2 - 1, bw + 2, bh + 2);
            // 腿部轮廓
            ctx.strokeRect(x - 9, screenY - ll - 1, 7, ll + 2);
            ctx.strokeRect(x, screenY - ll - 1, 7, ll + 2);
        }

        ctx.restore();
    }

    static drawIdle(ctx, x, y, c, breathOffset, flash, weaponType) {
        const bodyY = y - 40 + breathOffset;
        this.drawLegs(ctx, x, y, c, 0, 0);
        this.drawBody(ctx, x, bodyY, c, flash);
        this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
        this.drawWeaponArm(ctx, x + 10, bodyY + 5, c, flash, weaponType, 0);
        this.drawHead(ctx, x, bodyY - 18, c, flash);
    }

    static drawWalk(ctx, x, y, c, frame, flash, weaponType) {
        const bodyY = y - 40;
        const legSwing = Math.sin(frame * 0.7) * 12;
        const armSwing = Math.sin(frame * 0.7) * 15;
        this.drawLegs(ctx, x, y, c, legSwing, -legSwing);
        this.drawBody(ctx, x, bodyY, c, flash);
        this.drawArm(ctx, x - 10, bodyY + 5, c, -armSwing * Math.PI / 180, flash);
        this.drawWeaponArm(ctx, x + 10, bodyY + 5, c, flash, weaponType, armSwing * Math.PI / 180);
        this.drawHead(ctx, x, bodyY - 18, c, flash);
    }

    static drawJump(ctx, x, y, c, flash, weaponType) {
        const bodyY = y - 40;
        this.drawLegs(ctx, x, y, c, -8, -8);
        this.drawBody(ctx, x, bodyY, c, flash);
        this.drawArm(ctx, x - 10, bodyY + 5, c, -0.8, flash);
        this.drawWeaponArm(ctx, x + 10, bodyY + 5, c, flash, weaponType, 0.8);
        this.drawHead(ctx, x, bodyY - 18, c, flash);
    }

    /** 普攻三段 - 以肢体动作为主 */
    static drawAttack(ctx, x, y, c, progress, combo, flash, weaponType) {
        const bodyY = y - 40;
        const extend = Math.sin(progress * Math.PI);
        const trailColor = c.trailColor || '#aaddff';
        const trailWidth = c.trailWidth || 2;
        const weaponTrailColor = weaponType ? (Weapon.CONFIGS[weaponType] || {}).color : null;

        if (combo === 0) {
            const lean = extend * 4;
            this.drawLegs(ctx, x, y, c, 4, -2);
            this.drawBody(ctx, x + lean, bodyY, c, flash);
            this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
            if (weaponType) {
                this.drawWeaponSwingArm(ctx, x + 12, bodyY + 3, c, flash, weaponType, extend * 32, -0.3);
            } else {
                this.drawPunchArm(ctx, x + 12, bodyY + 3, c, extend * 32, flash);
            }
            this.drawHead(ctx, x + lean, bodyY - 18, c, flash);
            if (extend > 0.5) this.drawSlashLines(ctx, x + 12 + extend * 32, bodyY + 3, 10, weaponTrailColor || trailColor, trailWidth);
        } else if (combo === 1) {
            const lean = extend * 3;
            this.drawLegs(ctx, x, y, c, -2, 4);
            this.drawBody(ctx, x + lean, bodyY, c, flash);
            if (weaponType) {
                this.drawWeaponSwingArm(ctx, x - 12, bodyY + 3, c, flash, weaponType, extend * 25, -1.2 + extend * 1.8);
            } else {
                this.drawSwingArm(ctx, x - 12, bodyY + 3, c, extend, flash);
            }
            this.drawGuardArm(ctx, x + 10, bodyY + 5, c, flash);
            this.drawHead(ctx, x + lean, bodyY - 18, c, flash);
            if (extend > 0.5) this.drawArcSlash(ctx, x - 12, bodyY + 3, extend * 25, weaponTrailColor || trailColor, trailWidth);
        } else {
            const lean = extend * 5;
            this.drawKickLeg(ctx, x + 3, y, c, extend * 30, flash);
            this.drawLegs(ctx, x, y, c, 0, 0);
            this.drawBody(ctx, x + lean, bodyY, c, flash);
            this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
            this.drawWeaponArm(ctx, x + 10, bodyY + 5, c, flash, weaponType, 0);
            this.drawHead(ctx, x + lean, bodyY - 18, c, flash);
            if (extend > 0.5) this.drawSlashLines(ctx, x + 3 + extend * 30, y - 20, 14, trailColor, trailWidth);
        }
    }

    /** 重击 - 蓄力后大幅重拳 */
    static drawHeavy(ctx, x, y, c, progress, flash, weaponType) {
        const bodyY = y - 40;
        const extend = Math.sin(progress * Math.PI);
        const trailColor = c.heavyTrailColor || c.trailColor || '#ffaa00';
        const trailWidth = (c.trailWidth || 2) + 1;
        const weaponTrailColor = weaponType ? (Weapon.CONFIGS[weaponType] || {}).color : null;

        if (progress < 0.3) {
            this.drawLegs(ctx, x, y, c, 6, -4);
            this.drawBody(ctx, x - 5, bodyY, c, flash);
            this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
            if (weaponType) {
                this.drawWeaponSwingArm(ctx, x + 8, bodyY + 3, c, flash, weaponType, 0, -0.6);
            } else {
                this.drawPullBackArm(ctx, x + 8, bodyY + 3, c, flash);
            }
            this.drawHead(ctx, x - 5, bodyY - 18, c, flash);
            if (progress > 0.15) {
                ctx.save();
                ctx.globalAlpha = progress * 2;
                ctx.strokeStyle = weaponTrailColor || trailColor;
                ctx.lineWidth = 1.5;
                for (let i = 0; i < 3; i++) {
                    const ly = bodyY + i * 8 - 8;
                    ctx.beginPath();
                    ctx.moveTo(x + 5, ly);
                    ctx.lineTo(x + 20, ly + 3);
                    ctx.stroke();
                }
                ctx.restore();
            }
        } else {
            const lean = extend * 8;
            this.drawLegs(ctx, x, y, c, -4, 6);
            this.drawBody(ctx, x + lean, bodyY, c, flash);
            this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
            if (weaponType) {
                this.drawWeaponSwingArm(ctx, x + 12, bodyY + 1, c, flash, weaponType, extend * 40, 0.3);
            } else {
                this.drawPunchArm(ctx, x + 12, bodyY + 1, c, extend * 40, flash);
            }
            this.drawHead(ctx, x + lean, bodyY - 18, c, flash);
            if (extend > 0.3) this.drawImpactLines(ctx, x + 12 + extend * 40, bodyY + 1, extend, weaponTrailColor || trailColor, trailWidth);
        }
    }

    /** 根据技能类型分发技能姿势 */
    static drawSkillByType(ctx, x, y, c, progress, flash, skillType) {
        if (skillType === 'dashKick') {
            this.drawDashKickPose(ctx, x, y, c, progress, flash);
        } else if (skillType === 'groundPound') {
            this.drawGroundPoundPose(ctx, x, y, c, progress, flash);
        } else {
            // 默认：能量斩姿势
            this.drawEnergySlashPose(ctx, x, y, c, progress, flash);
        }
    }

    /** 阿龙 - 能量斩姿势 */
    static drawEnergySlashPose(ctx, x, y, c, progress, flash) {
        const bodyY = y - 40;
        const extend = Math.sin(progress * Math.PI);

        if (progress < 0.25) {
            this.drawLegs(ctx, x, y, c, 3, -3);
            this.drawBody(ctx, x, bodyY, c, flash);
            this.drawArm(ctx, x - 10, bodyY + 5, c, -0.6, flash);
            this.drawArm(ctx, x + 10, bodyY + 5, c, 0.6, flash);
            this.drawHead(ctx, x, bodyY - 18, c, flash);
            // 蓄力光点
            ctx.fillStyle = `rgba(100, 180, 255, ${0.4 + progress * 3})`;
            ctx.beginPath();
            ctx.arc(x, bodyY + 5, 4 + progress * 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            this.drawLegs(ctx, x, y, c, -5, 5);
            this.drawBody(ctx, x + 3, bodyY, c, flash);
            this.drawPunchArm(ctx, x - 8, bodyY + 3, c, extend * 18, flash);
            this.drawPunchArm(ctx, x + 12, bodyY + 3, c, extend * 18, flash);
            this.drawHead(ctx, x + 3, bodyY - 18, c, flash);
        }
    }

    /** 小影 - 疾风踢姿势 */
    static drawDashKickPose(ctx, x, y, c, progress, flash) {
        const bodyY = y - 40;

        if (progress < 0.2) {
            // 蓄力：身体微蹲，后腿蓄力
            this.drawLegs(ctx, x, y, c, 5, -8);
            this.drawBody(ctx, x - 3, bodyY + 3, c, flash);
            this.drawGuardArm(ctx, x - 10, bodyY + 5, c, flash);
            this.drawGuardArm(ctx, x + 10, bodyY + 5, c, flash);
            this.drawHead(ctx, x - 3, bodyY - 15, c, flash);
        } else {
            // 突进踢击：前腿伸出，身体前倾
            const lean = 8;
            this.drawKickLeg(ctx, x + 5, y, c, 35, flash);
            this.drawLegs(ctx, x - 5, y, c, 0, 0);
            this.drawBody(ctx, x + lean, bodyY, c, flash);
            this.drawGuardArm(ctx, x - 10 + lean, bodyY + 5, c, flash);
            this.drawArm(ctx, x + 10 + lean, bodyY + 5, c, -0.5, flash);
            this.drawHead(ctx, x + lean, bodyY - 18, c, flash);
        }
    }

    /** 铁山 - 震地拳姿势 */
    static drawGroundPoundPose(ctx, x, y, c, progress, flash) {
        const bodyY = y - 40;

        if (progress < 0.5) {
            // 蓄力：双臂高举
            this.drawLegs(ctx, x, y, c, 3, -3);
            this.drawBody(ctx, x, bodyY, c, flash);
            this.drawArm(ctx, x - 10, bodyY + 5, c, -1.8, flash); // 左臂高举
            this.drawArm(ctx, x + 10, bodyY + 5, c, 1.8, flash);  // 右臂高举
            this.drawHead(ctx, x, bodyY - 18, c, flash);
            // 蓄力光芒
            if (progress > 0.3) {
                ctx.save();
                ctx.globalAlpha = (progress - 0.3) * 2;
                ctx.fillStyle = '#ffaa33';
                ctx.beginPath();
                ctx.arc(x, bodyY - 15, 5 + progress * 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        } else {
            // 砸地：双拳下砸，身体下蹲
            const crouch = 6;
            this.drawLegs(ctx, x, y, c, 6, -4);
            this.drawBody(ctx, x, bodyY + crouch, c, flash);
            this.drawPunchArm(ctx, x - 8, bodyY + crouch + 5, c, 5, flash); // 左拳下砸
            this.drawPunchArm(ctx, x + 8, bodyY + crouch + 5, c, 5, flash);  // 右拳下砸
            this.drawHead(ctx, x, bodyY + crouch - 18, c, flash);
        }
    }

    /** 受击 - 后仰 */
    static drawHurt(ctx, x, y, c, flash) {
        const bodyY = y - 38;
        this.drawLegs(ctx, x, y, c, 0, 0);
        this.drawBody(ctx, x - 5, bodyY, c, flash);
        this.drawArm(ctx, x - 15, bodyY + 3, c, 0.6, flash);
        this.drawArm(ctx, x + 5, bodyY + 3, c, -0.4, flash);
        this.drawHead(ctx, x - 5, bodyY - 18, c, flash);
    }

    /** 死亡 - 倒地 */
    static drawDead(ctx, x, y, c, facing) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.translate(x, y);
        ctx.rotate(facing * 1.2);
        ctx.translate(-x, -y);
        const bodyY = y - 15;
        this.drawLegs(ctx, x, y, c, 0, 0);
        this.drawBody(ctx, x, bodyY, c, false);
        this.drawArm(ctx, x - 10, bodyY + 5, c, 0.8, false);
        this.drawArm(ctx, x + 10, bodyY + 5, c, -0.8, false);
        this.drawHead(ctx, x, bodyY - 18, c, false);
        ctx.restore();
    }

    // === 基础部件 ===

    static drawHead(ctx, x, y, c, flash) {
        // 头发底层（深色）
        ctx.fillStyle = flash ? '#fff' : c.hairColor;
        ctx.beginPath();
        ctx.arc(x, y - 3, c.headRadius + 2, Math.PI, Math.PI * 2);
        ctx.fill();
        // 头发高光层（浅色）
        if (!flash) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.beginPath();
            ctx.arc(x + 2, y - 5, c.headRadius * 0.6, Math.PI * 1.1, Math.PI * 1.9);
            ctx.fill();
        }
        // 脸
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(x, y, c.headRadius, 0, Math.PI * 2);
        ctx.fill();
        if (!flash) {
            // 脸部右侧高光点
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.beginPath();
            ctx.arc(x + c.headRadius * 0.4, y - c.headRadius * 0.2, c.headRadius * 0.35, 0, Math.PI * 2);
            ctx.fill();
            // 脸部左侧暗面
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.beginPath();
            ctx.arc(x - c.headRadius * 0.3, y, c.headRadius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }
        // 轮廓线
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, c.headRadius, 0, Math.PI * 2); ctx.stroke();
        // 眼睛
        ctx.fillStyle = flash ? '#fff' : '#222';
        ctx.beginPath();
        ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
        ctx.fill();
        // 嘴
        ctx.fillStyle = flash ? '#fff' : '#aa7755';
        ctx.fillRect(x + 1, y + 4, 5, 2);
    }

    static drawBody(ctx, x, y, c, flash) {
        // 主体
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth, c.bodyHeight);
        if (!flash) {
            // 左侧暗面更明显
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth * 0.25, c.bodyHeight);
            // 右侧高光
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(x + c.bodyWidth / 2 - c.bodyWidth * 0.2, y - c.bodyHeight / 2, c.bodyWidth * 0.2, c.bodyHeight);
            // 底部阴影
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(x - c.bodyWidth / 2, y + c.bodyHeight / 2 - 4, c.bodyWidth, 4);
        }
        // 领口/肩线
        ctx.fillStyle = flash ? '#fff' : c.shirtDetail;
        ctx.fillRect(x - c.bodyWidth / 2 + 2, y - c.bodyHeight / 2, c.bodyWidth - 4, 4);
        // 轮廓线
        ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
        ctx.strokeRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth, c.bodyHeight);
    }

    static drawArm(ctx, x, y, c, angle, flash) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength);
        if (!flash) {
            // 手臂暗面
            ctx.fillStyle = 'rgba(0,0,0,0.15)';
            ctx.fillRect(-3, 0, 2, c.armLength);
            // 手臂高光
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(1, 0, 2, c.armLength);
        }
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static drawGuardArm(ctx, x, y, c, flash) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.3);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.7);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength * 0.7 + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static drawPunchArm(ctx, x, y, c, extendX, flash) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.4);
        ctx.fillRect(extendX * 0.4 - 3, c.armLength * 0.25, 6, c.armLength * 0.4);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(extendX * 0.4, c.armLength * 0.65 + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static drawPullBackArm(ctx, x, y, c, flash) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(-0.6);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.8);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength * 0.8 + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    static drawSwingArm(ctx, x, y, c, progress, flash) {
        ctx.save();
        ctx.translate(x, y);
        const angle = -1.2 + progress * 1.8;
        ctx.rotate(angle);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    /** 持武器的手臂（静止/行走/跳跃） */
    static drawWeaponArm(ctx, x, y, c, flash, weaponType, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.7);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength * 0.7 + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        // 在手的位置绘制武器（放大版本）
        if (weaponType) {
            this.drawLargeWeapon(ctx, weaponType, 0, c.armLength * 0.7 + 2, 0);
        }
        ctx.restore();
    }

    /** 挥动武器的手臂（攻击/重击） */
    static drawWeaponSwingArm(ctx, x, y, c, flash, weaponType, extendX, swingAngle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.4);
        ctx.fillRect(extendX * 0.4 - 3, c.armLength * 0.25, 6, c.armLength * 0.4);
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(extendX * 0.4, c.armLength * 0.65 + 2, 6, 0, Math.PI * 2);
        ctx.fill();
        // 在手的位置绘制武器（放大版本）
        if (weaponType) {
            this.drawLargeWeapon(ctx, weaponType, extendX * 0.4, c.armLength * 0.65 + 2, swingAngle || 0);
        }
        ctx.restore();
    }

    /** 绘制放大版武器（确保在角色身上可见） */
    static drawLargeWeapon(ctx, type, x, y, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 武器尺寸放大2.5倍确保可见
        const s = 2.5;
        ctx.scale(s, s);

        switch (type) {
            case 'stick': // 木棍
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(-3, -28, 6, 36);
                ctx.fillStyle = '#A0781E';
                ctx.fillRect(-2, -28, 4, 5);
                ctx.fillStyle = '#6B4904';
                ctx.fillRect(-3, 6, 6, 4);
                ctx.strokeStyle = '#5B3900';
                ctx.lineWidth = 1;
                ctx.strokeRect(-3, -28, 6, 36);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(0, -28, 3, 36);
                break;
            case 'pipe': // 钢管
                ctx.fillStyle = '#8899AA';
                ctx.fillRect(-4, -32, 8, 40);
                ctx.fillStyle = '#AABBCC';
                ctx.fillRect(-2, -32, 4, 40);
                ctx.fillStyle = '#556677';
                ctx.fillRect(-4, -32, 8, 4);
                ctx.fillRect(-4, 4, 8, 4);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1;
                ctx.strokeRect(-4, -32, 8, 40);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(-1, -26, 2, 20);
                break;
            case 'bottle': // 破瓶子
                ctx.fillStyle = '#44AA55';
                ctx.fillRect(-5, -18, 10, 20);
                ctx.fillStyle = '#55BB66';
                ctx.fillRect(-3, -26, 6, 9);
                ctx.fillStyle = '#338844';
                ctx.fillRect(-4, -28, 8, 3);
                // 碎裂尖端
                ctx.fillStyle = '#44AA55';
                ctx.beginPath();
                ctx.moveTo(-5, 2); ctx.lineTo(-4, 8); ctx.lineTo(-2, 2);
                ctx.lineTo(1, 9); ctx.lineTo(3, 3); ctx.lineTo(5, 2);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#227733';
                ctx.lineWidth = 1;
                ctx.strokeRect(-5, -18, 10, 20);
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.fillRect(-4, -17, 3, 12);
                break;
            case 'hammer': // 铁锤
                ctx.fillStyle = '#7B5B2A';
                ctx.fillRect(-3, -10, 6, 30);
                ctx.fillStyle = '#5B3B1A';
                ctx.fillRect(-4, 4, 8, 3);
                ctx.fillRect(-4, 10, 8, 3);
                ctx.fillStyle = '#667788';
                ctx.fillRect(-10, -22, 20, 14);
                ctx.fillStyle = '#8899AA';
                ctx.fillRect(-9, -21, 18, 4);
                ctx.fillStyle = '#556677';
                ctx.fillRect(-10, -10, 20, 3);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-10, -22, 20, 14);
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.fillRect(-6, -20, 4, 10);
                ctx.fillStyle = '#99AABB';
                ctx.beginPath(); ctx.arc(-5, -15, 2, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.arc(5, -15, 2, 0, Math.PI * 2); ctx.fill();
                break;
        }
        ctx.restore();
    }

    static drawKickLeg(ctx, x, y, c, extendX, flash) {
        ctx.save();
        ctx.translate(x + 5, y - 5);
        ctx.fillStyle = flash ? '#fff' : c.pantsColor;
        ctx.fillRect(0, -4, extendX, 7);
        ctx.fillStyle = flash ? '#fff' : c.shoeColor;
        ctx.fillRect(extendX - 3, -5, 10, 9);
        ctx.restore();
    }

    static drawLegs(ctx, x, y, c, leftSwing, rightSwing) {
        const legLen = c.legLength;
        // 左腿
        ctx.fillStyle = c.pantsColor;
        ctx.fillRect(x - 8, y - legLen + leftSwing, 7, legLen - leftSwing);
        // 左腿外侧暗面
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x - 8, y - legLen + leftSwing, 2, legLen - leftSwing);
        // 左鞋
        ctx.fillStyle = c.shoeColor;
        ctx.fillRect(x - 9, y - 4 + leftSwing, 9, 5);
        // 左鞋高光
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x - 7, y - 3 + leftSwing, 5, 2);
        // 右腿
        ctx.fillStyle = c.pantsColor;
        ctx.fillRect(x + 1, y - legLen + rightSwing, 7, legLen - rightSwing);
        // 右腿外侧暗面
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(x + 6, y - legLen + rightSwing, 2, legLen - rightSwing);
        // 右鞋
        ctx.fillStyle = c.shoeColor;
        ctx.fillRect(x, y - 4 + rightSwing, 9, 5);
        // 右鞋高光
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(x + 2, y - 3 + rightSwing, 5, 2);
    }

    // === 攻击特效（辅助，不占主要视觉） ===

    static drawSlashLines(ctx, x, y, size, color, width) {
        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = color || '#aaddff';
        ctx.lineWidth = width || 2;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(x, y + i * size * 0.4);
            ctx.lineTo(x + size, y + i * size * 0.3);
            ctx.stroke();
        }
        ctx.restore();
    }

    static drawArcSlash(ctx, x, y, radius, color, width) {
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = color || '#88ccff';
        ctx.lineWidth = width || 2.5;
        ctx.beginPath();
        ctx.arc(x, y, radius, -0.8, 0.8);
        ctx.stroke();
        ctx.restore();
    }

    static drawImpactLines(ctx, x, y, intensity, color, width) {
        ctx.save();
        ctx.globalAlpha = intensity * 0.7;
        ctx.strokeStyle = color || '#ffaa00';
        ctx.lineWidth = width || 2;
        for (let i = -2; i <= 2; i++) {
            const len = 10 + intensity * 15;
            ctx.beginPath();
            ctx.moveTo(x, y + i * 6);
            ctx.lineTo(x + len, y + i * 6 + (Math.random() - 0.5) * 4);
            ctx.stroke();
        }
        ctx.restore();
    }

    // === 角色配置 ===

    static getPlayerConfig() {
        return {
            headRadius: 11, bodyWidth: 22, bodyHeight: 28, armLength: 18, legLength: 22,
            skinColor: '#ffcc99', hairColor: '#332211',
            shirtColor: '#3366cc', shirtDetail: '#2255aa',
            pantsColor: '#2a2a44', shoeColor: '#443322',
            trailColor: '#aaddff', trailWidth: 2, heavyTrailColor: '#ffaa00'
        };
    }

    static getPlayerConfigByType(charType) {
        const charConfig = CharacterConfig.getById(charType);
        return charConfig ? charConfig.colorConfig : this.getPlayerConfig();
    }

    static drawPreview(ctx, x, y, charType, animFrame, selected) {
        const charConfig = CharacterConfig.getById(charType);
        if (!charConfig) return;
        const c = charConfig.colorConfig;
        const scale = 1.8;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const breathOffset = Math.sin(animFrame * 0.15) * 1.5;
        this.drawLegs(ctx, 0, 0, c, 0, 0);
        this.drawBody(ctx, 0, -40 + breathOffset, c, false);
        this.drawGuardArm(ctx, -10, -35 + breathOffset, c, false);
        this.drawGuardArm(ctx, 10, -35 + breathOffset, c, false);
        this.drawHead(ctx, 0, -58 + breathOffset, c, false);
        ctx.restore();
    }

    static getEnemyConfig(type) {
        const configs = {
            normal: {
                headRadius: 10, bodyWidth: 20, bodyHeight: 26, armLength: 16, legLength: 20,
                skinColor: '#ddaa77', hairColor: '#553322',
                shirtColor: '#cc3333', shirtDetail: '#aa2222',
                pantsColor: '#333333', shoeColor: '#222222',
                trailColor: '#ffaaaa', trailWidth: 2,
                outline: true
            },
            fast: {
                headRadius: 9, bodyWidth: 16, bodyHeight: 24, armLength: 17, legLength: 22,
                skinColor: '#ddbb88', hairColor: '#6644aa',
                shirtColor: '#7733aa', shirtDetail: '#5522aa',
                pantsColor: '#2a2a33', shoeColor: '#332233',
                trailColor: '#cc88ff', trailWidth: 1.5,
                outline: true
            },
            tank: {
                headRadius: 12, bodyWidth: 28, bodyHeight: 32, armLength: 20, legLength: 20,
                skinColor: '#cc9966', hairColor: '#222222',
                shirtColor: '#553322', shirtDetail: '#442211',
                pantsColor: '#333322', shoeColor: '#222211',
                trailColor: '#ffaa66', trailWidth: 3,
                outline: true
            }
        };
        return configs[type] || configs.normal;
    }

    static getBossConfig(type) {
        const configs = {
            boss1: {
                headRadius: 15, bodyWidth: 38, bodyHeight: 42, armLength: 26, legLength: 26,
                skinColor: '#cc9966', hairColor: '#111111',
                shirtColor: '#1a1a1a', shirtDetail: '#cc2222',
                pantsColor: '#1a1a2a', shoeColor: '#111111',
                trailColor: '#ff4444', trailWidth: 3,
                outline: true
            },
            boss2: {
                headRadius: 14, bodyWidth: 36, bodyHeight: 44, armLength: 28, legLength: 27,
                skinColor: '#bb8855', hairColor: '#222200',
                shirtColor: '#1a1a3a', shirtDetail: '#ccaa22',
                pantsColor: '#1a1a1a', shoeColor: '#222222',
                trailColor: '#ffcc44', trailWidth: 3,
                outline: true
            },
            boss3: {
                headRadius: 16, bodyWidth: 42, bodyHeight: 46, armLength: 30, legLength: 28,
                skinColor: '#aa7755', hairColor: '#333333',
                shirtColor: '#3a1a1a', shirtDetail: '#aaaacc',
                pantsColor: '#1a1a1a', shoeColor: '#1a1a1a',
                trailColor: '#ff6644', trailWidth: 3,
                outline: true
            },
        };
        return configs[type] || configs.boss1;
    }
}
