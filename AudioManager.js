/**
 * AudioManager.js - 音效管理模块
 * 使用 Web Audio API 生成程序化音效和 BGM，无需外部音频文件
 */
class AudioManager {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.sfxEnabled = true;
        this.bgmEnabled = true;
        this.volume = 0.3;
        this.initialized = false;
        // BGM
        this.bgmPlaying = false;
        this.bgmNodes = null;
        this.bgmGain = null;
        this.bgmVolume = 0.12;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.menuBgmPlaying = false;
        this.menuBgmNodes = null;
        this.menuBgmGain = null;
    }

    /** 初始化 AudioContext（需在用户交互后调用） */
    init() {
        if (this.initialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API 不可用');
        }
    }

    /** 切换静音（M 键） */
    toggleMute() {
        this.muted = !this.muted;
        this.updateBgmVolume();
    }

    /** 切换音效开关 */
    toggleSfx() {
        this.sfxEnabled = !this.sfxEnabled;
    }

    /** 切换 BGM 开关 */
    toggleBgm() {
        this.bgmEnabled = !this.bgmEnabled;
        if (!this.bgmEnabled) {
            this.stopBGM();
        } else if (this.bgmPlaying || this.menuBgmPlaying) {
            // 重新开始
            if (this.menuBgmPlaying) this.startMenuBGM();
            else this.startBattleBGM();
        }
    }

    /** 播放音效 */
    play(type) {
        if (this.muted || !this.sfxEnabled || !this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        switch (type) {
            case 'punch': this.playPunch(); break;
            case 'hit': this.playHit(); break;
            case 'heavy': this.playHeavy(); break;
            case 'skill': this.playSkill(); break;
            case 'hurt': this.playHurt(); break;
            case 'enemyDie': this.playEnemyDie(); break;
            case 'pickup': this.playPickup(); break;
            case 'victory': this.playVictory(); break;
            case 'defeat': this.playDefeat(); break;
            case 'propBreak': this.playPropBreak(); break;
        }
    }

    // === BGM 系统 ===

    /** 开始战斗 BGM */
    startBattleBGM() {
        if (!this.ctx || !this.bgmEnabled) return;
        this.stopBGM();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.bgmPlaying = true;
        this.menuBgmPlaying = false;
        this.bgmStep = 0;

        // 创建 BGM 增益节点
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.muted ? 0 : this.bgmVolume;
        this.bgmGain.connect(this.ctx.destination);

        // 使用定时器驱动步进式音乐
        const bpm = 140;
        const stepTime = 60 / bpm / 2 * 1000; // 八分音符间隔（ms）

        this.bgmTimer = setInterval(() => {
            if (!this.bgmPlaying || !this.ctx) return;
            this.playBattleStep(this.bgmStep);
            this.bgmStep = (this.bgmStep + 1) % 32;
        }, stepTime);
    }

    /** 战斗 BGM 步进音符 */
    playBattleStep(step) {
        if (!this.ctx || !this.bgmGain) return;
        const t = this.ctx.currentTime;

        // 贝斯线 - 简单的街机风格低音进行
        const bassNotes = [65, 65, 82, 82, 73, 73, 87, 87, 65, 65, 82, 82, 98, 98, 87, 87,
                           65, 65, 82, 82, 73, 73, 87, 87, 65, 65, 98, 98, 87, 87, 65, 65];
        if (step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = bassNotes[step];
            g.gain.setValueAtTime(0.35, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
            osc.connect(g);
            g.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + 0.15);
        }

        // 鼓点
        if (step % 4 === 0) {
            // 底鼓
            const kick = this.ctx.createOscillator();
            const kg = this.ctx.createGain();
            kick.type = 'sine';
            kick.frequency.setValueAtTime(150, t);
            kick.frequency.exponentialRampToValueAtTime(30, t + 0.1);
            kg.gain.setValueAtTime(0.4, t);
            kg.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            kick.connect(kg);
            kg.connect(this.bgmGain);
            kick.start(t);
            kick.stop(t + 0.12);
        }
        if (step % 4 === 2) {
            // 军鼓（噪声模拟）
            const snare = this.ctx.createOscillator();
            const sg = this.ctx.createGain();
            snare.type = 'sawtooth';
            snare.frequency.value = 200;
            sg.gain.setValueAtTime(0.2, t);
            sg.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
            snare.connect(sg);
            sg.connect(this.bgmGain);
            snare.start(t);
            snare.stop(t + 0.08);
        }

        // 旋律线 - 简单的8-bit风格
        const melodyNotes = [0, 330, 0, 392, 0, 440, 392, 0, 0, 330, 0, 392, 440, 0, 523, 0,
                             0, 330, 0, 392, 0, 440, 392, 0, 0, 523, 0, 494, 440, 0, 392, 0];
        if (melodyNotes[step] > 0) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.value = melodyNotes[step];
            g.gain.setValueAtTime(0.12, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
            osc.connect(g);
            g.connect(this.bgmGain);
            osc.start(t);
            osc.stop(t + 0.12);
        }
    }

    /** 开始菜单 BGM（较轻柔） */
    startMenuBGM() {
        if (!this.ctx || !this.bgmEnabled) return;
        this.stopBGM();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        this.menuBgmPlaying = true;
        this.bgmPlaying = false;
        this.bgmStep = 0;

        this.menuBgmGain = this.ctx.createGain();
        this.menuBgmGain.gain.value = this.muted ? 0 : this.bgmVolume * 0.6;
        this.menuBgmGain.connect(this.ctx.destination);

        const bpm = 90;
        const stepTime = 60 / bpm / 2 * 1000;

        this.bgmTimer = setInterval(() => {
            if (!this.menuBgmPlaying || !this.ctx) return;
            this.playMenuStep(this.bgmStep);
            this.bgmStep = (this.bgmStep + 1) % 16;
        }, stepTime);
    }

    /** 菜单 BGM 步进 */
    playMenuStep(step) {
        if (!this.ctx || !this.menuBgmGain) return;
        const t = this.ctx.currentTime;

        const chords = [262, 330, 392, 262, 294, 349, 440, 294, 262, 330, 392, 523, 440, 349, 330, 262];
        if (step % 2 === 0) {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = chords[step];
            g.gain.setValueAtTime(0.15, t);
            g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
            osc.connect(g);
            g.connect(this.menuBgmGain);
            osc.start(t);
            osc.stop(t + 0.25);
        }
    }

    /** 停止所有 BGM */
    stopBGM() {
        this.bgmPlaying = false;
        this.menuBgmPlaying = false;
        if (this.bgmTimer) {
            clearInterval(this.bgmTimer);
            this.bgmTimer = null;
        }
        this.bgmGain = null;
        this.menuBgmGain = null;
    }

    /** 暂停 BGM（降低音量） */
    pauseBGM() {
        if (this.bgmGain) this.bgmGain.gain.value = 0;
        if (this.menuBgmGain) this.menuBgmGain.gain.value = 0;
    }

    /** 恢复 BGM 音量 */
    resumeBGM() {
        this.updateBgmVolume();
    }

    /** 更新 BGM 音量 */
    updateBgmVolume() {
        const vol = (this.muted || !this.bgmEnabled) ? 0 : this.bgmVolume;
        const menuVol = (this.muted || !this.bgmEnabled) ? 0 : this.bgmVolume * 0.6;
        if (this.bgmGain) this.bgmGain.gain.value = vol;
        if (this.menuBgmGain) this.menuBgmGain.gain.value = menuVol;
    }

    // === 音效生成 ===

    /** 创建振荡器音效 */
    createTone(freq, duration, type = 'square', vol = this.volume) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playPunch() {
        this.createTone(300, 0.06, 'sawtooth', 0.15);
        this.createTone(150, 0.08, 'square', 0.1);
    }

    playHit() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, t);
        osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.12);
        this.createTone(80, 0.08, 'sawtooth', 0.12);
    }

    playHeavy() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);
        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.25);
        this.createTone(60, 0.15, 'square', 0.15);
    }

    playSkill() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.15);
        osc.frequency.exponentialRampToValueAtTime(400, t + 0.3);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.35);
        this.createTone(50, 0.2, 'sine', 0.2);
    }

    playHurt() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(250, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.15);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.18);
    }

    playEnemyDie() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.35);
    }

    playPickup() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523, t);
        osc.frequency.setValueAtTime(659, t + 0.08);
        osc.frequency.setValueAtTime(784, t + 0.16);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.25);
    }

    playVictory() {
        const t = this.ctx.currentTime;
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.15, t + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.3);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(t + i * 0.15); osc.stop(t + i * 0.15 + 0.3);
        });
    }

    playDefeat() {
        const t = this.ctx.currentTime;
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.12, t + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.2 + 0.35);
            osc.connect(gain); gain.connect(this.ctx.destination);
            osc.start(t + i * 0.2); osc.stop(t + i * 0.2 + 0.35);
        });
    }

    playPropBreak() {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        gain.gain.setValueAtTime(0.15, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.12);
        this.createTone(120, 0.06, 'square', 0.1);
    }
}
