/**
 * main.js - 游戏入口文件
 * 负责初始化 Canvas 和 Game 实例
 */
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    window.game = new Game(canvas);
    window.game.start();
});
