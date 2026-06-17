/**
 * GeneratedSpriteSheet.js - 程序生成占位精灵帧
 * 使用 Canvas 2D 生成角色、敌人、Boss 的动画帧
 * 生成的帧比实时几何绘制更像帧动画，有完整姿势
 */
class GeneratedSpriteSheet {
    constructor() {
        this.cache = new Map();
    }

    /**
     * 获取或生成角色动画帧
     * @param {string} charType - 角色类型 ('along', 'xiaoying', 'tieshan', 'normal', 'fast', 'tank', 'boss1', 'boss2', 'boss3')
     * @param {string} animName - 动画名称 ('idle', 'walk', 'attack', etc.)
     * @returns {Canvas[]} 帧数组
     */
    getFrames(charType, animName) {
        const key = `${charType}_${animName}`;
        if (!this.cache.has(key)) {
            const frames = this.generateFrames(charType, animName);
            this.cache.set(key, frames);
        }
        return this.cache.get(key);
    }

    generateFrames(charType, animName) {
        const config = this.getConfig(charType);
        const frameCounts = {
            idle: 4, walk: 6, jump: 3,
            attack1: 4, attack2: 4, attack3: 4,
            attack: 4, heavy: 5, skill: 6,
            weaponAttack: 4, weaponHeavy: 5,
            hurt: 3, dead: 6,
            punch: 4, charge: 4, slam: 5, entrance: 4
        };
        const count = frameCounts[animName] || 4;
        const frames = [];

        for (let i = 0; i < count; i++) {
            const progress = i / Math.max(1, count - 1);
            const canvas = this.drawPose(charType, config, animName, i, progress, count);
            frames.push(canvas);
        }
        return frames;
    }

    getConfig(charType) {
        const configs = {
            along: {
                headRadius: 11, bodyWidth: 22, bodyHeight: 28, armLength: 18, legLength: 22,
                skinColor: '#ffcc99', hairColor: '#332211',
                shirtColor: '#3366cc', shirtDetail: '#2255aa',
                pantsColor: '#2a2a44', shoeColor: '#443322',
                scale: 1.0, isPlayer: true
            },
            xiaoying: {
                headRadius: 9, bodyWidth: 14, bodyHeight: 20, armLength: 14, legLength: 24,
                skinColor: '#eeddbb', hairColor: '#553388',
                shirtColor: '#6633aa', shirtDetail: '#8844cc',
                pantsColor: '#2a2233', shoeColor: '#332244',
                scale: 0.9, isPlayer: true
            },
            tieshan: {
                headRadius: 15, bodyWidth: 34, bodyHeight: 38, armLength: 24, legLength: 20,
                skinColor: '#cc9966', hairColor: '#221100',
                shirtColor: '#883322', shirtDetail: '#aa4422',
                pantsColor: '#2a2218', shoeColor: '#332211',
                scale: 1.2, isPlayer: true
            },
            normal: {
                headRadius: 10, bodyWidth: 20, bodyHeight: 26, armLength: 16, legLength: 20,
                skinColor: '#ddaa77', hairColor: '#553322',
                shirtColor: '#cc3333', shirtDetail: '#aa2222',
                pantsColor: '#333333', shoeColor: '#222222',
                scale: 1.0, isEnemy: true
            },
            fast: {
                headRadius: 9, bodyWidth: 16, bodyHeight: 24, armLength: 17, legLength: 22,
                skinColor: '#ddbb88', hairColor: '#6644aa',
                shirtColor: '#7733aa', shirtDetail: '#5522aa',
                pantsColor: '#2a2a33', shoeColor: '#332233',
                scale: 0.95, isEnemy: true
            },
            tank: {
                headRadius: 12, bodyWidth: 28, bodyHeight: 32, armLength: 20, legLength: 20,
                skinColor: '#cc9966', hairColor: '#222222',
                shirtColor: '#553322', shirtDetail: '#442211',
                pantsColor: '#333322', shoeColor: '#222211',
                scale: 1.15, isEnemy: true
            },
            boss1: {
                headRadius: 15, bodyWidth: 38, bodyHeight: 42, armLength: 26, legLength: 26,
                skinColor: '#cc9966', hairColor: '#111111',
                shirtColor: '#1a1a1a', shirtDetail: '#cc2222',
                pantsColor: '#1a1a2a', shoeColor: '#111111',
                scale: 1.4, isBoss: true
            },
            boss2: {
                headRadius: 14, bodyWidth: 36, bodyHeight: 44, armLength: 28, legLength: 27,
                skinColor: '#bb8855', hairColor: '#222200',
                shirtColor: '#1a1a3a', shirtDetail: '#ccaa22',
                pantsColor: '#1a1a1a', shoeColor: '#222222',
                scale: 1.45, isBoss: true
            },
            boss3: {
                headRadius: 16, bodyWidth: 42, bodyHeight: 46, armLength: 30, legLength: 28,
                skinColor: '#aa7755', hairColor: '#333333',
                shirtColor: '#3a1a1a', shirtDetail: '#aaaacc',
                pantsColor: '#1a1a1a', shoeColor: '#1a1a1a',
                scale: 1.5, isBoss: true
            }
        };
        return configs[charType] || configs.along;
    }

