/**
 * LevelManager.js - 关卡数据管理模块
 * 管理三关的地图、敌人、Boss、道具、背景配置
 */
class LevelManager {
    constructor() {
        this.currentLevel = 1;
        this.maxLevel = 3;
        this.totalEnemiesKilled = 0;
        this.levelEnemiesKilled = 0;
    }

    /** 获取关卡配置 */
    getLevelConfig(level) {
        const configs = {
            1: this.getLevel1Config(),
            2: this.getLevel2Config(),
            3: this.getLevel3Config(),
        };
        return configs[level] || configs[1];
    }

    /** 获取当前关卡配置 */
    getCurrentConfig() {
        return this.getLevelConfig(this.currentLevel);
    }

    /** 是否最终关卡 */
    isFinalLevel() {
        return this.currentLevel >= this.maxLevel;
    }

    /** 进入下一关 */
    nextLevel() {
        if (this.currentLevel < this.maxLevel) {
            this.currentLevel++;
            this.levelEnemiesKilled = 0;
            return true;
        }
        return false;
    }

    /** 重置到第1关 */
    reset() {
        this.currentLevel = 1;
        this.totalEnemiesKilled = 0;
        this.levelEnemiesKilled = 0;
    }

    /** 记录击杀敌人 */
    recordKill() {
        this.totalEnemiesKilled++;
        this.levelEnemiesKilled++;
    }

