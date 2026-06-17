/**
 * SpriteAnimation.js - 精灵动画类
 * 管理单个动画的帧序列、播放速度、循环设置
 */
class SpriteAnimation {
    constructor(name, frames, frameDuration, loop, hitFrame) {
        this.name = name;
        this.frames = frames; // Canvas 数组或图像数据
        this.frameDuration = frameDuration; // 每帧持续游戏帧数
        this.loop = loop;
        this.hitFrame = hitFrame; // 命中帧索引（攻击动画专用）
        this.currentFrame = 0;
        this.timer = 0;
        this.finished = false;
        this.onComplete = null;
    }

    update() {
        if (this.finished) return;
        this.timer++;
        if (this.timer >= this.frameDuration) {
            this.timer = 0;
            this.currentFrame++;
            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.finished = true;
                    if (this.onComplete) this.onComplete();
                }
            }
        }
    }

    reset() {
        this.currentFrame = 0;
        this.timer = 0;
        this.finished = false;
    }

    getCurrentFrame() {
        return this.frames[this.currentFrame] || this.frames[0];
    }

    isHitFrame() {
        return this.hitFrame !== null && this.hitFrame !== undefined && this.currentFrame === this.hitFrame;
    }

    isFinished() {
        return this.finished;
    }

    getProgress() {
        if (this.frames.length <= 1) return 1;
        return this.currentFrame / (this.frames.length - 1);
    }
}
