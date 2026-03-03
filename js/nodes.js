// ZX Story Flow - Node Classes
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

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
        // Añadir sufijo aleatorio de 3 dígitos para evitar colisiones
        this.title = "Screen_" + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        this.text = "Screen Text";

        // Option/Port Management
        this.outputs = [{ label: "Next", target: null }]; // Default 1 option
        this.borderColor = 'black'; // Default border color
        this.baseHeight = 80;
        this.optionHeight = 30;

        // Initial auto-size
        this.height = this.baseHeight + (this.outputs.length * this.optionHeight);
    }

    getOutputPort(index) {
        // Position options at the bottom of the node
        const totalOptionsHeight = this.outputs.length * this.optionHeight;
        const optionsStartY = this.height - totalOptionsHeight;
        const y = this.y + optionsStartY + (index * this.optionHeight) + (this.optionHeight / 2);
        return { x: this.x + this.width, y: y };
    }

    addOption(label = "New Option") {
        this.outputs.push({ label: label, target: null });
        // Increase height to accommodate new option
        this.height += this.optionHeight;
    }

    removeOption(index) {
        if (this.outputs.length > 0) {
            this.outputs.splice(index, 1);
            // Decrease height
            this.height -= this.optionHeight;
        }
    }

    // Check if the resize handle is being clicked (bottom-right corner)
    isResizeHandleHit(x, y) {
        const handleSize = 20;
        return x >= this.x + this.width - handleSize &&
            x <= this.x + this.width &&
            y >= this.y + this.height - handleSize &&
            y <= this.y + this.height;
    }
}

// Node Reference (Pointer) - A small node that references another node
export class NodeReference extends Node {
    constructor(id, x, y, targetNodeId = null) {
        super(id, x, y, "Reference");
        this.targetNodeId = targetNodeId; // ID of the node this reference points to
        this.width = 120;
        this.height = 50;
        this.outputs = []; // References don't have outputs, they ARE outputs
    }

    // Get the title based on the target node
    getDisplayTitle(nodes) {
        if (!this.targetNodeId) return "(No target)";
        const targetNode = nodes.find(n => n.id === this.targetNodeId);
        return targetNode ? `${targetNode.title}` : "(Not found)";
    }
}

export class Group {
    constructor(id, x, y, width = 400, height = 300) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = "New Group";
        this.color = "#4a90e2"; // Default blue color
        this.nodeIds = []; // IDs of nodes contained in this group
    }

    isHit(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    // Check if header bar is being clicked (for moving group)
    isHeaderHit(x, y) {
        const headerHeight = 30;
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + headerHeight;
    }

    // Check if a point is inside the group
    containsPoint(x, y) {
        return x >= this.x && x <= this.x + this.width &&
            y >= this.y && y <= this.y + this.height;
    }

    // Check if a node should be in this group
    containsNode(node) {
        const centerX = node.x + node.width / 2;
        const centerY = node.y + node.height / 2;
        return this.containsPoint(centerX, centerY);
    }

    // Check if the resize handle is being clicked (bottom-right corner)
    isResizeHandleHit(x, y) {
        const handleSize = 20;
        return x >= this.x + this.width - handleSize &&
            x <= this.x + this.width &&
            y >= this.y + this.height - handleSize &&
            y <= this.y + this.height;
    }

    // Check if delete icon is being clicked (top-right corner of header)
    isDeleteIconHit(x, y) {
        const deleteIconSize = 16;
        const deleteIconX = this.x + this.width - deleteIconSize - 5;
        const deleteIconY = this.y + 5;
        const centerX = deleteIconX + deleteIconSize / 2;
        const centerY = deleteIconY + deleteIconSize / 2;
        const distance = Math.hypot(x - centerX, y - centerY);
        return distance <= deleteIconSize / 2;
    }

    // Check if config icon is being clicked (bottom-left corner)
    isConfigIconHit(x, y) {
        const configIconSize = 16;
        const configIconX = this.x + 5;
        const configIconY = this.y + this.height - configIconSize - 5;
        const centerX = configIconX + configIconSize / 2;
        const centerY = configIconY + configIconSize / 2;
        const distance = Math.hypot(x - centerX, y - centerY);
        return distance <= configIconSize / 2;
    }
}