    // === 第1关：城市街头 ===
    getLevel1Config() {
        const canvasW = 1280;
        return {
            name: '城市街头',
            level: 1,
            mapWidth: canvasW,
            battleYMin: 380,
            battleYMax: 640,
            theme: 'street',
            walkArea: { xMin: 80, xMax: canvasW - 80, yMin: 380, yMax: 640 },
            // 波次配置
            waves: [
                [{ type: 'normal', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'normal', offset: 100 }],
                [{ type: 'fast', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'normal', offset: 100 }],
                [{ type: 'tank', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'normal', offset: 100 }]
            ],
            // Boss 配置
            boss: {
                name: '街区老大',
                hp: 300,
                speed: 1.2,
                verticalSpeed: 0.8,
                punchDamage: 12,
                heavyDamage: 20,
                chargeDamage: 25,
                slamDamage: 18,
                punchRange: 55,
                heavyRange: 65,
                chargeRange: 80,
                slamRange: 100,
                attackCooldownMax: 50,
                charConfig: 'boss1',
                phase2Text: 'Boss 进入强化状态！',
                phase3Text: 'Boss 进入狂暴状态！',
            },
            // 道具配置
            props: {
                crateCount: 8,
                trashcanCount: 5,
                itemDropRate: 0.9,
            },
            // 背景元素生成函数
            generateBgElements: (mapWidth, battleYMin, battleYMax) => {
                const elements = [];
                for (let i = 0; i < 10; i++) {
                    elements.push({ type: 'building', x: 150 + i * 300 + Math.random() * 80, width: 70 + Math.random() * 90, height: 120 + Math.random() * 180, color: `hsl(${210 + Math.random() * 30}, 15%, ${18 + Math.random() * 12}%)` });
                }
                for (let i = 0; i < 8; i++) { elements.push({ type: 'lamp', x: 250 + i * 380 + Math.random() * 40 }); }
                for (let i = 0; i < 4; i++) { elements.push({ type: 'sign', x: 300 + i * 700 + Math.random() * 100, width: 60 + Math.random() * 40, height: 25 + Math.random() * 15, color: `hsl(${Math.random() * 360}, 60%, 45%)` }); }
                for (let i = 0; i < 12; i++) { elements.push({ type: 'debris', x: 80 + Math.random() * (mapWidth - 160), y: battleYMin + Math.random() * (battleYMax - battleYMin), size: 2 + Math.random() * 4, color: `hsl(30, 8%, ${22 + Math.random() * 12}%)` }); }
                return elements;
            },
            // 背景渲染函数
            renderBackground: (ctx, W, H, cameraX, battleYMin, battleYMax, bgElements) => {
                // 天空
                const skyG = ctx.createLinearGradient(0, 0, 0, battleYMin);
                skyG.addColorStop(0, '#080818'); skyG.addColorStop(0.3, '#101030'); skyG.addColorStop(0.6, '#1a1040'); skyG.addColorStop(1, '#2a1828');
                ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, battleYMin);
                // 远景建筑
                const p1 = cameraX * 0.15; ctx.fillStyle = '#12122a';
                for (let i = 0; i < 18; i++) { const bx = i * 100 - p1 % 100, bh = 30 + Math.sin(i * 1.5) * 25; ctx.fillRect(bx, battleYMin - bh - 80, 70, bh + 80); }
                // 中景建筑
                const p2 = cameraX * 0.4;
                for (let i = 0; i < 12; i++) { const bx = i * 160 - p2 % 160, bh = 50 + Math.sin(i * 2.1) * 35; ctx.fillStyle = '#1a1a38'; ctx.fillRect(bx, battleYMin - bh - 30, 110, bh + 30); ctx.fillStyle = '#ffcc44'; for (let wy = 12; wy < bh - 10; wy += 22) for (let wx = 10; wx < 100; wx += 28) { if ((wx + wy + i) % 3 !== 0) ctx.fillRect(bx + wx, battleYMin - bh - 20 + wy, 9, 11); } }
                // 路缘
                ctx.fillStyle = '#3a3a3a'; ctx.fillRect(0, battleYMin - 8, W, 12);
                // 地面
                const stG = ctx.createLinearGradient(0, battleYMin, 0, H);
                stG.addColorStop(0, '#2e2e2e'); stG.addColorStop(0.15, '#333'); stG.addColorStop(0.5, '#2a2a2a'); stG.addColorStop(1, '#1e1e1e');
                ctx.fillStyle = stG; ctx.fillRect(0, battleYMin + 4, W, H - battleYMin - 4);
                // 虚线
                ctx.strokeStyle = '#555544'; ctx.lineWidth = 2; ctx.setLineDash([30, 20]); ctx.beginPath(); ctx.moveTo(-cameraX % 50, (battleYMin + battleYMax) / 2); ctx.lineTo(W, (battleYMin + battleYMax) / 2); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = '#4a4a4a'; ctx.fillRect(0, battleYMin + 2, W, 4);
                // 背景元素
                LevelManager.renderBgElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements);
            },
        };
    }

    // === 第2关：废弃仓库 ===
    getLevel2Config() {
        const canvasW = 1280;
        return {
            name: '废弃仓库',
            level: 2,
            mapWidth: canvasW,
            battleYMin: 380,
            battleYMax: 640,
            theme: 'warehouse',
            walkArea: { xMin: 80, xMax: canvasW - 80, yMin: 380, yMax: 640 },
            waves: [
                [{ type: 'fast', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'fast', offset: 100 }, { type: 'normal', offset: 150 }],
                [{ type: 'normal', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'fast', offset: 100 }, { type: 'tank', offset: 150 }],
                [{ type: 'tank', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'fast', offset: 100 }, { type: 'normal', offset: 150 }, { type: 'fast', offset: 200 }]
            ],
            boss: {
                name: '仓库拳王',
                hp: 360,
                speed: 1.5,
                verticalSpeed: 0.9,
                punchDamage: 14,
                heavyDamage: 24,
                chargeDamage: 28,
                slamDamage: 20,
                punchRange: 58,
                heavyRange: 70,
                chargeRange: 90,
                slamRange: 110,
                attackCooldownMax: 42,
                charConfig: 'boss2',
                phase2Text: '仓库拳王 进入强化状态！',
                phase3Text: '仓库拳王 进入狂暴状态！',
            },
            props: {
                crateCount: 12,
                trashcanCount: 3,
                itemDropRate: 0.95,
            },
            generateBgElements: (mapWidth, battleYMin, battleYMax) => {
                const elements = [];
                // 金属货架
                for (let i = 0; i < 8; i++) {
                    elements.push({ type: 'shelf', x: 200 + i * 400 + Math.random() * 60, width: 50 + Math.random() * 30, height: 100 + Math.random() * 60 });
                }
                // 木箱堆
                for (let i = 0; i < 6; i++) {
                    elements.push({ type: 'crateStack', x: 150 + i * 500 + Math.random() * 80, size: 20 + Math.random() * 15 });
                }
                // 吊灯
                for (let i = 0; i < 6; i++) {
                    elements.push({ type: 'hangingLamp', x: 200 + i * 500 + Math.random() * 100 });
                }
                // 墙面裂纹
                for (let i = 0; i < 5; i++) {
                    elements.push({ type: 'crack', x: 100 + i * 600 + Math.random() * 100 });
                }
                // 油污
                for (let i = 0; i < 10; i++) {
                    elements.push({ type: 'oilStain', x: 80 + Math.random() * (mapWidth - 160), y: battleYMin + 10 + Math.random() * (battleYMax - battleYMin - 20), size: 8 + Math.random() * 12 });
                }
                return elements;
            },
            renderBackground: (ctx, W, H, cameraX, battleYMin, battleYMax, bgElements) => {
                // 天花板
                const ceilG = ctx.createLinearGradient(0, 0, 0, battleYMin);
                ceilG.addColorStop(0, '#0a0a0a'); ceilG.addColorStop(0.5, '#151510'); ceilG.addColorStop(1, '#1a1812');
                ctx.fillStyle = ceilG; ctx.fillRect(0, 0, W, battleYMin);
                // 远景仓库墙壁
                const p1 = cameraX * 0.2;
                ctx.fillStyle = '#1a1815';
                for (let i = 0; i < 16; i++) {
                    const bx = i * 200 - p1 % 200;
                    ctx.fillRect(bx, battleYMin - 200, 180, 200);
                    // 墙面裂纹
                    ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(bx + 40, battleYMin - 180); ctx.lineTo(bx + 55, battleYMin - 140); ctx.lineTo(bx + 50, battleYMin - 100); ctx.stroke();
                }
                // 金属横梁
                ctx.fillStyle = '#2a2825';
                for (let i = 0; i < 8; i++) {
                    const bx = i * 400 - cameraX * 0.3 % 400;
                    ctx.fillRect(bx, battleYMin - 220, 15, 220);
                    ctx.fillRect(bx - 20, battleYMin - 220, 55, 8);
                }
                // 地面
                const flG = ctx.createLinearGradient(0, battleYMin, 0, H);
                flG.addColorStop(0, '#2a2520'); flG.addColorStop(0.2, '#252218'); flG.addColorStop(0.6, '#201d15'); flG.addColorStop(1, '#1a1812');
                ctx.fillStyle = flG; ctx.fillRect(0, battleYMin + 4, W, H - battleYMin - 4);
                // 警戒线
                ctx.strokeStyle = '#ccaa22'; ctx.lineWidth = 3; ctx.setLineDash([20, 15]);
                ctx.beginPath(); ctx.moveTo(-cameraX % 35, (battleYMin + battleYMax) / 2); ctx.lineTo(W, (battleYMin + battleYMax) / 2); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = '#2a2520'; ctx.fillRect(0, battleYMin + 2, W, 4);
                // 背景元素
                LevelManager.renderWarehouseElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements);
            },
        };
    }

    // === 第3关：码头夜战 ===
    getLevel3Config() {
        const canvasW = 1280;
        return {
            name: '码头夜战',
            level: 3,
            mapWidth: canvasW,
            battleYMin: 380,
            battleYMax: 640,
            theme: 'dock',
            walkArea: { xMin: 80, xMax: canvasW - 80, yMin: 380, yMax: 640 },
            waves: [
                [{ type: 'normal', offset: 0 }, { type: 'normal', offset: 50 }, { type: 'tank', offset: 100 }, { type: 'fast', offset: 150 }],
                [{ type: 'tank', offset: 0 }, { type: 'fast', offset: 50 }, { type: 'normal', offset: 100 }, { type: 'tank', offset: 150 }, { type: 'fast', offset: 200 }],
                [{ type: 'tank', offset: 0 }, { type: 'tank', offset: 60 }, { type: 'fast', offset: 120 }, { type: 'fast', offset: 180 }, { type: 'normal', offset: 240 }]
            ],
            boss: {
                name: '码头霸主',
                hp: 450,
                speed: 1.3,
                verticalSpeed: 0.9,
                punchDamage: 16,
                heavyDamage: 26,
                chargeDamage: 30,
                slamDamage: 22,
                punchRange: 60,
                heavyRange: 75,
                chargeRange: 95,
                slamRange: 120,
                attackCooldownMax: 45,
                charConfig: 'boss3',
                phase2Text: '码头霸主 进入强化状态！',
                phase3Text: '码头霸主 进入狂暴状态！',
            },
            props: {
                crateCount: 6,
                trashcanCount: 4,
                itemDropRate: 0.8,
            },
            generateBgElements: (mapWidth, battleYMin, battleYMax) => {
                const elements = [];
                // 集装箱
                for (let i = 0; i < 6; i++) {
                    const colors = ['#2244aa', '#aa3322', '#228833', '#887722', '#553388', '#226688'];
                    elements.push({ type: 'container', x: 200 + i * 550 + Math.random() * 80, width: 80 + Math.random() * 40, height: 60 + Math.random() * 30, color: colors[i] });
                }
                // 吊机
                for (let i = 0; i < 3; i++) {
                    elements.push({ type: 'crane', x: 300 + i * 1100 + Math.random() * 100 });
                }
                // 船灯
                for (let i = 0; i < 4; i++) {
                    elements.push({ type: 'shipLight', x: 100 + i * 800 + Math.random() * 100 });
                }
                // 水面反光
                for (let i = 0; i < 15; i++) {
                    elements.push({ type: 'waterReflect', x: 50 + Math.random() * (mapWidth - 100), y: battleYMin + 5 + Math.random() * 15, size: 3 + Math.random() * 5 });
                }
                return elements;
            },
            renderBackground: (ctx, W, H, cameraX, battleYMin, battleYMax, bgElements) => {
                // 夜空
                const skyG = ctx.createLinearGradient(0, 0, 0, battleYMin);
                skyG.addColorStop(0, '#020810'); skyG.addColorStop(0.3, '#051020'); skyG.addColorStop(0.6, '#0a1830'); skyG.addColorStop(1, '#0a1525');
                ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, battleYMin);
                // 星星
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 30; i++) {
                    const sx = (i * 137 + 50) % W, sy = (i * 89 + 20) % (battleYMin * 0.5);
                    ctx.globalAlpha = 0.3 + Math.sin(i * 2.3) * 0.2;
                    ctx.fillRect(sx, sy, 1.5, 1.5);
                }
                ctx.globalAlpha = 1;
                // 海面远景
                const p1 = cameraX * 0.1;
                ctx.fillStyle = '#061018';
                ctx.fillRect(0, battleYMin - 120, W, 60);
                // 海面波纹
                ctx.strokeStyle = 'rgba(100,150,200,0.08)'; ctx.lineWidth = 1;
                for (let i = 0; i < 20; i++) {
                    const wx = i * 80 - p1 % 80;
                    ctx.beginPath(); ctx.moveTo(wx, battleYMin - 100 + Math.sin(i * 0.8) * 5); ctx.lineTo(wx + 40, battleYMin - 95 + Math.sin(i * 0.8 + 1) * 5); ctx.stroke();
                }
                // 远景船只
                const p2 = cameraX * 0.15;
                for (let i = 0; i < 3; i++) {
                    const bx = i * 500 - p2 % 500 + 100;
                    ctx.fillStyle = '#0a1520'; ctx.fillRect(bx, battleYMin - 140, 60, 30);
                    ctx.fillStyle = '#ffcc44'; ctx.fillRect(bx + 10, battleYMin - 145, 4, 4); ctx.fillRect(bx + 40, battleYMin - 145, 4, 4);
                }
                // 码头地面
                const flG = ctx.createLinearGradient(0, battleYMin, 0, H);
                flG.addColorStop(0, '#1a1a22'); flG.addColorStop(0.2, '#181820'); flG.addColorStop(0.6, '#151520'); flG.addColorStop(1, '#101018');
                ctx.fillStyle = flG; ctx.fillRect(0, battleYMin + 4, W, H - battleYMin - 4);
                // 地面反光
                ctx.fillStyle = 'rgba(100,150,200,0.03)';
                for (let i = 0; i < 8; i++) {
                    const rx = i * 180 - cameraX * 0.8 % 180;
                    ctx.fillRect(rx, battleYMin + 5, 80, 3);
                }
                ctx.fillStyle = '#1a1a22'; ctx.fillRect(0, battleYMin + 2, W, 4);
                // 背景元素
                LevelManager.renderDockElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements);
            },
        };
    }

    // === 静态渲染辅助 ===

    /** 渲染城市街头背景元素 */
    static renderBgElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements) {
        bgElements.forEach(el => {
            const sx = el.x - cameraX;
            if (sx < -200 || sx > W + 200) return;
            if (el.type === 'building') {
                ctx.fillStyle = el.color; ctx.fillRect(sx, battleYMin - el.height, el.width, el.height);
                ctx.fillStyle = '#ffcc44'; for (let wy = 15; wy < el.height - 10; wy += 28) for (let wx = 8; wx < el.width - 8; wx += 20) { if ((wx + wy) % 3 !== 0) ctx.fillRect(sx + wx, battleYMin - el.height + wy, 9, 12); }
                ctx.fillStyle = '#1a1a1a'; ctx.fillRect(sx + el.width / 2 - 10, battleYMin - 40, 20, 40);
            } else if (el.type === 'lamp') {
                ctx.fillStyle = '#555'; ctx.fillRect(sx, battleYMin - 90, 4, 90);
                ctx.fillStyle = '#ffee88'; ctx.beginPath(); ctx.arc(sx + 2, battleYMin - 92, 7, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,238,136,0.06)'; ctx.beginPath(); ctx.arc(sx + 2, battleYMin - 92, 35, 0, Math.PI * 2); ctx.fill();
            } else if (el.type === 'sign') {
                ctx.fillStyle = el.color; ctx.fillRect(sx, battleYMin - 80, el.width, el.height);
                ctx.strokeStyle = '#888'; ctx.lineWidth = 1; ctx.strokeRect(sx, battleYMin - 80, el.width, el.height);
                ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
                const signs = ['BAR', 'OPEN', 'SALE', 'PUB', '24H', 'HOT'];
                ctx.fillText(signs[Math.floor(el.x) % signs.length], sx + el.width / 2, battleYMin - 80 + el.height / 2 + 3);
            } else if (el.type === 'debris') {
                ctx.fillStyle = el.color; ctx.fillRect(sx - el.size / 2, el.y - el.size, el.size, el.size);
            }
        });
    }

    /** 渲染废弃仓库背景元素 */
    static renderWarehouseElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements) {
        bgElements.forEach(el => {
            const sx = el.x - cameraX;
            if (sx < -200 || sx > W + 200) return;
            if (el.type === 'shelf') {
                // 金属货架
                ctx.fillStyle = '#3a3530'; ctx.fillRect(sx, battleYMin - el.height, el.width, el.height);
                ctx.fillStyle = '#4a4540'; for (let sy = 0; sy < el.height; sy += 25) { ctx.fillRect(sx, battleYMin - el.height + sy, el.width, 3); }
                // 货架上的箱子
                ctx.fillStyle = '#5a4a30'; ctx.fillRect(sx + 5, battleYMin - el.height + 5, 15, 12);
                ctx.fillStyle = '#4a5a30'; ctx.fillRect(sx + 25, battleYMin - el.height + 5, 12, 10);
            } else if (el.type === 'crateStack') {
                // 木箱堆
                ctx.fillStyle = '#5a4a30'; ctx.fillRect(sx, battleYMin - el.size * 2, el.size * 1.5, el.size * 2);
                ctx.fillStyle = '#4a3a20'; ctx.fillRect(sx + el.size * 0.3, battleYMin - el.size * 3, el.size * 1.2, el.size);
                ctx.strokeStyle = '#3a2a15'; ctx.lineWidth = 1; ctx.strokeRect(sx, battleYMin - el.size * 2, el.size * 1.5, el.size * 2);
            } else if (el.type === 'hangingLamp') {
                // 吊灯
                ctx.fillStyle = '#444'; ctx.fillRect(sx, battleYMin - 250, 2, 150);
                ctx.fillStyle = '#ffdd66'; ctx.beginPath(); ctx.arc(sx + 1, battleYMin - 100, 8, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,221,102,0.04)'; ctx.beginPath(); ctx.arc(sx + 1, battleYMin - 100, 60, 0, Math.PI * 2); ctx.fill();
            } else if (el.type === 'crack') {
                // 墙面裂纹
                ctx.strokeStyle = '#2a2520'; ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(sx, battleYMin - 180); ctx.lineTo(sx + 15, battleYMin - 140); ctx.lineTo(sx + 10, battleYMin - 100); ctx.lineTo(sx + 25, battleYMin - 60); ctx.stroke();
            } else if (el.type === 'oilStain') {
                // 油污
                ctx.fillStyle = 'rgba(30,25,15,0.4)'; ctx.beginPath(); ctx.ellipse(sx, el.y, el.size, el.size * 0.5, 0, 0, Math.PI * 2); ctx.fill();
            }
        });
    }

    /** 渲染码头夜战背景元素 */
    static renderDockElements(ctx, W, cameraX, battleYMin, battleYMax, bgElements) {
        bgElements.forEach(el => {
            const sx = el.x - cameraX;
            if (sx < -200 || sx > W + 200) return;
            if (el.type === 'container') {
                // 集装箱
                ctx.fillStyle = el.color; ctx.fillRect(sx, battleYMin - el.height - 20, el.width, el.height);
                ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.strokeRect(sx, battleYMin - el.height - 20, el.width, el.height);
                // 集装箱纹理线
                ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(sx, battleYMin - el.height / 2 - 20); ctx.lineTo(sx + el.width, battleYMin - el.height / 2 - 20); ctx.stroke();
            } else if (el.type === 'crane') {
                // 吊机剪影
                ctx.fillStyle = '#0a0a12';
                ctx.fillRect(sx, battleYMin - 280, 8, 280); // 立柱
                ctx.fillRect(sx - 60, battleYMin - 280, 130, 6); // 横臂
                ctx.fillRect(sx - 40, battleYMin - 274, 2, 40); // 吊绳
                ctx.fillRect(sx - 50, battleYMin - 234, 20, 15); // 吊钩
            } else if (el.type === 'shipLight') {
                // 船只灯光
                ctx.fillStyle = '#ff6633'; ctx.beginPath(); ctx.arc(sx, battleYMin - 130, 4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,102,51,0.05)'; ctx.beginPath(); ctx.arc(sx, battleYMin - 130, 25, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#33ff66'; ctx.beginPath(); ctx.arc(sx + 30, battleYMin - 125, 3, 0, Math.PI * 2); ctx.fill();
            } else if (el.type === 'waterReflect') {
                // 水面反光
                ctx.fillStyle = 'rgba(100,150,220,0.08)'; ctx.fillRect(sx - el.size / 2, el.y, el.size, 2);
            }
        });
    }
}
