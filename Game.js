/**
 * Game.js - 游戏主模块
 * 状态：menu / characterSelect / playing / paused / settings / levelClear / victory / defeat
 */
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.input = new Input();
        this.camera = new Camera(canvas);
        this.state = 'menu';
        this.levelManager = new LevelManager();
        this.mapWidth = 1280;
        this.battleYMin = 380;
        this.battleYMax = 640;
        this.battleYCenter = 510;
        this.player = null;
        this.enemies = [];
        this.waveManager = new WaveManager();
        this.waveSpawned = false;
        this.effects = new Effects();
        this.audio = new AudioManager();
        this.bossManager = new BossManager();
        this.weaponManager = new WeaponManager();
        this.atmosphere = new Atmosphere();
        this.transition = new Transition();
        this.lowFX = false;
        this.props = [];
        this.items = [];
        this.bgElements = [];
        this.startButton = null;
        this.restartButton = null;
        this.nextLevelButton = null;
        this.menuButton = null;
        this.frameCount = 0;
        this.totalCombo = 0;
        this.totalComboTimer = 0;
        this.score = 0;
        this.defeatHandled = false;
        this.levelClearHandled = false;
        this.victoryHandled = false;
        this.debugMode = false;
        this.walkAreaDebug = false;
        this.pauseButtons = [];
        this.settingsButtons = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.levelTitleTimer = 0;
        this.levelTitleDuration = 120;
        // 角色选择
        this.selectedCharIndex = 0;
        this.charList = CharacterConfig.getAll();
        this.charCards = [];
        // 菜单封面图（兼容旧版）
        this.menuCoverImage = null;
        this.menuCoverLoaded = false;
        // 菜单背景图（新版）
        this.menuBgImage = null;
        this.menuBgLoaded = false;
        // 菜单动画计时器
        this.menuAnimTimer = 0;
        // 角色立绘图片缓存
        this.charSpriteImages = {};
        // 角色多帧动作图片缓存 { charId: { state: [Image, ...] } }
        this.charSpriteFrameImages = {};
        this.chifengLaserPoseImage = null;
        this.laserBeamImage = null;
    }

    get currentLevel() { return this.levelManager.currentLevel; }

    /** 获取当前关卡配置 */
    getLevelConfig() { return this.levelManager.getCurrentConfig(); }

    initLevel(level) {
        this.levelManager.currentLevel = level;
        const config = this.getLevelConfig();
        this.mapWidth = config.mapWidth;
        this.battleYMin = config.battleYMin;
        this.battleYMax = config.battleYMax;
        this.battleYCenter = (this.battleYMin + this.battleYMax) / 2;

        // 进入 ready 状态（不是 loading！让 gameLoop 能调用 update）
        this.state = 'ready';
        this.effects.clear();
        this.effects.shakeIntensity = 0; this.effects.shakeTimer = 0; this.effects.flashAlpha = 0;
        this.totalCombo = 0; this.totalComboTimer = 0;
        this.defeatHandled = false; this.levelClearHandled = false; this.victoryHandled = false;
        // 保留上一关武器
        const savedWeapon = this.player ? this.player.weapon : null;
        if (savedWeapon) savedWeapon.onGround = false;
        this.player = new Player(200, this.battleYCenter, this.charList[this.selectedCharIndex]);
        if (savedWeapon) this.player.weapon = savedWeapon;
        this.enemies = []; this.items = [];
        this.waveManager.initLevel(level);
        this.waveSpawned = false;
        this.bossManager.reset();
        this.weaponManager.initLevel(level, this.mapWidth, this.battleYMin, this.battleYMax);
        this.atmosphere.setLowFX(this.lowFX);
        this.atmosphere.initLevel(level, this.mapWidth, this.battleYMin, this.battleYMax);
        this.transition.clear();
        this.transition.shakeCallback = (intensity, duration) => this.effects.shake(intensity, duration);
        this.generateProps();
        this.bgElements = config.generateBgElements(this.mapWidth, this.battleYMin, this.battleYMax);
        this.audio.init();
        this.audio.startBattleBGM();
        this.transition.startLevelTransition(`第${level}关`, config.name);
        this.levelTitleTimer = this.levelTitleDuration;

        // 设置 ready 倒计时
        this.readyTimer = 90; // 1.5秒 ready，给玩家准备时间
        this.playerControlEnabled = true;
        this.enemyAIEnabled = false;
        this.player.controlEnabled = true;

        console.log(`[Game] initLevel(${level}) done, state=ready, readyTimer=${this.readyTimer}, playerControlEnabled=${this.playerControlEnabled}`);
    }

    returnToMenu() {
        if (this.player) this.player.clearSkillState();
        this.state = 'menu';
        this.audio.stopBGM();
        this.effects.clear(); this.effects.shakeIntensity = 0; this.effects.shakeTimer = 0; this.effects.flashAlpha = 0;
        this.player = null; this.enemies = []; this.items = []; this.props = [];
        this.weaponManager.clear();
        this.bossManager.reset();
        this.atmosphere.clear();
        this.transition.clear();
        this.waveManager.initLevel(1); this.waveSpawned = false;
        this.levelManager.reset();
        this.defeatHandled = false; this.levelClearHandled = false; this.victoryHandled = false;
        this.audio.startMenuBGM();
    }

    /** 进入下一关 */
    goToNextLevel() {
        const nextLvl = this.currentLevel + 1;
        // 恢复部分 HP/EP
        if (this.player) {
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 40);
            this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + 50);
        }
        // 保留分数
        const savedScore = this.score;
        const savedKills = this.levelManager.totalEnemiesKilled;
        this.levelManager.nextLevel();
        this.initLevel(nextLvl);
        this.score = savedScore;
        this.levelManager.totalEnemiesKilled = savedKills;
    }

    spawnWave() {
        if (this.waveSpawned) return;
        this.waveSpawned = true;
        const newEnemies = this.waveManager.spawnCurrentWave(
            this.player.x, this.camera.x, this.camera.logicalWidth,
            this.battleYCenter, this.battleYMin, this.battleYMax, this.mapWidth
        );
        newEnemies.forEach(e => { e.yMin = this.battleYMin; e.yMax = this.battleYMax; });
        this.enemies.push(...newEnemies);
    }

    generateProps() {
        this.props = [];
        const config = this.getLevelConfig();
        const pc = config.props;
        const walkArea = config.walkArea;

        // 第1关减少箱子数量保证稳定
        let crateCount = pc.crateCount;
        let trashcanCount = pc.trashcanCount;
        if (this.currentLevel === 1) {
            crateCount = Math.min(crateCount, 5);
            trashcanCount = Math.min(trashcanCount, 3);
        }

        // 安全区域：玩家出生点和敌人出生点附近不生成
        const playerSpawnZone = { x: 200, y: this.battleYCenter, radius: 80 };
        const enemySpawnZone = { x: Math.min(this.mapWidth - 100, 600), y: this.battleYCenter, radius: 100 };

        // 已放置的道具列表（用于避让检测）
        const placedProps = [];

        // 检查区域是否空闲
        const isAreaFree = (x, y, w, h) => {
            // 检查是否在 walkArea 内
            if (walkArea) {
                if (x - w / 2 < walkArea.xMin || x + w / 2 > walkArea.xMax) return false;
                if (y - h < walkArea.yMin || y > walkArea.yMax) return false;
            }
            // 检查玩家出生安全区
            const pdist = Math.sqrt((x - playerSpawnZone.x) ** 2 + (y - playerSpawnZone.y) ** 2);
            if (pdist < playerSpawnZone.radius) return false;
            // 检查敌人出生安全区
            const edist = Math.sqrt((x - enemySpawnZone.x) ** 2 + (y - enemySpawnZone.y) ** 2);
            if (edist < enemySpawnZone.radius) return false;
            // 检查和已有道具 AABB 重叠
            for (const p of placedProps) {
                if (Math.abs(x - p.x) < (w + p.width) / 2 + 4 &&
                    Math.abs(y - p.y) < (h + p.height) / 2 + 4) {
                    return false;
                }
            }
            return true;
        };

        // 生成箱子
        for (let i = 0; i < crateCount; i++) {
            let placed = false;
            for (let attempt = 0; attempt < 50; attempt++) {
                const x = walkArea ? walkArea.xMin + 30 + Math.random() * ((walkArea.xMax - walkArea.xMin) - 60) : 300 + Math.random() * (this.mapWidth - 600);
                const y = this.battleYMin + 20 + Math.random() * (this.battleYMax - this.battleYMin - 40);
                if (isAreaFree(x, y, 24, 24)) {
                    const prop = new Prop(x, y, 'crate');
                    this.props.push(prop);
                    placedProps.push({ x, y, width: 24, height: 24 });
                    placed = true;
                    break;
                }
            }
            if (!placed) console.log(`[Props] 箱子 ${i + 1} 放置失败（50次尝试均重叠），跳过`);
        }

        // 生成垃圾桶
        for (let i = 0; i < trashcanCount; i++) {
            let placed = false;
            for (let attempt = 0; attempt < 50; attempt++) {
                const x = walkArea ? walkArea.xMin + 30 + Math.random() * ((walkArea.xMax - walkArea.xMin) - 60) : 250 + Math.random() * (this.mapWidth - 500);
                const y = this.battleYMin + 15 + Math.random() * (this.battleYMax - this.battleYMin - 30);
                if (isAreaFree(x, y, 18, 26)) {
                    const prop = new Prop(x, y, 'trashcan');
                    this.props.push(prop);
                    placedProps.push({ x, y, width: 18, height: 26 });
                    placed = true;
                    break;
                }
            }
            if (!placed) console.log(`[Props] 垃圾桶 ${i + 1} 放置失败（50次尝试均重叠），跳过`);
        }

        console.log(`[Props] 生成完成：${this.props.length} 个道具（箱${crateCount}/桶${trashcanCount}）`);
    }

    gameLoop() {
        this.frameCount++;
        this.effects.update();

        // === 状态流转：ready → playing ===
        if (this.state === 'ready') {
            // ready 阶段：玩家可以移动，敌人不更新
            const config = this.getLevelConfig();
            const walkArea = config.walkArea;
            this.player.update(this.input, this.mapWidth, this.battleYMin, this.battleYMax, walkArea);
            this.camera.follow(this.player.x, this.mapWidth);
            this.props.forEach(p => { p.update(); if (walkArea) GameUtils.clampToWalkArea(p, walkArea); });
            this.items.forEach(item => { item.update(); if (walkArea) GameUtils.clampToWalkArea(item, walkArea); });
            this.atmosphere.update(this.mapWidth, this.battleYMin, this.battleYMax);
            this.transition.update();
            this.handleWeaponInput();
            this.updatePlayerLaserSkill();
            // ready 倒计时
            if (this.readyTimer > 0) {
                this.readyTimer--;
                if (this.readyTimer <= 0) {
                    // ready 结束 → 进入 playing，生成敌人
                    this.state = 'playing';
                    this.enemyAIEnabled = true;
                    console.log(`[Game] ready→playing, enemyAIEnabled=true, about to spawn wave`);
                }
            }
        } else if (this.state === 'playing') {
            this.update();
            this.waveManager.update();
            this.bossManager.update();
        }

        // 关卡标题倒计时
        if (this.levelTitleTimer > 0) this.levelTitleTimer--;
        // ESC
        if (this.input.isJustPressed('Escape')) {
            if (this.state === 'playing') { this.state = 'paused'; this.audio.pauseBGM(); }
            else if (this.state === 'paused') { this.state = 'playing'; this.audio.resumeBGM(); }
            else if (this.state === 'settings') { this.state = 'paused'; }
            else if (this.state === 'characterSelect') { this.state = 'menu'; this.audio.startMenuBGM(); }
        }
        if (this.player && this.state !== 'playing' && this.state !== 'ready' && this.player.isLaserCasting) {
            this.player.endLaserCast(false);
        }
        // 角色选择界面操作
        if (this.state === 'characterSelect') {
            if (this.input.isJustPressed('KeyA') || this.input.isJustPressed('ArrowLeft')) {
                this.selectedCharIndex = (this.selectedCharIndex - 1 + this.charList.length) % this.charList.length;
            }
            if (this.input.isJustPressed('KeyD') || this.input.isJustPressed('ArrowRight')) {
                this.selectedCharIndex = (this.selectedCharIndex + 1) % this.charList.length;
            }
            if (this.input.isJustPressed('Enter')) {
                this.startGameWithSelectedChar();
            }
        }
        // 调试快捷键
        if (this.input.isJustPressed('F3')) this.debugMode = !this.debugMode;
        if (this.input.isJustPressed('F11')) this.walkAreaDebug = !this.walkAreaDebug;
        if (this.input.isJustPressed('F4')) this.toggleSpriteRenderer();
        if (this.input.isJustPressed('F9') && this.state === 'playing') this.skipToBoss();
        if (this.input.isJustPressed('F8') && this.state === 'playing') this.skipToNextLevel();
        if (this.input.isJustPressed('F6') && this.state === 'playing') this.debugSpawnWeapon();
        if (this.input.isJustPressed('F10') && this.state === 'playing') this.debugCycleWeapon();
        if (this.input.isJustPressed('F7')) { this.lowFX = !this.lowFX; this.atmosphere.setLowFX(this.lowFX); }
        if (this.input.isJustPressed('KeyM')) this.audio.toggleMute();
        // Enter 键开始游戏（菜单状态）
        if (this.state === 'menu' && this.input.isJustPressed('Enter')) {
            this.state = 'characterSelect';
            this.audio.stopBGM();
        }

        // F12：强制修复当前关卡测试状态
        if (this.input.isJustPressed('F12')) this.debugForceFix();
        this.render();
        this.input.update();
        requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        // 敌人生成（正常流程）
        if (!this.waveSpawned && !this.waveManager.allCleared) this.spawnWave();

        // === 安全兜底：如果 playing 状态下没有敌人且波次未完成，强制生成 ===
        if (this.state === 'playing' && this.enemies.length === 0 && !this.waveManager.allCleared && !this.bossManager.bossActive) {
            console.warn(`[Game] 安全兜底触发：playing 状态无敌人，波次未完成，强制重新生成！waveIndex=${this.waveManager.currentWaveIndex}`);
            this.waveSpawned = false;
            this.spawnWave();
            if (this.enemies.length === 0) {
                console.error(`[Game] spawnWave 仍然没有生成敌人！尝试直接创建...`);
                // 终极兜底：直接创建敌人
                const fallbackEnemies = this.waveManager.spawnCurrentWave(
                    this.player.x, this.camera.x, this.camera.logicalWidth,
                    this.battleYCenter, this.battleYMin, this.battleYMax, this.mapWidth
                );
                if (fallbackEnemies.length > 0) {
                    fallbackEnemies.forEach(e => { e.yMin = this.battleYMin; e.yMax = this.battleYMax; });
                    this.enemies.push(...fallbackEnemies);
                    this.waveSpawned = true;
                    console.log(`[Game] 兜底成功：生成了 ${fallbackEnemies.length} 个敌人`);
                }
            }
        }

        const config = this.getLevelConfig();
        const walkArea = config.walkArea;
        this.player.update(this.input, this.mapWidth, this.battleYMin, this.battleYMax, walkArea);
        this.enemies.forEach(e => e.update(this.player, walkArea));
        if (this.bossManager.boss && this.bossManager.boss.alive) this.bossManager.boss.update(this.player, walkArea);
        this.updatePlayerLaserSkill();
        this.checkPlayerAttack(); this.checkPlayerAttackProps(); this.checkPlayerAttackBoss();
        this.checkEnemyAttack(); this.checkBossAttack();
        this.camera.follow(this.player.x, this.mapWidth);
        this.props.forEach(p => { p.update(); if (walkArea) GameUtils.clampToWalkArea(p, walkArea); });
        this.items.forEach(item => { item.update(); if (walkArea) GameUtils.clampToWalkArea(item, walkArea); });
        this.weaponManager.update();
        this.atmosphere.update(this.mapWidth, this.battleYMin, this.battleYMax);
        this.transition.update();
        this.checkPickups();
        this.handleWeaponInput();
        this.checkWeaponDurability();
        this.checkPlayerDeathDrop();
        if (this.totalComboTimer > 0) { this.totalComboTimer--; if (this.totalComboTimer <= 0) this.totalCombo = 0; }
        this.cleanupDeadEnemies(); this.recallOffscreenEnemies();
        this.checkWaveProgress(); this.checkGameResult();
        // 跳跃状态下越过敌人
        this.handleJumpOverEnemies();
        // 攻击名额：更新当前持有者（如果当前持有者不在攻击状态则释放）
        if (this.currentEnemyAttacker && !this.currentEnemyAttacker.isAttacking) {
            this.currentEnemyAttacker = null;
        }
    }

    // 跳跃状态下越过敌人
    handleJumpOverEnemies() {
        if (this.player.jumpHeight <= 15) return;
        this.enemies.forEach(enemy => {
            if (!enemy.alive || enemy.state === 'dead') return;
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 30) {
                // 跳跃时轻微推开，避免卡死
                const pushDir = dx > 0 ? 1 : -1;
                this.player.x += pushDir * 2;
                const config = this.getLevelConfig();
                if (config.walkArea) GameUtils.clampToWalkArea(this.player, config.walkArea);
            }
        });
    }

    updatePlayerLaserSkill() {
        const p = this.player;
        if (!p || !p.isLaserCharacter || !p.isLaserCasting || !p.laserSkillActive) return;

        const now = performance.now();
        if (p.laserLastUpdateAt > 0) {
            const deltaSeconds = Math.max(0, (now - p.laserLastUpdateAt) / 1000);
            const drain = (p.config.laserEnergyCostPerSecond || 0) * deltaSeconds;
            if (drain > 0) {
                p.energy = Math.max(0, p.energy - drain);
                if (p.energy <= 0) {
                    p.endLaserCast(false);
                    return;
                }
            }
        }
        p.laserLastUpdateAt = now;

        if ((p.config.laserMaxDuration || 0) > 0 && now - p.laserStartTime >= p.config.laserMaxDuration) {
            p.endLaserCast();
            return;
        }

        const targetData = this.findPlayerLaserTarget();
        p.laserOrigin = this.getPlayerLaserOrigin(p);
        p.laserTarget = targetData ? targetData.entity : null;
        p.laserTargetId = targetData ? targetData.id : null;
        p.laserHasTarget = !!targetData;

        if (targetData) {
            p.laserEnd = this.getLaserTargetPoint(targetData.entity);
            p.laserDistance = Math.hypot(p.laserEnd.x - p.laserOrigin.x, p.laserEnd.y - p.laserOrigin.y);
            if (targetData.entity.x !== p.x) {
                p.facing = targetData.entity.x > p.x ? 1 : -1;
            }
            const tickInterval = p.config.laserTickInterval || 120;
            const elapsed = p.laserLastDamageAt > 0 ? now - p.laserLastDamageAt : Infinity;
            p.laserDamageCooldown = elapsed === Infinity ? 0 : Math.max(0, tickInterval - elapsed);
            if (elapsed >= tickInterval) {
                this.applyPlayerLaserDamage(targetData);
                p.laserLastDamageAt = now;
                p.laserDamageCooldown = 0;
            }
        } else {
            const preheatLength = p.config.laserPreheatLength || 72;
            p.laserEnd = {
                x: p.laserOrigin.x + p.facing * preheatLength,
                y: p.laserOrigin.y
            };
            p.laserDistance = preheatLength;
            p.laserDamageCooldown = 0;
        }
    }

    findPlayerLaserTarget() {
        const p = this.player;
        if (!p || !p.isLaserCharacter) return null;

        const candidates = [];
        this.enemies.forEach(enemy => {
            if (!enemy.alive || enemy.state === 'dead') return;
            const dx = enemy.x - p.x;
            const absY = Math.abs(enemy.y - p.y);
            const distance = Math.hypot(dx, absY);
            if (p.facing === 1 && dx < 0) return;
            if (p.facing === -1 && dx > 0) return;
            if (distance > (p.config.laserRange || 520)) return;
            candidates.push({
                entity: enemy,
                id: `enemy-${enemy.type}-${Math.floor(enemy.x)}-${Math.floor(enemy.y)}`,
                dx: Math.abs(dx),
                dy: absY,
                distance,
                isBoss: false
            });
        });

        const boss = this.bossManager.boss;
        if (this.bossManager.bossActive && boss && boss.alive && boss.state !== 'dead') {
            const dx = boss.x - p.x;
            const absY = Math.abs(boss.y - p.y);
            const distance = Math.hypot(dx, absY);
            if (!((p.facing === 1 && dx < 0) || (p.facing === -1 && dx > 0))) {
                if (distance <= (p.config.laserRange || 520)) {
                    candidates.push({
                        entity: boss,
                        id: `boss-${boss.name}`,
                        dx: Math.abs(dx),
                        dy: absY,
                        distance,
                        isBoss: true
                    });
                }
            }
        }

        candidates.sort((a, b) => (a.distance - b.distance) || (a.dx - b.dx) || (a.dy - b.dy));
        return candidates[0] || null;
    }

    getPlayerLaserOrigin(player) {
        const targetHeight = SpriteCharacterRenderer.getTargetHeight(player.config.id);
        const poseImage = this.chifengLaserPoseImage;
        const drawWidth = poseImage && poseImage.complete && poseImage.naturalWidth > 0
            ? poseImage.naturalWidth * (targetHeight / poseImage.naturalHeight)
            : targetHeight * 0.75;

        return {
            x: player.x + player.facing * drawWidth * 0.17,
            y: player.y - player.jumpHeight - targetHeight * 0.82
        };
    }

    getLaserTargetPoint(target) {
        return {
            x: target.x,
            y: target.y - (target.height || 60) * 0.58 - (target.jumpHeight || 0)
        };
    }

    applyPlayerLaserDamage(targetData) {
        const p = this.player;
        if (!p || !targetData || !targetData.entity) return;

        const target = targetData.entity;
        let damage = p.config.laserDamagePerTick || 6;
        const enemyKnockback = p.config.laserEnemyKnockback || 2.6;
        const bossKnockback = p.config.laserBossKnockback || 1.2;

        if (targetData.isBoss) {
            damage = Math.max(1, Math.round(damage * (p.config.laserBossDamageMultiplier || 0.5)));
            target.hp -= damage;
            target.flashWhiteTimer = Math.max(target.flashWhiteTimer || 0, 4);
            if (target.state !== 'dead') {
                target.state = 'hurt';
                target.hurtTimer = Math.max(target.hurtTimer || 0, 4);
                target.knockbackX = p.facing * bossKnockback;
                target.knockbackY = 0;
            }
            target.x += p.facing * bossKnockback;
            if (typeof target.clampPosition === 'function') target.clampPosition();
            else if (typeof target.clampY === 'function') target.clampY();
            if (target.hp <= 0) {
                target.hp = 0;
                target.state = 'dead';
                target.deathTimer = 0;
                this.audio.play('enemyDie');
                this.score += 500;
            }
        } else {
            target.takeDamage(damage, p.facing, enemyKnockback);
            if (target.state !== 'dead') {
                target.knockbackX = p.facing * enemyKnockback;
                target.knockbackY = 0;
            }
            if (target.hp <= 0) {
                this.audio.play('enemyDie');
                this.score += 100;
                this.levelManager.recordKill();
            }
        }

        this.effects.spawnHitParticles(target.x, target.y - target.height * 0.5, 'enemyHit');
        this.audio.play('hit');
    }

    renderPlayerLaser(ctx, cameraX) {
        const p = this.player;
        if (!p || !p.isLaserCasting || !p.laserSkillActive || !p.laserOrigin || !p.laserEnd) return;

        const originX = p.laserOrigin.x - cameraX;
        const originY = p.laserOrigin.y;
        const endX = p.laserEnd.x - cameraX;
        const endY = p.laserEnd.y;
        const dx = endX - originX;
        const dy = endY - originY;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);
        const beamThickness = p.laserHasTarget ? 26 : 18;

        ctx.save();
        ctx.translate(originX, originY);
        ctx.rotate(angle);
        if (this.laserBeamImage && this.laserBeamImage.complete && this.laserBeamImage.naturalWidth > 0) {
            ctx.globalAlpha = p.laserHasTarget ? 0.95 : 0.6;
            ctx.drawImage(
                this.laserBeamImage,
                0, 0, this.laserBeamImage.naturalWidth, this.laserBeamImage.naturalHeight,
                0, -beamThickness / 2, distance, beamThickness
            );
        } else {
            const gradient = ctx.createLinearGradient(0, 0, distance, 0);
            gradient.addColorStop(0, 'rgba(255,120,120,0.2)');
            gradient.addColorStop(0.25, 'rgba(255,255,255,0.95)');
            gradient.addColorStop(0.8, 'rgba(255,70,70,0.9)');
            gradient.addColorStop(1, 'rgba(255,40,40,0.15)');
            ctx.strokeStyle = gradient;
            ctx.lineWidth = beamThickness;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(distance, 0);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        const eyeGlow = ctx.createRadialGradient(originX, originY, 2, originX, originY, 18);
        eyeGlow.addColorStop(0, '#ffffff');
        eyeGlow.addColorStop(0.35, '#ff6666');
        eyeGlow.addColorStop(1, 'rgba(255,30,30,0)');
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.arc(originX, originY, 18, 0, Math.PI * 2);
        ctx.fill();

        if (p.laserHasTarget) {
            const impactGlow = ctx.createRadialGradient(endX, endY, 2, endX, endY, 20);
            impactGlow.addColorStop(0, '#ffffff');
            impactGlow.addColorStop(0.35, '#ff5555');
            impactGlow.addColorStop(1, 'rgba(255,20,20,0)');
            ctx.fillStyle = impactGlow;
            ctx.beginPath();
            ctx.arc(endX, endY, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    cleanupDeadEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (!this.enemies[i].alive && this.enemies[i].state !== 'dead') this.enemies.splice(i, 1);
        }
    }

    recallOffscreenEnemies() {
        const camLeft = this.camera.x - 100, camRight = this.camera.x + this.camera.logicalWidth + 100;
        this.enemies.forEach(e => {
            if (!e.alive || e.state === 'dead') return;
            if (e.x < camLeft || e.x > camRight) {
                e.x = Math.max(50, Math.min(this.player.x + (e.x < camLeft ? -200 : 200), this.mapWidth - 50));
                e.y = this.battleYMin + 20 + Math.random() * (this.battleYMax - this.battleYMin - 40);
            }
        });
    }

    checkPlayerAttack() {
        const attackBox = this.player.getAttackBox();
        if (!attackBox) return;

        const isMultiHit = this.player.isMultiHitSkill;
        if (!isMultiHit && this.player.attackHit) return;

        // 音效：普攻/重击只播一次，技能只播一次
        if (this.player.attackType === 'normal') this.audio.play('punch');
        else if (this.player.attackType === 'heavy') this.audio.play('heavy');
        else if (this.player.attackType === 'skill' && !this.player.skillSoundPlayed) {
            this.audio.play('skill');
            this.player.skillSoundPlayed = true;
        }

        // 角色专属技能命中粒子类型
        const skillParticleType = this.player.attackType === 'skill'
            ? ('skill' + this.player.config.charType.charAt(0).toUpperCase() + this.player.config.charType.slice(1))
            : this.player.attackType;

        this.enemies.forEach(enemy => {
            if (enemy.state === 'dead' || !enemy.alive) return;
            if (isMultiHit && this.player.skillHitEnemies.has(enemy)) return;
            
            // 使用统一的 canHit 判定
            const hit = GameUtils.canHit(this.player, enemy, attackBox, attackBox.yRange, true);
            
            if (hit) {
                const damage = this.player.getCurrentDamage(), knockbackForce = this.player.getCurrentKnockback();
                enemy.takeDamage(damage, this.player.facing, knockbackForce);
                if (isMultiHit) { this.player.skillHitEnemies.add(enemy); } else { this.player.attackHit = true; }
                this.player.advanceCombo();
                this.totalCombo++; this.totalComboTimer = 60;
                this.effects.spawnHitParticles(enemy.x, enemy.y - enemy.height / 2, skillParticleType);
                this.effects.spawnHitText(enemy.x, enemy.y - enemy.height, damage, this.player.attackType);
                this.audio.play('hit');
                if (this.totalCombo >= 3) this.effects.spawnComboText(this.player.x, this.player.y - this.player.height, this.totalCombo);
                if (this.player.attackType === 'skill') { this.effects.shake(8, 10); this.effects.flash(); }
                else if (this.player.attackType === 'heavy') this.effects.shake(5, 6);
                else if (this.player.comboCount === 2) this.effects.shake(4, 5);
                if (enemy.hp <= 0) { this.audio.play('enemyDie'); this.score += 100; this.levelManager.recordKill(); }
                // 武器耐久
                if (this.player.weapon && (this.player.attackType === 'normal' || this.player.attackType === 'heavy')) {
                    this.useWeaponDurability();
                }
            }
        });
    }

    checkPlayerAttackBoss() {
        if (!this.bossManager.boss || !this.bossManager.boss.alive) return;
        const boss = this.bossManager.boss;
        if (boss.state === 'dead' || boss.state === 'entrance') return;
        const attackBox = this.player.getAttackBox();
        if (!attackBox) return;

        const isMultiHit = this.player.isMultiHitSkill;
        if (!isMultiHit && this.player.attackHit) return;
        if (isMultiHit && this.player.skillHitEnemies.has(boss)) return;

        const skillParticleType = this.player.attackType === 'skill'
            ? ('skill' + this.player.config.charType.charAt(0).toUpperCase() + this.player.config.charType.slice(1))
            : this.player.attackType;

        // 使用统一的 canHit 判定
        const hit = GameUtils.canHit(this.player, boss, attackBox, attackBox.yRange, true);

        if (hit) {
            const damage = this.player.getCurrentDamage(), knockbackForce = this.player.getCurrentKnockback();
            boss.takeDamage(damage, this.player.facing, knockbackForce);
            if (isMultiHit) { this.player.skillHitEnemies.add(boss); } else { this.player.attackHit = true; }
            this.totalCombo++; this.totalComboTimer = 60;
            this.effects.spawnHitParticles(boss.x, boss.y - boss.height / 2, skillParticleType);
            this.effects.spawnHitText(boss.x, boss.y - boss.height, damage, this.player.attackType);
            this.audio.play('hit');
            if (this.totalCombo >= 3) this.effects.spawnComboText(this.player.x, this.player.y - this.player.height, this.totalCombo);
            if (this.player.attackType === 'skill') { this.effects.shake(8, 10); this.effects.flash(); }
            else if (this.player.attackType === 'heavy') this.effects.shake(5, 6);
            else if (this.player.comboCount === 2) this.effects.shake(4, 5);
            if (boss.hp <= 0) { this.audio.play('enemyDie'); this.score += 500; }
            // 武器耐久
            if (this.player.weapon && (this.player.attackType === 'normal' || this.player.attackType === 'heavy')) {
                this.useWeaponDurability();
            }
        }
    }

    checkPlayerAttackProps() {
        const attackBox = this.player.getAttackBox();
        if (!attackBox) return;

        const isMultiHit = this.player.isMultiHitSkill;
        if (!isMultiHit && this.player.attackHit) return;

        this.props.forEach(prop => {
            if (!prop.alive) return;
            if (isMultiHit && this.player.skillHitProps.has(prop)) return;
            const hit = GameUtils.canHit(this.player, prop, attackBox, attackBox.yRange, true);
            if (hit) {
                prop.takeDamage(this.player.getCurrentDamage());
                if (isMultiHit) { this.player.skillHitProps.add(prop); } else { this.player.attackHit = true; }
                this.audio.play('hit'); this.effects.spawnHitParticles(prop.x, prop.y - prop.height / 2, 'normal');
                if (!prop.alive) { this.effects.spawnPropDebris(prop.x, prop.y, prop.color); this.audio.play('propBreak'); this.score += 10; this.spawnItemFromProp(prop); }
            }
        });
    }

    spawnItemFromProp(prop) {
        const config = this.getLevelConfig();
        const rate = config.props.itemDropRate || 0.9;
        const weaponConfig = WeaponManager.getLevelConfig(this.currentLevel);
        const rand = Math.random();
        // 武器掉落概率
        if (rand < weaponConfig.propDropRate) {
            const type = Weapon.randomType(weaponConfig.weights);
            this.weaponManager.spawnWeapon(type, prop.x, prop.y);
            this.effects.spawnPickupText(prop.x, prop.y - 20, `掉落: ${Weapon.CONFIGS[type].name}`, Weapon.CONFIGS[type].color);
            return;
        }
        if (rand < 0.4 * rate + weaponConfig.propDropRate) this.items.push(new Item(prop.x, prop.y - 10, 'health'));
        else if (rand < 0.65 * rate + weaponConfig.propDropRate) this.items.push(new Item(prop.x, prop.y - 10, 'energy'));
        else if (rand < rate + weaponConfig.propDropRate) this.items.push(new Item(prop.x, prop.y - 10, 'coin'));
    }

    checkEnemyAttack() {
        if (this.player.state === 'dead') return;
        
        // 攻击名额机制：优先选择距离玩家最近的、已进入攻击状态且持有攻击名额的敌人
        let attacker = null;
        if (this.currentEnemyAttacker && this.currentEnemyAttacker.isAttacking && this.currentEnemyAttacker.alive) {
            attacker = this.currentEnemyAttacker;
        } else {
            // 当前持有者不在攻击中，选择距离最近且已进入攻击状态的敌人
            let closestDist = Infinity;
            this.enemies.forEach(e => {
                if (e.state === 'dead' || !e.alive) return;
                if (!e.isAttacking) return;
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < closestDist) { closestDist = dist; attacker = e; }
            });
            this.currentEnemyAttacker = attacker;
        }
        
        if (!attacker) return;
        const attackBox = attacker.getAttackBox();
        if (!attackBox || attacker.attackHit) return;
        
        const hit = GameUtils.canHit(attacker, this.player, attackBox, attacker.attackYRange, true);
        if (hit) {
            this.player.takeDamage(attacker.damage, attacker.facing);
            attacker.attackHit = true;
            // 命中后释放攻击名额
            this.currentEnemyAttacker = null;
            this.effects.spawnHitParticles(this.player.x, this.player.y - this.player.height / 2, 'enemyHit');
            this.effects.shake(3, 4);
            this.audio.play('hurt');
        }
    }

    checkBossAttack() {
        if (!this.bossManager.boss || !this.bossManager.bossActive) return;
        if (this.player.state === 'dead') return;
        const boss = this.bossManager.boss;
        if (boss.state === 'dead') return;
        const attackBox = boss.getAttackBox();
        if (!attackBox || boss.attackHit) return;
        const hit = GameUtils.canHit(boss, this.player, attackBox, attackBox.yRange, true);
        if (hit) {
            this.player.takeDamage(attackBox.damage, boss.facing); boss.attackHit = true;
            this.effects.spawnHitParticles(this.player.x, this.player.y - this.player.height / 2, 'enemyHit');
            this.effects.shake(5, 6); this.audio.play('hurt');
        }
    }

    checkPickups() {
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            if (item.checkPickup(this.player.x, this.player.y)) {
                if (item.type === 'health') this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
                else if (item.type === 'energy') this.player.energy = Math.min(this.player.maxEnergy, this.player.energy + item.value);
                else if (item.type === 'coin') this.score += item.value;
                this.effects.spawnPickupText(item.x, item.y, item.label, item.color);
                this.audio.play('pickup'); item.pickup(); this.items.splice(i, 1);
            }
        }
    }

    checkWaveProgress() {
        if (this.waveManager.allCleared) return;
        const aliveEnemies = this.enemies.filter(e => e.alive);
        if (aliveEnemies.length === 0 && this.waveSpawned) {
            const hasNext = this.waveManager.advanceWave();
            if (hasNext) {
                this.waveSpawned = false;
                setTimeout(() => { if (this.state === 'playing' && !this.bossManager.bossSpawned) this.spawnWave(); }, 800);
            } else {
                if (!this.bossManager.bossSpawned) {
                    const config = this.getLevelConfig();
                    this.bossManager.triggerBossEntrance(
                        this.player.x, this.camera.x, this.camera.logicalWidth,
                        this.battleYCenter, this.battleYMin, this.battleYMax, this.mapWidth,
                        config.boss
                    );
                }
            }
        }
    }

    /** 武器拾取/丢弃输入处理 */
    handleWeaponInput() {
        if (this.player.state === 'dead') return;
        // E - 拾取武器
        if (this.input.isJustPressed('KeyE')) {
            const nearby = this.weaponManager.findNearbyWeapon(this.player.x, this.player.y, 50);
            if (nearby) {
                const pickedUp = this.weaponManager.pickupWeapon(nearby);
                if (pickedUp) {
                    // 如果已有武器，先丢弃
                    if (this.player.weapon) {
                        const oldWeapon = this.player.weapon;
                        console.log(`[Weapon] dropped: ${oldWeapon.name} durability ${oldWeapon.durability}/${oldWeapon.maxDurability}`);
                        this.weaponManager.dropWeapon(oldWeapon, this.player.x + this.player.facing * 20, this.player.y, this.mapWidth);
                    }
                    this.player.weapon = pickedUp;
                    console.log(`[Weapon] picked up: ${pickedUp.name} ${pickedUp.durability}/${pickedUp.maxDurability}`);
                    console.log(`[Player] currentWeapon: ${pickedUp.type}`);
                    this.effects.spawnPickupText(this.player.x, this.player.y - this.player.height, `拾取: ${pickedUp.name}`, pickedUp.color);
                    this.audio.play('pickup');
                }
            }
        }
        // Q - 丢弃武器
        if (this.input.isJustPressed('KeyQ')) {
            if (this.player.weapon) {
                const dropped = this.player.weapon;
                console.log(`[Weapon] dropped: ${dropped.name} durability ${dropped.durability}/${dropped.maxDurability}`);
                console.log(`[Player] currentWeapon cleared`);
                this.weaponManager.dropWeapon(dropped, this.player.x + this.player.facing * 25, this.player.y, this.mapWidth);
                this.player.weapon = null;
                this.effects.spawnPickupText(this.player.x, this.player.y - this.player.height, `丢弃: ${dropped.name}`, '#ff8844');
            }
        }
    }

    /** 检查武器耐久 */
    checkWeaponDurability() {
        if (!this.player.weapon) return;
        // 武器耐久在命中时减少（见 checkPlayerAttack 等方法）
    }

    /** 武器命中后减少耐久，返回 true 表示武器损坏 */
    useWeaponDurability() {
        if (!this.player.weapon) return false;
        const broken = this.player.weapon.useDurability();
        if (broken) {
            const brokenWeapon = this.player.weapon;
            console.log(`[Weapon] broken: ${brokenWeapon.name}`);
            console.log(`[Player] currentWeapon cleared`);
            this.effects.spawnPickupText(this.player.x, this.player.y - this.player.height, `${this.player.weapon.name} 损坏!`, '#ff4444');
            // 武器碎裂特效
            this.effects.spawnHitParticles(this.player.x + this.player.facing * 20, this.player.y - 30, 'weaponBreak');
            this.player.weapon = null;
            return true;
        }
        return false;
    }

    /** 玩家死亡时掉落武器 */
    checkPlayerDeathDrop() {
        if (this.player.weaponDropOnDeath) {
            const dropped = this.player.weaponDropOnDeath;
            this.player.weaponDropOnDeath = null;
            this.weaponManager.dropWeapon(dropped, this.player.x, this.player.y, this.mapWidth);
        }
    }

    /** F6 调试：在玩家附近生成随机武器 */
    debugSpawnWeapon() {
        const config = WeaponManager.getLevelConfig(this.currentLevel);
        const type = Weapon.randomType(config.weights);
        const x = this.player.x + this.player.facing * 60;
        this.weaponManager.spawnWeapon(type, x, this.player.y);
    }

    /** F10 调试：循环切换测试武器（无→木棍→钢管→破瓶子→铁锤→无） */
    debugCycleWeapon() {
        if (!this.player) return;
        const weaponOrder = [null, 'stick', 'pipe', 'bottle', 'hammer'];
        let currentIndex = -1;
        const current = this.player.weapon ? this.player.weapon.type : null;
        for (let i = 0; i < weaponOrder.length; i++) {
            if (weaponOrder[i] === current) { currentIndex = i; break; }
        }
        const nextIndex = (currentIndex + 1) % weaponOrder.length;
        const nextType = weaponOrder[nextIndex];

        if (nextType) {
            // 创建测试武器对象
            const testWeapon = new Weapon(nextType, this.player.x, this.player.y);
            this.player.weapon = testWeapon;
            console.log(`[F10 Debug] set weapon: ${testWeapon.name} ${testWeapon.durability}/${testWeapon.maxDurability}`);
            console.log(`[Player] currentWeapon: ${testWeapon.type}`);
        } else {
            if (this.player.weapon) {
                console.log(`[F10 Debug] cleared weapon`);
            }
            this.player.weapon = null;
            console.log(`[Player] currentWeapon cleared`);
        }
    }

    /** F12：强制修复当前关卡测试状态 */
    debugForceFix() {
        console.log('=== F12 强制修复 ===');
        const beforeState = this.state;

        // 1. 确保有玩家
        if (!this.player || !this.player.alive) {
            this.player = new Player(200, this.battleYCenter, this.charList[this.selectedCharIndex]);
            console.log('[F12] 重新生成玩家');
        }

        // 2. 强制设置状态
        this.playerControlEnabled = true;
        this.player.controlEnabled = true;
        this.enemyAIEnabled = true;

        // 3. 强制进入 playing
        if (this.state !== 'playing') {
            this.state = 'playing';
            console.log(`[F12] state: ${beforeState} → playing`);
        }

        // 4. 如果没有敌人，强制生成
        if (this.enemies.length === 0 && !this.waveManager.allCleared && !this.bossManager.bossActive) {
            console.log(`[F12] 敌人为0，强制生成第${this.waveManager.getCurrentWaveNumber()}波`);
            this.waveSpawned = false;
            this.spawnWave();
            if (this.enemies.length === 0) {
                // 终极兜底
                const fb = this.waveManager.spawnCurrentWave(
                    this.player.x, this.camera.x, this.camera.logicalWidth,
                    this.battleYCenter, this.battleYMin, this.battleYMax, this.mapWidth
                );
                fb.forEach(e => { e.yMin = this.battleYMin; e.yMax = this.battleYMax; });
                this.enemies.push(...fb);
                this.waveSpawned = true;
            }
        }

        // 5. 清理重叠箱子（简单方式：重置位置）
        this.fixOverlappingProps();

        // 6. 输出当前状态
        console.log(`[F12] 修复完成:`);
        console.log(`  state=${this.state} playerControlEnabled=${this.playerControlEnabled}`);
        console.log(`  player.x=${Math.floor(this.player.x)} player.y=${Math.floor(this.player.y)}`);
        console.log(`  enemies.length=${this.enemies.length} wave=${this.waveManager.getCurrentWaveNumber()}/${this.waveManager.getTotalWaves()}`);
        console.log(`  props.length=${this.props.length}`);
    }

    /** 修复重叠箱子：简单推开 */
    fixOverlappingProps() {
        const solids = this.props.filter(p => p.alive);
        let fixedCount = 0;
        for (let i = 0; i < solids.length; i++) {
            for (let j = i + 1; j < solids.length; j++) {
                const a = solids[i], b = solids[j];
                const dx = Math.abs(a.x - b.x);
                const dy = Math.abs(a.y - b.y);
                if (dx < (a.width + b.width) / 2 && dy < (a.height + b.height) / 2) {
                    b.x += (a.width + b.width) / 2 + 5;
                    fixedCount++;
                }
            }
        }
        if (fixedCount > 0) console.log(`[F12] 修复了 ${fixedCount} 对重叠箱子`);
    }

    checkGameResult() {
        if (this.player.state === 'dead' && !this.defeatHandled) {
            this.defeatHandled = true; this.state = 'defeat';
            this.audio.play('defeat'); this.audio.stopBGM();
            this.effects.shakeIntensity = 0; this.effects.shakeTimer = 0; this.effects.flashAlpha = 0;
        }
        if (this.bossManager.bossDefeated && !this.levelClearHandled && !this.victoryHandled) {
            if (this.bossManager.boss && !this.bossManager.boss.alive) {
                if (this.levelManager.isFinalLevel()) {
                    this.victoryHandled = true; this.state = 'victory';
                } else {
                    this.levelClearHandled = true; this.state = 'levelClear';
                }
                this.audio.play('victory'); this.audio.stopBGM();
                this.effects.shakeIntensity = 0; this.effects.shakeTimer = 0; this.effects.flashAlpha = 0;
            }
        }
    }

    skipToBoss() {
        if (this.state !== 'playing') return;
        this.enemies = [];
        this.waveManager.currentWaveIndex = this.waveManager.getTotalWaves();
        this.waveManager.allCleared = true; this.waveSpawned = true;
        if (!this.bossManager.bossSpawned) {
            const config = this.getLevelConfig();
            this.bossManager.triggerBossEntrance(
                this.player.x, this.camera.x, this.camera.logicalWidth,
                this.battleYCenter, this.battleYMin, this.battleYMax, this.mapWidth, config.boss
            );
        }
    }

    skipToNextLevel() {
        if (this.state !== 'playing') return;
        if (this.levelManager.isFinalLevel()) {
            // 第3关按F8直接胜利
            this.enemies = [];
            this.bossManager.reset();
            this.victoryHandled = true; this.state = 'victory';
            this.audio.play('victory'); this.audio.stopBGM();
            this.effects.shakeIntensity = 0; this.effects.shakeTimer = 0; this.effects.flashAlpha = 0;
            return;
        }
        // 清理当前关卡，进入下一关
        this.goToNextLevel();
    }

    // === 渲染 ===

    render() {
        const ctx = this.ctx, W = this.camera.logicalWidth, H = this.camera.logicalHeight;
        const shake = this.state === 'playing' ? this.effects.getShakeOffset() : { x: 0, y: 0 };
        ctx.save(); ctx.translate(shake.x, shake.y); ctx.clearRect(-10, -10, W + 20, H + 20);
        if (this.state === 'menu') { this.renderMenu(ctx, W, H); }
        else if (this.state === 'characterSelect') { this.renderCharacterSelect(ctx, W, H); }
        else {
            this.renderGame(ctx, W, H);
            if (this.state === 'levelClear') this.renderLevelClear(ctx, W, H);
            else if (this.state === 'victory') this.renderVictory(ctx, W, H);
            else if (this.state === 'defeat') this.renderDefeat(ctx, W, H);
            else if (this.state === 'paused') this.renderPauseMenu(ctx, W, H);
            else if (this.state === 'settings') this.renderSettings(ctx, W, H);
        }
        ctx.restore();
        if (this.state === 'playing') this.effects.renderFlash(ctx, W, H);
        if (this.debugMode && this.state !== 'menu') this.renderDebug(ctx, W, H);
        if (this.walkAreaDebug && this.state === 'playing') this.renderF11Debug(ctx, W, H);
    }

    renderLevelTitle(ctx, W, H) {
        const config = this.getLevelConfig();
        const alpha = Math.min(1, this.levelTitleTimer / 40);
        ctx.save(); ctx.globalAlpha = alpha;
        ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`第${this.currentLevel}关：${config.name}`, W / 2, H / 2 - 30);
        ctx.restore();
    }

    /** 主菜单渲染：街机格斗风格（menu_bg.png 背景 + 全UI绘制） */
    renderMenu(ctx, W, H) {
        // 优先使用新版 menuBgImage，fallback 到旧版 menuCoverImage，最后用纯色背景
        const useBgImage = this.menuBgImage && this.menuBgImage.complete && this.menuBgImage.naturalWidth > 0;
        const useCoverImage = !useBgImage && this.menuCoverImage && this.menuCoverImage.complete && this.menuCoverImage.naturalWidth > 0;

        if (!useBgImage && !useCoverImage) {
            this._renderFallbackMenu(ctx, W, H);
            return;
        }

        const img = useBgImage ? this.menuBgImage : this.menuCoverImage;
        const t = this.frameCount * 0.016; // 时间（秒）

        // === 阶段1：背景层 ===
        // cover 模式铺满
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;
        const coverScale = Math.max(W / imgW, H / imgH);
        let drawW = imgW * coverScale;
        let drawH = imgH * coverScale;
        let drawX = (W - drawW) / 2;
        let drawY = (H - drawH) / 2;

        // 浮动动画
        const floatX = Math.sin(t * 0.25) * 3;
        const floatY = Math.sin(t * 0.35) * 2;
        // 呼吸缩放 ±0.3%
        const breathe = 1 + Math.sin(t * 0.5) * 0.003;

        const finalX = drawX + floatX;
        const finalY = drawY + floatY;
        const finalW = drawW * breathe;
        const finalH = drawH * breathe;

        ctx.drawImage(img, finalX, finalY, finalW, finalH);

        // 暗色遮罩 rgba(0,0,0,0.35)
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, 0, W, H);

        // 暗角 vignette 效果
        const vgGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.2, W / 2, H / 2, Math.max(W, H) * 0.7);
        vgGrad.addColorStop(0, 'rgba(0,0,0,0)');
        vgGrad.addColorStop(0.5, 'rgba(0,0,0,0.1)');
        vgGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = vgGrad;
        ctx.fillRect(0, 0, W, H);

        // === 粒子效果（克制）===
        this._drawMenuParticles(ctx, W, H, t);

        // === 阶段2：标题区域 (y≈70~130) ===
        ctx.save();
        ctx.textAlign = 'center';

        // 主标题
        const titleGlow = Math.sin(t * 0.04) * 6 + 12; // blur 6~18
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = titleGlow;
        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 52px "Microsoft YaHei", sans-serif';
        ctx.fillText('赤锋行动', W / 2, 100);

        // 副标题
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#aaccff';
        ctx.font = '20px "Microsoft YaHei", sans-serif';
        ctx.fillText('距离判定清版格斗', W / 2, 130);
        ctx.restore();

        // === 阶段3：特色卡片 (y≈330~410) ===
        this._renderFeatureCards(ctx, W, t);

        // === 阶段4：操作说明 (y≈450~505) ===
        this._renderControls(ctx, W, t);

        // === 阶段5：开始按钮 (y≈590) ★严格居中★ ===
        const btnW = 260;
        const btnH = 58;
        const btnX = W / 2 - btnW / 2;  // ★ 居中 ★
        const btnY = 590;

        const isHover = this.isMouseOver(btnX, btnY, btnW, btnH);

        ctx.save();

        // ★★ 绝对不要画任何硬边框/矩形描边！！！★★
        // 脉冲动画（非 hover 时也有微弱脉冲）
        const pulseGlow = isHover
            ? Math.sin(this.frameCount * 0.06) * 6 + 16  // hover: 10~22
            : Math.sin(this.frameCount * 0.06) * 4 + 12; // normal: 8~16

        ctx.shadowColor = isHover ? '#ffaa22' : '#ff6600';
        ctx.shadowBlur = pulseGlow;

        // 按钮内部渐变
        const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
        if (isHover) {
            btnGrad.addColorStop(0, '#ff6600');
            btnGrad.addColorStop(1, '#dd3300');
        } else {
            btnGrad.addColorStop(0, '#dd4400');
            btnGrad.addColorStop(1, '#aa2200');
        }
        ctx.fillStyle = btnGrad;

        // 圆角按钮（仅1px圆角描边，不是粗边框！）
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.fill();

        // 仅1px圆角描边
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isHover ? '#ffcc66' : '#ff9933';
        ctx.lineWidth = 1;
        this.roundRect(ctx, btnX, btnY, btnW, btnH, 10);
        ctx.stroke();

        ctx.restore();

        // 按钮文字
        ctx.save();
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(255,255,255,0.3)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
        ctx.fillText('开始游戏', W / 2, btnY + 38);
        ctx.restore();

        // 更新 startButton
        this.startButton = { x: btnX, y: btnY, w: btnW, h: btnH };
    }

    /** 渲染5个特色卡片 */
    _renderFeatureCards(ctx, W, t) {
        const cardW = 190, cardH = 72, gap = 14;
        const totalW = cardW * 5 + gap * 4; // 1010
        const startX = (W - totalW) / 2; // 135
        const cardY = 330;

        const features = [
            { emoji: '🥊', title: '经典格斗', desc: '横版清版 爽快打击' },
            { emoji: '👤', title: '多样角色', desc: '各具特色 自由选择' },
            { emoji: '🔥', title: '连招技能', desc: '组合连击 畅快淋漓' },
            { emoji: '👑', title: 'BOSS挑战', desc: '强敌来袭 极限对决' },
            { emoji: '📦', title: '丰富道具', desc: '武器装备 助力闯关' },
        ];

        features.forEach((f, i) => {
            const cx = startX + i * (cardW + gap);

            // 卡片背景
            ctx.fillStyle = 'rgba(8,12,28,0.72)';
            this.roundRect(ctx, cx, cardY, cardW, cardH, 8);
            ctx.fill();

            // 卡片边框
            ctx.strokeStyle = 'rgba(255,120,30,0.2)';
            ctx.lineWidth = 1;
            this.roundRect(ctx, cx, cardY, cardW, cardH, 8);
            ctx.stroke();

            // Emoji 图标
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(f.emoji, cx + 14, cardY + 32);

            // 标题
            ctx.fillStyle = '#ffcc66';
            ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
            ctx.fillText(f.title, cx + 46, cardY + 28);

            // 描述
            ctx.fillStyle = '#8899aa';
            ctx.font = '12px "Microsoft YaHei", sans-serif';
            ctx.fillText(f.desc, cx + 46, cardY + 50);
        });
    }

    /** 渲染操作说明 */
    _renderControls(ctx, W, t) {
        ctx.save();
        ctx.textAlign = 'center';

        // 标题行
        ctx.fillStyle = '#44ddff';
        ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
        ctx.fillText('>>> 操作说明 <<<', W / 2, 452);

        // 键位定义
        const keys = [
            { label: 'A D', func: '左右移动' },
            { label: 'W S', func: '上下移动' },
            { label: 'J', func: '普攻' },
            { label: 'K', func: '重击' },
            { label: 'L', func: '技能' },
            { label: '空格', func: '跳跃' },
            { label: 'E', func: '拾取' },
            { label: 'Q', func: '丢弃' },
            { label: 'ESC', func: '暂停' },
        ];

        const keyW = 48, keyH = 26, keyGap = 6;
        const totalKeyW = keys.length * keyW + (keys.length - 1) * keyGap;
        const keyStartX = (W - totalKeyW) / 2;
        const keyY = 465;

        keys.forEach((k, i) => {
            const kx = keyStartX + i * (keyW + keyGap);

            // 键帽背景
            ctx.fillStyle = 'rgba(15,20,35,0.82)';
            this.roundRect(ctx, kx, keyY, keyW, keyH, 4);
            ctx.fill();

            // 键帽边框
            ctx.strokeStyle = 'rgba(80,120,160,0.25)';
            ctx.lineWidth = 1;
            this.roundRect(ctx, kx, keyY, keyW, keyH, 4);
            ctx.stroke();

            // 键名文字
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(k.label, kx + keyW / 2, keyY + 17);

            // 功能说明
            ctx.fillStyle = '#667788';
            ctx.font = '10px "Microsoft YaHei", sans-serif';
            ctx.fillText(k.func, kx + keyW / 2, keyY + keyH + 13);
        });

        ctx.restore();
    }

    /** 菜单氛围粒子（克制版：8~10个粒子） */
    _drawMenuParticles(ctx, W, H, t) {
        const seed = (i) => ((i * 7919 + 1) % 10000) / 10000;
        const particleCount = 10;

        for (let i = 0; i < particleCount; i++) {
            const s = seed(i);
            // 基础位置
            const baseX = s * W;
            const baseY = seed(i + 100) * H;
            // 缓慢漂移
            const px = baseX + Math.sin(t * 0.3 + i * 2.5) * 30;
            const py = baseY + Math.cos(t * 0.2 + i * 1.8) * 20 + t * (8 + seed(i + 200) * 12); // 上浮
            // 循环回到顶部
            const wrapY = ((py % (H + 60)) + H + 60) % (H + 60) - 30;

            // 颜色交替：橙色 / 蓝色
            const isOrange = i % 2 === 0;
            const alpha = 0.08 + Math.sin(t * 1.5 + i) * 0.10; // 0.08~0.18

            ctx.beginPath();
            ctx.arc(px % W, wrapY, 1.5 + seed(i + 300) * 1.5, 0, Math.PI * 2);
            if (isOrange) {
                ctx.fillStyle = `rgba(255,140,40,${alpha.toFixed(3)})`;
            } else {
                ctx.fillStyle = `rgba(50,140,255,${alpha.toFixed(3)})`;
            }
            ctx.fill();
        }
    }

    /** fallback 菜单：封面加载失败时显示 */
    _renderFallbackMenu(ctx, W, H) {
        // 深色背景
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, '#0a0618');
        gradient.addColorStop(1, '#05101c');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // 标题
        ctx.save();
        ctx.fillStyle = '#ffcc44';
        ctx.font = 'bold 42px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = 16;
        ctx.fillText('赤锋行动', W / 2, H * 0.35);
        ctx.font = '20px "Microsoft YaHei", sans-serif';
        ctx.shadowBlur = 8;
        ctx.fillText('距离判定清版格斗', W / 2, H * 0.42);
        ctx.restore();

        // 开始按钮
        const btnW = 240, btnH = 56;
        const bx = W / 2 - btnW / 2, by = H * 0.62;
        const isHover = this.isMouseOver(bx, by, btnW, btnH);

        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = isHover ? 18 : 10;
        const bg = ctx.createLinearGradient(bx, by, bx, by + btnH);
        bg.addColorStop(0, isHover ? '#ff7722' : '#ee5500');
        bg.addColorStop(1, isHover ? '#dd3300' : '#bb3300');
        ctx.fillStyle = bg;
        this.roundRect(ctx, bx, by, btnW, btnH, 10);
        ctx.fill();
        ctx.strokeStyle = '#ffcc44';
        ctx.lineWidth = 2;
        this.roundRect(ctx, bx, by, btnW, btnH, 10);
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('开始游戏', W / 2, by + 37);

        // 操作提示
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '13px "Microsoft YaHei", sans-serif';
        ctx.fillText('按 Enter 或点击按钮开始', W / 2, H * 0.75);

        this.startButton = { x: bx, y: by, w: btnW, h: btnH };
    }

    /** 圆角矩形辅助方法 */
    roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    }

    renderGame(ctx, W, H) {
        const cameraX = this.camera.x;
        const config = this.getLevelConfig();

        // 背景（视差）
        BackgroundRenderer.render(ctx, this.currentLevel, W, H, cameraX, this.battleYMin, this.battleYMax, this.frameCount, this.lowFX);

        // 氛围粒子
        this.atmosphere.render(ctx, cameraX, this.frameCount);

        // 地面阴影
        if (this.player.alive) {
            BackgroundRenderer.drawGroundShadow(ctx, this.player.x - cameraX, this.player.y, this.player.width, this.player.height, this.player.jumpHeight);
        }
        this.enemies.forEach(e => { if (e.alive) BackgroundRenderer.drawGroundShadow(ctx, e.x - cameraX, e.y, e.width, e.height, 0); });
        if (this.bossManager.boss && this.bossManager.boss.alive) {
            const b = this.bossManager.boss;
            BackgroundRenderer.drawGroundShadow(ctx, b.x - cameraX, b.y, b.width, b.height, 0);
        }
        this.props.forEach(p => { if (p.alive) BackgroundRenderer.drawGroundShadow(ctx, p.x - cameraX, p.y, p.width, p.height, 0); });
        this.weaponManager.weapons.forEach(w => { if (w.alive && w.onGround) BackgroundRenderer.drawGroundShadow(ctx, w.x - cameraX, w.y, 20, 10, 0); });

        // 战斗对象（按Y排序）
        const renderList = [];
        renderList.push({ type: 'player', y: this.player.y - this.player.jumpHeight });
        this.enemies.forEach(e => { if (e.alive || (e.state === 'dead' && e.deathTimer < e.deathDuration)) renderList.push({ type: 'enemy', y: e.y, obj: e }); });
        if (this.bossManager.boss && (this.bossManager.boss.alive || (this.bossManager.boss.state === 'dead' && this.bossManager.boss.deathTimer < this.bossManager.boss.deathDuration))) {
            renderList.push({ type: 'boss', y: this.bossManager.boss.y, obj: this.bossManager.boss });
        }
        this.props.forEach(p => { if (p.alive || p.breaking) renderList.push({ type: 'prop', y: p.y, obj: p }); });
        this.items.forEach(item => { if (item.alive) renderList.push({ type: 'item', y: item.y, obj: item }); });
        this.weaponManager.weapons.forEach(w => { if (w.alive && w.onGround) renderList.push({ type: 'weapon', y: w.y, obj: w }); });
        renderList.sort((a, b) => a.y - b.y);
        renderList.forEach(item => {
            if (item.type === 'player') this.player.render(ctx, cameraX);
            else if (item.type === 'enemy') item.obj.render(ctx, cameraX);
            else if (item.type === 'boss') item.obj.render(ctx, cameraX);
            else if (item.type === 'prop') item.obj.render(ctx, cameraX);
            else if (item.type === 'item') item.obj.render(ctx, cameraX);
            else if (item.type === 'weapon') item.obj.renderOnGround(ctx, cameraX);
        });

        this.renderPlayerLaser(ctx, cameraX);

        // 武器挥动轨迹
        if (this.player.weapon && (this.player.state === 'attack' || this.player.state === 'heavy')) {
            const progress = 1 - this.player.attackTimer / this.player.attackDuration;
            Weapon.drawSwingTrail(ctx, this.player.x - cameraX, this.player.y, this.player.facing, progress, this.player.weapon.type, this.player.state === 'heavy');
        }

        this.effects.renderParticles(ctx, cameraX);
        this.effects.renderFloatTexts(ctx, cameraX);
        this.waveManager.renderAnnounce(ctx, W, H);
        this.bossManager.renderEntranceAnnounce(ctx, W, H);
        this.bossManager.renderPhaseAnnounce(ctx, W, H);

        // UI
        this.renderUI(ctx, W, H);

        // Boss 血条
        if (this.bossManager.bossActive && this.bossManager.boss && this.bossManager.boss.alive) {
            UITheme.drawBossHPBar(ctx, W, this.bossManager.boss.name || 'BOSS', this.bossManager.boss.hp, this.bossManager.boss.maxHp);
        }

        // 关卡标题淡入淡出
        if (this.levelTitleTimer > 0) {
            this.levelTitleTimer--;
            const alpha = this.levelTitleTimer > this.levelTitleDuration - 20
                ? (this.levelTitleDuration - this.levelTitleTimer) / 20
                : this.levelTitleTimer < 30 ? this.levelTitleTimer / 30 : 1;
            ctx.save(); ctx.globalAlpha = alpha;
            ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 36px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`第${this.currentLevel}关`, W / 2, H / 2 - 20);
            ctx.fillStyle = '#aaddff'; ctx.font = '22px "Microsoft YaHei", sans-serif';
            ctx.fillText(config.name, W / 2, H / 2 + 15);
            ctx.restore();
        }

        // 过渡效果
        this.transition.render(ctx, W, H);

        // 调试
        if (this.debugMode) this.renderDebug(ctx, W, H);
    }

    renderUI(ctx, W, H) {
        // 顶部信息栏 - 街机风格
        const topBar = ctx.createLinearGradient(0, 0, 0, 58);
        topBar.addColorStop(0, 'rgba(10,8,20,0.85)');
        topBar.addColorStop(0.8, 'rgba(15,12,25,0.75)');
        topBar.addColorStop(1, 'rgba(20,15,30,0.65)');
        ctx.fillStyle = topBar; ctx.fillRect(0, 0, W, 58);
        // 底部装饰线
        ctx.strokeStyle = 'rgba(255,150,0,0.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 57); ctx.lineTo(W, 57); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,150,0,0.1)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, 59); ctx.lineTo(W, 59); ctx.stroke();

        // HP 条
        const hpR = this.player.hp / this.player.maxHp;
        UITheme.drawBar(ctx, 18, 14, 200, 18, hpR, UITheme.getHPColors(hpR), 'HP', `${Math.max(0, this.player.hp)}/${this.player.maxHp}`);

        // EP 条
        const epR = this.player.energy / this.player.maxEnergy;
        UITheme.drawBar(ctx, 18, 36, 200, 12, epR, UITheme.getEPColors(), 'EP', `${Math.floor(this.player.energy)}/${this.player.maxEnergy}`);

        // 武器信息
        const wpnX = 230, wpnY = 10;
        if (this.player.weapon) {
            const w = this.player.weapon;
            UITheme.drawPanel(ctx, wpnX, wpnY, 130, 38, w.color);
            UITheme.drawWeaponIcon(ctx, w.type, wpnX + 15, wpnY + 20, 14);
            ctx.fillStyle = w.color; ctx.font = 'bold 12px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'left';
            ctx.fillText(w.name, wpnX + 28, wpnY + 16);
            const durR = w.durability / w.maxDurability;
            UITheme.drawBar(ctx, wpnX + 28, wpnY + 22, 95, 10, durR,
                durR > 0.5 ? { top: '#44cc44', bottom: '#33aa33', border: '#66ee66' } :
                durR > 0.25 ? { top: '#cccc44', bottom: '#aaaa22', border: '#eeee66' } :
                { top: '#cc4444', bottom: '#aa2222', border: '#ee6666' },
                '', `${w.durability}/${w.maxDurability}`);
        } else {
            UITheme.drawPanel(ctx, wpnX, wpnY, 130, 38, '#555');
            ctx.fillStyle = '#666'; ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('无武器', wpnX + 65, wpnY + 24);
        }

        const config = this.getLevelConfig();
        ctx.textAlign = 'center'; ctx.fillStyle = '#ffcc44'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        if (this.bossManager.bossActive) {
            ctx.fillText(`第${this.currentLevel}关：${config.name} - BOSS 战`, W / 2, 28);
        } else {
            ctx.fillText(`第${this.currentLevel}关：${config.name} - 第${this.waveManager.getCurrentWaveNumber()}波`, W / 2, 28);
            ctx.fillStyle = '#998844'; ctx.font = '12px "Microsoft YaHei", sans-serif';
            ctx.fillText(`${this.waveManager.getCurrentWaveNumber()}/${this.waveManager.getTotalWaves()}`, W / 2, 44);
        }

        const alive = this.enemies.filter(e => e.alive).length;
        ctx.textAlign = 'right'; ctx.fillStyle = '#ff6644'; ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        ctx.fillText(`敌人: ${alive}`, W - 18, 22);
        ctx.fillStyle = '#ffcc00'; ctx.fillText(`分数: ${this.score}`, W - 18, 40);
        ctx.fillStyle = '#889'; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText(`音效: ${this.audio.muted ? '关' : '开'}`, W - 18, 54);
        if (this.totalCombo >= 2 && this.totalComboTimer > 0) {
            const a = Math.min(1, this.totalComboTimer / 20);
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ffcc00'; ctx.font = `bold ${24 + this.totalCombo}px "Microsoft YaHei", sans-serif`; ctx.textAlign = 'right'; ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10;
            ctx.fillText(`${this.totalCombo} COMBO!`, W - 18, H - 40); ctx.restore();
        }

        // 附近武器拾取提示
        if (this.player.alive) {
            const nearby = this.weaponManager.findNearbyWeapon(this.player.x, this.player.y, 50);
            if (nearby) {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.6)';
                const tipW = 130, tipH = 22;
                const tipX = W / 2 - tipW / 2, tipY = H - 50;
                ctx.fillRect(tipX, tipY, tipW, tipH);
                ctx.strokeStyle = nearby.color; ctx.lineWidth = 1; ctx.strokeRect(tipX, tipY, tipW, tipH);
                ctx.fillStyle = '#fff'; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`E 拾取 ${nearby.name}`, W / 2, tipY + 16);
                ctx.restore();
            }
        }

        ctx.textAlign = 'right'; ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '12px "Microsoft YaHei", sans-serif';
        ctx.fillText('A/D移动 W/S上下 空格跳跃 J/K攻击 L技能 E拾取 Q丢弃 ESC暂停', W - 14, H - 14);
    }

    // === 关卡结算 ===

    renderLevelClear(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
        const config = this.getLevelConfig();
        ctx.save(); ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 25;
        ctx.fillStyle = '#ffcc00'; ctx.font = 'bold 48px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`第${this.currentLevel}关 通关！`, W / 2, H * 0.22); ctx.restore();

        ctx.fillStyle = '#ddd'; ctx.font = '22px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`${config.name}`, W / 2, H * 0.30);
        ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei", sans-serif';
        ctx.fillText(`得分: ${this.score}`, W / 2, H * 0.38);
        ctx.fillText(`击败敌人: ${this.levelManager.levelEnemiesKilled}`, W / 2, H * 0.43);
        ctx.fillText(`剩余血量: ${Math.max(0, this.player.hp)}`, W / 2, H * 0.48);

        // 下一关按钮
        const btnW = 220, btnH = 50, btnX = W / 2 - btnW / 2, btnY1 = H * 0.55;
        const hover1 = this.isMouseOver(btnX, btnY1, btnW, btnH);
        ctx.save(); ctx.shadowColor = '#44aa44'; ctx.shadowBlur = 12; ctx.fillStyle = hover1 ? '#33aa33' : '#228822'; ctx.fillRect(btnX, btnY1, btnW, btnH); ctx.restore();
        ctx.strokeStyle = hover1 ? '#66dd66' : '#44aa44'; ctx.lineWidth = 2; ctx.strokeRect(btnX, btnY1, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 22px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('下一关', W / 2, btnY1 + 34);
        this.nextLevelButton = { x: btnX, y: btnY1, w: btnW, h: btnH };

        // 返回主菜单按钮
        const btnY2 = H * 0.65;
        const hover2 = this.isMouseOver(btnX, btnY2, btnW, btnH);
        ctx.fillStyle = hover2 ? '#aa5500' : '#884400'; ctx.fillRect(btnX, btnY2, btnW, btnH);
        ctx.strokeStyle = hover2 ? '#ddaa66' : '#aa7744'; ctx.lineWidth = 2; ctx.strokeRect(btnX, btnY2, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        ctx.fillText('返回主菜单', W / 2, btnY2 + 33);
        this.menuButton = { x: btnX, y: btnY2, w: btnW, h: btnH };
    }

    renderVictory(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 30;
        ctx.fillStyle = '#ffdd44'; ctx.font = 'bold 60px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('游戏通关！', W / 2, H * 0.22); ctx.restore();

        ctx.fillStyle = '#ffcc88'; ctx.font = '24px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('最终胜利', W / 2, H * 0.30);
        ctx.fillStyle = '#ccc'; ctx.font = '20px "Microsoft YaHei", sans-serif';
        ctx.fillText(`最终得分: ${this.score}`, W / 2, H * 0.38);
        ctx.fillText(`总击败敌人: ${this.levelManager.totalEnemiesKilled}`, W / 2, H * 0.43);

        const btnW = 220, btnH = 50, btnX = W / 2 - btnW / 2, btnY = H * 0.52;
        const hover = this.isMouseOver(btnX, btnY, btnW, btnH);
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12; ctx.fillStyle = hover ? '#dd5500' : '#cc4400'; ctx.fillRect(btnX, btnY, btnW, btnH); ctx.restore();
        ctx.strokeStyle = hover ? '#ffaa66' : '#ff8844'; ctx.lineWidth = 2; ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('重新开始', W / 2, btnY + 34);
        this.restartButton = { x: btnX, y: btnY, w: btnW, h: btnH };

        // 返回主菜单
        const btnY2 = H * 0.63;
        const hover2 = this.isMouseOver(btnX, btnY2, btnW, btnH);
        ctx.fillStyle = hover2 ? '#aa5500' : '#884400'; ctx.fillRect(btnX, btnY2, btnW, btnH);
        ctx.strokeStyle = hover2 ? '#ddaa66' : '#aa7744'; ctx.lineWidth = 2; ctx.strokeRect(btnX, btnY2, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
        ctx.fillText('返回主菜单', W / 2, btnY2 + 33);
        this.menuButton = { x: btnX, y: btnY2, w: btnW, h: btnH };
    }

    renderDefeat(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 25; ctx.fillStyle = '#ff4444'; ctx.font = 'bold 64px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('游戏失败', W / 2, H * 0.35); ctx.restore();
        ctx.fillStyle = '#ff8888'; ctx.font = '24px "Microsoft YaHei", sans-serif'; ctx.fillText(`得分: ${this.score}`, W / 2, H * 0.44);
        this.renderRestartAndMenuButtons(ctx, W, H * 0.52);
    }

    renderRestartAndMenuButtons(ctx, W, y) {
        const btnW = 220, btnH = 50, btnX = W / 2 - btnW / 2;
        const hover = this.isMouseOver(btnX, y, btnW, btnH);
        ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 12; ctx.fillStyle = hover ? '#dd5500' : '#cc4400'; ctx.fillRect(btnX, y, btnW, btnH); ctx.restore();
        ctx.strokeStyle = hover ? '#ffaa66' : '#ff8844'; ctx.lineWidth = 2; ctx.strokeRect(btnX, y, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('重新开始', W / 2, y + 34);
        this.restartButton = { x: btnX, y: y, w: btnW, h: btnH };

        const y2 = y + 60;
        const hover2 = this.isMouseOver(btnX, y2, btnW, btnH);
        ctx.fillStyle = hover2 ? '#aa5500' : '#884400'; ctx.fillRect(btnX, y2, btnW, btnH);
        ctx.strokeStyle = hover2 ? '#ddaa66' : '#aa7744'; ctx.lineWidth = 2; ctx.strokeRect(btnX, y2, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 20px "Microsoft YaHei", sans-serif'; ctx.fillText('返回主菜单', W / 2, y2 + 33);
        this.menuButton = { x: btnX, y: y2, w: btnW, h: btnH };
    }

    // === 暂停菜单 ===

    renderPauseMenu(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, W, H);
        const panelW = 360, panelH = 320, panelX = (W - panelW) / 2, panelY = (H - panelH) / 2 - 20;
        UITheme.drawPanel(ctx, panelX, panelY, panelW, panelH, '#ff6600');
        UITheme.drawArcadeTitle(ctx, W / 2, panelY + 50, '暂停', '#ff8844', 36);
        const btnW = 260, btnH = 46, btnX = (W - btnW) / 2;
        const buttons = [
            { label: '继续游戏', y: panelY + 80, action: 'resume' },
            { label: '重新开始', y: panelY + 136, action: 'restart' },
            { label: '返回主菜单', y: panelY + 192, action: 'menu' },
            { label: '设置', y: panelY + 248, action: 'settings' },
        ];
        this.pauseButtons = buttons.map(b => ({ ...b, x: btnX, w: btnW, h: btnH }));
        this.pauseButtons.forEach(btn => {
            const hover = this.isMouseOver(btn.x, btn.y, btn.w, btn.h);
            UITheme.drawButton(ctx, btn.x, btn.y, btn.w, btn.h, btn.label, hover, UITheme.COLORS.orange);
        });
    }

    // === 设置面板 ===

    renderSettings(ctx, W, H) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
        const panelW = 420, panelH = 470, panelX = (W - panelW) / 2, panelY = (H - panelH) / 2 - 10;
        UITheme.drawPanel(ctx, panelX, panelY, panelW, panelH, '#4488ff');
        UITheme.drawArcadeTitle(ctx, W / 2, panelY + 45, '设置', '#6699ff', 32);
        // 音效
        const sfxY = panelY + 80; ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('音效', panelX + 30, sfxY + 22);
        const sfxBtnX = panelX + panelW - 120, sfxBtnW = 90, sfxBtnH = 34;
        const sfxOn = this.audio.sfxEnabled && !this.audio.muted;
        ctx.fillStyle = sfxOn ? '#226622' : '#662222'; ctx.fillRect(sfxBtnX, sfxY + 5, sfxBtnW, sfxBtnH);
        ctx.strokeStyle = this.isMouseOver(sfxBtnX, sfxY + 5, sfxBtnW, sfxBtnH) ? '#ffaa66' : '#888'; ctx.lineWidth = 1.5; ctx.strokeRect(sfxBtnX, sfxY + 5, sfxBtnW, sfxBtnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(sfxOn ? '开' : '关', sfxBtnX + sfxBtnW / 2, sfxY + 28);
        // BGM
        const bgmY = panelY + 130; ctx.fillStyle = '#ccc'; ctx.font = '18px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('背景音乐', panelX + 30, bgmY + 22);
        const bgmBtnX = panelX + panelW - 120, bgmBtnW = 90, bgmBtnH = 34;
        const bgmOn = this.audio.bgmEnabled && !this.audio.muted;
        ctx.fillStyle = bgmOn ? '#226622' : '#662222'; ctx.fillRect(bgmBtnX, bgmY + 5, bgmBtnW, bgmBtnH);
        ctx.strokeStyle = this.isMouseOver(bgmBtnX, bgmY + 5, bgmBtnW, bgmBtnH) ? '#ffaa66' : '#888'; ctx.strokeRect(bgmBtnX, bgmY + 5, bgmBtnW, bgmBtnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText(bgmOn ? '开' : '关', bgmBtnX + bgmBtnW / 2, bgmY + 28);
        // 操作说明
        const keysY = panelY + 190; ctx.fillStyle = '#aaa'; ctx.font = 'bold 16px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'left'; ctx.fillText('操作说明', panelX + 30, keysY);
        ctx.fillStyle = '#888'; ctx.font = '14px "Microsoft YaHei", sans-serif';
        ['A / D    左右移动', 'W / S    上下移动', '空格      跳跃', 'J          普通攻击（可连击）', 'K          重击', 'L          技能攻击', 'E          拾取武器', 'Q          丢弃武器', 'M          静音切换', 'ESC       暂停/继续', 'F3         调试信息', 'F6         生成武器（调试）', 'F8         跳到下一关（调试）', 'F9         跳到 Boss（调试）'].forEach((k, i) => ctx.fillText(k, panelX + 40, keysY + 22 + i * 16));
        // 返回
        const backBtnW = 200, backBtnH = 42, backBtnX = (W - backBtnW) / 2, backBtnY = panelY + panelH - 55;
        const backHover = this.isMouseOver(backBtnX, backBtnY, backBtnW, backBtnH);
        ctx.fillStyle = backHover ? '#cc5500' : '#993300'; ctx.fillRect(backBtnX, backBtnY, backBtnW, backBtnH);
        ctx.strokeStyle = backHover ? '#ffaa66' : '#ff8844'; ctx.lineWidth = 1.5; ctx.strokeRect(backBtnX, backBtnY, backBtnW, backBtnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 18px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center'; ctx.fillText('返回', W / 2, backBtnY + 28);
        this.settingsButtons = [
            { x: sfxBtnX, y: sfxY + 5, w: sfxBtnW, h: sfxBtnH, action: 'toggleSfx' },
            { x: bgmBtnX, y: bgmY + 5, w: bgmBtnW, h: bgmBtnH, action: 'toggleBgm' },
            { x: backBtnX, y: backBtnY, w: backBtnW, h: backBtnH, action: 'back' },
        ];
    }

    renderDebug(ctx, W, H) {
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(10, H - 450, 520, 440);
        ctx.fillStyle = '#0f0'; ctx.font = '12px monospace'; ctx.textAlign = 'left';
        const alive = this.enemies.filter(e => e.alive).length;
        const boss = this.bossManager.boss;
        const config = this.getLevelConfig();
        const p = this.player;
        const nearbyWeapon = this.weaponManager.findNearbyWeapon(p.x, p.y, 50);
        const wpnCfg = WeaponManager.getLevelConfig(this.currentLevel);
        const animState = p.animStateMachine ? p.animStateMachine.currentState : 'N/A';
        const animFrame = p.animStateMachine ? p.animStateMachine.getCurrentFrameIndex() : 0;
        const animTotal = p.animStateMachine ? p.animStateMachine.getTotalFrames() : 0;
        const animLoop = p.animStateMachine ? p.animStateMachine.isLooping() : false;
        const isHitFrame = p.animStateMachine ? p.animStateMachine.isHitFrame() : false;
        const useSprite = p.useSpriteRenderer ? 'Sprite' : 'Legacy';
        const weaponAnim = p.weapon ? `${p.weapon.name}` : 'None';

        // 赤锋精灵动画帧 key 计算（与 SpriteCharacterRenderer 一致的映射）
        let frameKey = 'idle';
        const renderState = p.getRenderState ? p.getRenderState() : p.state;
        switch (renderState) {
            case 'idle': frameKey = 'idle'; break;
            case 'walk': frameKey = 'walk'; break;
            case 'attack': frameKey = 'attack'; break;
            case 'heavy': frameKey = 'attack'; break;
            case 'skill': frameKey = 'attack'; break;
            case 'hurt': frameKey = 'hurt'; break;
            case 'dead': frameKey = 'dead'; break;
            case 'jump': frameKey = 'idle'; break;
        }
        const spriteCR = SpriteCharacterRenderer;
        const debugCharId = p.config.id || p.config.charType;
        const spriteState = spriteCR.lastStates[debugCharId] ? spriteCR.lastStates[debugCharId].state : 'N/A';
        // 获取当前播放帧文件名
        const currentFrameDebug = spriteCR.getCurrentFrameDebugInfo(debugCharId);
        const currentFrameName = currentFrameDebug.frame || 'N/A';
        const currentFrameIndex = Number.isInteger(currentFrameDebug.frameIndex) ? currentFrameDebug.frameIndex : -1;
        const currentAnim = currentFrameDebug.currentAnim || 'N/A';

        const lines = [
            `=== DEBUG (F3关闭) ===`,
            `State: ${this.state} | Frame: ${this.frameCount}`,
            `Level: ${this.currentLevel} / ${this.levelManager.maxLevel} - ${config.name}`,
            `Boss: ${config.boss.name} (HP:${config.boss.hp})`,
            `Player: x=${Math.floor(p.x)} y=${Math.floor(p.y)} hp=${p.hp} state=${p.state}`,
            `  Char: ${p.config.name} (${debugCharId}) | Facing: ${p.facing === 1 ? 'Right' : 'Left'}`,
            `  WalkDebug: characterId=${debugCharId} moving=${!!p.moving} state=${p.state} renderState=${renderState}`,
            `  WalkAnim: currentAnim=${currentAnim} currentFrameName=${currentFrameName} currentFrameIndex=${currentFrameIndex} facing=${p.facing}`,
            `  赤锋动画: state=${p.state} / frameKey=${frameKey} / spriteState=${spriteState} / currentFrame=${currentFrameName}`,
            `  SkillType: ${p.config.skillType} | skillTimer: ${p.skillTimer} | skillActive: ${p.skillActive}`,
            `  currentRole: ${debugCharId} | laserSkillActive: ${!!p.laserSkillActive} | isLaserCasting: ${!!p.isLaserCasting}`,
            `  laserTargetId: ${p.laserTargetId || 'none'} | laserHasTarget: ${!!p.laserHasTarget} | laserFacingDirection: ${p.facing}`,
            `  laserDistance: ${Math.floor(p.laserDistance || 0)} | laserDamageCooldown: ${Math.max(0, Math.floor(p.laserDamageCooldown || 0))}`,
            `  dashTimer: ${p.dashTimer} | dashDir: ${p.dashDir} | groundPoundPhase: ${p.groundPoundPhase}`,
            `  attackType: ${p.attackType} | attackHit: ${p.attackHit} | comboCount: ${p.comboCount}`,
            `  skillHitEnemies: ${p.skillHitEnemies.size} | skillHitProps: ${p.skillHitProps.size}`,
            `  afterImages: ${p.afterImages.length} | EP: ${Math.floor(p.energy)}/${p.maxEnergy}`,
            `Weapon: ${p.weapon ? p.weapon.name : '无'} | Dur: ${p.weapon ? p.weapon.durability + '/' + p.weapon.maxDurability : '-'}`,
            `  Nearby: ${nearbyWeapon ? nearbyWeapon.name : '无'} | GroundWeapons: ${this.weaponManager.weapons.length}`,
            `  LevelWpnCfg: init=${wpnCfg.initialCount} drop=${wpnCfg.propDropRate}`,
            `Wave: ${this.waveManager.getCurrentWaveNumber()}/${this.waveManager.getTotalWaves()} spawned=${this.waveSpawned} allCleared=${this.waveManager.allCleared}`,
            `Enemies: ${this.enemies.length} | Alive: ${alive} | Kills: ${this.levelManager.totalEnemiesKilled}`,
            `Boss: spawned=${this.bossManager.bossSpawned} active=${this.bossManager.bossActive} defeated=${this.bossManager.bossDefeated}`,
            boss && boss.alive ? `  Boss: x=${Math.floor(boss.x)} y=${Math.floor(boss.y)} hp=${boss.hp} phase=${boss.phase} state=${boss.state}` : `  Boss: none`,
            `Defeat: ${this.defeatHandled} | LevelClear: ${this.levelClearHandled} | Victory: ${this.victoryHandled}`,
            `Shake: timer=${this.effects.shakeTimer}`,
            `Audio: muted=${this.audio.muted} sfx=${this.audio.sfxEnabled} bgm=${this.audio.bgmEnabled}`,
            `BGM: playing=${this.audio.bgmPlaying} menu=${this.audio.menuBgmPlaying}`,
            `Map: width=${this.mapWidth} theme=${config.theme}`,
            `Theme: ${config.theme} | BG Layers: 4 | Atmosphere: ${this.atmosphere.particleCount}`,
            `LowFX: ${this.lowFX} | Transition: ${this.transition.phase}`,
            `=== Animation System ===`,
            `AnimState: ${animState} | Frame: ${animFrame}/${animTotal} | Loop: ${animLoop}`,
            `HitFrame: ${isHitFrame} | Renderer: ${useSprite} | WeaponAnim: ${weaponAnim}`,
            `F4: Toggle Renderer | Current: ${useSprite}`,
        ];
        lines.forEach((l, i) => ctx.fillText(l, 18, H - 435 + i * 16));
        ctx.restore();
    }

    renderF11Debug(ctx, W, H) {
        if (!this.player) return;
        const p = this.player;
        const config = this.getLevelConfig();
        const wa = config.walkArea;
        const screenX = p.x - this.camera.x;
        const pScreenX = Math.floor(screenX);
        const airborne = p.jumpHeight > 15;

        // 检测玩家是否被箱子阻挡
        let blockedByProp = false;
        let blockingPropName = '无';
        if (wa) {
            for (const prop of this.props) {
                if (!prop.alive) continue;
                const hb = prop.getHitBox();
                const phb = p.getHitBox();
                if (phb.x < hb.x + hb.width && phb.x + phb.width > hb.x &&
                    phb.y < hb.y + hb.height && phb.y + phb.height > hb.y) {
                    blockedByProp = true;
                    blockingPropName = prop.type;
                    break;
                }
            }
        }

        ctx.save();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        if (wa) {
            ctx.strokeRect(wa.xMin - this.camera.x, wa.yMin, wa.xMax - wa.xMin, wa.yMax - wa.yMin);
        }
        ctx.setLineDash([]);

        // Attack range for player
        if (p.attackTimer > 0) {
            const ab = p.getAttackBox();
            if (ab) {
                ctx.strokeStyle = '#00ff00';
                ctx.strokeRect(ab.x - this.camera.x, ab.y, ab.width, ab.height);
            }
        }

        // Enemy attack ranges
        ctx.strokeStyle = '#ff0000';
        this.enemies.forEach(e => {
            if (e.state === 'dead' || !e.alive) return;
            const eb = e.getAttackBox();
            if (eb) {
                ctx.strokeRect(eb.x - this.camera.x, eb.y, eb.width, eb.height);
            }
        });

        // Info panel
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(W - 340, 60, 330, 280);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'left';

        // 检测箱子重叠数
        let overlapCount = 0;
        const solids = this.props.filter(p => p.alive);
        for (let i = 0; i < solids.length; i++) {
            for (let j = i + 1; j < solids.length; j++) {
                const a = solids[i], b = solids[j];
                if (Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
                    Math.abs(a.y - b.y) < (a.height + b.height) / 2) {
                    overlapCount++;
                }
            }
        }

        const lines = [
            `=== F11 调试面板 ===`,
            `gameState: ${this.state}`,
            `playerControlEnabled: ${this.playerControlEnabled}`,
            `controlEnabled: ${p.controlEnabled}`,
            `enemyAIEnabled: ${this.enemyAIEnabled}`,
            `readyTimer: ${this.readyTimer || 0}`,
            ``,
            `player.x: ${Math.floor(p.x)}  player.y: ${Math.floor(p.y)}`,
            `screenX: ${pScreenX}`,
            `jumpHeight: ${p.jumpHeight.toFixed(1)}  airborne: ${airborne}`,
            ``,
            `enemies.length: ${this.enemies.length}`,
            `aliveEnemies: ${this.enemies.filter(e => e.alive).length}`,
            `waveSpawned: ${this.waveSpawned}`,
            `wave: ${this.waveManager.getCurrentWaveNumber()}/${this.waveManager.getTotalWaves()}`,
            `allCleared: ${this.waveManager.allCleared}`,
            ``,
            `props(箱子): ${this.props.length}  重叠对数: ${overlapCount}`,
            `被道具阻挡: ${blockedByProp ? '是(' + blockingPropName + ')' : '否'}`,
            ``,
            `walkArea: [${wa ? wa.xMin : '-'}, ${wa ? wa.yMin : '-'}] ~ [${wa ? wa.xMax : '-'}, ${wa ? wa.yMax : '-'}]`,
            `camera.x: ${Math.floor(this.camera.x)}`,
        ];
        lines.forEach((l, i) => ctx.fillText(l, W - 330, 80 + i * 16));

        // Nearest enemy info
        let nearestEnemy = null;
        let nearestDist = Infinity;
        this.enemies.forEach(e => {
            if (e.state === 'dead' || !e.alive) return;
            const dist = Math.abs(e.x - p.x);
            if (dist < nearestDist) { nearestDist = dist; nearestEnemy = e; }
        });
        if (nearestEnemy) {
            const dx = Math.abs(nearestEnemy.x - p.x);
            const dy = Math.abs(nearestEnemy.y - p.y);
            const canHit = GameUtils.canHit(nearestEnemy, p, nearestEnemy.attackRange, nearestEnemy.attackYRange, true);
            ctx.fillStyle = canHit ? '#ff4444' : '#44ff44';
            ctx.fillText(`最近敌人: ${nearestEnemy.type} dist=${Math.floor(nearestDist)}`, W - 330, 80 + 17 * 18);
            ctx.fillText(`  dx=${Math.floor(dx)} dy=${Math.floor(dy)} canHit=${canHit}`, W - 330, 80 + 18 * 18);
            ctx.fillText(`  attackCooldown: ${nearestEnemy.attackCooldown}/${nearestEnemy.attackCooldownMax}`, W - 330, 80 + 19 * 18);
            ctx.fillText(`  isAttacking: ${nearestEnemy.isAttacking} airborne: ${nearestEnemy.jumpHeight > 15}`, W - 330, 80 + 20 * 18);
        }

        ctx.restore();
    }

    toggleSpriteRenderer() {
        if (!this.player) return;
        this.player.useSpriteRenderer = !this.player.useSpriteRenderer;
        if (this.player.animStateMachine) {
            this.player.animStateMachine.useSpriteRenderer = this.player.useSpriteRenderer;
        }
        this.enemies.forEach(e => {
            e.useSpriteRenderer = this.player.useSpriteRenderer;
            if (e.animStateMachine) {
                e.animStateMachine.useSpriteRenderer = this.player.useSpriteRenderer;
            }
        });
        if (this.bossManager.boss) {
            this.bossManager.boss.useSpriteRenderer = this.player.useSpriteRenderer;
            if (this.bossManager.boss.animStateMachine) {
                this.bossManager.boss.animStateMachine.useSpriteRenderer = this.player.useSpriteRenderer;
            }
        }
        console.log(`Sprite Renderer: ${this.player.useSpriteRenderer ? 'ON' : 'OFF'}`);
    }

    // === 鼠标交互 ===

    isMouseOver(x, y, w, h) { return this.mouseX >= x && this.mouseX <= x + w && this.mouseY >= y && this.mouseY <= y + h; }

    handleClick(mouseX, mouseY) {
        this.mouseX = mouseX; this.mouseY = mouseY;
        if (this.state === 'menu' && this.startButton) {
            const b = this.startButton;
            if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) { this.state = 'characterSelect'; this.audio.stopBGM(); return; }
        }
        if (this.state === 'characterSelect') {
            // 点击角色卡片
            for (let i = 0; i < this.charCards.length; i++) {
                const card = this.charCards[i];
                if (mouseX >= card.x && mouseX <= card.x + card.w && mouseY >= card.y && mouseY <= card.y + card.h) {
                    this.selectedCharIndex = i;
                    return;
                }
            }
            // 开始闯关按钮
            if (this.startGameButton) {
                const b = this.startGameButton;
                if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                    this.startGameWithSelectedChar();
                    return;
                }
            }
            // 返回主菜单按钮
            if (this.backToMenuButton) {
                const b = this.backToMenuButton;
                if (mouseX >= b.x && mouseX <= b.x + b.w && mouseY >= b.y && mouseY <= b.y + b.h) {
                    this.state = 'menu';
                    this.audio.startMenuBGM();
                    return;
                }
            }
        }
        if (this.state === 'paused') {
            for (const btn of this.pauseButtons) {
                if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) { this.handlePauseAction(btn.action); return; }
            }
        }
        if (this.state === 'settings') {
            for (const btn of this.settingsButtons) {
                if (mouseX >= btn.x && mouseX <= btn.x + btn.w && mouseY >= btn.y && mouseY <= btn.y + btn.h) { this.handleSettingsAction(btn.action); return; }
            }
        }
        if (this.state === 'levelClear') {
            if (this.nextLevelButton && mouseX >= this.nextLevelButton.x && mouseX <= this.nextLevelButton.x + this.nextLevelButton.w && mouseY >= this.nextLevelButton.y && mouseY <= this.nextLevelButton.y + this.nextLevelButton.h) { this.goToNextLevel(); return; }
            if (this.menuButton && mouseX >= this.menuButton.x && mouseX <= this.menuButton.x + this.menuButton.w && mouseY >= this.menuButton.y && mouseY <= this.menuButton.y + this.menuButton.h) { this.returnToMenu(); return; }
        }
        if (this.state === 'victory') {
            if (this.restartButton && mouseX >= this.restartButton.x && mouseX <= this.restartButton.x + this.restartButton.w && mouseY >= this.restartButton.y && mouseY <= this.restartButton.y + this.restartButton.h) { this.levelManager.reset(); this.initLevel(1); return; }
            if (this.menuButton && mouseX >= this.menuButton.x && mouseX <= this.menuButton.x + this.menuButton.w && mouseY >= this.menuButton.y && mouseY <= this.menuButton.y + this.menuButton.h) { this.returnToMenu(); return; }
        }
        if (this.state === 'defeat') {
            if (this.restartButton && mouseX >= this.restartButton.x && mouseX <= this.restartButton.x + this.restartButton.w && mouseY >= this.restartButton.y && mouseY <= this.restartButton.y + this.restartButton.h) { this.levelManager.reset(); this.initLevel(1); return; }
            if (this.menuButton && mouseX >= this.menuButton.x && mouseX <= this.menuButton.x + this.menuButton.w && mouseY >= this.menuButton.y && mouseY <= this.menuButton.y + this.menuButton.h) { this.returnToMenu(); return; }
        }
    }

    handlePauseAction(action) {
        switch (action) {
            case 'resume': this.state = 'playing'; this.audio.resumeBGM(); break;
            case 'restart': this.audio.stopBGM(); this.initLevel(1); break;
            case 'menu': this.returnToMenu(); break;
            case 'settings': this.state = 'settings'; break;
        }
    }

    handleSettingsAction(action) {
        switch (action) {
            case 'toggleSfx': this.audio.toggleSfx(); if (this.audio.sfxEnabled && this.audio.muted) { this.audio.muted = false; this.audio.updateBgmVolume(); } break;
            case 'toggleBgm': this.audio.toggleBgm(); break;
            case 'back': this.state = 'paused'; break;
        }
    }

    /** 使用选中的角色开始游戏 */
    startGameWithSelectedChar() {
        this.levelManager.reset();
        this.initLevel(1);
    }

    // === 角色选择界面 ===

    renderCharacterSelect(ctx, W, H) {
        // 背景
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, '#0a0a2e'); gradient.addColorStop(0.5, '#101040'); gradient.addColorStop(1, '#0a1530');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);

        // 标题
        UITheme.drawArcadeTitle(ctx, W / 2, 55, '选择角色', '#ff8844', 42);

        // 三个角色卡片（缩小以适配布局）
        const cardW = 300, cardH = 390, gap = 40;
        const totalW = cardW * 3 + gap * 2;
        const startX = (W - totalW) / 2;
        const cardY = 80;

        this.charCards = [];
        for (let i = 0; i < this.charList.length; i++) {
            const char = this.charList[i];
            const cx = startX + i * (cardW + gap);
            const selected = i === this.selectedCharIndex;
            const hover = this.isMouseOver(cx, cardY, cardW, cardH);

            // 卡片背景
            ctx.fillStyle = selected ? 'rgba(255,100,0,0.15)' : hover ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.4)';
            ctx.fillRect(cx, cardY, cardW, cardH);

            // 选中边框
            if (selected) {
                ctx.save(); ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 15;
                ctx.strokeStyle = '#ff8844'; ctx.lineWidth = 3;
                ctx.strokeRect(cx, cardY, cardW, cardH);
                ctx.restore();
            } else {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1;
                ctx.strokeRect(cx, cardY, cardW, cardH);
            }

            // 角色预览：优先显示真实立绘图片
            let imgRendered = false;
            if (char.spriteIdle && this.charSpriteImages && this.charSpriteImages[char.id]) {
                const spriteImg = this.charSpriteImages[char.id];
                console.log(`[CharSprite] renderSelect check: ${char.id}, complete=${spriteImg.complete}, naturalWidth=${spriteImg.naturalWidth}`);
                if (spriteImg.complete && spriteImg.naturalWidth > 0) {
                    // 等比缩放：宽度适配卡片85%，高度最大220px
                    const imgScale = Math.min((cardW * 0.85) / spriteImg.naturalWidth, 230 / spriteImg.naturalHeight);
                    const drawW = spriteImg.naturalWidth * imgScale;
                    const drawH = spriteImg.naturalHeight * imgScale;
                    const drawX = cx + cardW / 2 - drawW / 2;
                    const drawY = cardY + 10; // 从卡片顶部开始
                    ctx.drawImage(spriteImg, drawX, drawY, drawW, drawH);
                    imgRendered = true;
                    console.log(`[CharSprite] ✅ renderSelect drew image: ${char.id} (${drawW.toFixed(0)}x${drawH.toFixed(0)})`);
                } else {
                    console.log(`[CharSpriteError] ${char.id} image not ready: complete=${spriteImg.complete}, w=${spriteImg.naturalWidth}`);
                }
            } else {
                console.log(`[CharSpriteError] ${char.id} no cached image: hasSpriteIdle=${!!char.spriteIdle}, hasCache=${!!(this.charSpriteImages && this.charSpriteImages[char.id])}, spriteIdlePath=${char.spriteIdle || 'NULL'}`);
            }
            if (!imgRendered) {
                // 显示"加载中..."占位
                ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.font = '14px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
                ctx.fillText('角色立绘加载中...', cx + cardW / 2, cardY + 120);

                // Fallback：程序绘制或精灵动画
                try {
                    if (!this.charPreviewMachines) this.charPreviewMachines = {};
                    if (!this.charPreviewMachines[char.id]) {
                        const machine = new AnimationStateMachine({ comboCount: 0 });
                        machine.init(char.id);
                        this.charPreviewMachines[char.id] = machine;
                    }
                    const pm = this.charPreviewMachines[char.id];
                    pm.update('idle', 0);
                    let pr = SpriteCharacterRenderer.drawPreview(ctx, cx + cardW / 2, cardY + 80, char.id, this.frameCount, selected, pm, char);
                    if (!pr) CharacterRenderer.drawPreview(ctx, cx + cardW / 2, cardY + 80, char.id, this.frameCount, selected);
                } catch(e) {
                    console.warn(`[CharSpriteError] preview fallback failed for ${char.id}:`, e.message);
                    CharacterRenderer.drawPreview(ctx, cx + cardW / 2, cardY + 80, char.id, this.frameCount, selected);
                }
            }

            // 角色名字
            ctx.fillStyle = selected ? '#ffcc44' : '#cccccc'; ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(char.name, cx + cardW / 2, cardY + 185);

            // 定位
            ctx.fillStyle = selected ? '#ff9944' : '#999999'; ctx.font = '15px "Microsoft YaHei", sans-serif';
            ctx.fillText(char.title, cx + cardW / 2, cardY + 208);

            // 属性条
            const barX = cx + 28, barW = cardW - 56, barH = 9;
            const attrs = [
                { label: 'HP', value: char.maxHp, max: 150, color: '#44cc44' },
                { label: 'EP', value: char.maxEp, max: 150, color: '#44aaff' },
                { label: '速度', value: char.moveSpeed * 20, max: 100, color: '#ffcc44' },
                { label: '攻击', value: char.normalDamage[2] * 4, max: 100, color: '#ff6644' },
            ];
            attrs.forEach((attr, ai) => {
                const ay = cardY + 228 + ai * 26;
                ctx.fillStyle = '#aaa'; ctx.font = '11px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'left';
                ctx.fillText(attr.label, barX, ay + 9);
                ctx.fillStyle = '#333'; ctx.fillRect(barX + 32, ay, barW - 32, barH);
                ctx.fillStyle = attr.color; ctx.fillRect(barX + 32, ay, (barW - 32) * Math.min(1, attr.value / attr.max), barH);
                ctx.strokeStyle = '#555'; ctx.lineWidth = 0.5; ctx.strokeRect(barX + 32, ay, barW - 32, barH);
            });

            // 技能名称
            ctx.fillStyle = selected ? '#88ddff' : '#888'; ctx.font = 'bold 13px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(`技能: ${char.skillName}`, cx + cardW / 2, cardY + 345);

            // 技能说明
            ctx.fillStyle = selected ? '#aaddff' : '#777'; ctx.font = '11px "Microsoft YaHei", sans-serif';
            ctx.fillText(char.skillDesc, cx + cardW / 2, cardY + 365);

            this.charCards.push({ x: cx, y: cardY, w: cardW, h: cardH });
        }

        // === 按钮区域（卡片下方，间距合理） ===

        // "开始闯关"按钮 - 橙色醒目
        const btnW = 240, btnH = 52, btnX = W / 2 - btnW / 2, btnY = 495;
        const hover1 = this.isMouseOver(btnX, btnY, btnW, btnH);
        ctx.save();
        ctx.shadowColor = '#ff6600';
        ctx.shadowBlur = hover1 ? 22 : 14 + Math.sin(this.frameCount * 0.06) * 4;
        ctx.fillStyle = hover1 ? '#ff7722' : '#ee5500';
        ctx.fillRect(btnX, btnY, btnW, btnH);
        ctx.restore();
        ctx.strokeStyle = hover1 ? '#ffbb88' : '#ff8844'; ctx.lineWidth = hover1 ? 3 : 2;
        ctx.strokeRect(btnX, btnY, btnW, btnH);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('开始闯关', W / 2, btnY + 35);
        this.startGameButton = { x: btnX, y: btnY, w: btnW, h: btnH };

        // "返回主菜单 (ESC)" - 独立区域，不和按钮挤在一起
        const backY = 570;
        const backW = 200, backH = 28;
        const backX = W / 2 - backW / 2;
        const hover2 = this.isMouseOver(backX, backY, backW, backH);
        ctx.fillStyle = hover2 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)';
        ctx.fillRect(backX, backY, backW, backH);
        ctx.strokeStyle = hover2 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1; ctx.strokeRect(backX, backY, backW, backH);
        ctx.fillStyle = hover2 ? '#ccc' : '#887766'; ctx.font = '15px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('返回主菜单 (ESC)', W / 2, backY + 20);
        this.backToMenuButton = { x: backX, y: backY, w: backW, h: backH };

        // 操作提示 - 底部，小字
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.font = '12px "Microsoft YaHei", sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('A / D 或 ← → 切换角色    Enter 确认', W / 2, H - 15);
    }

    start() {
        this.canvas.addEventListener('click', (e) => { const pos = this.camera.screenToLogical(e.clientX, e.clientY); this.handleClick(pos.x, pos.y); });
        this.canvas.addEventListener('mousemove', (e) => { const pos = this.camera.screenToLogical(e.clientX, e.clientY); this.mouseX = pos.x; this.mouseY = pos.y; });
        window.addEventListener('blur', () => { if (this.state === 'playing') { this.state = 'paused'; this.audio.pauseBGM(); } });
        this.audio.init(); this.audio.startMenuBGM();
        const charSpriteVersion = window.GAME_BUILD_VERSION || Date.now(); // 统一版本号，避免部署后旧资源闪现
        // 预加载背景图片
        BackgroundRenderer.preloadImages();
        // 预加载菜单封面图
        const coverImg = new Image();
        coverImg.src = `assets/ui/menu_cover.png?v=${charSpriteVersion}`;
        coverImg.onload = () => {
            this.menuCoverImage = coverImg;
            this.menuCoverLoaded = true;
            console.log('[Menu] menu_cover.png loaded');
        };
        coverImg.onerror = () => {
            console.warn('[Menu] menu_cover.png not found, using fallback background');
        };
        // 预加载菜单背景图
        const bgImg = new Image();
        bgImg.src = `assets/ui/menu_bg.png?v=${charSpriteVersion}`;
        bgImg.onload = () => {
            this.menuBgImage = bgImg;
            this.menuBgLoaded = true;
            console.log('[Menu] menu_bg.png loaded');
        };
        bgImg.onerror = () => {
            console.warn('[Menu] menu_bg.png not found');
        };
        // 预加载角色立绘图片（带版本号防缓存）
        this.charList.forEach(char => {
            if (char.spriteIdle) {
                console.log(`[CharSprite] ${char.id} src = ${char.spriteIdle}?v=${charSpriteVersion}`);
                const cImg = new Image();
                cImg.src = `${char.spriteIdle}?v=${charSpriteVersion}`;
                cImg.onload = () => {
                    this.charSpriteImages[char.id] = cImg;
                    // 同时注册到 SpriteCharacterRenderer 静态缓存（共享同一个 Image 对象）
                    SpriteCharacterRenderer.idleImages[char.id] = cImg;
                    console.log(`[CharSprite] ✅ ${char.name} idle loaded, size = ${cImg.naturalWidth}x${cImg.naturalHeight}`);
                };
                cImg.onerror = () => {
                    console.error(`[CharSpriteError] ${char.id} (${char.name}) idle failed: ${cImg.src}`);
                };
            } else {
                console.warn(`[CharSpriteError] ${char.id} has no spriteIdle path!`);
            }
        });
        console.log(`[CharSprite] Total characters to load: ${this.charList.length}, charList IDs: [${this.charList.map(c=>c.id).join(', ')}]`);

        // 预加载角色多帧动作图片
        this.charList.forEach(char => {
            if (char.spriteFrames) {
                this.charSpriteFrameImages[char.id] = {};
                SpriteCharacterRenderer.setFrameImages(char.id, this.charSpriteFrameImages[char.id]);
                let loadedCount = 0, totalCount = 0;
                const walkFrameTotal = char.id === 'chifeng' && Array.isArray(char.spriteFrames.walk)
                    ? char.spriteFrames.walk.length
                    : 0;
                let walkFrameLoaded = 0;
                for (const [state, paths] of Object.entries(char.spriteFrames)) {
                    this.charSpriteFrameImages[char.id][state] = [];
                    paths.forEach((path, index) => {
                        totalCount++;
                        const img = new Image();
                        img.src = `${path}?v=${charSpriteVersion}`;
                        this.charSpriteFrameImages[char.id][state][index] = img; // 先占位
                        img.onload = () => {
                            loadedCount++;
                            console.log(`[CharAnim] ${char.id} ${state} #${index + 1} loaded`);
                            if (loadedCount === totalCount) {
                                console.log(`[CharAnim] ✅ ${char.name} all ${totalCount} frames loaded`);
                                // 注册到 SpriteCharacterRenderer
                                SpriteCharacterRenderer.setFrameImages(char.id, this.charSpriteFrameImages[char.id]);
                            }
                        };
                        img.onerror = () => {
                            console.error(`[CharAnimError] ${char.id} ${state} #${index + 1} failed: ${img.src}`);
                        };
                    });
                }
            } else {
                console.log(`[CharAnim] ${char.id} has no spriteFrames, using single-image mode`);
            }
        });

        // 动作帧自检（输出赤锋动作帧清单）
        const chifengWalkPaths = [
            'assets/sprites/players/chifeng/walk_01.png',
            'assets/sprites/players/chifeng/walk_02.png',
            'assets/sprites/players/chifeng/walk_03.png',
            'assets/sprites/players/chifeng/walk_04.png',
        ];
        this.chifengWalkFrames = new Array(chifengWalkPaths.length);
        let chifengWalkLoaded = 0;
        chifengWalkPaths.forEach((path, index) => {
            const frameName = `walk_${String(index + 1).padStart(2, '0')}`;
            const img = new Image();
            img.src = `${path}?v=${charSpriteVersion}`;
            this.chifengWalkFrames[index] = img;
            img.onload = () => {
                chifengWalkLoaded++;
                console.log(`[WalkAnim] chifeng ${frameName} loaded`);
                if (!this.charSpriteFrameImages.chifeng) {
                    this.charSpriteFrameImages.chifeng = {};
                }
                this.charSpriteFrameImages.chifeng.walk = this.chifengWalkFrames;
                SpriteCharacterRenderer.setFrameImages('chifeng', this.charSpriteFrameImages.chifeng);
                if (chifengWalkLoaded === chifengWalkPaths.length) {
                    console.log('[WalkAnim] chifeng all walk frames loaded');
                }
            };
            img.onerror = () => {
                console.error(`[WalkAnimError] chifeng ${frameName} failed: ${path}`);
            };
        });

        const chifengLaserPose = new Image();
        chifengLaserPose.src = `assets/sprites/players/chifeng/skill_pose.png?v=${charSpriteVersion}`;
        chifengLaserPose.onload = () => {
            this.chifengLaserPoseImage = chifengLaserPose;
            SpriteCharacterRenderer.setSkillPoseImage('chifeng', chifengLaserPose);
            console.log('[LaserSkill] chifeng skill pose loaded');
        };
        chifengLaserPose.onerror = () => {
            console.error('[LaserSkillError] chifeng skill pose failed: assets/sprites/players/chifeng/skill_pose.png');
        };

        const laserBeamImg = new Image();
        laserBeamImg.src = `assets/effects/laser_beam.png?v=${charSpriteVersion}`;
        laserBeamImg.onload = () => {
            this.laserBeamImage = laserBeamImg;
            console.log('[LaserSkill] laser beam loaded');
        };
        laserBeamImg.onerror = () => {
            console.error('[LaserSkillError] laser beam failed: assets/effects/laser_beam.png');
        };

        SpriteCharacterRenderer.frameCheck();

        this.gameLoop();
    }
}
