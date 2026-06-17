/**
 * SpriteCharacterRenderer.js
 * Character image renderer with a strict Chifeng walk animation path.
 */

const CHIFENG_FRAME_MANIFEST = {
    idle: [
        { file: 'idle_01.png', sourceName: 'char01_chifeng_idle_01.png' },
        { file: 'idle_02.png', sourceName: 'char01_chifeng_idle_02.png' },
    ],
    walk: [
        { file: 'walk_01.png', sourceName: 'char01_walk_01.png' },
        { file: 'walk_02.png', sourceName: 'char01_walk_02.png' },
        { file: 'walk_03.png', sourceName: 'char01_walk_03.png' },
        { file: 'walk_04.png', sourceName: 'char01_walk_04.png' },
    ],
    attack: [
        { file: 'attack_01.png', sourceName: 'char01_chifeng_walk_02.png' },
        { file: 'attack_02.png', sourceName: 'char01_chifeng_attack_02.png' },
    ],
    hurt: [
        { file: 'hurt.png', sourceName: 'char01_chifeng_down.png' },
    ],
    down: [
        { file: 'down.png', sourceName: 'char01_chifeng_idle_01.png' },
    ],
};

class SpriteCharacterRenderer {
    static walkFrameDurationMs = 1000 / 8;
    static playerTargetHeight = 148;
    static idleImages = {};
    static skillPoseImages = {};
    static frameImages = {};
    static lastStates = {};
    static playableCharIds = new Set(['chifeng', 'qinglan', 'tiekui']);

    static createStateTracker() {
        return {
            state: null,
            animFrameWhenStateStart: 0,
            stateStartTimeMs: 0,
            lastLoggedState: null,
            currentAnim: 'idle',
            currentFrameName: 'N/A',
            currentFrameIndex: -1,
            lastWalkDebugSignature: null,
        };
    }

    static getStateTracker(charId) {
        if (!this.lastStates[charId]) {
            this.lastStates[charId] = this.createStateTracker();
        }
        return this.lastStates[charId];
    }

    static setFrameImages(charId, stateImages) {
        this.frameImages[charId] = stateImages;
        this.getStateTracker(charId);
    }

    static initAnimState(charId) {
        this.lastStates[charId] = this.createStateTracker();
    }

    static frameCheck() {
        console.log('=== [FrameCheck] chifeng frame manifest ===');
        for (const [state, frames] of Object.entries(CHIFENG_FRAME_MANIFEST)) {
            const mapped = frames.map(frame => `${frame.file}<-${frame.sourceName}`).join(', ');
            console.log(`[FrameCheck] ${state} -> ${mapped}`);
        }
        console.log('[FrameCheck] done');
    }

    static getCurrentFrameName(charId) {
        return this.getCurrentFrameDebugInfo(charId).frame || 'N/A';
    }

    static getCurrentFrameDebugInfo(charId) {
        const tracker = this.getStateTracker(charId);
        return {
            state: tracker.state || 'N/A',
            frame: tracker.currentFrameName || 'N/A',
            frameIndex: Number.isInteger(tracker.currentFrameIndex) ? tracker.currentFrameIndex : -1,
            currentAnim: tracker.currentAnim || 'N/A',
        };
    }

    static preloadIdleImage(charId, path) {
        if (!path || this.idleImages[charId]) return;
        const img = new Image();
        img.src = path;
        img.onload = () => {
            this.idleImages[charId] = img;
            console.log(`[SpriteCR] preloadIdleImage loaded: ${charId}`);
        };
        img.onerror = () => {
            console.error(`[SpriteCR] preloadIdleImage failed: ${charId} -> ${path}`);
        };
    }

    static setIdleImage(charId, img) {
        if (img && img.complete) {
            this.idleImages[charId] = img;
        }
    }

    static setSkillPoseImage(charId, img) {
        if (img && img.complete) {
            this.skillPoseImages[charId] = img;
        }
    }

    static getFrameKey(renderState) {
        switch (renderState) {
            case 'walk': return 'walk';
            case 'attack': return 'attack';
            case 'heavy': return 'heavy';
            case 'hurt': return 'hurt';
            case 'dead': return 'dead';
            default: return null;
        }
    }

    static setTrackerState(charId, renderState, frameName, frameIndex, animFrame) {
        const tracker = this.getStateTracker(charId);
        if (tracker.state !== renderState) {
            tracker.state = renderState;
            tracker.animFrameWhenStateStart = animFrame;
            tracker.stateStartTimeMs = performance.now();
        }
        tracker.currentAnim = renderState;
        tracker.currentFrameName = frameName;
        tracker.currentFrameIndex = frameIndex;
    }

