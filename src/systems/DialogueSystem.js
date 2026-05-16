
export class DialogueSystem {
    constructor(scene) {
        this.scene    = scene;
        this.lines    = [];   // array activo de diálogos
        this.index    = 0;
        this.onFinish = null; // callback cuando termina el array
    }

    load(lines, onFinish) {
        this.lines    = lines;
        this.index    = 0;
        this.onFinish = onFinish;
    }

    current() {
        return this.lines[this.index] || null;
    }

    advance() {
        this.index++;
        if (this.index >= this.lines.length) {
            if (this.onFinish) this.onFinish();
            return false;
        }
        return true;
    }

    hasMore() {
        return this.index < this.lines.length - 1;
    }

    isFinished() {
        return this.index >= this.lines.length;
    }
}