
export class Node {
    constructor(id, x, y, type) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 150;
        this.height = 80;
        this.type = type;
        this.title = type;
        this.text = "";
        this.outputs = []; // Array of connections
    }

    draw(ctx, isSelected) {
        // Basic drawing logic, can be overridden
        ctx.fillStyle = isSelected ? "#555" : "#333";
        ctx.strokeStyle = isSelected ? "#00d022" : "#666";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "14px Courier New";
        ctx.fillText(this.title, this.x + 10, this.y + 20);

        // Draw output ports
        // ... (Logic to be refined in editor)
    }

    isHit(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }
}

export class ScreenNode extends Node {
    constructor(id, x, y) {
        super(id, x, y, "Screen");
        this.description = "A simple screen.";
        this.height = 100;
        this.outputs = [{ label: "Next", target: null }]; // Single output
    }

    draw(ctx, isSelected) {
        super.draw(ctx, isSelected);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px Courier New";
        ctx.fillText(this.description.substring(0, 20) + "...", this.x + 10, this.y + 45);

        // Draw Output Point
        ctx.fillStyle = "#00d022";
        ctx.beginPath();
        ctx.arc(this.x + this.width, this.y + this.height / 2, 5, 0, Math.PI * 2);
        ctx.fill();
    }

    getOutputPort(index) {
        return { x: this.x + this.width, y: this.y + this.height / 2 };
    }
}


export class DecisionNode extends Node {
    constructor(id, x, y) {
        super(id, x, y, "Decision");
        this.question = "What do you do?";
        // Default to 2 options
        this.outputs = [
            { label: "Option 1", target: null },
            { label: "Option 2", target: null }
        ];
        this.baseHeight = 60;
        this.optionHeight = 30;
    }

    get height() {
        return this.baseHeight + (this.outputs.length * this.optionHeight);
    }

    // Setter needed because parent class or restore logic might try to set it, 
    // but we want it computed. 
    set height(v) { /* no-op */ }

    draw(ctx, isSelected) {
        super.draw(ctx, isSelected);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px Courier New";
        ctx.fillText(this.question.substring(0, 20) + "...", this.x + 10, this.y + 45);

        // Draw Output Points (Options)
        this.outputs.forEach((opt, index) => {
            const y = this.y + this.baseHeight + (index * this.optionHeight) - (this.optionHeight / 2);

            // Port
            ctx.fillStyle = "#00d022";
            ctx.beginPath();
            ctx.arc(this.x + this.width, y, 5, 0, Math.PI * 2);
            ctx.fill();

            // Label
            ctx.fillStyle = "#fff";
            ctx.textAlign = "right";
            let label = opt.label;
            if (label.length > 15) label = label.substring(0, 12) + "...";
            ctx.fillText(label, this.x + this.width - 15, y + 4);
            ctx.textAlign = "left"; // Reset
        });
    }

    getOutputPort(index) {
        const y = this.y + this.baseHeight + (index * this.optionHeight) - (this.optionHeight / 2);
        return { x: this.x + this.width, y: y };
    }

    addOption(label = "New Option") {
        this.outputs.push({ label: label, target: null });
    }

    removeOption(index) {
        if (this.outputs.length > 1) {
            this.outputs.splice(index, 1);
        }
    }
}
