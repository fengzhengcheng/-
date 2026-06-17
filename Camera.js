/**
 * Camera.js - 摄像机模块（固定屏幕模式）
 * 当前关卡采用一屏清版战斗，不做横向卷轴
 */
class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        // 逻辑分辨率（16:9）
        this.logicalWidth = 1280;
        this.logicalHeight = 720;
        // 摄像机位置（固定为 0）
        this.x = 0;
        // 缩放比例
        this.scale = 1;
        // 屏幕偏移（居中用）
        this.offsetX = 0;
        this.offsetY = 0;

        // 初始适配
        this.resize();
        // 监听窗口大小变化
        window.addEventListener('resize', () => this.resize());
    }

    /** 根据窗口大小自适应画布，保持 16:9 比例 */
    resize() {
        const windowW = window.innerWidth;
        const windowH = window.innerHeight;
        const ratio = this.logicalWidth / this.logicalHeight;

        let displayW, displayH;
        if (windowW / windowH > ratio) {
            displayH = windowH;
            displayW = windowH * ratio;
        } else {
            displayW = windowW;
            displayH = displayW / ratio;
        }

        this.canvas.width = this.logicalWidth;
        this.canvas.height = this.logicalHeight;
        this.canvas.style.width = displayW + 'px';
        this.canvas.style.height = displayH + 'px';

        this.scale = displayW / this.logicalWidth;
        this.offsetX = (windowW - displayW) / 2;
        this.offsetY = (windowH - displayH) / 2;
    }

    /** 固定屏幕模式：摄像机不动 */
    follow(playerX, mapWidth) {
        // 不做任何移动，camera.x 始终为 0
    }

    /** 将鼠标屏幕坐标转换为逻辑坐标 */
    screenToLogical(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (screenX - rect.left) / this.scale;
        const y = (screenY - rect.top) / this.scale;
        return { x, y };
    }
}