    static logWalkDebug(charId, moving, renderState, frameName, frameIndex, facing) {
        const tracker = this.getStateTracker(charId);
        const signature = `${moving}|${renderState}|${frameName}|${frameIndex}|${facing}`;
        if (tracker.lastWalkDebugSignature === signature) return;
        tracker.lastWalkDebugSignature = signature;

        if (renderState === 'walk') {
            console.log(`[WalkDebug] char=${charId} moving=${moving} state=${renderState} renderState=${renderState} currentAnim=walk currentFrameName=${frameName} currentFrameIndex=${frameIndex} facing=${facing}`);
            return;
        }

        if (renderState === 'idle') {
            console.log(`[WalkDebug] char=${charId} moving=${moving} state=${renderState} renderState=${renderState} currentAnim=idle currentFrameName=idle currentFrameIndex=-1 facing=${facing}`);
            return;
        }

        console.log(`[WalkDebug] char=${charId} moving=${moving} state=${renderState} renderState=${renderState} currentAnim=${renderState} currentFrameName=N/A currentFrameIndex=-1 facing=${facing} walk disabled`);
    }

    static drawImageWithFootAnchor(ctx, img, x, screenY, targetHeight) {
        const scale = targetHeight / img.naturalHeight;
        const drawWidth = img.naturalWidth * scale;
        const drawHeight = targetHeight;
        ctx.drawImage(img, x - drawWidth / 2, screenY - drawHeight, drawWidth, drawHeight);
        return { drawWidth, drawHeight };
    }

    static getTargetHeight(charId) {
        return this.playableCharIds.has(charId) ? this.playerTargetHeight : 140;
    }

