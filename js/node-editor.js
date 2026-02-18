import { ScreenNode, Group } from './nodes.js';

export class NodeEditor {
    constructor(canvas, propertyPanelCallback) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.nodes = [];
        this.groups = []; // Array of Group objects
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.propertyPanelCallback = propertyPanelCallback;

        this.selectedNode = null;
        this.selectedGroup = null;
        this.dragState = null; // { type: 'node'|'connection'|'group', ... }

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

    addGroup(x = 100, y = 100) {
        const id = 'group_' + Date.now();
        const newGroup = new Group(id, x, y);
        this.groups.push(newGroup);
        this.selectGroup(newGroup);
        this.draw();
        return newGroup;
    }

    removeGroup(group) {
        if (!group) return;
        this.groups = this.groups.filter(g => g !== group);
        if (this.selectedGroup === group) {
            this.selectGroup(null);
        }
        this.draw();
    }

    selectGroup(group) {
        this.selectedGroup = group;
        this.selectedNode = null; // Deselect node when selecting group
        if (this.propertyPanelCallback) {
            this.propertyPanelCallback(group);
        }
        this.draw();
    }

    getGroupAt(x, y) {
        // Check header first (for dragging), then check if point is in group
        for (let i = this.groups.length - 1; i >= 0; i--) {
            const group = this.groups[i];
            if (group.isHeaderHit(x, y)) {
                return { group, isHeader: true };
            }
        }
        for (let i = this.groups.length - 1; i >= 0; i--) {
            const group = this.groups[i];
            if (group.isHit(x, y)) {
                return { group, isHeader: false };
            }
        }
        return null;
    }

    updateGroupMembership() {
        // Update which nodes belong to which groups
        this.groups.forEach(group => {
            group.nodeIds = [];
            this.nodes.forEach(node => {
                if (group.containsNode(node)) {
                    group.nodeIds.push(node.id);
                }
            });
        });
    }

    removeNode(node) {
        if (!node) return;

        // Clear any outputs that point to this node
        this.nodes.forEach(n => {
            n.outputs.forEach(output => {
                if (output.target === node.id) {
                    output.target = null;
                }
            });
        });

        this.nodes = this.nodes.filter(n => n !== node);
        if (this.selectedNode === node) {
            this.selectNode(null);
        }
        this.draw();
    }

    selectNode(node) {
        this.selectedNode = node;
        this.selectedGroup = null; // Deselect group when selecting node
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

        // Check if clicking on a group resize handle (before nodes and headers)
        for (let i = this.groups.length - 1; i >= 0; i--) {
            const group = this.groups[i];
            if (group.isResizeHandleHit(x, y)) {
                this.selectGroup(group);
                this.dragState = {
                    type: 'resize-group',
                    group: group,
                    startX: x,
                    startY: y,
                    initialWidth: group.width,
                    initialHeight: group.height
                };
                return;
            }
        }

        // Check if clicking on a node first (nodes are on top of groups)
        const node = this.getNodeAt(x, y);
        if (node) {
            this.selectNode(node);
            this.dragState = {
                type: 'node',
                node: node,
                offsetX: x - node.x,
                offsetY: y - node.y
            };
            return;
        }

        // Check if clicking on a group header
        const groupResult = this.getGroupAt(x, y);
        if (groupResult && groupResult.isHeader) {
            this.selectGroup(groupResult.group);
            this.dragState = {
                type: 'group',
                group: groupResult.group,
                offsetX: x - groupResult.group.x,
                offsetY: y - groupResult.group.y
            };
            return;
        }

        // If clicking inside a group but not on header, select it but don't drag
        if (groupResult) {
            this.selectGroup(groupResult.group);
            return;
        }

        // Otherwise, start panning
        this.selectNode(null);
        this.selectGroup(null);
        this.dragState = {
            type: 'pan',
            startX: e.clientX,
            startY: e.clientY,
            initialCameraX: this.camera.x,
            initialCameraY: this.camera.y
        };
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left - this.camera.x) / this.camera.zoom;
        const y = (e.clientY - rect.top - this.camera.y) / this.camera.zoom;

