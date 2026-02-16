
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
        this.question = "Yes or No?";
        this.outputs = [
            { label: "Yes", target: null },
            { label: "No", target: null }
        ];
        this.height = 120;
    }

    draw(ctx, isSelected) {
        super.draw(ctx, isSelected);
        ctx.fillStyle = "#aaa";
        ctx.font = "12px Courier New";
        ctx.fillText(this.question.substring(0, 20) + "...", this.x + 10, this.y + 45);

        // Draw Output Points
        ctx.fillStyle = "#00d022"; // Yes
        ctx.beginPath();
        ctx.arc(this.x + this.width, this.y + 40, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText("Y", this.x + this.width - 15, this.y + 45);

        ctx.fillStyle = "#d00000"; // No
        ctx.beginPath();
        ctx.arc(this.x + this.width, this.y + 80, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.fillText("N", this.x + this.width - 15, this.y + 85);
    }
    
    getOutputPort(index) {
        if (index === 0) return { x: this.x + this.width, y: this.y + 40 };
        return { x: this.x + this.width, y: this.y + 80 };
    }
}