    drawPose(charType, config, animName, frameIndex, progress, totalFrames) {
        const canvas = document.createElement('canvas');
        const size = 120;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const centerX = size / 2;
        const centerY = size * 0.75;

        ctx.save();

        // 根据动画和帧索引计算姿势参数
        const pose = this.calculatePose(animName, frameIndex, progress, totalFrames, config);

        // 绘制阴影
        if (pose.jumpOffset < 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(centerX, centerY + 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        const drawY = centerY + pose.jumpOffset;

        // 绘制腿部
        this.drawLegs(ctx, centerX, drawY, config, pose.leftLegAngle, pose.rightLegAngle, pose.crouch);

        // 绘制身体
        this.drawBody(ctx, centerX + pose.bodyOffsetX, drawY - 40 + pose.breathOffset + pose.crouch, config, pose.flashWhite);

        // 绘制手臂
        this.drawArms(ctx, centerX + pose.bodyOffsetX, drawY - 35 + pose.breathOffset + pose.crouch, config, pose.leftArmAngle, pose.rightArmAngle, pose.punchExtend, pose.weaponType);

        // 绘制头部
        this.drawHead(ctx, centerX + pose.bodyOffsetX, drawY - 58 + pose.breathOffset + pose.crouch, config, pose.flashWhite);

        // 绘制武器（如果有）
        if (pose.weaponType) {
            this.drawWeaponOnHand(ctx, centerX + pose.bodyOffsetX + 12, drawY - 30 + pose.breathOffset + pose.crouch, config, pose.weaponType, pose.weaponAngle);
        }

        ctx.restore();
        return canvas;
    }

    calculatePose(animName, frameIndex, progress, totalFrames, config) {
        const pose = {
            breathOffset: 0,
            bodyOffsetX: 0,
            leftArmAngle: 0,
            rightArmAngle: 0,
            leftLegAngle: 0,
            rightLegAngle: 0,
            punchExtend: 0,
            crouch: 0,
            jumpOffset: 0,
            flashWhite: false,
            weaponType: null,
            weaponAngle: 0
        };

        switch (animName) {
            case 'idle':
                pose.breathOffset = Math.sin(frameIndex * 0.8) * 1.5;
                pose.leftArmAngle = -0.2 + Math.sin(frameIndex * 0.5) * 0.05;
                pose.rightArmAngle = 0.2 + Math.sin(frameIndex * 0.5) * 0.05;
                break;

            case 'walk':
                const walkCycle = Math.sin(frameIndex * 1.2);
                pose.leftLegAngle = walkCycle * 0.4;
                pose.rightLegAngle = -walkCycle * 0.4;
                pose.leftArmAngle = -walkCycle * 0.3;
                pose.rightArmAngle = walkCycle * 0.3;
                pose.bodyOffsetX = Math.sin(frameIndex * 1.2) * 1;
                break;

            case 'jump':
                pose.jumpOffset = -10;
                pose.leftLegAngle = -0.3;
                pose.rightLegAngle = -0.3;
                pose.leftArmAngle = -0.5;
                pose.rightArmAngle = 0.5;
                break;

            case 'attack':
            case 'attack1':
                // 出拳动画
                if (progress < 0.3) {
                    pose.rightArmAngle = -0.8;
                    pose.bodyOffsetX = -2;
                } else if (progress < 0.6) {
                    pose.punchExtend = 1;
                    pose.rightArmAngle = 0.2;
                    pose.bodyOffsetX = 4;
                } else {
                    pose.punchExtend = 1 - (progress - 0.6) / 0.4;
                    pose.rightArmAngle = 0.1;
                    pose.bodyOffsetX = 2;
                }
                break;

            case 'attack2':
                // 摆拳
                if (progress < 0.3) {
                    pose.leftArmAngle = -1.0;
                    pose.bodyOffsetX = -3;
                } else if (progress < 0.6) {
                    pose.leftArmAngle = 0.8;
                    pose.bodyOffsetX = 5;
                } else {
                    pose.leftArmAngle = 0.5;
                    pose.bodyOffsetX = 2;
                }
                break;

            case 'attack3':
                // 踢击
                if (progress < 0.3) {
                    pose.rightLegAngle = -0.5;
                    pose.crouch = 3;
                } else if (progress < 0.7) {
                    pose.rightLegAngle = 0.8;
                    pose.bodyOffsetX = 6;
                } else {
                    pose.rightLegAngle = 0.3;
                    pose.bodyOffsetX = 2;
                }
                break;

            case 'heavy':
                // 重击 - 蓄力后大幅攻击
                if (progress < 0.4) {
                    pose.rightArmAngle = -1.2;
                    pose.bodyOffsetX = -5;
                    pose.crouch = 4;
                } else if (progress < 0.7) {
                    pose.punchExtend = 1;
                    pose.rightArmAngle = 0.5;
                    pose.bodyOffsetX = 8;
                    pose.crouch = -2;
                } else {
                    pose.punchExtend = 1 - (progress - 0.7) / 0.3;
                    pose.bodyOffsetX = 3;
                }
                break;

            case 'skill':
                // 技能动画（根据角色类型不同）
                if (config.isPlayer) {
                    if (progress < 0.3) {
                        pose.crouch = 5;
                        pose.leftArmAngle = -1.5;
                        pose.rightArmAngle = 1.5;
                    } else if (progress < 0.7) {
                        pose.bodyOffsetX = 10;
                        pose.leftArmAngle = 0.5;
                        pose.rightArmAngle = 0.5;
                        pose.punchExtend = 1;
                    } else {
                        pose.bodyOffsetX = 3;
                        pose.crouch = 2;
                    }
                }
                break;

            case 'weaponAttack':
                pose.weaponType = 'stick';
                if (progress < 0.3) {
                    pose.weaponAngle = -1.2;
                    pose.rightArmAngle = -0.8;
                } else if (progress < 0.6) {
                    pose.weaponAngle = 0.5;
                    pose.rightArmAngle = 0.3;
                    pose.bodyOffsetX = 5;
                } else {
                    pose.weaponAngle = 0.2;
                    pose.bodyOffsetX = 2;
                }
                break;

            case 'weaponHeavy':
                pose.weaponType = 'stick';
                if (progress < 0.4) {
                    pose.weaponAngle = -1.5;
                    pose.rightArmAngle = -1.0;
                    pose.crouch = 5;
                } else if (progress < 0.7) {
                    pose.weaponAngle = 0.8;
                    pose.rightArmAngle = 0.5;
                    pose.bodyOffsetX = 8;
                    pose.crouch = -3;
                } else {
                    pose.weaponAngle = 0.3;
                    pose.bodyOffsetX = 3;
                }
                break;

            case 'hurt':
                pose.bodyOffsetX = -5;
                pose.leftArmAngle = 0.6;
                pose.rightArmAngle = -0.4;
                pose.crouch = 2;
                break;

            case 'dead':
                // 倒地动画
                if (progress < 0.3) {
                    pose.crouch = 10;
                    pose.bodyOffsetX = -3;
                } else if (progress < 0.7) {
                    pose.crouch = 20;
                    pose.bodyOffsetX = -8;
                    pose.leftArmAngle = 1.2;
                    pose.rightArmAngle = -1.2;
                } else {
                    pose.crouch = 25;
                    pose.bodyOffsetX = -10;
                    pose.leftArmAngle = 1.5;
                    pose.rightArmAngle = -1.5;
                }
                break;

            case 'punch': // Boss 普攻
                if (progress < 0.3) {
                    pose.rightArmAngle = -1.0;
                    pose.bodyOffsetX = -4;
                } else if (progress < 0.6) {
                    pose.punchExtend = 1;
                    pose.rightArmAngle = 0.3;
                    pose.bodyOffsetX = 6;
                } else {
                    pose.bodyOffsetX = 2;
                }
                break;

            case 'charge': // Boss 冲撞
                if (progress < 0.3) {
                    pose.crouch = 5;
                    pose.bodyOffsetX = -5;
                } else {
                    pose.bodyOffsetX = 10;
                    pose.crouch = 3;
                }
                break;

            case 'slam': // Boss 震地
                if (progress < 0.4) {
                    pose.leftArmAngle = -1.8;
                    pose.rightArmAngle = 1.8;
                    pose.crouch = 5;
                } else if (progress < 0.7) {
                    pose.leftArmAngle = 0.8;
                    pose.rightArmAngle = 0.8;
                    pose.crouch = -5;
                    pose.bodyOffsetX = 3;
                } else {
                    pose.crouch = 3;
                }
                break;

            case 'entrance': // Boss 出场
                pose.bodyOffsetX = (1 - progress) * 20;
                break;
        }

        return pose;
    }

    drawHead(ctx, x, y, c, flash) {
        // 头发
        ctx.fillStyle = flash ? '#fff' : c.hairColor;
        ctx.beginPath();
        ctx.arc(x, y - 3, c.headRadius + 2, Math.PI, Math.PI * 2);
        ctx.fill();

        // 脸
        ctx.fillStyle = flash ? '#fff' : c.skinColor;
        ctx.beginPath();
        ctx.arc(x, y, c.headRadius, 0, Math.PI * 2);
        ctx.fill();

        // 描边
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x, y, c.headRadius, 0, Math.PI * 2);
        ctx.stroke();

        // 眼睛
        if (!flash) {
            ctx.fillStyle = '#222';
            ctx.beginPath();
            ctx.arc(x + 3, y - 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawBody(ctx, x, y, c, flash) {
        // 主体
        ctx.fillStyle = flash ? '#fff' : c.shirtColor;
        ctx.fillRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth, c.bodyHeight);

        // 暗面
        if (!flash) {
            ctx.fillStyle = 'rgba(0,0,0,0.25)';
            ctx.fillRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth * 0.3, c.bodyHeight);
        }

        // 描边
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x - c.bodyWidth / 2, y - c.bodyHeight / 2, c.bodyWidth, c.bodyHeight);

        // 领口
        ctx.fillStyle = flash ? '#fff' : c.shirtDetail;
        ctx.fillRect(x - c.bodyWidth / 2 + 2, y - c.bodyHeight / 2, c.bodyWidth - 4, 4);
    }

    drawArms(ctx, x, y, c, leftAngle, rightAngle, punchExtend, weaponType) {
        // 左臂
        ctx.save();
        ctx.translate(x - c.bodyWidth / 2 - 2, y + 5);
        ctx.rotate(leftAngle);
        ctx.fillStyle = c.shirtColor;
        ctx.fillRect(-3, 0, 6, c.armLength * 0.7);
        ctx.fillStyle = c.skinColor;
        ctx.beginPath();
        ctx.arc(0, c.armLength * 0.7 + 2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-3, 0, 6, c.armLength * 0.7);
        ctx.restore();

        // 右臂（出拳臂）
        ctx.save();
        ctx.translate(x + c.bodyWidth / 2 + 2, y + 5);
        ctx.rotate(rightAngle);
        ctx.fillStyle = c.shirtColor;
        const armLen = c.armLength * (0.7 + punchExtend * 0.3);
        ctx.fillRect(-3, 0, 6, armLen);
        ctx.fillStyle = c.skinColor;
        ctx.beginPath();
        ctx.arc(0, armLen + 2, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-3, 0, 6, armLen);
        ctx.restore();
    }

    drawLegs(ctx, x, y, c, leftAngle, rightAngle, crouch) {
        const legLen = c.legLength - crouch;

        // 左腿
        ctx.save();
        ctx.translate(x - 6, y - legLen);
        ctx.rotate(leftAngle);
        ctx.fillStyle = c.pantsColor;
        ctx.fillRect(-4, 0, 7, legLen);
        ctx.fillStyle = c.shoeColor;
        ctx.fillRect(-5, legLen - 4, 9, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-4, 0, 7, legLen);
        ctx.restore();

        // 右腿
        ctx.save();
        ctx.translate(x + 6, y - legLen);
        ctx.rotate(rightAngle);
        ctx.fillStyle = c.pantsColor;
        ctx.fillRect(-3, 0, 7, legLen);
        ctx.fillStyle = c.shoeColor;
        ctx.fillRect(-4, legLen - 4, 9, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        ctx.strokeRect(-3, 0, 7, legLen);
        ctx.restore();
    }

    drawWeaponOnHand(ctx, x, y, c, weaponType, angle) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);

        // 放大武器尺寸，确保在120x120精灵帧中可见
        const s = 1.5;
        ctx.scale(s, s);

        switch (weaponType) {
            case 'stick':
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(-3, -24, 6, 32);
                ctx.strokeStyle = '#5B3900';
                ctx.lineWidth = 1;
                ctx.strokeRect(-3, -24, 6, 32);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(0, -24, 3, 32);
                break;
            case 'pipe':
                ctx.fillStyle = '#8899AA';
                ctx.fillRect(-4, -28, 8, 34);
                ctx.fillStyle = '#AABBCC';
                ctx.fillRect(-2, -28, 4, 34);
                ctx.fillStyle = '#556677';
                ctx.fillRect(-4, -28, 8, 4);
                ctx.fillRect(-4, 2, 8, 4);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1;
                ctx.strokeRect(-4, -28, 8, 34);
                break;
            case 'bottle':
                ctx.fillStyle = '#44AA55';
                ctx.fillRect(-5, -16, 10, 18);
                ctx.fillStyle = '#55BB66';
                ctx.fillRect(-3, -22, 6, 7);
                ctx.fillStyle = '#338844';
                ctx.fillRect(-4, -24, 8, 3);
                // 碎裂尖端
                ctx.fillStyle = '#44AA55';
                ctx.beginPath();
                ctx.moveTo(-5, 2); ctx.lineTo(-4, 7); ctx.lineTo(-2, 2);
                ctx.lineTo(1, 8); ctx.lineTo(3, 3); ctx.lineTo(5, 2);
                ctx.closePath(); ctx.fill();
                ctx.strokeStyle = '#227733';
                ctx.lineWidth = 1;
                ctx.strokeRect(-5, -16, 10, 18);
                ctx.fillStyle = 'rgba(255,255,255,0.2)';
                ctx.fillRect(-4, -15, 3, 10);
                break;
            case 'hammer':
                ctx.fillStyle = '#7B5B2A';
                ctx.fillRect(-3, -8, 6, 26);
                ctx.fillStyle = '#5B3B1A';
                ctx.fillRect(-4, 4, 8, 3);
                ctx.fillRect(-4, 10, 8, 3);
                ctx.fillStyle = '#667788';
                ctx.fillRect(-10, -20, 20, 14);
                ctx.fillStyle = '#8899AA';
                ctx.fillRect(-9, -19, 18, 4);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1;
                ctx.strokeRect(-10, -20, 20, 14);
                ctx.fillStyle = 'rgba(255,255,255,0.15)';
                ctx.fillRect(-6, -18, 4, 8);
                break;
        }

        ctx.restore();
    }

    clearCache() {
        this.cache.clear();
    }
}