        // Update cursor based on hover state
        if (!this.dragState) {
            let cursorSet = false;
            // Check if hovering over a resize handle
            for (let i = this.groups.length - 1; i >= 0; i--) {
                const group = this.groups[i];
                if (group.isResizeHandleHit(x, y)) {
                    this.canvas.style.cursor = 'nwse-resize';
                    cursorSet = true;
                    break;
                }
            }
            if (!cursorSet) {
                this.canvas.style.cursor = 'default';
            }
        }

        if (this.dragState) {
            if (this.dragState.type === 'node') {
                this.dragState.node.x = x - this.dragState.offsetX;
                this.dragState.node.y = y - this.dragState.offsetY;
                this.draw();
            } else if (this.dragState.type === 'resize-group') {
                const group = this.dragState.group;
                const deltaX = x - this.dragState.startX;
                const deltaY = y - this.dragState.startY;

                // Update width and height with minimum constraints
                group.width = Math.max(150, this.dragState.initialWidth + deltaX);
                group.height = Math.max(100, this.dragState.initialHeight + deltaY);

                this.draw();
            } else if (this.dragState.type === 'group') {
                const group = this.dragState.group;
                const newX = x - this.dragState.offsetX;
                const newY = y - this.dragState.offsetY;
                const deltaX = newX - group.x;
                const deltaY = newY - group.y;

                // Move the group
                group.x = newX;
                group.y = newY;

                // Move all nodes that belong to this group
                group.nodeIds.forEach(nodeId => {
                    const node = this.nodes.find(n => n.id === nodeId);
                    if (node) {
                        node.x += deltaX;
                        node.y += deltaY;
                    }
                });

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
                // Set connection target directly in output
                const fromNode = this.dragState.fromNode;
                const portIndex = this.dragState.fromPortIndex;

                if (fromNode.outputs[portIndex]) {
                    fromNode.outputs[portIndex].target = targetNode.id;
                }
            }
        }

        // Update group membership after dragging nodes or resizing groups
        if (this.dragState && (this.dragState.type === 'node' || this.dragState.type === 'resize-group')) {
            this.updateGroupMembership();
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

        // Draw Groups first (behind nodes)
        this.groups.forEach(group => {
            const isSelected = this.selectedGroup === group;
            const headerHeight = 30;

            // Draw group background
            this.ctx.fillStyle = group.color + '15'; // Add transparency
            this.ctx.strokeStyle = isSelected ? group.color : group.color + '80';
            this.ctx.lineWidth = isSelected ? 3 : 2;
            this.ctx.beginPath();
            this.ctx.roundRect(group.x, group.y, group.width, group.height, 8);
            this.ctx.fill();
            this.ctx.stroke();

            // Draw header bar
            this.ctx.fillStyle = group.color;
            this.ctx.beginPath();
            this.ctx.roundRect(group.x, group.y, group.width, headerHeight, [8, 8, 0, 0]);
            this.ctx.fill();

            // Draw group name
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "bold 14px Courier New";
            this.ctx.fillText(group.name, group.x + 10, group.y + 20);

            // Draw resize handle in bottom-right corner
            const handleSize = 20;
            const handleX = group.x + group.width - handleSize;
            const handleY = group.y + group.height - handleSize;

            // Draw handle background
            this.ctx.fillStyle = group.color + (isSelected ? '60' : '30');
            this.ctx.fillRect(handleX, handleY, handleSize, handleSize);

            // Draw grip lines
            this.ctx.strokeStyle = group.color;
            this.ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const offset = handleSize - 4 - (i * 5);
                this.ctx.beginPath();
                this.ctx.moveTo(group.x + group.width - offset, group.y + group.height - 2);
                this.ctx.lineTo(group.x + group.width - 2, group.y + group.height - offset);
                this.ctx.stroke();
            }
        });

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
        this.nodes.forEach(fromNode => {
            if (fromNode instanceof ScreenNode) {
                fromNode.outputs.forEach((output, index) => {
                    if (!output.target) return;

                    const toNode = this.nodes.find(n => n.id === output.target);
                    if (!toNode) return;

                    const port = fromNode.getOutputPort(index);
                    const startX = port.x;
                    const startY = port.y;
                    const endX = toNode.x;
                    const endY = toNode.y + toNode.height / 2;

                    this.drawConnection(startX, startY, endX, endY);
                });
            }
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
