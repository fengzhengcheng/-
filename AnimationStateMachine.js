/**
 * AnimationStateMachine.js - 动画状态机
 * 管理角色动画状态的切换规则
 */
class AnimationStateMachine {
    constructor(owner) {
        this.owner = owner;
        this.currentState = 'idle';
        this.currentAnimation = null;
        this.animations = new Map();
        this.spriteSheet = new GeneratedSpriteSheet();
        this.charType = 'along';
        this.useSpriteRenderer = true;
        this.previousState = null;
    }

    init(charType, animations) {
        this.charType = charType;
        this.animations = animations || new Map();
        this.currentState = 'idle';
        this.playAnimation('idle');
    }

    playAnimation(animName) {
        const key = `${this.charType}_${animName}`;
        const frames = this.spriteSheet.getFrames(this.charType, animName);
        if (!frames || frames.length === 0) return false;

        const animConfig = this.getAnimationConfig(animName);
        this.currentAnimation = new SpriteAnimation(
            animName,
            frames,
            animConfig.frameDuration,
            animConfig.loop,
            animConfig.hitFrame
        );
        this.currentState = animName;
        return true;
    }

    getAnimationConfig(animName) {
        const configs = {
            idle: { frameDuration: 8, loop: true, hitFrame: null },
            walk: { frameDuration: 6, loop: true, hitFrame: null },
            jump: { frameDuration: 8, loop: false, hitFrame: null },
            attack: { frameDuration: 5, loop: false, hitFrame: 1 },
            attack1: { frameDuration: 5, loop: false, hitFrame: 1 },
            attack2: { frameDuration: 5, loop: false, hitFrame: 1 },
            attack3: { frameDuration: 5, loop: false, hitFrame: 2 },
            heavy: { frameDuration: 6, loop: false, hitFrame: 2 },
            skill: { frameDuration: 5, loop: false, hitFrame: 2 },
            weaponAttack: { frameDuration: 5, loop: false, hitFrame: 1 },
            weaponHeavy: { frameDuration: 6, loop: false, hitFrame: 2 },
            hurt: { frameDuration: 6, loop: false, hitFrame: null },
            dead: { frameDuration: 8, loop: false, hitFrame: null },
            punch: { frameDuration: 5, loop: false, hitFrame: 1 },
            charge: { frameDuration: 6, loop: false, hitFrame: null },
            slam: { frameDuration: 6, loop: false, hitFrame: 2 },
            entrance: { frameDuration: 8, loop: false, hitFrame: null }
        };
        return configs[animName] || { frameDuration: 6, loop: false, hitFrame: null };
    }

    update(logicState, logicProgress) {
        if (!this.useSpriteRenderer) return;

        const animName = this.mapLogicStateToAnim(logicState, logicProgress);

        if (animName !== this.currentState) {
            if (this.canTransitionTo(animName)) {
                this.previousState = this.currentState;
                this.playAnimation(animName);
            }
        }

        if (this.currentAnimation) {
            this.currentAnimation.update();

            if (this.currentAnimation.isFinished() && !this.currentAnimation.loop) {
                this.onAnimationFinished();
            }
        }
    }

    mapLogicStateToAnim(logicState, logicProgress) {
        if (logicState === 'attack') {
            const combo = this.owner.comboCount || 0;
            if (combo === 0) return 'attack1';
            if (combo === 1) return 'attack2';
            if (combo === 2) return 'attack3';
            return 'attack1';
        }
        if (logicState === 'heavy') return 'heavy';
        if (logicState === 'skill') return 'skill';
        if (logicState === 'hurt') return 'hurt';
        if (logicState === 'dead') return 'dead';
        if (logicState === 'jump') return 'jump';
        if (logicState === 'walk' || logicState === 'chase') return 'walk';
        if (logicState === 'entrance') return 'entrance';
        if (logicState === 'charge') return 'charge';
        if (logicState === 'slam') return 'slam';
        if (logicState === 'punch') return 'punch';
        if (logicState === 'heavyAttack') return 'heavy';
        return 'idle';
    }

    canTransitionTo(newState) {
        if (this.currentState === 'dead') return false;
        if (newState === 'dead') return true;
        if (newState === 'hurt') return true;

        const attackStates = ['attack', 'attack1', 'attack2', 'attack3', 'heavy', 'skill', 'weaponAttack', 'weaponHeavy', 'punch', 'charge', 'slam'];
        if (attackStates.includes(this.currentState)) {
            if (newState === 'walk' || newState === 'idle') return false;
            if (newState === 'hurt' || newState === 'dead') return true;
            return false;
        }

        return true;
    }

    onAnimationFinished() {
        if (this.currentState === 'dead') return;
        if (this.currentState === 'hurt') {
            this.playAnimation('idle');
            return;
        }
        if (this.currentState === 'jump') {
            this.playAnimation('idle');
            return;
        }
        const attackStates = ['attack1', 'attack2', 'attack3', 'heavy', 'skill', 'weaponAttack', 'weaponHeavy', 'punch', 'slam'];
        if (attackStates.includes(this.currentState)) {
            this.playAnimation('idle');
        }
    }

    getCurrentFrame() {
        if (!this.currentAnimation) return null;
        return this.currentAnimation.getCurrentFrame();
    }

    isHitFrame() {
        if (!this.currentAnimation) return false;
        return this.currentAnimation.isHitFrame();
    }

    getProgress() {
        if (!this.currentAnimation) return 0;
        return this.currentAnimation.getProgress();
    }

    getCurrentFrameIndex() {
        if (!this.currentAnimation) return 0;
        return this.currentAnimation.currentFrame;
    }

    getTotalFrames() {
        if (!this.currentAnimation) return 0;
        return this.currentAnimation.frames.length;
    }

    isLooping() {
        if (!this.currentAnimation) return false;
        return this.currentAnimation.loop;
    }

    reset() {
        this.currentState = 'idle';
        this.previousState = null;
        this.playAnimation('idle');
    }

    forceState(animName) {
        this.playAnimation(animName);
    }
}
