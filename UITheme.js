/**
 * UITheme.js - 统一UI风格（街机增强版）
 * 提供血条、按钮、面板等统一绘制方法
 */
class UITheme {
    /** 绘制渐变血条（增强版：内阴影+三层渐变+发光边框+文字阴影） */
    static drawBar(ctx, x, y, w, h, ratio, colors, label, showValue) {
        ratio = Math.max(0, Math.min(1, ratio));
        const isLowHP = ratio <= 0.25;
        const pulse = isLowHP ? 0.5 + 0.5 * Math.sin(Date.now() * 0.008) : 0;

        // 背景
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y, w, h);

        // 内阴影效果（顶部和底部深色渐变模拟内凹）
        const innerShadow = ctx.createLinearGradient(x, y, x, y + h);
        innerShadow.addColorStop(0, 'rgba(0,0,0,0.4)');
        innerShadow.addColorStop(0.15, 'rgba(0,0,0,0.1)');
        innerShadow.addColorStop(0.85, 'rgba(0,0,0,0.1)');
        innerShadow.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = innerShadow;
        ctx.fillRect(x, y, w, h);

        // 渐变填充（三层：顶部高光、中间主色、底部暗色）
        if (ratio > 0) {
            const fillW = w * ratio;
            const grad = ctx.createLinearGradient(x, y, x, y + h);
            grad.addColorStop(0, colors.top);
            grad.addColorStop(0.3, colors.top);
            grad.addColorStop(0.5, colors.bottom);
            grad.addColorStop(1, UITheme._darkenColor(colors.bottom, 0.6));
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, fillW, h);

            // 顶部高光条（更明显）
            const hlGrad = ctx.createLinearGradient(x, y, x, y + h * 0.4);
            hlGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
            hlGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
            ctx.fillStyle = hlGrad;
            ctx.fillRect(x, y, fillW, h * 0.4);

