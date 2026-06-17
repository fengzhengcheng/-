/**
 * BackgroundRenderer.js - 三关视差背景渲染（增强版）
 * 每关4层视差：skyLayer(0.05-0.1) / farLayer(0.15-0.2) / midLayer(0.4-0.5) / frontLayer(0.7-0.85)
 * 不同关卡有完全不同的视觉元素
 * 支持图片背景：如果 assets/backgrounds/ 下有对应图片则使用，否则回退到代码绘制
 */
class BackgroundRenderer {
    /** 预加载的背景图片 */
    static images = {};
    static loaded = false;

    /** 预加载背景图片 */
    static async preloadImages() {
        if (this.loaded) return;
        const version = Date.now(); // 清除缓存
        const imageMap = {
            city_street: `assets/backgrounds/city_street.png?v=${version}`,
            warehouse: `assets/backgrounds/warehouse.png?v=${version}`,
            dock: `assets/backgrounds/dock.png?v=${version}`,
        };
        for (const [key, src] of Object.entries(imageMap)) {
            try {
                const basePath = src.split('?')[0];
                console.log(`[Background] loading ${basePath}`);
                const img = await this.loadImage(src);
                if (img) {
                    this.images[key] = img;
                    console.log(`[Background] loaded ${key} ${img.width}x${img.height}`);
                } else {
                    console.log(`[Background] failed to load ${key} - image returned null`);
                }
            } catch (e) {
                console.log(`[Background] failed to load ${key}: ${e.message}`);
            }
        }
        this.loaded = true;
    }

