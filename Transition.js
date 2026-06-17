/**
 * Transition.js - 关卡过渡效果（增强版）
 * 幕布合拢/打开 + 打字机标题 + Boss登场脉动
 */
class Transition {
    constructor() {
        this.active = false;
        this.phase = 'none'; // fadeIn / title / fadeOut / none
        this.alpha = 0;
        this.timer = 0;
        this.titleText = '';
        this.subtitleText = '';
        this.onComplete = null;
        // Boss 登场
        this.bossIntro = false;
        this.bossIntroTimer = 0;
        this.bossName = '';
        // 新增属性
        this.shakeCallback = null;
        this.curtainProgress = 0; // 0=完全打开, 1=完全合拢
        // 打字机效果
        this.typewriterIndex = 0;
        this.typewriterDelay = 0;
        this.subtitleVisible = false;
    }

    /** 开始关卡过渡 */
    startLevelTransition(title, subtitle, onComplete) {
        this.active = true;
        this.phase = 'fadeIn';
        this.alpha = 0;
        this.timer = 0;
        this.titleText = title;
        this.subtitleText = subtitle || '';
        this.onComplete = onComplete;
        this.bossIntro = false;
        this.curtainProgress = 0;
        this.typewriterIndex = 0;
        this.typewriterDelay = 0;
        this.subtitleVisible = false;
    }

    /** 开始 Boss 登场提示 */
    startBossIntro(bossName) {
        this.bossIntro = true;
        this.bossIntroTimer = 100;
        this.bossName = bossName;
        // 触发屏幕震动
        if (this.shakeCallback) {
            this.shakeCallback(8, 12);
        }
    }

    update() {
        // 关卡过渡
        if (this.active) {
            this.timer++;
            switch (this.phase) {
                case 'fadeIn':
                    // 幕布从两侧合拢
                    this.curtainProgress = Math.min(1, this.timer / 30);
                    this.alpha = Math.min(1, this.timer / 30);
                    if (this.timer >= 30) {
                        this.phase = 'title';
                        this.timer = 0;
                        this.typewriterIndex = 0;
                        this.typewriterDelay = 0;
                        this.subtitleVisible = false;
                    }
                    break;
                case 'title':
                    // 打字机效果：每3帧显示一个字
                    this.typewriterDelay++;
                    if (this.typewriterDelay >= 3 && this.typewriterIndex < this.titleText.length) {
                        this.typewriterIndex++;
                        this.typewriterDelay = 0;
                    }
                    // 副标题在标题打完后延迟出现
                    if (this.typewriterIndex >= this.titleText.length && !this.subtitleVisible) {
                        if (this.timer > this.titleText.length * 3 + 20) {
                            this.subtitleVisible = true;
                        }
                    }
                    if (this.timer >= 110) {
                        this.phase = 'fadeOut';
                        this.timer = 0;
                    }
                    break;
                case 'fadeOut':
                    // 幕布向两侧打开
                    this.curtainProgress = Math.max(0, 1 - this.timer / 30);
                    this.alpha = Math.max(0, 1 - this.timer / 30);
                    if (this.timer >= 30) {
                        this.phase = 'none';
                        this.active = false;
                        this.curtainProgress = 0;
                        if (this.onComplete) this.onComplete();
                    }
                    break;
            }
        }
        // Boss 登场
        if (this.bossIntro) {
            this.bossIntroTimer--;
            if (this.bossIntroTimer <= 0) this.bossIntro = false;
        }
    }

