/**
 * SkillEffects.js - 技能特效模块
 * 负责绘制不同角色的技能视觉特效
 * 每个角色有独特的技能表现，不共用圆形冲击特效
 */
class SkillEffects {

    /**
     * 阿龙 - 能量斩特效
     * 横向月牙形冲击波，蓝/橙色调
     */
    static drawAlongEnergySlash(ctx, screenX, y, facing, progress) {
        if (progress < 0.25) return;

        const slashProgress = (progress - 0.25) / 0.75;
        const dist = slashProgress * 80;
        const alpha = Math.max(0, 1 - slashProgress * 0.4);

        ctx.save();
        ctx.globalAlpha = alpha;

        const slashX = screenX + facing * dist;

        // 外层蓝色月牙
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(slashX, y - 5, 25 + slashProgress * 20, facing === 1 ? -0.8 : Math.PI - 0.8, facing === 1 ? 0.8 : Math.PI + 0.8);
        ctx.stroke();

        // 内层亮蓝线
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(slashX, y - 5, 18 + slashProgress * 15, facing === 1 ? -0.6 : Math.PI - 0.6, facing === 1 ? 0.6 : Math.PI + 0.6);
        ctx.stroke();

        // 橙色核心
        ctx.strokeStyle = '#ff8844';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(slashX, y - 5, 10 + slashProgress * 8, facing === 1 ? -0.4 : Math.PI - 0.4, facing === 1 ? 0.4 : Math.PI + 0.4);
        ctx.stroke();

        // 拖尾粒子
        for (let i = 0; i < 5; i++) {
            const px = slashX - facing * (i * 10 + (i * 7) % 8);
            const py = y - 5 + ((i * 13) % 30) - 15;
            const size = 2 + (i % 3);
            ctx.globalAlpha = alpha * (1 - i * 0.15);
            ctx.fillStyle = i % 2 === 0 ? '#88ccff' : '#ffaa66';
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * 小影 - 疾风踢特效
     * 紫色/青色速度线 + 踢击闪光
     */
    static drawXiaoyingDashKick(ctx, screenX, y, facing, progress) {
        if (progress < 0.15) return;

        const dashProgress = (progress - 0.15) / 0.85;
        ctx.save();

        // 速度线（多条水平线）
        for (let i = 0; i < 5; i++) {
            const lineY = y - 45 + i * 12 + Math.sin(i * 1.5) * 5;
            const lineLen = 20 + dashProgress * 40 + (i * 7) % 15;
            const lineX = screenX - facing * (5 + i * 8);

            ctx.globalAlpha = 0.3 + dashProgress * 0.4 - i * 0.05;
            ctx.strokeStyle = i % 2 === 0 ? '#aa66ff' : '#44ddff';
            ctx.lineWidth = 1.5 + (i === 2 ? 1 : 0);
            ctx.beginPath();
            ctx.moveTo(lineX, lineY);
            ctx.lineTo(lineX - facing * lineLen, lineY);
            ctx.stroke();
        }

        // 前方踢击闪光
        if (dashProgress > 0.3 && dashProgress < 0.8) {
            const flashX = screenX + facing * 30;
            const flashAlpha = Math.sin((dashProgress - 0.3) / 0.5 * Math.PI) * 0.6;
            ctx.globalAlpha = flashAlpha;

            // 菱形闪光
            ctx.fillStyle = '#cc88ff';
            ctx.beginPath();
            ctx.moveTo(flashX, y - 35);
            ctx.lineTo(flashX + facing * 12, y - 25);
            ctx.lineTo(flashX, y - 15);
            ctx.lineTo(flashX - facing * 12, y - 25);
            ctx.closePath();
            ctx.fill();

            // 小型切裂光效
            ctx.strokeStyle = '#44ddff';
            ctx.lineWidth = 1.5;
            for (let j = 0; j < 3; j++) {
                const angle = (j - 1) * 0.4 + (facing === 1 ? 0 : Math.PI);
                ctx.beginPath();
                ctx.moveTo(flashX, y - 25);
                ctx.lineTo(flashX + Math.cos(angle) * 15, y - 25 + Math.sin(angle) * 15);
                ctx.stroke();
            }
        }

        ctx.restore();
    }

    /**
     * 铁山 - 震地拳特效
     * 地面裂纹 + 尘土 + 冲击波
     */
    static drawTieshanGroundSlam(ctx, screenX, y, facing, progress, phase) {
        if (phase < 1) {
            // 蓄力阶段：拳头发光
            if (progress > 0.2) {
                ctx.save();
                const glowAlpha = (progress - 0.2) / 0.3 * 0.5;
                ctx.globalAlpha = glowAlpha;
                ctx.fillStyle = '#ffaa33';
                ctx.beginPath();
                ctx.arc(screenX + facing * 15, y - 55, 8 + progress * 10, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ff6622';
                ctx.beginPath();
                ctx.arc(screenX + facing * 15, y - 55, 4 + progress * 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }

        // 砸地阶段
        const slamProgress = Math.min(1, (progress - 0.5) / 0.4);
        if (slamProgress <= 0) return;

        ctx.save();

        // 地面裂纹
        this.drawGroundCracks(ctx, screenX, y, slamProgress);

        // 尘土粒子
        this.drawDustParticles(ctx, screenX, y, slamProgress);

        // 左右扩散冲击波
        const waveDist = slamProgress * 100;
        ctx.globalAlpha = Math.max(0, 1 - slamProgress * 0.8);
        ctx.strokeStyle = '#ff6633';
        ctx.lineWidth = 4;
        for (let dir = -1; dir <= 1; dir += 2) {
            ctx.beginPath();
            ctx.moveTo(screenX + dir * waveDist * 0.2, y - 3);
            ctx.lineTo(screenX + dir * waveDist, y - 15);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(screenX + dir * waveDist * 0.2, y);
            ctx.lineTo(screenX + dir * waveDist, y - 8);
            ctx.stroke();
        }

        // 橙色冲击光环
        ctx.strokeStyle = '#ffaa44';
        ctx.lineWidth = 2;
        ctx.globalAlpha = Math.max(0, 0.6 - slamProgress * 0.5);
        ctx.beginPath();
        ctx.ellipse(screenX, y - 5, waveDist * 0.8, 8 + slamProgress * 5, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    }

    /**
     * 地面裂纹
     */
    static drawGroundCracks(ctx, screenX, y, progress) {
        ctx.save();
        const alpha = Math.min(1, progress * 2) * 0.8;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#553311';
        ctx.lineWidth = 2;

        const len = progress * 80;

        // 固定裂纹图案（左3条 + 右3条），不使用随机数避免抖动
        const crackOffsets = [
            [{ dx: -15, dy: -2 }, { dx: -30, dy: 1 }, { dx: -50, dy: -3 }, { dx: -70, dy: 0 }],
            [{ dx: -10, dy: 1 }, { dx: -25, dy: -1 }, { dx: -45, dy: 2 }, { dx: -65, dy: -1 }],
            [{ dx: -20, dy: 0 }, { dx: -35, dy: -2 }, { dx: -55, dy: 1 }, { dx: -75, dy: -2 }],
            [{ dx: 15, dy: -2 }, { dx: 30, dy: 1 }, { dx: 50, dy: -3 }, { dx: 70, dy: 0 }],
            [{ dx: 10, dy: 1 }, { dx: 25, dy: -1 }, { dx: 45, dy: 2 }, { dx: 65, dy: -1 }],
            [{ dx: 20, dy: 0 }, { dx: 35, dy: -2 }, { dx: 55, dy: 1 }, { dx: 75, dy: -2 }],
        ];

        crackOffsets.forEach(crack => {
            ctx.beginPath();
            ctx.moveTo(screenX, y - 2);
            crack.forEach(pt => {
                if (Math.abs(pt.dx) <= len) {
                    ctx.lineTo(screenX + pt.dx * (len / 80), y + pt.dy);
                }
            });
            ctx.stroke();
        });

        // 裂纹发光
        ctx.strokeStyle = '#ff6633';
        ctx.lineWidth = 1;
        ctx.globalAlpha = alpha * 0.4;
        for (let dir = -1; dir <= 1; dir += 2) {
            ctx.beginPath();
            ctx.moveTo(screenX, y);
            ctx.lineTo(screenX + dir * len * 0.7, y - 3);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 尘土粒子
     */
    static drawDustParticles(ctx, screenX, y, progress) {
        ctx.save();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = progress * (20 + i * 5);
            const dx = Math.cos(angle) * dist;
            const dy = -Math.abs(Math.sin(angle)) * dist * 0.5 - progress * 8;
            const size = 3 + i * 0.5;
            const alpha = Math.max(0, (1 - progress) * 0.5);

            ctx.globalAlpha = alpha;
            ctx.fillStyle = i % 2 === 0 ? '#aa8855' : '#887744';
            ctx.beginPath();
            ctx.arc(screenX + dx, y + dy, size * (1 - progress * 0.3), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    /**
     * 速度残影绘制
     */
    static drawSpeedAfterImages(ctx, cameraX, afterImages, charConfig) {
        afterImages.forEach(ai => {
            if (ai.timer <= 0) return;
            const screenX = ai.x - cameraX;
            ctx.save();
            ctx.globalAlpha = ai.alpha * 0.5;
            CharacterRenderer.draw(
                ctx, screenX, ai.y, ai.facing,
                ai.pose || 'attack', charConfig,
                ai.animFrame || 0, 0.5, 1, false, 0
            );
            // 紫色/青色色调覆盖
            ctx.globalAlpha = ai.alpha * 0.15;
            ctx.fillStyle = '#8844cc';
            ctx.fillRect(screenX - 15, ai.y - 65, 30, 65);
            ctx.restore();
        });
    }
}
