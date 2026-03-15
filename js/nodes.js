// ZX Story Flow - Node Geometry Utilities
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details
//
// Nodes are now PLAIN OBJECTS (POJOs). These classes provide:
//   - Static factory methods to create new plain node objects
//   - Static geometry/hit-testing functions used by the canvas

export class ScreenNode {
    // Constants shared by all screen nodes
    static BASE_HEIGHT = 100;
    static OPTION_HEIGHT = 30;
    static FOOTER_HEIGHT = 20;
    static DEFAULT_WIDTH = 280;

    /** Create a new plain ScreenNode object */
    static create(id, x, y) {
        const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const outputs = [{ label: 'Next', target: null, eligible: true, prefix: '', suffix: '' }];
        return {
            id,
            type: 'Screen',
            x, y,
            width: ScreenNode.DEFAULT_WIDTH,
            height: ScreenNode.BASE_HEIGHT + outputs.length * ScreenNode.OPTION_HEIGHT + ScreenNode.FOOTER_HEIGHT,
            title: 'Screen_' + suffix,
            text: 'Screen Text',
            outputs,
            borderColor: 'black'
        };
    }

    /** Hit-test a (cx,cy) world point against a node POJO */
    static isHit(node, x, y) {
        return x >= node.x && x <= node.x + node.width &&
               y >= node.y && y <= node.y + node.height;
    }

    /** Get the world position of an output port */
    static getOutputPort(node, index) {
        const totalOpts = node.outputs.length * ScreenNode.OPTION_HEIGHT;
        const startY = node.height - totalOpts - ScreenNode.FOOTER_HEIGHT;
        const y = node.y + startY + index * ScreenNode.OPTION_HEIGHT + ScreenNode.OPTION_HEIGHT / 2;
        return { x: node.x + node.width, y };
    }

    /** Check resize handle (bottom-right corner) */
    static isResizeHandleHit(node, x, y) {
        const h = 20;
        return x >= node.x + node.width - h && x <= node.x + node.width &&
               y >= node.y + node.height - h && y <= node.y + node.height;
    }

    /** Check delete icon (top-right circle) */
    static isDeleteIconHit(node, x, y) {
        const s = 16;
        const cx = node.x + node.width - s - 5 + s / 2;
        const cy = node.y + 5 + s / 2;
        return Math.hypot(x - cx, y - cy) <= s / 2;
    }

    /** Check config icon (bottom-left circle) */
    static isConfigIconHit(node, x, y) {
        const s = 16;
        const cx = node.x + 5 + s / 2;
        const cy = node.y + node.height - s - 5 + s / 2;
        return Math.hypot(x - cx, y - cy) <= s / 2;
    }

    /** Add an option to a node POJO in-place */
    static addOption(node, label = 'New Option') {
        node.outputs.push({ label, target: null, eligible: true, prefix: '', suffix: '' });
        node.height += ScreenNode.OPTION_HEIGHT;
    }

    /** Remove an option from a node POJO in-place */
    static removeOption(node, index) {
        if (node.outputs.length > 0) {
            node.outputs.splice(index, 1);
            node.height -= ScreenNode.OPTION_HEIGHT;
        }
    }
}

export class NodeReference {
    static DEFAULT_WIDTH = 120;
    static DEFAULT_HEIGHT = 50;

    /** Create a new plain NodeReference object */
    static create(id, x, y, targetNodeId = null) {
        return {
            id,
            type: 'Reference',
            x, y,
            width: NodeReference.DEFAULT_WIDTH,
            height: NodeReference.DEFAULT_HEIGHT,
            title: 'Reference',
            text: '',
            outputs: [],
            targetNodeId
        };
    }

    static isHit(node, x, y) {
        return x >= node.x && x <= node.x + node.width &&
               y >= node.y && y <= node.y + node.height;
    }

    static isResizeHandleHit(node, x, y) {
        const h = 14;
        return x >= node.x + node.width - h && x <= node.x + node.width &&
               y >= node.y + node.height - h && y <= node.y + node.height;
    }

    static getDisplayTitle(node, nodes) {
        if (!node.targetNodeId) return '(No target)';
        const target = nodes.find(n => n.id === node.targetNodeId);
        return target ? target.title : '(Not found)';
    }
}

export class Group {
    static DEFAULT_WIDTH = 400;
    static DEFAULT_HEIGHT = 300;

    /** Create a new plain Group object */
    static create(id, x, y) {
        return {
            id,
            type: 'Group',
            x, y,
            width: Group.DEFAULT_WIDTH,
            height: Group.DEFAULT_HEIGHT,
            name: 'New Group',
            color: '#4a90e2',
            nodeIds: []
        };
    }

    static isHit(group, x, y) {
        return x >= group.x && x <= group.x + group.width &&
               y >= group.y && y <= group.y + group.height;
    }

    static isHeaderHit(group, x, y) {
        const h = 30;
        return x >= group.x && x <= group.x + group.width &&
               y >= group.y && y <= group.y + h;
    }

    static containsPoint(group, x, y) {
        return Group.isHit(group, x, y);
    }

    static containsNode(group, node) {
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        return Group.containsPoint(group, cx, cy);
    }

    static isResizeHandleHit(group, x, y) {
        const h = 20;
        return x >= group.x + group.width - h && x <= group.x + group.width &&
               y >= group.y + group.height - h && y <= group.y + group.height;
    }

    static isDeleteIconHit(group, x, y) {
        const s = 16;
        const cx = group.x + group.width - s - 5 + s / 2;
        const cy = group.y + 5 + s / 2;
        return Math.hypot(x - cx, y - cy) <= s / 2;
    }

    static isConfigIconHit(group, x, y) {
        const s = 16;
        const cx = group.x + 5 + s / 2;
        const cy = group.y + group.height - s - 5 + s / 2;
        return Math.hypot(x - cx, y - cy) <= s / 2;
    }
}