    /** 异步加载图片 */
    static loadImage(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    /** 绘制图片背景（铺满、保持比例） */
    static drawImageBackground(ctx, img, W, H, cameraX, battleYMin) {
        const imgRatio = img.width / img.height;
        const screenRatio = W / H;
        let drawW, drawH;
        if (imgRatio > screenRatio) {
            drawH = H;
            drawW = H * imgRatio;
        } else {
            drawW = W;
            drawH = W / imgRatio;
        }
        const offX = (W - drawW) / 2 - (cameraX * (drawW / W) * 0.1) % drawW;
        const offY = (H - drawH) / 2;
        ctx.drawImage(img, offX, offY, drawW, drawH);

        // 下半部分用渐变填充（角色活动区域下方）
        if (drawH < H) {
            const groundGrad = ctx.createLinearGradient(0, battleYMin, 0, H);
            groundGrad.addColorStop(0, '#1a1a22');
            groundGrad.addColorStop(1, '#0e0e14');
            ctx.fillStyle = groundGrad;
            ctx.fillRect(0, battleYMin, W, H - battleYMin);
        }
    }

    /** 渲染指定关卡背景 */
    static render(ctx, level, W, H, cameraX, battleYMin, battleYMax, frameCount, lowFX) {
        // 尝试使用图片背景
        const bgKey = ['city_street', 'warehouse', 'dock'][level - 1];
        const levelNames = ['第1关城市街头', '第2关废弃仓库', '第3关码头夜战'];
        if (this.images[bgKey]) {
            console.log(`[Background] using image background: ${bgKey} for ${levelNames[level-1]}`);
            this.drawImageBackground(ctx, this.images[bgKey], W, H, cameraX, battleYMin);
            return;
        }
        console.log(`[Background] using fallback drawing for ${levelNames[level-1]} (${bgKey})`);
        // 无图片时回退到代码绘制
        switch (level) {
            case 1: this.renderCity(ctx, W, H, cameraX, battleYMin, battleYMax, frameCount, lowFX); break;
            case 2: this.renderWarehouse(ctx, W, H, cameraX, battleYMin, battleYMax, frameCount, lowFX); break;
            case 3: this.renderDock(ctx, W, H, cameraX, battleYMin, battleYMax, frameCount, lowFX); break;
        }
    }

    // ============================================================
    //  第1关：城市街头（增强）
    // ============================================================
    static renderCity(ctx, W, H, cameraX, byMin, byMax, frame, lowFX) {
        // ---- skyLayer (0.05) ----
        const skyOff = cameraX * 0.05;
        this.drawCitySky(ctx, W, byMin, skyOff, frame, lowFX);

        // ---- farLayer (0.15) ----
        const farOff = cameraX * 0.15;
        this.drawCityFarBuildings(ctx, W, byMin, farOff, frame, lowFX);

        // ---- midLayer (0.4) ----
        const midOff = cameraX * 0.4;
        this.drawCityMid(ctx, W, H, byMin, byMax, midOff, frame, lowFX);

        // 地面
        this.drawCityGround(ctx, W, H, byMin, byMax, cameraX, frame, lowFX);

        // ---- frontLayer (0.8) ----
        const frontOff = cameraX * 0.8;
        this.drawCityLamps(ctx, W, byMin, byMax, frontOff, frame, lowFX);
    }

    /* --- skyLayer：深蓝夜空 + 星星 + 月亮 + 薄云 --- */
    static drawCitySky(ctx, W, byMin, off, frame, lowFX) {
        const sky = ctx.createLinearGradient(0, 0, 0, byMin);
        sky.addColorStop(0, '#030318');
        sky.addColorStop(0.3, '#080830');
        sky.addColorStop(0.6, '#0c0c3a');
        sky.addColorStop(1, '#151548');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, byMin);

        if (lowFX) return;

        // 星星 40+
        for (let i = 0; i < 50; i++) {
            const sx = ((i * 137 + 50) % (W + 200)) - 100 - (off * 0.3) % (W + 200);
            const sy = (i * 89 + 20) % (byMin * 0.55);
            const size = (i % 5 === 0) ? 2 : 1.2;
            const twinkle = 0.25 + Math.sin(frame * 0.025 + i * 1.7) * 0.35;
            ctx.globalAlpha = Math.max(0, twinkle);
            ctx.fillStyle = i % 7 === 0 ? '#aaccff' : '#ffffff';
            ctx.fillRect(sx, sy, size, size);
            // 大星十字光芒
            if (i % 11 === 0) {
                ctx.globalAlpha = twinkle * 0.4;
                ctx.fillRect(sx - 3, sy + 0.3, 7, 0.8);
                ctx.fillRect(sx + 0.3, sy - 3, 0.8, 7);
            }
        }
        ctx.globalAlpha = 1;

        // 月亮
        const mx = W * 0.78 - off * 0.2;
        const my = byMin * 0.15;
        // 月晕
        const moonGlow = ctx.createRadialGradient(mx, my, 8, mx, my, 60);
        moonGlow.addColorStop(0, 'rgba(200,210,255,0.12)');
        moonGlow.addColorStop(0.5, 'rgba(150,170,220,0.04)');
        moonGlow.addColorStop(1, 'rgba(100,120,180,0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(mx - 60, my - 60, 120, 120);
        // 月亮本体
        ctx.fillStyle = '#dde4f0';
        ctx.beginPath();
        ctx.arc(mx, my, 14, 0, Math.PI * 2);
        ctx.fill();
        // 月亮暗面（新月效果）
        ctx.fillStyle = '#080830';
        ctx.beginPath();
        ctx.arc(mx + 5, my - 2, 11, 0, Math.PI * 2);
        ctx.fill();

        // 薄云（3条）
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#8888aa';
        for (let c = 0; c < 3; c++) {
            const cy = byMin * (0.2 + c * 0.15);
            const cx = ((c * 500 + 100) - off * 0.5) % (W + 400) - 200;
            for (let p = 0; p < 5; p++) {
                const px = cx + p * 60;
                const pw = 80 + (c + p) * 15;
                const ph = 12 + c * 4;
                ctx.beginPath();
                ctx.ellipse(px, cy, pw / 2, ph / 2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    }

    /* --- farLayer：3排高楼 + 窗户暖光闪烁 + 霓虹灯牌 --- */
    static drawCityFarBuildings(ctx, W, byMin, off, frame, lowFX) {
        // 后排（最远、最矮、最暗）
        this._drawCityBuildingRow(ctx, W, byMin, off * 0.6, {
            color: '#08081e', windowColor: 'rgba(255,200,100,0.08)',
            heights: [35, 50, 30, 55, 40, 45, 60, 35, 50, 40, 55, 30, 45, 50, 35, 60, 40, 55, 30, 50],
            widthBase: 60, widthVar: 25, spacing: 130, yOff: 0, winStep: 20, winSize: [4, 5]
        });
        // 中排
        this._drawCityBuildingRow(ctx, W, byMin, off * 0.85, {
            color: '#0a0a25', windowColor: 'rgba(255,200,100,0.12)',
            heights: [55, 80, 45, 100, 65, 90, 50, 75, 95, 60, 85, 40, 70, 55, 90, 65, 110, 45, 80, 60],
            widthBase: 70, widthVar: 30, spacing: 150, yOff: 0, winStep: 18, winSize: [5, 7]
        });
        // 前排（最近、最高）
        this._drawCityBuildingRow(ctx, W, byMin, off, {
            color: '#0c0c2c', windowColor: 'rgba(255,200,100,0.18)',
            heights: [70, 110, 55, 130, 85, 115, 60, 95, 125, 75, 105, 50, 90, 70, 120, 80, 140, 55, 100, 75],
            widthBase: 80, widthVar: 35, spacing: 160, yOff: 0, winStep: 16, winSize: [6, 8]
        });

        // 霓虹灯牌
        if (!lowFX) {
            this.drawCityNeonSigns(ctx, W, byMin, off, frame);
        }
    }

    static _drawCityBuildingRow(ctx, W, byMin, off, cfg) {
        const { color, windowColor, heights, widthBase, widthVar, spacing, yOff, winStep, winSize } = cfg;
        for (let i = 0; i < heights.length; i++) {
            const bx = i * spacing - (off % spacing);
            const bh = heights[i];
            const bw = widthBase + (i % 3) * widthVar;
            ctx.fillStyle = color;
            ctx.fillRect(bx, byMin - bh - yOff, bw, bh + yOff);
            // 窗户
            ctx.fillStyle = windowColor;
            for (let wy = byMin - bh + 8; wy < byMin - 6; wy += winStep) {
                for (let wx = bx + 6; wx < bx + bw - 6; wx += winStep) {
                    // 随机亮灭（基于位置hash）
                    if (Math.sin(wx * 3.7 + wy * 7.3 + i * 2.1) > 0.15) {
                        ctx.fillRect(wx, wy, winSize[0], winSize[1]);
                    }
                }
            }
        }
    }

    /* --- 霓虹灯牌 --- */
    static drawCityNeonSigns(ctx, W, byMin, off, frame) {
        const signs = [
            { x: 250, text: 'BAR', color: '#ff3366', y: 0.65 },
            { x: 700, text: 'HOTEL', color: '#33ccff', y: 0.55 },
            { x: 1200, text: 'CLUB', color: '#ff66ff', y: 0.6 },
            { x: 1700, text: '24H', color: '#66ff33', y: 0.7 },
            { x: 2200, text: 'NEON', color: '#ffaa00', y: 0.58 },
        ];
        signs.forEach(s => {
            const sx = s.x - off;
            if (sx < -80 || sx > W + 80) return;
            const sy = byMin * s.y;
            // 闪烁
            const flicker = 0.7 + Math.sin(frame * 0.06 + s.x * 0.01) * 0.3;
            ctx.save();
            ctx.globalAlpha = flicker;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = s.color;
            ctx.font = 'bold 16px "Courier New", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(s.text, sx, sy);
            // 双重发光
            ctx.shadowBlur = 25;
            ctx.globalAlpha = flicker * 0.4;
            ctx.fillText(s.text, sx, sy);
            ctx.restore();
        });
    }

    /* --- midLayer：店铺 + 招牌霓虹 + 遮雨棚 + 空调外机 + 窗户 --- */
    static drawCityMid(ctx, W, H, byMin, byMax, off, frame, lowFX) {
        const shops = [
            { x: 80,   w: 130, h: 90,  color: '#1a1a38', sign: '酒馆', sc: '#ff6644', awning: '#883322' },
            { x: 350,  w: 110, h: 78,  color: '#1a1532', sign: '商店', sc: '#44aaff', awning: '#224466' },
            { x: 620,  w: 150, h: 95,  color: '#181832', sign: '餐厅', sc: '#ffaa44', awning: '#886622' },
            { x: 920,  w: 115, h: 80,  color: '#1a1a38', sign: '药店', sc: '#44ff88', awning: '#226644' },
            { x: 1220, w: 140, h: 88,  color: '#151532', sign: '武馆', sc: '#ff4488', awning: '#882244' },
            { x: 1520, w: 110, h: 75,  color: '#1a1838', sign: '当铺', sc: '#cccc44', awning: '#666622' },
            { x: 1820, w: 130, h: 85,  color: '#181832', sign: '旅馆', sc: '#ff8844', awning: '#884422' },
            { x: 2120, w: 115, h: 80,  color: '#1a1a38', sign: '酒吧', sc: '#cc44ff', awning: '#662288' },
        ];
        shops.forEach(s => {
            const sx = s.x - off;
            if (sx + s.w < -60 || sx > W + 60) return;

            // 建筑主体
            ctx.fillStyle = s.color;
            ctx.fillRect(sx, byMin - s.h, s.w, s.h);

            // 屋顶线
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(sx, byMin - s.h, s.w, 3);

            // 窗户（上方）
            ctx.fillStyle = 'rgba(255,200,100,0.1)';
            for (let wi = 0; wi < 2; wi++) {
                const wx = sx + 15 + wi * (s.w - 50);
                ctx.fillRect(wx, byMin - s.h + 12, 20, 18);
                ctx.strokeStyle = 'rgba(255,255,255,0.06)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(wx, byMin - s.h + 12, 20, 18);
                // 窗户十字
                ctx.beginPath();
                ctx.moveTo(wx + 10, byMin - s.h + 12);
                ctx.lineTo(wx + 10, byMin - s.h + 30);
                ctx.moveTo(wx, byMin - s.h + 21);
                ctx.lineTo(wx + 20, byMin - s.h + 21);
                ctx.stroke();
            }

            // 遮雨棚
            ctx.fillStyle = s.awning;
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.moveTo(sx - 5, byMin - s.h + 35);
            ctx.lineTo(sx + s.w + 5, byMin - s.h + 35);
            ctx.lineTo(sx + s.w, byMin - s.h + 45);
            ctx.lineTo(sx, byMin - s.h + 45);
            ctx.closePath();
            ctx.fill();
            // 遮雨棚条纹
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            for (let si = 0; si < s.w; si += 12) {
                ctx.fillRect(sx + si, byMin - s.h + 35, 6, 10);
            }
            ctx.globalAlpha = 1;

            // 空调外机
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(sx + s.w - 22, byMin - s.h + 50, 18, 12);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(sx + s.w - 20, byMin - s.h + 52, 14, 3);

            // 招牌（霓虹发光）
            ctx.save();
            const flicker = 0.8 + Math.sin(frame * 0.05 + s.x * 0.01) * 0.2;
            ctx.globalAlpha = flicker;
            ctx.shadowColor = s.sc;
            ctx.shadowBlur = 10;
            ctx.fillStyle = s.sc;
            ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.sign, sx + s.w / 2, byMin - s.h + 28);
            // 二次发光
            ctx.shadowBlur = 22;
            ctx.globalAlpha = flicker * 0.35;
            ctx.fillText(s.sign, sx + s.w / 2, byMin - s.h + 28);
            ctx.restore();

            // 门
            ctx.fillStyle = '#0a0a18';
            ctx.fillRect(sx + s.w / 2 - 13, byMin - 32, 26, 32);
            // 门框
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + s.w / 2 - 13, byMin - 32, 26, 32);
            // 门上小窗
            ctx.fillStyle = 'rgba(255,200,100,0.08)';
            ctx.fillRect(sx + s.w / 2 - 10, byMin - 28, 20, 10);
        });
    }

    /* --- 地面：裂纹 + 斑马线 + 井盖 + 路缘线 + 排水沟 + 路面反光 --- */
    static drawCityGround(ctx, W, H, byMin, byMax, off, frame, lowFX) {
        const gh = byMax - byMin + 40;
        const ground = ctx.createLinearGradient(0, byMin, 0, byMax + 40);
        ground.addColorStop(0, '#2c2c38');
        ground.addColorStop(0.15, '#282832');
        ground.addColorStop(0.5, '#242430');
        ground.addColorStop(1, '#1a1a22');
        ctx.fillStyle = ground;
        ctx.fillRect(0, byMin, W, gh);

        // 路缘线
        ctx.fillStyle = '#3a3a48';
        ctx.fillRect(0, byMin, W, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, byMin + 3, W, 1);

        // 排水沟
        ctx.fillStyle = '#151518';
        ctx.fillRect(0, byMin + 4, W, 5);
        // 排水沟格栅
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let dx = -(off % 15); dx < W; dx += 15) {
            ctx.beginPath();
            ctx.moveTo(dx, byMin + 4);
            ctx.lineTo(dx, byMin + 9);
            ctx.stroke();
        }

        // 斑马线残影
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let z = 0; z < 3; z++) {
            const zx = (z * 800 + 300) - off;
            if (zx < -200 || zx > W + 200) continue;
            for (let i = 0; i < 8; i++) {
                ctx.fillRect(zx + i * 28, byMin + 12, 14, byMax - byMin - 20);
            }
        }

        // 井盖
        for (let i = 0; i < 6; i++) {
            const gx = (i * 450 + 180) - off;
            if (gx < -30 || gx > W + 30) continue;
            const gy = byMin + (byMax - byMin) * 0.55;
            ctx.strokeStyle = '#3a3a44';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(gx, gy, 11, 0, Math.PI * 2);
            ctx.stroke();
            // 井盖纹理
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(gx - 7, gy);
            ctx.lineTo(gx + 7, gy);
            ctx.moveTo(gx, gy - 7);
            ctx.lineTo(gx, gy + 7);
            ctx.stroke();
        }

        // 路面裂纹
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 0.8;
        const cracks = [
            { x: 300, y: 0.4, pts: [[0,0],[15,-5],[30,2],[45,-3],[55,5]] },
            { x: 900, y: 0.6, pts: [[0,0],[10,4],[25,-2],[40,3],[50,-4],[60,1]] },
            { x: 1600, y: 0.35, pts: [[0,0],[12,-3],[20,5],[35,-1],[42,4]] },
            { x: 2300, y: 0.5, pts: [[0,0],[8,3],[18,-4],[30,2],[40,-3],[52,1]] },
        ];
        cracks.forEach(c => {
            const cx = c.x - off;
            if (cx < -80 || cx > W + 80) return;
            const cy = byMin + (byMax - byMin) * c.y;
            ctx.beginPath();
            c.pts.forEach((p, idx) => {
                const px = cx + p[0], py = cy + p[1];
                idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            });
            ctx.stroke();
        });

        // 路面反光（湿润效果）
        if (!lowFX) {
            ctx.fillStyle = `rgba(80,90,120,${0.03 + Math.sin(frame * 0.008) * 0.015})`;
            ctx.fillRect(0, byMin + 10, W, byMax - byMin - 10);
        }
    }