            // 底部反光
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(x, y + h * 0.85, fillW, h * 0.15);
        }

        // 发光边框（低HP时红色脉动）
        if (isLowHP) {
            ctx.save();
            ctx.shadowColor = `rgba(255,0,0,${0.4 + pulse * 0.6})`;
            ctx.shadowBlur = 6 + pulse * 8;
            ctx.strokeStyle = `rgba(255,${Math.floor(50 + pulse * 50)},${Math.floor(50 + pulse * 50)},${0.7 + pulse * 0.3})`;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, w, h);
            ctx.restore();
        } else {
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
        }

        // 内边框高光
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);

        // 文字（带阴影）
        if (label || showValue) {
            const fontSize = Math.max(9, h - 4);
            ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
            ctx.textAlign = 'center';
            let text = '';
            if (label) text += label + ' ';
            if (showValue) text += showValue;
            // 阴影
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillText(text, x + w / 2 + 1, y + h - 2);
            // 主文字
            ctx.fillStyle = '#fff';
            ctx.fillText(text, x + w / 2, y + h - 3);
        }
    }

    /** HP 条颜色 */
    static getHPColors(ratio) {
        if (ratio > 0.5) return { top: '#55dd55', bottom: '#33aa33', border: '#66ee66' };
        if (ratio > 0.25) return { top: '#dddd44', bottom: '#aaaa22', border: '#eeee66' };
        return { top: '#dd4444', bottom: '#aa2222', border: '#ee6666' };
    }

    /** EP 条颜色 */
    static getEPColors() {
        return { top: '#55aaff', bottom: '#2277dd', border: '#66bbff' };
    }

    /** 绘制街机风格按钮（增强版：按下效果+悬停发光） */
    static drawButton(ctx, x, y, w, h, label, isHover, colorScheme, isPressed) {
        const cs = colorScheme || UITheme.COLORS.orange;
        const pressed = isPressed || false;
        const offsetY = pressed ? 2 : 0;

        // 阴影（按下时阴影更小）
        ctx.fillStyle = pressed ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.35)';
        ctx.fillRect(x + 2, y + 2 + offsetY, w, h);

        // 主体渐变
        const grad = ctx.createLinearGradient(x, y + offsetY, x, y + h + offsetY);
        if (pressed) {
            grad.addColorStop(0, UITheme._darkenColor(cs.bottom, 0.8));
            grad.addColorStop(1, UITheme._darkenColor(cs.bottom, 0.6));
        } else {
            grad.addColorStop(0, isHover ? cs.hoverTop : cs.top);
            grad.addColorStop(0.4, isHover ? cs.hoverTop : cs.top);
            grad.addColorStop(1, isHover ? cs.hoverBottom : cs.bottom);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(x, y + offsetY, w, h);

        // 高光
        if (!pressed) {
            const hlGrad = ctx.createLinearGradient(x, y + offsetY, x, y + h * 0.45 + offsetY);
            hlGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
            hlGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
            ctx.fillStyle = hlGrad;
            ctx.fillRect(x, y + offsetY, w, h * 0.45);
        }

        // 悬停发光边框
        if (isHover && !pressed) {
            ctx.save();
            ctx.shadowColor = cs.hoverBorder;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = cs.hoverBorder;
            ctx.lineWidth = 2.5;
            ctx.strokeRect(x, y + offsetY, w, h);
            ctx.restore();
        } else {
            ctx.strokeStyle = pressed ? UITheme._darkenColor(cs.border, 0.7) : cs.border;
            ctx.lineWidth = pressed ? 2 : 1.5;
            ctx.strokeRect(x, y + offsetY, w, h);
        }

        // 内边框高光
        if (!pressed) {
            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(x + 2, y + 2 + offsetY, w - 4, h - 4);
        }

        // 文字
        const fontSize = Math.min(22, h * 0.55);
        ctx.font = `bold ${fontSize}px "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        // 阴影
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(label, x + w / 2 + 1, y + h * 0.65 + offsetY + 1);
        // 主文字
        ctx.fillStyle = pressed ? 'rgba(255,255,255,0.8)' : '#fff';
        ctx.fillText(label, x + w / 2, y + h * 0.65 + offsetY);
    }

    /** 绘制面板（增强版：标题栏+阴影+高光内边框） */
    static drawPanel(ctx, x, y, w, h, borderColor, title) {
        const titleH = title ? 28 : 0;
        const bc = borderColor || '#ff6600';

        // 面板阴影
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(x + 4, y + 4, w, h);

        // 主体
        ctx.fillStyle = 'rgba(15,12,25,0.93)';
        ctx.fillRect(x, y, w, h);

        // 标题栏区域
        if (title) {
            const titleGrad = ctx.createLinearGradient(x, y, x, y + titleH);
            titleGrad.addColorStop(0, 'rgba(255,102,0,0.25)');
            titleGrad.addColorStop(1, 'rgba(255,102,0,0.05)');
            ctx.fillStyle = titleGrad;
            ctx.fillRect(x + 1, y + 1, w - 2, titleH);

            // 标题栏底线
            ctx.strokeStyle = bc;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + titleH);
            ctx.lineTo(x + w - 6, y + titleH);
            ctx.stroke();

            // 标题文字
            ctx.fillStyle = bc;
            ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(title, x + w / 2, y + titleH - 7);
        }

        // 外边框
        ctx.strokeStyle = bc;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);

        // 内边框高光（更明显）
        const hlGrad = ctx.createLinearGradient(x, y, x, y + h);
        hlGrad.addColorStop(0, 'rgba(255,255,255,0.12)');
        hlGrad.addColorStop(0.5, 'rgba(255,255,255,0.03)');
        hlGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
        ctx.strokeStyle = hlGrad;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, w - 6, h - 6);

        // 角落装饰
        const cornerLen = 8;
        ctx.strokeStyle = bc;
        ctx.lineWidth = 1.5;
        // 左上
        ctx.beginPath(); ctx.moveTo(x, y + cornerLen); ctx.lineTo(x, y); ctx.lineTo(x + cornerLen, y); ctx.stroke();
        // 右上
        ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + cornerLen); ctx.stroke();
        // 左下
        ctx.beginPath(); ctx.moveTo(x, y + h - cornerLen); ctx.lineTo(x, y + h); ctx.lineTo(x + cornerLen, y + h); ctx.stroke();
        // 右下
        ctx.beginPath(); ctx.moveTo(x + w - cornerLen, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - cornerLen); ctx.stroke();
    }

    /** 绘制 Boss 血条（增强版：装饰线+脉动+金属边框+骷髅+分段标记） */
    static drawBossHPBar(ctx, W, bossName, hp, maxHp) {
        const barW = W * 0.6, barH = 24;
        const barX = (W - barW) / 2, barY = 58;
        const ratio = Math.max(0, hp / maxHp);
        const isLowHP = ratio <= 0.25;
        const pulse = isLowHP ? 0.5 + 0.5 * Math.sin(Date.now() * 0.008) : 0;
        const centerX = W / 2;

        // Boss 名称 + 装饰线
        ctx.save();
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 10 + pulse * 6;
        ctx.fillStyle = '#ff6644';
        ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bossName, centerX, barY - 8);
        ctx.restore();

        // 名称两侧装饰线
        const nameWidth = ctx.measureText(bossName).width || 60;
        const lineLen = 30;
        ctx.strokeStyle = 'rgba(255,100,50,0.6)';
        ctx.lineWidth = 1.5;
        // 左侧线
        ctx.beginPath();
        ctx.moveTo(centerX - nameWidth / 2 - 8, barY - 12);
        ctx.lineTo(centerX - nameWidth / 2 - 8 - lineLen, barY - 12);
        ctx.stroke();
        // 右侧线
        ctx.beginPath();
        ctx.moveTo(centerX + nameWidth / 2 + 8, barY - 12);
        ctx.lineTo(centerX + nameWidth / 2 + 8 + lineLen, barY - 12);
        ctx.stroke();

        // 骷髅/危险标记（血条左侧）
        ctx.save();
        ctx.fillStyle = isLowHP ? `rgba(255,50,50,${0.7 + pulse * 0.3})` : 'rgba(255,80,50,0.7)';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☠', barX - 12, barY + barH / 2 + 5);
        ctx.restore();

        // 背景外框（金属质感双层边框 - 外层）
        ctx.fillStyle = 'rgba(40,20,20,0.8)';
        ctx.fillRect(barX - 4, barY - 4, barW + 8, barH + 8);
        ctx.strokeStyle = '#553322';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX - 4, barY - 4, barW + 8, barH + 8);

        // 金属质感双层边框 - 内层
        ctx.strokeStyle = '#886644';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // 背景内区
        const bgGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        bgGrad.addColorStop(0, 'rgba(30,10,10,0.8)');
        bgGrad.addColorStop(1, 'rgba(50,15,15,0.9)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(barX, barY, barW, barH);

        // 渐变血条（暗红渐变+脉动）
        if (ratio > 0) {
            const fillW = barW * ratio;
            const grad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
            if (ratio > 0.5) {
                grad.addColorStop(0, '#cc3333');
                grad.addColorStop(0.3, '#bb2222');
                grad.addColorStop(0.7, '#991111');
                grad.addColorStop(1, '#770808');
            } else if (ratio > 0.25) {
                grad.addColorStop(0, '#cc6633');
                grad.addColorStop(0.3, '#bb5522');
                grad.addColorStop(0.7, '#994411');
                grad.addColorStop(1, '#773308');
            } else {
                grad.addColorStop(0, `rgba(220,30,30,${0.8 + pulse * 0.2})`);
                grad.addColorStop(0.3, `rgba(180,20,20,${0.8 + pulse * 0.2})`);
                grad.addColorStop(0.7, `rgba(140,10,10,${0.8 + pulse * 0.2})`);
                grad.addColorStop(1, `rgba(100,5,5,${0.8 + pulse * 0.2})`);
            }
            ctx.fillStyle = grad;
            ctx.fillRect(barX, barY, fillW, barH);

            // 高光
            const hlGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH * 0.4);
            hlGrad.addColorStop(0, 'rgba(255,255,255,0.2)');
            hlGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
            ctx.fillStyle = hlGrad;
            ctx.fillRect(barX, barY, fillW, barH * 0.4);

            // 低HP脉动发光
            if (isLowHP) {
                ctx.save();
                ctx.shadowColor = `rgba(255,0,0,${0.3 + pulse * 0.5})`;
                ctx.shadowBlur = 8 + pulse * 10;
                ctx.fillStyle = `rgba(255,0,0,${0.05 + pulse * 0.1})`;
                ctx.fillRect(barX, barY, fillW, barH);
                ctx.restore();
            }
        }

        // 血条分段标记（phase分界线：25%、50%、75%）
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        const phases = [0.25, 0.5, 0.75];
        for (const p of phases) {
            const px = barX + barW * p;
            ctx.beginPath();
            ctx.moveTo(px, barY);
            ctx.lineTo(px, barY + barH);
            ctx.stroke();
        }

        // 内边框
        ctx.strokeStyle = 'rgba(255,200,150,0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(barX + 1, barY + 1, barW - 2, barH - 2);

        // HP 数字（更大更醒目）
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = isLowHP ? `rgba(255,${Math.floor(150 + pulse * 105)},${Math.floor(100 + pulse * 100)},1)` : '#ffccaa';
        ctx.font = 'bold 13px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.max(0, Math.ceil(hp))} / ${maxHp}`, centerX, barY + barH - 5);
        ctx.restore();
    }

    /** 绘制武器图标轮廓（增强版：更大更清晰+描边+细节） */
    static drawWeaponIcon(ctx, type, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        const s = size / 16;
        ctx.scale(s, s);

        switch (type) {
            case 'stick': {
                // 木棍 - 增加木纹
                // 外轮廓描边
                ctx.strokeStyle = '#5a3a0a';
                ctx.lineWidth = 6;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
                // 主体
                ctx.strokeStyle = '#8B6914';
                ctx.lineWidth = 4;
                ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(0, 12); ctx.stroke();
                // 木纹（横向细线）
                ctx.strokeStyle = 'rgba(90,50,10,0.4)';
                ctx.lineWidth = 0.8;
                for (let i = -8; i <= 8; i += 4) {
                    ctx.beginPath();
                    ctx.moveTo(-1.5, i);
                    ctx.lineTo(1.5, i + 1);
                    ctx.stroke();
                }
                // 顶部高光
                ctx.strokeStyle = 'rgba(200,170,100,0.4)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(-0.5, -11); ctx.lineTo(-0.5, 11); ctx.stroke();
                break;
            }
            case 'pipe': {
                // 钢管 - 增加金属反光
                // 外轮廓描边
                ctx.strokeStyle = '#4a5566';
                ctx.lineWidth = 7;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
                // 主体
                ctx.strokeStyle = '#8899AA';
                ctx.lineWidth = 5;
                ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, 14); ctx.stroke();
                // 金属反光（纵向高光条）
                ctx.strokeStyle = 'rgba(200,220,240,0.5)';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(-1.5, -13); ctx.lineTo(-1.5, 13); ctx.stroke();
                // 次级反光
                ctx.strokeStyle = 'rgba(180,200,220,0.25)';
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(1, 12); ctx.stroke();
                // 端部接口环
                ctx.strokeStyle = 'rgba(60,70,85,0.6)';
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(-3, -12); ctx.lineTo(3, -12); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-3, 12); ctx.lineTo(3, 12); ctx.stroke();
                break;
            }
            case 'bottle': {
                // 破瓶子 - 增加碎裂效果
                // 外轮廓描边
                ctx.strokeStyle = '#2a7a3a';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.beginPath();
                ctx.moveTo(0, -10); ctx.lineTo(0, 5);
                ctx.moveTo(-5, 5); ctx.lineTo(0, 12); ctx.lineTo(5, 5);
                ctx.stroke();
                // 主体
                ctx.strokeStyle = '#44AA55';
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(0, -10); ctx.lineTo(0, 5);
                ctx.moveTo(-5, 5); ctx.lineTo(0, 12); ctx.lineTo(5, 5);
                ctx.stroke();
                // 碎裂效果（锯齿裂纹线）
                ctx.strokeStyle = 'rgba(200,255,200,0.5)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(0, -4); ctx.lineTo(2, -2); ctx.lineTo(-1, 0); ctx.lineTo(1.5, 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, -6); ctx.lineTo(-2, -3);
                ctx.stroke();
                // 碎片
                ctx.fillStyle = 'rgba(68,170,85,0.4)';
                ctx.beginPath();
                ctx.moveTo(3, 3); ctx.lineTo(6, 1); ctx.lineTo(5, 4);
                ctx.closePath();
                ctx.fill();
                // 高光
                ctx.strokeStyle = 'rgba(150,255,150,0.3)';
                ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.moveTo(-0.5, -9); ctx.lineTo(-0.5, 4); ctx.stroke();
                break;
            }
            case 'hammer': {
                // 铁锤 - 增加锤头细节
                // 手柄外描边
                ctx.strokeStyle = '#3a3a3a';
                ctx.lineWidth = 4;
                ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 14); ctx.stroke();
                // 手柄
                ctx.strokeStyle = '#6B4226';
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(0, 14); ctx.stroke();
                // 手柄缠绕
                ctx.strokeStyle = 'rgba(90,55,30,0.5)';
                ctx.lineWidth = 0.8;
                for (let i = 4; i <= 12; i += 2) {
                    ctx.beginPath();
                    ctx.moveTo(-1.2, i); ctx.lineTo(1.2, i + 1);
                    ctx.stroke();
                }
                // 锤头外描边
                ctx.strokeStyle = '#2a2a2a';
                ctx.lineWidth = 2.5;
                ctx.strokeRect(-8, -10, 16, 12);
                // 锤头主体
                const hammerGrad = ctx.createLinearGradient(-8, -10, -8, 2);
                hammerGrad.addColorStop(0, '#8899AA');
                hammerGrad.addColorStop(0.3, '#778899');
                hammerGrad.addColorStop(1, '#556677');
                ctx.fillStyle = hammerGrad;
                ctx.fillRect(-8, -10, 16, 12);
                // 锤头高光
                ctx.fillStyle = 'rgba(200,220,240,0.3)';
                ctx.fillRect(-7, -9, 14, 3);
                // 锤头底边暗线
                ctx.strokeStyle = 'rgba(30,30,40,0.5)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(-8, 2); ctx.lineTo(8, 2);
                ctx.stroke();
                break;
            }
        }
        ctx.restore();
    }

    /** 街机风格标题文字（描边+阴影+发光） */
    static drawArcadeTitle(ctx, x, y, text, color, fontSize) {
        const fs = fontSize || 32;
        const c = color || '#ff6600';
        ctx.save();
        ctx.font = `bold ${fs}px "Microsoft YaHei", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // 外发光
        ctx.shadowColor = c;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // 描边（黑色粗描边）
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = fs * 0.12;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);

        // 描边（颜色描边）
        ctx.strokeStyle = UITheme._darkenColor(c, 0.5);
        ctx.lineWidth = fs * 0.06;
        ctx.strokeText(text, x, y);

        // 主文字
        ctx.shadowBlur = 8;
        ctx.fillStyle = c;
        ctx.fillText(text, x, y);

        // 高光层
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillText(text, x, y - 1);

        ctx.restore();
    }

    /** 小图标（心形HP、闪电EP、星星分数） */
    static drawMiniIcon(ctx, x, y, type, size) {
        const s = size || 12;
        ctx.save();
        ctx.translate(x, y);

        switch (type) {
            case 'heart': {
                // 心形HP图标
                const hs = s / 12;
                ctx.scale(hs, hs);
                ctx.fillStyle = '#ee3344';
                ctx.beginPath();
                ctx.moveTo(0, 3);
                ctx.bezierCurveTo(-1, -2, -7, -2, -7, 2);
                ctx.bezierCurveTo(-7, 6, 0, 10, 0, 12);
                ctx.bezierCurveTo(0, 10, 7, 6, 7, 2);
                ctx.bezierCurveTo(7, -2, 1, -2, 0, 3);
                ctx.fill();
                // 高光
                ctx.fillStyle = 'rgba(255,255,255,0.3)';
                ctx.beginPath();
                ctx.ellipse(-3, 1, 2, 1.5, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
            case 'lightning': {
                // 闪电EP图标
                const ls = s / 10;
                ctx.scale(ls, ls);
                ctx.fillStyle = '#55aaff';
                ctx.beginPath();
                ctx.moveTo(1, -8);
                ctx.lineTo(-3, 0);
                ctx.lineTo(0, 0);
                ctx.lineTo(-1, 8);
                ctx.lineTo(3, 0);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fill();
                // 发光
                ctx.shadowColor = '#55aaff';
                ctx.shadowBlur = 4;
                ctx.fill();
                break;
            }
            case 'star': {
                // 星星分数图标
                const ss = s / 10;
                ctx.scale(ss, ss);
                ctx.fillStyle = '#ffcc00';
                ctx.beginPath();
                for (let i = 0; i < 5; i++) {
                    const angle = -Math.PI / 2 + (i * 2 * Math.PI / 5);
                    const outerX = Math.cos(angle) * 7;
                    const outerY = Math.sin(angle) * 7;
                    if (i === 0) ctx.moveTo(outerX, outerY);
                    else ctx.lineTo(outerX, outerY);
                    const innerAngle = angle + Math.PI / 5;
                    ctx.lineTo(Math.cos(innerAngle) * 3, Math.sin(innerAngle) * 3);
                }
                ctx.closePath();
                ctx.fill();
                // 高光
                ctx.fillStyle = 'rgba(255,255,255,0.25)';
                ctx.beginPath();
                ctx.ellipse(-1, -2, 2, 1.5, -0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
            }
        }
        ctx.restore();
    }

    /** 分割线装饰 */
    static drawSectionDivider(ctx, x, y, w, color) {
        const c = color || '#ff6600';
        const centerX = x + w / 2;
        const diamondSize = 4;

        ctx.save();
        // 左侧线
        const lineGrad1 = ctx.createLinearGradient(x, y, centerX - diamondSize - 4, y);
        lineGrad1.addColorStop(0, 'rgba(0,0,0,0)');
        lineGrad1.addColorStop(1, c);
        ctx.strokeStyle = lineGrad1;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(centerX - diamondSize - 4, y);
        ctx.stroke();

        // 右侧线
        const lineGrad2 = ctx.createLinearGradient(centerX + diamondSize + 4, y, x + w, y);
        lineGrad2.addColorStop(0, c);
        lineGrad2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.strokeStyle = lineGrad2;
        ctx.beginPath();
        ctx.moveTo(centerX + diamondSize + 4, y);
        ctx.lineTo(x + w, y);
        ctx.stroke();

        // 中间菱形装饰
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(centerX, y - diamondSize);
        ctx.lineTo(centerX + diamondSize, y);
        ctx.lineTo(centerX, y + diamondSize);
        ctx.lineTo(centerX - diamondSize, y);
        ctx.closePath();
        ctx.fill();

        // 菱形高光
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.moveTo(centerX, y - diamondSize + 1);
        ctx.lineTo(centerX + diamondSize - 1, y);
        ctx.lineTo(centerX, y);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /** 辅助方法：加深颜色 */
    static _darkenColor(hex, factor) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.floor(r * factor)},${Math.floor(g * factor)},${Math.floor(b * factor)})`;
    }
}

UITheme.COLORS = {
    orange: { top: '#dd5500', bottom: '#aa3300', border: '#ff8844', hoverTop: '#ff7722', hoverBottom: '#dd5500', hoverBorder: '#ffbb88' },
    green: { top: '#228822', bottom: '#116611', border: '#44aa44', hoverTop: '#33aa33', hoverBottom: '#228822', hoverBorder: '#66dd66' },
    red: { top: '#aa2222', bottom: '#881111', border: '#cc4444', hoverTop: '#cc3333', hoverBottom: '#aa2222', hoverBorder: '#ee6666' },
    blue: { top: '#224488', bottom: '#112266', border: '#4466aa', hoverTop: '#3355aa', hoverBottom: '#224488', hoverBorder: '#6688cc' },
};
