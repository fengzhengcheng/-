/**
 * Input.js - keyboard input handling.
 */
class Input {
    constructor() {
        this.keys = {};
        this.justPressed = {};
        this.prevKeys = {};
        this.pressedSinceLastUpdate = {};

        window.addEventListener('keydown', (e) => this.onKeyDown(e));
        window.addEventListener('keyup', (e) => this.onKeyUp(e));
    }

    onKeyDown(e) {
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL', 'KeyE', 'KeyQ', 'Space', 'Escape', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
            e.preventDefault();
        }
        if (!this.keys[e.code]) {
            this.pressedSinceLastUpdate[e.code] = true;
        }
        this.keys[e.code] = true;
    }

    onKeyUp(e) {
        this.keys[e.code] = false;
    }

    update() {
        this.justPressed = {};
        for (const key in this.keys) {
            if (this.keys[key] && !this.prevKeys[key]) {
                this.justPressed[key] = true;
            }
        }
        for (const key in this.pressedSinceLastUpdate) {
            if (this.pressedSinceLastUpdate[key]) {
                this.justPressed[key] = true;
            }
        }
        this.prevKeys = { ...this.keys };
        this.pressedSinceLastUpdate = {};
    }

    isDown(code) {
        return !!this.keys[code];
    }

    isJustPressed(code) {
        return !!this.justPressed[code];
    }
}