    static draw(
        ctx,
        x,
        y,
        facing,
        state,
        config,
        animFrame,
        attackProgress,
        comboCount,
        flashWhite,
        jumpY,
        skillType,
        weaponType,
        animStateMachine,
        charId
    ) {
        if (!charId) {
            charId = (config && config.id) || (config && config.charType);
        }
        if (!charId) {
            console.warn('[CharSpriteError] draw called without charId');
        }

        const screenY = y - jumpY;
        const isChifeng = charId === 'chifeng';
        const renderState = state;
        const isWalkState = renderState === 'walk';
        const tracker = this.getStateTracker(charId);

        ctx.save();

        if (jumpY > 0) {
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.beginPath();
            ctx.ellipse(x, y + 2, 18, 5, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        if (facing === -1) {
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }
        if (flashWhite) ctx.globalAlpha = 0.8;

        if (isChifeng && !isWalkState) {
            this.setTrackerState(charId, renderState, renderState === 'idle' ? 'idle' : 'N/A', renderState === 'idle' ? 0 : -1, animFrame);
            this.logWalkDebug(charId, false, renderState, tracker.currentFrameName, tracker.currentFrameIndex, facing);
        }

        const useGeneratedSpriteSheet = animStateMachine &&
            animStateMachine.useSpriteRenderer &&
            !this.playableCharIds.has(charId);

        if (useGeneratedSpriteSheet) {
            try {
                const frame = animStateMachine.getCurrentFrame();
                if (frame && frame.naturalWidth > 0) {
                    const frameSize = frame.width;
                    ctx.drawImage(frame, x - frameSize / 2, screenY - frameSize + 20);
                    if (weaponType && renderState !== 'dead') {
                        this.drawWeaponOverlay(ctx, weaponType, x + 18, screenY - 28, 0, 1.8);
                    }
                    ctx.restore();
                    return true;
                }
            } catch (error) {
                console.warn('[SpriteCR] animStateMachine render failed:', error.message);
            }
        }

        const frameKey = this.getFrameKey(renderState);
        const stateFrames = frameKey ? (this.frameImages[charId] && this.frameImages[charId][frameKey]) : null;
        const skillPoseImg = this.skillPoseImages[charId];

        if (charId === 'chifeng' && renderState === 'skill' && skillType === 'laser_eye' && skillPoseImg && skillPoseImg.complete && skillPoseImg.naturalWidth > 0) {
            const poseName = skillPoseImg.src.split('/').pop().split('?')[0] || 'skill_pose.png';
            this.setTrackerState(charId, 'skill', poseName, -1, animFrame);
            this.drawImageWithFootAnchor(ctx, skillPoseImg, x, screenY, this.getTargetHeight(charId));
            ctx.restore();
            return true;
        }

        if (isChifeng && isWalkState) {
            const walkFrames = this.frameImages.chifeng && this.frameImages.chifeng.walk;
            if (walkFrames && walkFrames.length === 4 && walkFrames.every(img => img && img.complete && img.naturalWidth > 0)) {
                if (tracker.state !== 'walk') {
                    tracker.state = 'walk';
                    tracker.animFrameWhenStateStart = animFrame;
                    tracker.stateStartTimeMs = performance.now();
                }

                const elapsedMs = Math.max(0, performance.now() - tracker.stateStartTimeMs);
                const frameIndex = Math.floor(elapsedMs / this.walkFrameDurationMs) % walkFrames.length;
                const frameImg = walkFrames[frameIndex];
                const frameName = frameImg.src.split('/').pop().split('?')[0] || `walk_${String(frameIndex + 1).padStart(2, '0')}.png`;
                this.setTrackerState(charId, 'walk', frameName, frameIndex, animFrame);
                this.logWalkDebug(charId, true, 'walk', frameName, frameIndex, facing);

                this.drawImageWithFootAnchor(ctx, frameImg, x, screenY, this.getTargetHeight(charId));
                if (weaponType) {
                    this.drawWeaponOverlay(ctx, weaponType, x + 20, screenY - 35, 0, 2.0);
                }
                ctx.restore();
                return true;
            }

            this.setTrackerState(charId, 'idle', 'idle-fallback', -1, animFrame);
            this.logWalkDebug(charId, true, 'idle', 'idle-fallback', -1, facing);
        }

        if (isChifeng && stateFrames && stateFrames.length > 0 && stateFrames[0] && stateFrames[0].complete && stateFrames[0].naturalWidth > 0) {
            const frameImg = stateFrames[0];
            const frameName = frameImg.src.split('/').pop().split('?')[0] || 'N/A';
            this.setTrackerState(charId, renderState, frameName, 0, animFrame);
            this.drawImageWithFootAnchor(ctx, frameImg, x, screenY, this.getTargetHeight(charId));
            if (weaponType && renderState !== 'dead' && renderState !== 'hurt') {
                this.drawWeaponOverlay(ctx, weaponType, x + 20, screenY - 35, 0, 2.0);
            }
            ctx.restore();
            return true;
        }

        if (!this.playableCharIds.has(charId) && stateFrames && stateFrames.length > 0) {
            if (tracker.state !== renderState) {
                tracker.state = renderState;
                tracker.animFrameWhenStateStart = animFrame;
                tracker.stateStartTimeMs = performance.now();
            }

            const localAnimFrame = animFrame - tracker.animFrameWhenStateStart;
            const frameStep = frameKey === 'idle' ? 6 : (frameKey === 'walk' ? 10 : 14);
            const frameIndex = Math.floor(localAnimFrame / frameStep) % stateFrames.length;
            const frameImg = stateFrames[frameIndex];

            if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
                const frameName = frameImg.src.split('/').pop().split('?')[0] || 'N/A';
                this.setTrackerState(charId, renderState, frameName, frameIndex, animFrame);
                this.drawImageWithFootAnchor(ctx, frameImg, x, screenY, this.getTargetHeight(charId));
                if (weaponType && renderState !== 'dead') {
                    this.drawWeaponOverlay(ctx, weaponType, x + 20, screenY - 35, 0, 2.0);
                }
                ctx.restore();
                return true;
            }
        }

        const idleImg = this.idleImages[charId];
        if (idleImg && idleImg.complete && idleImg.naturalWidth > 0) {
            const targetHeight = this.getTargetHeight(charId);
            let offsetX = 0;
            let offsetY = 0;
            let rotation = 0;
            let alpha = 1;

            switch (renderState) {
                case 'walk':
                    offsetX = Math.sin(animFrame * 0.5) * 3;
                    offsetY = Math.abs(Math.sin(animFrame * 0.5)) * 2;
                    break;
                case 'attack': {
                    const attackOffset = Math.sin(attackProgress * Math.PI);
                    offsetX = attackOffset * 10;
                    rotation = attackOffset * 0.08;
                    break;
                }
                case 'heavy': {
                    const heavyOffset = Math.min(attackProgress * 2, 1);
                    offsetX = heavyOffset > 0.5 ? heavyOffset * 12 : -heavyOffset * 5;
                    offsetY = heavyOffset > 0.5 ? heavyOffset * 4 : 0;
                    break;
                }
                case 'skill': {
                    const skillOffset = Math.sin(attackProgress * Math.PI);
                    offsetX = skillOffset * 15;
                    rotation = skillOffset * 0.12;
                    break;
                }
                case 'hurt':
                    offsetX = -6;
                    rotation = -0.05;
                    if (Math.floor(animFrame / 3) % 2 === 0) alpha = 0.4;
                    break;
                case 'jump':
                    offsetY = -Math.min(jumpY, 30) * 0.25;
                    break;
                case 'dead':
                    rotation = 1.2;
                    ctx.globalAlpha *= 0.5;
                    break;
            }

            const staticFrameName = idleImg.src.split('/').pop().split('?')[0] || 'idle.png';
            this.setTrackerState(charId, renderState === 'walk' && isChifeng ? 'idle' : renderState, staticFrameName, -1, animFrame);

            ctx.save();
            ctx.translate(x + offsetX, screenY + offsetY);
            ctx.rotate(rotation);
            ctx.globalAlpha *= alpha;
            const scale = targetHeight / idleImg.naturalHeight;
            const drawWidth = idleImg.naturalWidth * scale;
            ctx.drawImage(idleImg, -drawWidth / 2, -targetHeight, drawWidth, targetHeight);
            ctx.restore();

            if (weaponType && renderState !== 'dead') {
                this.drawWeaponOverlay(ctx, weaponType, x + offsetX + 20, screenY + offsetY - 35, 0, charId === 'tiekui' ? 2.2 : 2.0);
            }

            ctx.restore();
            return true;
        }

        ctx.restore();
        return false;
    }

    static drawWeaponOverlay(ctx, type, handX, handY, swingAngle, scale) {
        ctx.save();
        ctx.translate(handX, handY);
        ctx.rotate(swingAngle || 0);
        ctx.scale(scale, scale);
        switch (type) {
            case 'stick':
                ctx.fillStyle = '#8B6914';
                ctx.fillRect(-3, -28, 6, 36);
                ctx.fillStyle = '#A0781E';
                ctx.fillRect(-2, -28, 4, 5);
                ctx.strokeStyle = '#5B3900';
                ctx.lineWidth = 1;
                ctx.strokeRect(-3, -28, 6, 36);
                break;
            case 'pipe':
                ctx.fillStyle = '#8899AA';
                ctx.fillRect(-4, -32, 8, 40);
                ctx.fillStyle = '#AABBCC';
                ctx.fillRect(-2, -32, 4, 40);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1;
                ctx.strokeRect(-4, -32, 8, 40);
                break;
            case 'bottle':
                ctx.fillStyle = '#44AA55';
                ctx.fillRect(-5, -18, 10, 20);
                ctx.fillStyle = '#55BB66';
                ctx.fillRect(-3, -26, 6, 9);
                ctx.strokeStyle = '#227733';
                ctx.lineWidth = 1;
                ctx.strokeRect(-5, -18, 10, 20);
                break;
            case 'hammer':
                ctx.fillStyle = '#7B5B2A';
                ctx.fillRect(-3, -10, 6, 30);
                ctx.fillStyle = '#667788';
                ctx.fillRect(-10, -22, 20, 14);
                ctx.strokeStyle = '#445566';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(-10, -22, 20, 14);
                break;
        }
        ctx.restore();
    }

    static drawPreview(ctx, x, y, charType, animFrame, selected, animStateMachine, charConfig) {
        const charId = (charConfig && charConfig.id) || charType;
        const idleImg = this.idleImages[charId];
        if (idleImg && idleImg.complete && idleImg.naturalWidth > 0) {
            const scale = Math.min(200 / idleImg.naturalWidth, 280 / idleImg.naturalHeight);
            const width = idleImg.naturalWidth * scale;
            const height = idleImg.naturalHeight * scale;
            ctx.save();
            ctx.translate(x, y);
            const breathe = 1 + Math.sin(animFrame * 0.06) * 0.02;
            ctx.scale(breathe, breathe);
            if (selected) {
                ctx.shadowColor = '#ff8844';
                ctx.shadowBlur = 20;
            }
            ctx.drawImage(idleImg, -width / 2, -height + 10, width, height);
            ctx.restore();
            return true;
        }

        const idleFrames = this.frameImages[charId] && this.frameImages[charId].idle;
        if (idleFrames && idleFrames.length > 0) {
            const frameImg = idleFrames[Math.floor(animFrame / 6) % idleFrames.length];
            if (frameImg && frameImg.complete && frameImg.naturalWidth > 0) {
                const scale = Math.min(200 / frameImg.naturalWidth, 280 / frameImg.naturalHeight);
                const width = frameImg.naturalWidth * scale;
                const height = frameImg.naturalHeight * scale;
                ctx.save();
                ctx.translate(x, y);
                if (selected) {
                    ctx.shadowColor = '#ff8844';
                    ctx.shadowBlur = 20;
                }
                ctx.drawImage(frameImg, -width / 2, -height + 10, width, height);
                ctx.restore();
                return true;
            }
        }

        if (animStateMachine && animStateMachine.useSpriteRenderer) {
            try {
                const frame = animStateMachine.getCurrentFrame();
                if (frame && frame.naturalWidth > 0) {
                    const scale = 1.8;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.scale(scale, scale);
                    ctx.drawImage(frame, -frame.width / 2, -frame.width + 20);
                    ctx.restore();
                    return true;
                }
            } catch (error) {
                console.warn('[SpriteCR] drawPreview fallback failed:', error.message);
            }
        }

        return false;
    }
}
