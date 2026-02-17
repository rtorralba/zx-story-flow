export class Node {
    constructor(id, x, y, type) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 100; // Base height
        this.type = type;
        this.title = type;
        this.text = "";
        this.outputs = []; // Array of connections { label:Str, target:NodeId }
    }

    isHit(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }
}

export class ScreenNode extends Node {
    constructor(id, x, y) {
        super(id, x, y, "Screen");
        this.text = "Screen Text";

        // Option/Port Management
        this.outputs = [{ label: "Next", target: null }]; // Default 1 option
        this.baseHeight = 80;
        this.optionHeight = 30;
    }

    // Dynamic height based on options
    get height() {
        return this.baseHeight + (this.outputs.length * this.optionHeight);
    }

    // Setter needed because parent class or restore logic might try to set it, 
    // but we want it computed. 
    set height(v) { /* no-op */ }

    getOutputPort(index) {
        const y = this.y + this.baseHeight + (index * this.optionHeight) - (this.optionHeight / 2);
        return { x: this.x + this.width, y: y };
    }

    addOption(label = "New Option") {
        this.outputs.push({ label: label, target: null });
    }

    removeOption(index) {
        if (this.outputs.length > 0) {
            this.outputs.splice(index, 1);
        }
    }
}
