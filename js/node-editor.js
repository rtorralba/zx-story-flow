import { ScreenNode } from './nodes.js';

export class NodeEditor {
    constructor(canvas, propertyPanelCallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.connections = []; // { fromNodeId, fromPortIndex, toNodeId }
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.propertyPanelCallback = propertyPanelCallback;

        this.selectedNode = null;
        this.dragState = null; // { type: 'node'|'connection', ... }

        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));

        // Start render loop
        this.animate();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.draw();
    }

    addNode(type, x = 100, y = 100) {
        const id = 'node_' + Date.now();
        // type ignored now effectively, or we can just assume screen
        const newNode = new ScreenNode(id, x, y);

        if (newNode) {
            this.nodes.push(newNode);
            this.selectNode(newNode);
            this.draw();
        }
    }

    removeNode(node) {
        if (!node) return;
        this.nodes = this.nodes.filter(n => n !== node);
        this.connections = this.connections.filter(c => c.fromNodeId !== node.id && c.toNodeId !== node.id);
        if (this.selectedNode === node) {
            this.selectNode(null);
        }
        this.draw();
    }

    selectNode(node) {
        this.selectedNode = node;
        if (this.propertyPanelCallback) {
            this.propertyPanelCallback(node);
        }
        this.draw();
    }

    getNodeAt(x, y) {
        // Reverse iterate to check top-most nodes first
        for (let i = this.nodes.length - 1; i >= 0; i--) {
            const node = this.nodes[i];
            if (node.isHit(x, y)) {
                return node;
            }
        }
        return null;
    }

    getPortAt(x, y) {
        for (const node of this.nodes) {
            if (node instanceof ScreenNode) {
                // Dynamic ports
                for (let i = 0; i < node.outputs.length; i++) {
                    const port = node.getOutputPort(i);
                    if (Math.hypot(x - port.x, y - port.y) < 10) return { node, index: i };
                }
            }
        }
        return null;
    }

    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
        const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

        const port = this.getPortAt(x, y);
        if (port) {
            this.dragState = {
                type: 'connection',
                fromNode: port.node,
                fromPortIndex: port.index,
                currentX: x,
                currentY: y
            };
            return;
        }

        const node = this.getNodeAt(x, y);
        if (node) {
            this.selectNode(node);
            this.dragState = {
                type: 'node',
                node: node,
                offsetX: x - node.x,
                offsetY: y - node.y
            };
        } else {
            this.selectNode(null);
            this.dragState = {
                type: 'pan',
                startX: e.clientX,
                startY: e.clientY,
                initialCameraX: this.camera.x,
                initialCameraY: this.camera.y
            };
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
        const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

        if (this.dragState) {
            if (this.dragState.type === 'node') {
                this.dragState.node.x = x - this.dragState.offsetX;
                this.dragState.node.y = y - this.dragState.offsetY;
                this.draw();
            } else if (this.dragState.type === 'connection') {
                this.dragState.currentX = x;
                this.dragState.currentY = y;
                this.draw();
            } else if (this.dragState.type === 'pan') {
                const dx = e.clientX - this.dragState.startX;
                const dy = e.clientY - this.dragState.startY;
                this.camera.x = this.dragState.initialCameraX + dx;
                this.camera.y = this.dragState.initialCameraY + dy;
                this.draw();
            }
        }
    }

    handleMouseUp(e) {
        if (this.dragState && this.dragState.type === 'connection') {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
            const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

            const targetNode = this.getNodeAt(x, y);
            if (targetNode && targetNode !== this.dragState.fromNode) {
                // Create connection
                // Remove existing connection from this port if any (optional, usually one output per port)
                this.connections = this.connections.filter(c =>
                    !(c.fromNodeId === this.dragState.fromNode.id && c.fromPortIndex === this.dragState.fromPortIndex)
                );

                this.connections.push({
                    fromNodeId: this.dragState.fromNode.id,
                    fromPortIndex: this.dragState.fromPortIndex,
                    toNodeId: targetNode.id
                });
            }
        }
        this.dragState = null;
        this.draw();
    }

    handleWheel(e) {
        e.preventDefault();

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // World position before zoom
        const worldX = (mouseX - this.camera.x) / this.camera.zoom;
        const worldY = (mouseY - this.camera.y) / this.camera.zoom;

        // Zoom factor
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.camera.zoom = Math.max(0.1, Math.min(3, this.camera.zoom * zoomFactor));

        // Adjust camera to keep mouse position stable
        this.camera.x = mouseX - worldX * this.camera.zoom;
        this.camera.y = mouseY - worldY * this.camera.zoom;

        this.draw();
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();
        this.ctx.translate(this.camera.x, this.camera.y);
        this.ctx.scale(this.camera.zoom, this.camera.zoom);

        // Draw Nodes
        this.nodes.forEach(node => {
            const isSelected = this.selectedNode === node;

            // Draw Node Body
            this.ctx.fillStyle = isSelected ? "#444" : "#333";
            this.ctx.strokeStyle = isSelected ? "#00d022" : "#666";
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.roundRect(node.x, node.y, node.width, node.height, 5);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw Node Title
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "bold 14px Courier New";
            this.ctx.fillText(node.title, node.x + 10, node.y + 25);

            // Draw Node Specific Content
            this.ctx.font = "12px Courier New";
            this.ctx.fillStyle = "#ccc";
            let content = node.text || "Empty screen text";
            if (content.length > 20) content = content.substring(0, 17) + "...";
            this.ctx.fillText(content, node.x + 10, node.y + 45);

            // Draw Ports and Options
            if (node instanceof ScreenNode) {
                node.outputs.forEach((opt, index) => {
                    const port = node.getOutputPort(index);
                    this.drawPort(port, "#00d022");

                    // Draw Label
                    this.ctx.fillStyle = "#fff";
                    this.ctx.font = "10px Courier New";
                    this.ctx.textAlign = "right";

                    let label = opt.label;
                    if (label.length > 15) label = label.substring(0, 12) + "...";

                    this.ctx.fillText(label, port.x - 12, port.y + 3);
                    this.ctx.textAlign = "left"; // Reset
                });
            }
        });

        // Draw Connections
        this.connections.forEach(conn => {
            const fromNode = this.nodes.find(n => n.id === conn.fromNodeId);
            const toNode = this.nodes.find(n => n.id === conn.toNodeId);
            if (!fromNode || !toNode) return;

            let startX, startY;
            // Assuming ScreenNode always
            const port = fromNode.getOutputPort(conn.fromPortIndex);
            if (port) {
                startX = port.x;
                startY = port.y;
            } else {
                // Port might no longer exist if option was deleted
                startX = fromNode.x + fromNode.width;
                startY = fromNode.y + fromNode.height / 2;
            }

            const endX = toNode.x;
            const endY = toNode.y + toNode.height / 2;

            this.drawConnection(startX, startY, endX, endY);
        });

        // Draw Dragging Connection
        if (this.dragState && this.dragState.type === 'connection') {
            let startX, startY;
            const fromNode = this.dragState.fromNode;
            // Assuming ScreenNode
            const port = fromNode.getOutputPort(this.dragState.fromPortIndex);
            startX = port.x;
            startY = port.y;

            this.drawConnection(startX, startY, this.dragState.currentX, this.dragState.currentY, true);
        }

        this.ctx.restore();
    }

    drawPort(pos, color) {
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.stroke();
    }

    drawConnection(x1, y1, x2, y2, isDragging = false) {
        this.ctx.strokeStyle = isDragging ? "#fff" : "#aaa";
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);

        // Bezier curve
        const cp1x = x1 + (x2 - x1) / 2;
        const cp1y = y1;
        const cp2x = x2 - (x2 - x1) / 2;
        const cp2y = y2;

        this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        this.ctx.stroke();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        // Currently just static draw on events, but good for reliable updates
        // this.draw(); 
    }
}