    render(ctx, W, H) {
        // 关卡过渡
        if (this.active) {
            ctx.save();

            // 幕布效果：从两侧合拢/打开的黑色幕布
            if (this.phase === 'fadeIn' || this.phase === 'fadeOut') {
                const curtainW = (W / 2) * this.curtainProgress;
                ctx.fillStyle = '#000';
                // 左侧幕布
                ctx.fillRect(0, 0, curtainW, H);
                // 右侧幕布
                ctx.fillRect(W - curtainW, 0, curtainW, H);
                // 中间区域也用半透明黑色填充（确保完全遮盖）
                ctx.globalAlpha = this.alpha;
                ctx.fillStyle = '#000';
                ctx.fillRect(curtainW, 0, W - curtainW * 2, H);
            } else if (this.phase === 'title') {
                // title 阶段完全黑屏
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, W, H);
            }

            // 标题文字（打字机效果）
            if (this.phase === 'title' || (this.phase === 'fadeIn' && this.timer > 20) || (this.phase === 'fadeOut' && this.timer < 15)) {
                let textAlpha;
                if (this.phase === 'fadeIn') {
                    textAlpha = Math.min(1, (this.timer - 20) / 10);
                } else if (this.phase === 'fadeOut') {
                    textAlpha = Math.max(0, 1 - this.timer / 15);
                } else {
                    textAlpha = 1;
                }

                ctx.save();
                ctx.globalAlpha = textAlpha;

                // 关卡编号装饰线
                const decorY = H / 2 - 55;
                const textWidth = ctx.measureText(this.titleText).width || 200;
                const decorWidth = 80;

                ctx.strokeStyle = '#ffcc00';
                ctx.lineWidth = 1;
                ctx.globalAlpha = textAlpha * 0.6;
                // 左侧装饰线
                ctx.beginPath();
                ctx.moveTo(W / 2 - textWidth / 2 - 20, decorY);
                ctx.lineTo(W / 2 - textWidth / 2 - 20 - decorWidth, decorY);
                ctx.stroke();
                // 右侧装饰线
                ctx.beginPath();
                ctx.moveTo(W / 2 + textWidth / 2 + 20, decorY);
                ctx.lineTo(W / 2 + textWidth / 2 + 20 + decorWidth, decorY);
                ctx.stroke();

                ctx.globalAlpha = textAlpha;

                // 标题（打字机效果）
                const displayText = this.phase === 'title'
                    ? this.titleText.substring(0, this.typewriterIndex)
                    : this.titleText;

                ctx.shadowColor = '#ffcc00';
                ctx.shadowBlur = 25;
                ctx.fillStyle = '#ffcc00';
                ctx.font = 'bold 52px "Microsoft YaHei", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(displayText, W / 2, H / 2 - 20);

                // 打字机光标
                if (this.phase === 'title' && this.typewriterIndex < this.titleText.length) {
                    if (this.timer % 10 < 5) {
                        const cursorX = W / 2 + ctx.measureText(displayText).width / 2 + 2;
                        ctx.fillRect(cursorX, H / 2 - 55, 3, 42);
                    }
                }

                // 副标题（延迟出现）
                if (this.subtitleVisible || (this.phase !== 'title' && this.subtitleText)) {
                    ctx.shadowBlur = 10;
                    ctx.fillStyle = '#aaddff';
                    ctx.font = '24px "Microsoft YaHei", sans-serif';
                    ctx.fillText(this.subtitleText, W / 2, H / 2 + 25);
                }

                ctx.restore();
            }

            ctx.restore();
        }

        // Boss 登场提示
        if (this.bossIntro && this.bossIntroTimer > 0) {
            const t = this.bossIntroTimer;
            const maxT = 100;
            let alpha = 0;
            if (t > maxT - 15) alpha = (maxT - t) / 15;
            else if (t < 15) alpha = t / 15;
            else alpha = 1;

            // 红色脉动闪烁背景
            const pulse = 0.5 + Math.sin(t * 0.3) * 0.5;
            ctx.save();
            ctx.globalAlpha = alpha * (0.2 + pulse * 0.25);
            ctx.fillStyle = '#440000';
            ctx.fillRect(0, 0, W, H);
            ctx.restore();

            // Boss 名字
            ctx.save();
            ctx.globalAlpha = alpha;

            // "BOSS" 文字 - 描边 + 大阴影
            ctx.textAlign = 'center';
            ctx.font = 'bold 48px "Microsoft YaHei", sans-serif';
            // 外描边
            ctx.strokeStyle = '#880000';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#ff0000';
            ctx.shadowBlur = 30;
            ctx.strokeText('BOSS', W / 2, H / 2 - 35);
            // 内填充
            ctx.fillStyle = '#ff4444';
            ctx.fillText('BOSS', W / 2, H / 2 - 35);

            // Boss 名字装饰线
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff4400';
            const nameWidth = ctx.measureText(this.bossName).width || 100;
            const lineLen = 50;
            ctx.strokeStyle = '#ff6644';
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.8;
            // 左装饰线
            ctx.beginPath();
            ctx.moveTo(W / 2 - nameWidth / 2 - 15, H / 2 + 8);
            ctx.lineTo(W / 2 - nameWidth / 2 - 15 - lineLen, H / 2 + 8);
            ctx.stroke();
            // 右装饰线
            ctx.beginPath();
            ctx.moveTo(W / 2 + nameWidth / 2 + 15, H / 2 + 8);
            ctx.lineTo(W / 2 + nameWidth / 2 + 15 + lineLen, H / 2 + 8);
            ctx.stroke();

            // Boss 名字
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur = 15;
            ctx.fillStyle = '#ffccaa';
            ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
            ctx.fillText(this.bossName, W / 2, H / 2 + 15);

            ctx.restore();
        }
    }

    clear() {
        this.active = false;
        this.phase = 'none';
        this.bossIntro = false;
        this.bossIntroTimer = 0;
        this.curtainProgress = 0;
        this.typewriterIndex = 0;
        this.typewriterDelay = 0;
        this.subtitleVisible = false;
    }

    get isTransitioning() { return this.active; }
}