    /* --- frontLayer：路灯 + 灯柱底座 + 灯罩 + 大光晕 + 路标牌 --- */
    static drawCityLamps(ctx, W, byMin, byMax, off, frame, lowFX) {
        for (let i = 0; i < 10; i++) {
            const lx = i * 320 + 80 - off;
            if (lx < -40 || lx > W + 40) continue;

            // 灯柱底座
            ctx.fillStyle = '#3a3a44';
            ctx.fillRect(lx - 6, byMin - 4, 12, 6);

            // 灯柱
            ctx.fillStyle = '#444450';
            ctx.fillRect(lx - 2.5, byMin - 110, 5, 110);

            // 灯臂
            ctx.fillStyle = '#444450';
            ctx.fillRect(lx - 2, byMin - 110, 18, 3);

            // 灯罩
            ctx.fillStyle = '#555565';
            ctx.beginPath();
            ctx.moveTo(lx + 10, byMin - 115);
            ctx.lineTo(lx + 24, byMin - 115);
            ctx.lineTo(lx + 22, byMin - 108);
            ctx.lineTo(lx + 12, byMin - 108);
            ctx.closePath();
            ctx.fill();

            // 灯泡
            ctx.fillStyle = '#ffee88';
            ctx.fillRect(lx + 14, byMin - 108, 5, 3);

            // 大光晕
            if (!lowFX) {
                const pulse = 0.12 + Math.sin(frame * 0.015 + i * 1.3) * 0.03;
                const glow = ctx.createRadialGradient(lx + 16, byMin - 105, 3, lx + 16, byMin - 50, 90);
                glow.addColorStop(0, `rgba(255,210,120,${pulse})`);
                glow.addColorStop(0.4, `rgba(255,190,100,${pulse * 0.4})`);
                glow.addColorStop(1, 'rgba(255,180,80,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(lx - 80, byMin - 150, 190, 200);

                // 地面光斑
                const groundGlow = ctx.createRadialGradient(lx + 16, byMin + 15, 5, lx + 16, byMin + 15, 55);
                groundGlow.addColorStop(0, `rgba(255,210,120,${pulse * 0.3})`);
                groundGlow.addColorStop(1, 'rgba(255,200,100,0)');
                ctx.fillStyle = groundGlow;
                ctx.fillRect(lx - 40, byMin, 110, 50);
            }
        }

        // 路标牌
        const signs = [
            { x: 200, text: '← Downtown', color: '#44aa44' },
            { x: 800, text: 'Harbor →', color: '#4488cc' },
            { x: 1400, text: '← Station', color: '#cc8844' },
            { x: 2000, text: 'Airport →', color: '#cc4488' },
        ];
        signs.forEach(s => {
            const sx = s.x - off;
            if (sx < -80 || sx > W + 80) return;
            // 标杆
            ctx.fillStyle = '#555560';
            ctx.fillRect(sx - 1.5, byMin - 70, 3, 70);
            // 牌子
            ctx.fillStyle = '#1a2a1a';
            ctx.fillRect(sx - 40, byMin - 72, 80, 18);
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 1;
            ctx.strokeRect(sx - 40, byMin - 72, 80, 18);
            ctx.fillStyle = s.color;
            ctx.font = '9px "Arial", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(s.text, sx, byMin - 59);
        });
    }

    // ============================================================
    //  第2关：废弃仓库（增强）
    // ============================================================
    static renderWarehouse(ctx, W, H, cameraX, byMin, byMax, frame, lowFX) {
        // ---- skyLayer (0.08) ----
        const skyOff = cameraX * 0.08;
        this.drawWarehouseCeiling(ctx, W, byMin, skyOff, frame, lowFX);

        // ---- farLayer (0.15) ----
        const farOff = cameraX * 0.15;
        this.drawWarehouseBackWall(ctx, W, byMin, farOff, frame, lowFX);

        // ---- midLayer (0.5) ----
        const midOff = cameraX * 0.5;
        this.drawWarehouseMid(ctx, W, byMin, byMax, midOff, frame, lowFX);

        // 地面
        this.drawWarehouseGround(ctx, W, H, byMin, byMax, cameraX, frame, lowFX);

        // ---- frontLayer (0.7) ----
        const frontOff = cameraX * 0.7;
        this.drawWarehouseLights(ctx, W, byMin, byMax, frontOff, frame, lowFX);
    }

    /* --- skyLayer：天花板 + 金属横梁 + 蜘蛛网 + 通风管道 --- */
    static drawWarehouseCeiling(ctx, W, byMin, off, frame, lowFX) {
        const sky = ctx.createLinearGradient(0, 0, 0, byMin);
        sky.addColorStop(0, '#060608');
        sky.addColorStop(0.4, '#0a0a0e');
        sky.addColorStop(1, '#121216');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, byMin);

        // 金属横梁
        ctx.fillStyle = '#1a1a22';
        for (let i = 0; i < 8; i++) {
            const bx = i * 350 - (off % 350);
            ctx.fillRect(bx, 0, 12, byMin * 0.15);
            // 横梁交叉支撑
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(bx + 2, 0);
            ctx.lineTo(bx + 10, byMin * 0.14);
            ctx.moveTo(bx + 10, 0);
            ctx.lineTo(bx + 2, byMin * 0.14);
            ctx.stroke();
        }
        // 纵梁
        ctx.fillStyle = '#161620';
        ctx.fillRect(0, byMin * 0.12, W, 6);
        ctx.fillRect(0, byMin * 0.06, W, 4);

        // 通风管道
        ctx.fillStyle = '#141418';
        for (let i = 0; i < 4; i++) {
            const px = i * 600 + 150 - off;
            if (px < -60 || px > W + 60) continue;
            ctx.fillRect(px, byMin * 0.02, 50, 14);
            ctx.fillRect(px + 5, byMin * 0.02 + 14, 8, byMin * 0.08);
            ctx.fillRect(px + 37, byMin * 0.02 + 14, 8, byMin * 0.08);
            // 管道接口
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(px, byMin * 0.02, 50, 14);
        }

        // 蜘蛛网
        if (!lowFX) {
            ctx.strokeStyle = 'rgba(200,200,200,0.06)';
            ctx.lineWidth = 0.5;
            const webs = [{ x: 100, y: 10 }, { x: 500, y: 5 }, { x: 1000, y: 12 }, { x: 1600, y: 8 }];
            webs.forEach(w => {
                const wx = w.x - off * 0.5;
                if (wx < -40 || wx > W + 40) return;
                const wy = w.y;
                const size = 25;
                // 放射线
                for (let a = 0; a < 8; a++) {
                    const angle = (a / 8) * Math.PI * 2;
                    ctx.beginPath();
                    ctx.moveTo(wx, wy);
                    ctx.lineTo(wx + Math.cos(angle) * size, wy + Math.sin(angle) * size * 0.6);
                    ctx.stroke();
                }
                // 同心环
                for (let r = 6; r <= size; r += 7) {
                    ctx.beginPath();
                    ctx.ellipse(wx, wy, r, r * 0.6, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
            });
        }
    }

    /* --- farLayer：后墙 + 砖纹 + 铁门 + 警戒标志 + 管道 + 裂纹 + 锈迹 --- */
    static drawWarehouseBackWall(ctx, W, byMin, off, frame, lowFX) {
        // 墙面底色
        const wallGrad = ctx.createLinearGradient(0, 0, 0, byMin);
        wallGrad.addColorStop(0, '#0e0e14');
        wallGrad.addColorStop(1, '#161620');
        ctx.fillStyle = wallGrad;
        ctx.fillRect(0, 0, W, byMin);

        // 砖纹
        ctx.strokeStyle = 'rgba(255,255,255,0.025)';
        ctx.lineWidth = 0.5;
        for (let y = 15; y < byMin; y += 18) {
            const shift = (Math.floor(y / 18) % 2) * 22;
            for (let x = (-off % 44) + shift - 44; x < W + 44; x += 44) {
                ctx.strokeRect(x, y, 44, 18);
            }
        }

        // 锈迹
        ctx.fillStyle = 'rgba(80,40,20,0.08)';
        const rustSpots = [
            { x: 150, y: 0.3, r: 20 }, { x: 400, y: 0.5, r: 15 },
            { x: 750, y: 0.2, r: 25 }, { x: 1100, y: 0.6, r: 18 },
            { x: 1500, y: 0.35, r: 22 }, { x: 1900, y: 0.45, r: 16 },
        ];
        rustSpots.forEach(r => {
            const rx = r.x - off;
            if (rx < -40 || rx > W + 40) return;
            ctx.beginPath();
            ctx.ellipse(rx, byMin * r.y, r.r, r.r * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // 铁门
        const doors = [{ x: 300 }, { x: 1000 }, { x: 1800 }];
        doors.forEach(d => {
            const dx = d.x - off;
            if (dx < -50 || dx > W + 50) return;
            ctx.fillStyle = '#1a1a24';
            ctx.fillRect(dx, byMin * 0.25, 50, byMin * 0.75);
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            ctx.strokeRect(dx, byMin * 0.25, 50, byMin * 0.75);
            // 门上铆钉
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            for (let ry = 0; ry < 4; ry++) {
                ctx.beginPath();
                ctx.arc(dx + 12, byMin * 0.3 + ry * byMin * 0.15, 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(dx + 38, byMin * 0.3 + ry * byMin * 0.15, 2, 0, Math.PI * 2);
                ctx.fill();
            }
            // 门把手
            ctx.fillStyle = '#2a2a35';
            ctx.fillRect(dx + 38, byMin * 0.55, 4, 10);
        });

        // 警戒标志
        const warnings = [{ x: 600, y: 0.4 }, { x: 1400, y: 0.35 }];
        warnings.forEach(w => {
            const wx = w.x - off;
            if (wx < -30 || wx > W + 30) return;
            const wy = byMin * w.y;
            ctx.fillStyle = 'rgba(200,180,0,0.12)';
            ctx.beginPath();
            ctx.moveTo(wx, wy - 12);
            ctx.lineTo(wx + 10, wy + 6);
            ctx.lineTo(wx - 10, wy + 6);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.font = '7px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('!', wx, wy + 3);
        });

        // 管道
        this.drawWarehousePipes(ctx, W, byMin, off);

        // 墙面裂纹
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.8;
        const wallCracks = [
            { x: 500, y: 0.3, pts: [[0,0],[8,-12],[15,5],[22,-8],[30,3],[38,-5]] },
            { x: 1200, y: 0.5, pts: [[0,0],[6,10],[14,-5],[20,8],[28,-3],[35,6]] },
            { x: 2000, y: 0.25, pts: [[0,0],[10,8],[18,-6],[25,4],[32,-8]] },
        ];
        wallCracks.forEach(c => {
            const cx = c.x - off;
            if (cx < -60 || cx > W + 60) return;
            const cy = byMin * c.y;
            ctx.beginPath();
            c.pts.forEach((p, idx) => {
                idx === 0 ? ctx.moveTo(cx + p[0], cy + p[1]) : ctx.lineTo(cx + p[0], cy + p[1]);
            });
            ctx.stroke();
        });
    }

    /* --- 管道 --- */
    static drawWarehousePipes(ctx, W, byMin, off) {
        const pipes = [
            { x: 100, y: 0.2, len: 300, thick: 6, vert: false },
            { x: 100, y: 0.2, len: 80, thick: 6, vert: true },
            { x: 700, y: 0.15, len: 250, thick: 8, vert: false },
            { x: 950, y: 0.15, len: 60, thick: 8, vert: true },
            { x: 1300, y: 0.25, len: 200, thick: 5, vert: false },
            { x: 1300, y: 0.25, len: 70, thick: 5, vert: true },
            { x: 1800, y: 0.18, len: 280, thick: 7, vert: false },
        ];
        pipes.forEach(p => {
            const px = p.x - off;
            if (px < -300 || px > W + 300) return;
            const py = byMin * p.y;
            ctx.fillStyle = '#1e1e28';
            if (p.vert) {
                ctx.fillRect(px - p.thick / 2, py, p.thick, p.len);
                // 管道接头
                ctx.fillStyle = '#252530';
                ctx.fillRect(px - p.thick / 2 - 2, py, p.thick + 4, 4);
                ctx.fillRect(px - p.thick / 2 - 2, py + p.len - 4, p.thick + 4, 4);
            } else {
                ctx.fillRect(px, py - p.thick / 2, p.len, p.thick);
                // 管道接头
                ctx.fillStyle = '#252530';
                ctx.fillRect(px, py - p.thick / 2 - 2, 4, p.thick + 4);
                ctx.fillRect(px + p.len - 4, py - p.thick / 2 - 2, 4, p.thick + 4);
            }
            // 高光
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            if (p.vert) {
                ctx.fillRect(px - p.thick / 2 + 1, py, 1.5, p.len);
            } else {
                ctx.fillRect(px, py - p.thick / 2 + 1, p.len, 1.5);
            }
        });
    }

    /* --- midLayer：柱子+底座+锈蚀 + 货架+物品 + 木箱堆 + 铁丝网 --- */
    static drawWarehouseMid(ctx, W, byMin, byMax, off, frame, lowFX) {
        // 柱子（带底座和锈蚀）
        for (let i = 0; i < 12; i++) {
            const px = i * 350 + 80 - off;
            if (px < -30 || px > W + 30) continue;
            // 底座
            ctx.fillStyle = '#2a2a38';
            ctx.fillRect(px - 18, byMin - 6, 36, 8);
            // 柱身
            ctx.fillStyle = '#222230';
            ctx.fillRect(px - 10, byMin - 130, 20, 130);
            // 柱顶
            ctx.fillStyle = '#2a2a38';
            ctx.fillRect(px - 14, byMin - 134, 28, 6);
            // 锈蚀纹理
            ctx.fillStyle = 'rgba(80,50,25,0.1)';
            for (let r = 0; r < 3; r++) {
                const ry = byMin - 20 - r * 35;
                const rx = px - 6 + (r % 2) * 8;
                ctx.beginPath();
                ctx.ellipse(rx, ry, 4 + r, 3 + r * 0.5, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            // 柱身高光
            ctx.fillStyle = 'rgba(255,255,255,0.02)';
            ctx.fillRect(px - 9, byMin - 130, 3, 130);
        }

        // 货架（带物品）
        for (let i = 0; i < 7; i++) {
            const sx = i * 500 + 150 - off;
            if (sx < -80 || sx > W + 80) continue;
            // 货架框架
            ctx.fillStyle = '#1e1e2a';
            ctx.fillRect(sx, byMin - 70, 65, 70);
            // 层板
            ctx.fillStyle = '#282835';
            ctx.fillRect(sx, byMin - 70, 65, 3);
            ctx.fillRect(sx, byMin - 48, 65, 3);
            ctx.fillRect(sx, byMin - 26, 65, 3);
            // 物品
            const items = [
                { y: byMin - 66, w: 12, h: 14, color: '#2a3528' },
                { y: byMin - 64, w: 8, h: 10, color: '#352a28' },
                { y: byMin - 44, w: 15, h: 12, color: '#283035' },
                { y: byMin - 42, w: 10, h: 8, color: '#353028' },
                { y: byMin - 22, w: 14, h: 10, color: '#302835' },
            ];
            items.forEach((it, idx) => {
                ctx.fillStyle = it.color;
                ctx.fillRect(sx + 8 + idx * 10, it.y, it.w, it.h);
            });
        }

        // 木箱堆（不同大小）
        const crateGroups = [
            { x: 250, crates: [{ dx: 0, dy: 0, w: 30, h: 25 }, { dx: 32, dy: 0, w: 25, h: 22 }, { dx: 5, dy: -27, w: 28, h: 24 }] },
            { x: 800, crates: [{ dx: 0, dy: 0, w: 35, h: 30 }, { dx: 37, dy: 0, w: 28, h: 25 }, { dx: 10, dy: -32, w: 30, h: 28 }, { dx: 12, dy: -60, w: 22, h: 20 }] },
            { x: 1400, crates: [{ dx: 0, dy: 0, w: 28, h: 24 }, { dx: 30, dy: 0, w: 32, h: 28 }, { dx: 8, dy: -26, w: 25, h: 22 }] },
            { x: 2000, crates: [{ dx: 0, dy: 0, w: 32, h: 28 }, { dx: 34, dy: 0, w: 26, h: 22 }, { dx: 6, dy: -30, w: 30, h: 26 }] },
        ];
        crateGroups.forEach(g => {
            const gx = g.x - off;
            if (gx < -80 || gx > W + 80) return;
            g.crates.forEach(c => {
                ctx.fillStyle = '#2a2518';
                ctx.fillRect(gx + c.dx, byMin + c.dy - c.h, c.w, c.h);
                ctx.strokeStyle = 'rgba(255,255,255,0.05)';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(gx + c.dx, byMin + c.dy - c.h, c.w, c.h);
                // 木纹
                ctx.strokeStyle = 'rgba(0,0,0,0.15)';
                ctx.beginPath();
                ctx.moveTo(gx + c.dx + 3, byMin + c.dy - c.h / 2);
                ctx.lineTo(gx + c.dx + c.w - 3, byMin + c.dy - c.h / 2);
                ctx.stroke();
            });
        });

        // 铁丝网
        ctx.strokeStyle = 'rgba(180,180,180,0.06)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const fx = i * 700 + 100 - off;
            if (fx < -60 || fx > W + 60) continue;
            const fy = byMin - 90;
            const fh = 50;
            // 竖线
            for (let v = 0; v < 6; v++) {
                ctx.beginPath();
                ctx.moveTo(fx + v * 10, fy);
                ctx.lineTo(fx + v * 10, fy + fh);
                ctx.stroke();
            }
            // 横线
            for (let h = 0; h < 4; h++) {
                ctx.beginPath();
                ctx.moveTo(fx, fy + h * 14);
                ctx.lineTo(fx + 50, fy + h * 14);
                ctx.stroke();
            }
        }
    }

    /* --- 地面：粗糙纹理 + 暗色渐变 + 油污 + 水渍 + 裂缝 + 排水沟 --- */
    static drawWarehouseGround(ctx, W, H, byMin, byMax, off, frame, lowFX) {
        const gh = byMax - byMin + 40;
        const ground = ctx.createLinearGradient(0, byMin, 0, byMax + 40);
        ground.addColorStop(0, '#1e1e24');
        ground.addColorStop(0.2, '#1a1a20');
        ground.addColorStop(0.6, '#17171c');
        ground.addColorStop(1, '#121216');
        ctx.fillStyle = ground;
        ctx.fillRect(0, byMin, W, gh);

        // 粗糙纹理（噪点）
        if (!lowFX) {
            ctx.fillStyle = 'rgba(255,255,255,0.012)';
            for (let i = 0; i < 60; i++) {
                const nx = (i * 97 + 33) % W;
                const ny = byMin + (i * 53 + 17) % (byMax - byMin);
                ctx.fillRect(nx, ny, 2 + (i % 3), 1);
            }
        }

        // 排水沟
        ctx.fillStyle = '#0e0e12';
        ctx.fillRect(0, byMin + 3, W, 4);
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 0.5;
        for (let dx = -(off % 12); dx < W; dx += 12) {
            ctx.beginPath();
            ctx.moveTo(dx, byMin + 3);
            ctx.lineTo(dx, byMin + 7);
            ctx.stroke();
        }

        // 油污
        const oilSpots = [
            { x: 180, y: 0.4, rx: 28, ry: 10 },
            { x: 550, y: 0.6, rx: 22, ry: 8 },
            { x: 920, y: 0.35, rx: 30, ry: 12 },
            { x: 1300, y: 0.55, rx: 25, ry: 9 },
            { x: 1700, y: 0.45, rx: 20, ry: 7 },
            { x: 2100, y: 0.5, rx: 26, ry: 10 },
        ];
        oilSpots.forEach(o => {
            const ox = o.x - off;
            if (ox < -50 || ox > W + 50) return;
            const oy = byMin + (byMax - byMin) * o.y;
            // 油污渐变
            const oilGrad = ctx.createRadialGradient(ox, oy, 0, ox, oy, o.rx);
            oilGrad.addColorStop(0, 'rgba(35,30,15,0.35)');
            oilGrad.addColorStop(0.6, 'rgba(40,35,18,0.2)');
            oilGrad.addColorStop(1, 'rgba(30,25,12,0)');
            ctx.fillStyle = oilGrad;
            ctx.beginPath();
            ctx.ellipse(ox, oy, o.rx, o.ry, 0, 0, Math.PI * 2);
            ctx.fill();
        });

        // 水渍
        if (!lowFX) {
            ctx.fillStyle = 'rgba(60,70,90,0.06)';
            const waterSpots = [
                { x: 300, y: 0.3, r: 18 }, { x: 700, y: 0.65, r: 14 },
                { x: 1100, y: 0.4, r: 20 }, { x: 1600, y: 0.55, r: 16 },
            ];
            waterSpots.forEach(w => {
                const wx = w.x - off;
                if (wx < -30 || wx > W + 30) return;
                ctx.beginPath();
                ctx.ellipse(wx, byMin + (byMax - byMin) * w.y, w.r, w.r * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 裂缝
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 0.7;
        const floorCracks = [
            { x: 250, y: 0.45, pts: [[0,0],[12,5],[20,-3],[32,4],[40,-2]] },
            { x: 800, y: 0.55, pts: [[0,0],[8,-4],[18,3],[25,-6],[35,2],[42,-3]] },
            { x: 1350, y: 0.35, pts: [[0,0],[10,4],[16,-5],[28,3],[36,-1]] },
            { x: 1900, y: 0.6, pts: [[0,0],[6,-3],[14,5],[22,-2],[30,4],[38,-3]] },
        ];
        floorCracks.forEach(c => {
            const cx = c.x - off;
            if (cx < -60 || cx > W + 60) return;
            const cy = byMin + (byMax - byMin) * c.y;
            ctx.beginPath();
            c.pts.forEach((p, idx) => {
                idx === 0 ? ctx.moveTo(cx + p[0], cy + p[1]) : ctx.lineTo(cx + p[0], cy + p[1]);
            });
            ctx.stroke();
        });

        // 警戒线
        ctx.strokeStyle = 'rgba(200,180,0,0.12)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.moveTo(0, byMin + 8);
        ctx.lineTo(W, byMin + 8);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    /* --- frontLayer：吊灯 + 灯罩细节 + 光锥 + 灰尘光束 + 铁链 --- */
    static drawWarehouseLights(ctx, W, byMin, byMax, off, frame, lowFX) {
        for (let i = 0; i < 6; i++) {
            const lx = i * 420 + 120 - off;
            if (lx < -60 || lx > W + 60) continue;

            // 铁链
            ctx.strokeStyle = '#2a2a30';
            ctx.lineWidth = 1.5;
            const chainLen = byMin * 0.3;
            for (let cy = 0; cy < chainLen; cy += 8) {
                const cw = (cy % 16 < 8) ? 2 : -2;
                ctx.beginPath();
                ctx.moveTo(lx + cw, cy);
                ctx.lineTo(lx - cw, cy + 8);
                ctx.stroke();
            }

            // 灯罩（梯形，更精细）
            ctx.fillStyle = '#3a3a44';
            ctx.beginPath();
            ctx.moveTo(lx - 18, byMin * 0.35);
            ctx.lineTo(lx + 18, byMin * 0.35);
            ctx.lineTo(lx + 12, byMin * 0.35 + 10);
            ctx.lineTo(lx - 12, byMin * 0.35 + 10);
            ctx.closePath();
            ctx.fill();
            // 灯罩边缘
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 0.5;
            ctx.stroke();

            // 灯泡
            const flicker = 0.7 + Math.sin(frame * 0.04 + i * 2.3) * 0.15 + Math.sin(frame * 0.11 + i) * 0.1;
            ctx.fillStyle = `rgba(255,220,150,${flicker * 0.8})`;
            ctx.beginPath();
            ctx.arc(lx, byMin * 0.35 + 8, 4, 0, Math.PI * 2);
            ctx.fill();

            // 光锥
            if (!lowFX) {
                const coneAlpha = 0.06 + Math.sin(frame * 0.03 + i * 2) * 0.02;
                const cone = ctx.createRadialGradient(lx, byMin * 0.35 + 10, 4, lx, byMin * 0.7, 100);
                cone.addColorStop(0, `rgba(255,220,150,${coneAlpha})`);
                cone.addColorStop(0.5, `rgba(255,210,130,${coneAlpha * 0.4})`);
                cone.addColorStop(1, 'rgba(255,200,100,0)');
                ctx.fillStyle = cone;
                ctx.beginPath();
                ctx.moveTo(lx - 6, byMin * 0.35 + 10);
                ctx.lineTo(lx - 70, byMin * 0.85);
                ctx.lineTo(lx + 70, byMin * 0.85);
                ctx.lineTo(lx + 6, byMin * 0.35 + 10);
                ctx.closePath();
                ctx.fill();

                // 灰尘光束
                ctx.fillStyle = `rgba(255,220,150,${coneAlpha * 0.3})`;
                for (let d = 0; d < 4; d++) {
                    const dx = lx - 30 + d * 18 + Math.sin(frame * 0.02 + d) * 5;
                    const dy1 = byMin * 0.4;
                    const dy2 = byMin * 0.7;
                    ctx.fillRect(dx, dy1, 1, dy2 - dy1);
                }
            }
        }
    }

    // ============================================================
    //  第3关：码头夜战（增强）
    // ============================================================
    static renderDock(ctx, W, H, cameraX, byMin, byMax, frame, lowFX) {
        // ---- skyLayer (0.05) ----
        const skyOff = cameraX * 0.05;
        this.drawDockSky(ctx, W, byMin, skyOff, frame, lowFX);

        // ---- farLayer (0.15) ----
        const farOff = cameraX * 0.15;
        this.drawDockFar(ctx, W, byMin, farOff, frame, lowFX);

        // ---- midLayer (0.4) ----
        const midOff = cameraX * 0.4;
        this.drawDockMid(ctx, W, byMin, byMax, midOff, frame, lowFX);

        // 地面
        this.drawDockGround(ctx, W, H, byMin, byMax, cameraX, frame, lowFX);

        // ---- frontLayer (0.85) ----
        const frontOff = cameraX * 0.85;
        this.drawDockFront(ctx, W, byMin, byMax, frontOff, frame, lowFX);
    }

    /* --- skyLayer：冷色夜空 + 月亮 + 雾气 + 云层 --- */
    static drawDockSky(ctx, W, byMin, off, frame, lowFX) {
        const sky = ctx.createLinearGradient(0, 0, 0, byMin);
        sky.addColorStop(0, '#020815');
        sky.addColorStop(0.3, '#041020');
        sky.addColorStop(0.6, '#081830');
        sky.addColorStop(1, '#0c2040');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, byMin);

        if (lowFX) return;

        // 星星
        for (let i = 0; i < 35; i++) {
            const sx = ((i * 157 + 40) % (W + 200)) - 100 - (off * 0.2) % (W + 200);
            const sy = (i * 73 + 15) % (byMin * 0.4);
            const twinkle = 0.2 + Math.sin(frame * 0.02 + i * 2.1) * 0.3;
            ctx.globalAlpha = Math.max(0, twinkle);
            ctx.fillStyle = '#aabbdd';
            ctx.fillRect(sx, sy, 1.2, 1.2);
        }
        ctx.globalAlpha = 1;

        // 月亮
        const mx = W * 0.2 - off * 0.15;
        const my = byMin * 0.12;
        const moonGlow = ctx.createRadialGradient(mx, my, 6, mx, my, 50);
        moonGlow.addColorStop(0, 'rgba(180,200,230,0.1)');
        moonGlow.addColorStop(0.5, 'rgba(120,150,190,0.03)');
        moonGlow.addColorStop(1, 'rgba(80,100,150,0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(mx - 50, my - 50, 100, 100);
        ctx.fillStyle = '#c8d4e0';
        ctx.beginPath();
        ctx.arc(mx, my, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#041020';
        ctx.beginPath();
        ctx.arc(mx + 4, my - 2, 9, 0, Math.PI * 2);
        ctx.fill();

        // 云层
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#556688';
        for (let c = 0; c < 4; c++) {
            const cy = byMin * (0.15 + c * 0.1);
            const cx = ((c * 600 + 50) - off * 0.3) % (W + 500) - 250;
            for (let p = 0; p < 6; p++) {
                ctx.beginPath();
                ctx.ellipse(cx + p * 55, cy, 50 + c * 10, 10 + c * 3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // 远处雾气
        const fogGrad = ctx.createLinearGradient(0, byMin * 0.35, 0, byMin * 0.6);
        fogGrad.addColorStop(0, 'rgba(30,50,80,0)');
        fogGrad.addColorStop(0.5, 'rgba(30,50,80,0.15)');
        fogGrad.addColorStop(1, 'rgba(20,40,70,0)');
        ctx.fillStyle = fogGrad;
        ctx.fillRect(0, byMin * 0.35, W, byMin * 0.25);
    }

    /* --- farLayer：海面 + 波纹 + 船只剪影 + 船灯 + 灯塔 --- */
    static drawDockFar(ctx, W, byMin, off, frame, lowFX) {
        // 海面
        const seaY = byMin * 0.5;
        const seaGrad = ctx.createLinearGradient(0, seaY, 0, byMin);
        seaGrad.addColorStop(0, '#061225');
        seaGrad.addColorStop(0.5, '#081830');
        seaGrad.addColorStop(1, '#0a1e38');
        ctx.fillStyle = seaGrad;
        ctx.fillRect(0, seaY, W, byMin - seaY);

        // 水面波纹
        if (!lowFX) {
            for (let i = 0; i < 10; i++) {
                const wy = seaY + 10 + i * 12;
                const alpha = 0.04 + (i % 3) * 0.02;
                ctx.strokeStyle = `rgba(80,120,180,${alpha})`;
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                for (let x = 0; x < W; x += 3) {
                    const y = wy + Math.sin((x + off + frame * 0.4) * 0.018 + i * 0.8) * 2.5
                                    + Math.sin((x + off * 0.5 + frame * 0.2) * 0.035 + i) * 1.5;
                    x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
        }

        // 远处船只剪影
        const ships = [
            { x: 200, y: seaY + 15, w: 60, h: 12 },
            { x: 700, y: seaY + 20, w: 45, h: 10 },
            { x: 1300, y: seaY + 12, w: 55, h: 14 },
        ];
        ships.forEach(s => {
            const sx = s.x - off;
            if (sx < -80 || sx > W + 80) return;
            // 船体
            ctx.fillStyle = '#0a1520';
            ctx.beginPath();
            ctx.moveTo(sx, s.y);
            ctx.lineTo(sx + s.w, s.y);
            ctx.lineTo(sx + s.w - 5, s.y + s.h);
            ctx.lineTo(sx + 5, s.y + s.h);
            ctx.closePath();
            ctx.fill();
            // 桅杆
            ctx.fillStyle = '#0a1520';
            ctx.fillRect(sx + s.w * 0.4, s.y - 18, 2, 18);
        });

        // 船灯闪烁
        const boatLights = [
            { x: 230, y: seaY + 10 },
            { x: 730, y: seaY + 15 },
            { x: 1330, y: seaY + 8 },
        ];
        boatLights.forEach((bl, idx) => {
            const bx = bl.x - off;
            if (bx < -20 || bx > W + 20) return;
            const blink = 0.4 + Math.sin(frame * 0.03 + idx * 2.5) * 0.3;
            ctx.fillStyle = `rgba(255,200,100,${blink})`;
            ctx.beginPath();
            ctx.arc(bx, bl.y, 2, 0, Math.PI * 2);
            ctx.fill();
            if (!lowFX) {
                const glow = ctx.createRadialGradient(bx, bl.y, 1, bx, bl.y, 12);
                glow.addColorStop(0, `rgba(255,200,100,${blink * 0.3})`);
                glow.addColorStop(1, 'rgba(255,200,100,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(bx - 12, bl.y - 12, 24, 24);
            }
        });

        // 灯塔
        this.drawDockLighthouse(ctx, W, byMin, off, frame);
    }

    /* --- 灯塔 --- */
    static drawDockLighthouse(ctx, W, byMin, off, frame) {
        const lhx = W * 0.85 - off * 0.5;
        if (lhx < -40 || lhx > W + 40) return;
        const lhy = byMin * 0.2;
        // 塔身
        ctx.fillStyle = '#1a2535';
        ctx.beginPath();
        ctx.moveTo(lhx - 8, byMin * 0.55);
        ctx.lineTo(lhx - 5, lhy + 10);
        ctx.lineTo(lhx + 5, lhy + 10);
        ctx.lineTo(lhx + 8, byMin * 0.55);
        ctx.closePath();
        ctx.fill();
        // 塔顶
        ctx.fillStyle = '#253545';
        ctx.fillRect(lhx - 7, lhy + 5, 14, 8);
        // 灯室
        ctx.fillStyle = '#1a2535';
        ctx.fillRect(lhx - 6, lhy, 12, 8);
        // 灯光
        const rotate = frame * 0.02;
        const beamAngle = Math.sin(rotate) * 0.5;
        ctx.save();
        ctx.translate(lhx, lhy + 4);
        ctx.rotate(beamAngle);
        const beam = ctx.createLinearGradient(0, 0, 200, 0);
        beam.addColorStop(0, 'rgba(255,240,200,0.15)');
        beam.addColorStop(0.3, 'rgba(255,230,180,0.06)');
        beam.addColorStop(1, 'rgba(255,220,150,0)');
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(200, -15);
        ctx.lineTo(200, 15);
        ctx.lineTo(0, 3);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        // 灯光点
        const lBlink = 0.6 + Math.sin(frame * 0.05) * 0.3;
        ctx.fillStyle = `rgba(255,240,200,${lBlink})`;
        ctx.beginPath();
        ctx.arc(lhx, lhy + 4, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    /* --- midLayer：集装箱+文字+锈蚀+堆叠 + 吊机+细节+吊绳+吊钩 + 码头建筑剪影 --- */
    static drawDockMid(ctx, W, byMin, byMax, off, frame, lowFX) {
        // 码头建筑剪影
        const buildings = [
            { x: 50, w: 100, h: 80 },
            { x: 500, w: 80, h: 60 },
            { x: 1000, w: 120, h: 90 },
            { x: 1600, w: 90, h: 70 },
            { x: 2200, w: 110, h: 85 },
        ];
        buildings.forEach(b => {
            const bx = b.x - off;
            if (bx + b.w < -20 || bx > W + 20) return;
            ctx.fillStyle = '#0c1520';
            ctx.fillRect(bx, byMin - b.h, b.w, b.h);
            // 窗户
            ctx.fillStyle = 'rgba(255,200,100,0.06)';
            for (let wy = byMin - b.h + 10; wy < byMin - 10; wy += 20) {
                for (let wx = bx + 10; wx < bx + b.w - 10; wx += 22) {
                    if (Math.sin(wx * 5 + wy * 3) > 0.3) {
                        ctx.fillRect(wx, wy, 8, 10);
                    }
                }
            }
        });

        // 集装箱（带文字标识和锈蚀）
        const containers = [
            { x: 100, w: 85, h: 55, color: '#2a3544', text: 'MAERSK', stack: 0 },
            { x: 100, w: 85, h: 55, color: '#253040', text: '', stack: 1 },
            { x: 250, w: 70, h: 50, color: '#352a2a', text: 'COSCO', stack: 0 },
            { x: 250, w: 70, h: 50, color: '#302525', text: '', stack: 1 },
            { x: 250, w: 70, h: 50, color: '#2a2020', text: '', stack: 2 },
            { x: 450, w: 90, h: 60, color: '#2a3528', text: 'EVER', stack: 0 },
            { x: 450, w: 90, h: 60, color: '#253022', text: '', stack: 1 },
            { x: 700, w: 75, h: 52, color: '#35302a', text: 'HAPAG', stack: 0 },
            { x: 950, w: 85, h: 58, color: '#2a2a38', text: 'YML', stack: 0 },
            { x: 950, w: 85, h: 58, color: '#252530', text: '', stack: 1 },
            { x: 1200, w: 80, h: 55, color: '#302a35', text: 'OOCL', stack: 0 },
            { x: 1500, w: 90, h: 60, color: '#2a3530', text: 'CMA', stack: 0 },
            { x: 1500, w: 90, h: 60, color: '#253028', text: '', stack: 1 },
            { x: 1800, w: 75, h: 52, color: '#353530', text: 'ZIM', stack: 0 },
            { x: 2100, w: 85, h: 58, color: '#2a3035', text: 'ONE', stack: 0 },
            { x: 2100, w: 85, h: 58, color: '#252a30', text: '', stack: 1 },
            { x: 2100, w: 85, h: 58, color: '#202530', text: '', stack: 2 },
        ];
        containers.forEach(c => {
            const cx = c.x - off;
            if (cx + c.w < -20 || cx > W + 20) return;
            const cy = byMin - c.h - c.stack * (c.h + 2);
            ctx.fillStyle = c.color;
            ctx.fillRect(cx, cy, c.w, c.h);
            // 边框
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(cx, cy, c.w, c.h);
            // 集装箱门线
            ctx.strokeStyle = 'rgba(255,255,255,0.03)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(cx + c.w * 0.3, cy);
            ctx.lineTo(cx + c.w * 0.3, cy + c.h);
            ctx.stroke();
            // 文字标识
            if (c.text) {
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.font = 'bold 8px "Courier New", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(c.text, cx + c.w / 2, cy + c.h / 2 + 3);
            }
            // 锈蚀
            ctx.fillStyle = 'rgba(80,50,25,0.08)';
            if (c.stack === 0) {
                ctx.beginPath();
                ctx.ellipse(cx + c.w * 0.7, cy + c.h * 0.6, 8, 5, 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // 吊机（更详细）
        for (let i = 0; i < 3; i++) {
            const cx = i * 900 + 350 - off;
            if (cx < -80 || cx > W + 80) continue;
            // 底座
            ctx.fillStyle = '#1e2530';
            ctx.fillRect(cx - 15, byMin - 10, 30, 10);
            // 塔身
            ctx.fillStyle = '#222830';
            ctx.fillRect(cx - 4, byMin - 170, 8, 170);
            // 横梁
            ctx.fillStyle = '#222830';
            ctx.fillRect(cx - 50, byMin - 175, 100, 5);
            // 横梁支撑
            ctx.strokeStyle = 'rgba(255,255,255,0.04)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cx - 45, byMin - 170);
            ctx.lineTo(cx, byMin - 160);
            ctx.moveTo(cx + 45, byMin - 170);
            ctx.lineTo(cx, byMin - 160);
            ctx.stroke();
            // 驾驶室
            ctx.fillStyle = '#252d38';
            ctx.fillRect(cx - 8, byMin - 165, 16, 12);
            ctx.fillStyle = 'rgba(255,200,100,0.08)';
            ctx.fillRect(cx - 5, byMin - 162, 10, 6);
            // 吊绳
            ctx.strokeStyle = '#3a3a44';
            ctx.lineWidth = 1;
            const hookX = cx + 35;
            ctx.beginPath();
            ctx.moveTo(hookX, byMin - 170);
            ctx.lineTo(hookX, byMin - 90);
            ctx.stroke();
            // 吊钩
            ctx.strokeStyle = '#444450';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hookX, byMin - 85, 5, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
            // 顶部警示灯
            const blink = Math.sin(frame * 0.06 + i * 2) > 0 ? 0.7 : 0.15;
            ctx.fillStyle = `rgba(255,50,50,${blink})`;
            ctx.beginPath();
            ctx.arc(cx, byMin - 178, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    /* --- 地面：潮湿反光 + 水洼 + 码头边缘 + 金属格栅 + 缆绳 --- */
    static drawDockGround(ctx, W, H, byMin, byMax, off, frame, lowFX) {
        const gh = byMax - byMin + 40;
        const ground = ctx.createLinearGradient(0, byMin, 0, byMax + 40);
        ground.addColorStop(0, '#1a2228');
        ground.addColorStop(0.2, '#161e24');
        ground.addColorStop(0.6, '#121a20');
        ground.addColorStop(1, '#0e1418');
        ctx.fillStyle = ground;
        ctx.fillRect(0, byMin, W, gh);

        // 码头边缘线
        ctx.fillStyle = '#2a3540';
        ctx.fillRect(0, byMin, W, 3);

        // 金属格栅
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 0.5;
        for (let gx = -(off % 30); gx < W; gx += 30) {
            ctx.beginPath();
            ctx.moveTo(gx, byMin + 4);
            ctx.lineTo(gx, byMin + 12);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(0, byMin + 4, W, 8);

        // 水洼
        if (!lowFX) {
            const puddles = [
                { x: 200, y: 0.4, rx: 30, ry: 8 },
                { x: 600, y: 0.6, rx: 25, ry: 6 },
                { x: 1050, y: 0.35, rx: 35, ry: 10 },
                { x: 1500, y: 0.55, rx: 28, ry: 7 },
                { x: 2000, y: 0.45, rx: 32, ry: 9 },
            ];
            puddles.forEach(p => {
                const px = p.x - off;
                if (px < -50 || px > W + 50) return;
                const py = byMin + (byMax - byMin) * p.y;
                // 水洼本体
                const puddleGrad = ctx.createRadialGradient(px, py, 0, px, py, p.rx);
                puddleGrad.addColorStop(0, 'rgba(40,60,90,0.2)');
                puddleGrad.addColorStop(0.7, 'rgba(30,50,80,0.1)');
                puddleGrad.addColorStop(1, 'rgba(20,40,70,0)');
                ctx.fillStyle = puddleGrad;
                ctx.beginPath();
                ctx.ellipse(px, py, p.rx, p.ry, 0, 0, Math.PI * 2);
                ctx.fill();
                // 水面反光
                const shimmer = 0.05 + Math.sin(frame * 0.03 + p.x * 0.01) * 0.03;
                ctx.fillStyle = `rgba(120,150,200,${shimmer})`;
                ctx.beginPath();
                ctx.ellipse(px - 5, py - 1, p.rx * 0.4, p.ry * 0.3, -0.2, 0, Math.PI * 2);
                ctx.fill();
            });
        }

        // 潮湿反光
        if (!lowFX) {
            ctx.fillStyle = `rgba(60,80,120,${0.04 + Math.sin(frame * 0.01) * 0.02})`;
            ctx.fillRect(0, byMin + 12, W, byMax - byMin - 12);
        }

        // 缆绳
        ctx.strokeStyle = 'rgba(100,80,50,0.15)';
        ctx.lineWidth = 2;
        const ropes = [
            { x1: 150, x2: 350 }, { x1: 650, x2: 800 },
            { x1: 1100, x2: 1300 }, { x1: 1700, x2: 1850 },
        ];
        ropes.forEach(r => {
            const rx1 = r.x1 - off;
            const rx2 = r.x2 - off;
            if (rx2 < -20 || rx1 > W + 20) return;
            const ry = byMin + (byMax - byMin) * 0.7;
            ctx.beginPath();
            ctx.moveTo(rx1, ry);
            ctx.quadraticCurveTo((rx1 + rx2) / 2, ry + 8, rx2, ry);
            ctx.stroke();
        });
    }

    /* --- frontLayer：金属栏杆 + 警示灯 + 绳索 + 系缆桩 + 远处灯光闪烁 --- */
    static drawDockFront(ctx, W, byMin, byMax, off, frame, lowFX) {
        // 金属栏杆
        for (let i = 0; i < 25; i++) {
            const rx = i * 160 + 30 - off;
            if (rx < -10 || rx > W + 10) continue;
            // 栏杆柱
            ctx.fillStyle = '#3a4048';
            ctx.fillRect(rx - 2, byMin - 45, 4, 45);
            // 柱顶球
            ctx.fillStyle = '#444850';
            ctx.beginPath();
            ctx.arc(rx, byMin - 46, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // 横杆
        ctx.fillStyle = '#333a42';
        ctx.fillRect(0, byMin - 42, W, 3);
        ctx.fillRect(0, byMin - 24, W, 3);
        // 横杆高光
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(0, byMin - 42, W, 1);
        ctx.fillRect(0, byMin - 24, W, 1);

        // 系缆桩
        const bollards = [
            { x: 180 }, { x: 580 }, { x: 980 }, { x: 1380 }, { x: 1780 }, { x: 2180 },
        ];
        bollards.forEach(b => {
            const bx = b.x - off;
            if (bx < -20 || bx > W + 20) return;
            // 底座
            ctx.fillStyle = '#2a2e34';
            ctx.fillRect(bx - 8, byMin - 6, 16, 6);
            // 桩身
            ctx.fillStyle = '#333840';
            ctx.beginPath();
            ctx.moveTo(bx - 6, byMin - 6);
            ctx.lineTo(bx - 4, byMin - 18);
            ctx.lineTo(bx + 4, byMin - 18);
            ctx.lineTo(bx + 6, byMin - 6);
            ctx.closePath();
            ctx.fill();
            // 桩顶
            ctx.fillStyle = '#3a4048';
            ctx.fillRect(bx - 5, byMin - 20, 10, 3);
        });

        // 绳索（系在桩上）
        ctx.strokeStyle = 'rgba(120,100,60,0.2)';
        ctx.lineWidth = 2.5;
        const ropeSections = [
            { x1: 180, x2: 580 }, { x1: 980, x2: 1380 }, { x1: 1780, x2: 2180 },
        ];
        ropeSections.forEach(r => {
            const rx1 = r.x1 - off;
            const rx2 = r.x2 - off;
            if (rx2 < -20 || rx1 > W + 20) return;
            ctx.beginPath();
            ctx.moveTo(rx1, byMin - 16);
            ctx.quadraticCurveTo((rx1 + rx2) / 2, byMin - 8, rx2, byMin - 16);
            ctx.stroke();
        });

        // 警示灯
        for (let i = 0; i < 5; i++) {
            const lx = i * 450 + 150 - off;
            if (lx < -20 || lx > W + 20) continue;
            const blink = Math.sin(frame * 0.08 + i * 1.8) > 0 ? 0.85 : 0.15;
            // 灯座
            ctx.fillStyle = '#2a2e34';
            ctx.fillRect(lx - 3, byMin - 50, 6, 8);
            // 灯
            ctx.fillStyle = `rgba(255,50,50,${blink})`;
            ctx.beginPath();
            ctx.arc(lx, byMin - 52, 4, 0, Math.PI * 2);
            ctx.fill();
            if (!lowFX && blink > 0.5) {
                const glow = ctx.createRadialGradient(lx, byMin - 52, 2, lx, byMin - 52, 25);
                glow.addColorStop(0, 'rgba(255,50,50,0.18)');
                glow.addColorStop(1, 'rgba(255,50,50,0)');
                ctx.fillStyle = glow;
                ctx.fillRect(lx - 25, byMin - 77, 50, 50);
            }
        }

        // 远处灯光闪烁
        if (!lowFX) {
            for (let i = 0; i < 6; i++) {
                const dlx = (i * 380 + 100) - off * 0.3;
                if (dlx < -10 || dlx > W + 10) continue;
                const dly = byMin * 0.45 + (i % 3) * 15;
                const dblink = 0.15 + Math.sin(frame * 0.025 + i * 1.5) * 0.1;
                ctx.fillStyle = `rgba(255,220,150,${dblink})`;
                ctx.beginPath();
                ctx.arc(dlx, dly, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // ============================================================
    //  通用地面阴影（增强）
    // ============================================================
    static drawGroundShadow(ctx, screenX, y, width, height, jumpY) {
        const jumpFactor = Math.abs(jumpY || 0) / 100;
        const shadowScale = 1 - jumpFactor * 0.6;
        const alphaScale = 1 - jumpFactor * 0.5;

        // 阴影大小根据角色体型变化
        const sw = width * 0.8 * Math.max(0.25, shadowScale);
        const sh = (3 + width * 0.02) * Math.max(0.25, shadowScale);

        // 椭圆渐变阴影
        ctx.save();
        const maxR = Math.max(sw / 2, sh);
        const shadowGrad = ctx.createRadialGradient(screenX, y, 0, screenX, y, maxR);
        const baseAlpha = 0.3 * Math.max(0.15, alphaScale);
        shadowGrad.addColorStop(0, `rgba(0,0,0,${baseAlpha})`);
        shadowGrad.addColorStop(0.5, `rgba(0,0,0,${baseAlpha * 0.5})`);
        shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(screenX, y, sw / 2, sh, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}
