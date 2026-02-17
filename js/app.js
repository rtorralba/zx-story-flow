import { NodeEditor } from './node-editor.js';
import { ScreenNode, DecisionNode } from './nodes.js';
import { generateBasic } from './basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { createTap } from './bas2tap.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');

    // Initialize Editor
    const editor = new NodeEditor(canvas, (selectedNode) => {
        updatePropertyPanel(selectedNode);
    });

    // Toolbar Buttons
    document.getElementById('add-screen-btn').addEventListener('click', () => {
        editor.addNode('screen');
    });

    document.getElementById('add-decision-btn').addEventListener('click', () => {
        editor.addNode('decision');
    });

    document.getElementById('export-tap-btn').addEventListener('click', () => {
        try {
            const basicCode = generateBasic(editor.nodes, editor.connections);
            const tapData = createTap(basicCode, "adventure");

            const blob = new Blob([tapData], { type: 'application/x-tap' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'adventure.tap';
            a.click();
            URL.revokeObjectURL(url);
            console.log("TAP Export successful");
        } catch (e) {
            console.error("TAP Export failed:", e);
            alert("TAP Export failed: " + e.message);
        }
    });

    document.getElementById('export-btn').addEventListener('click', () => {
        const basicCode = generateBasic(editor.nodes, editor.connections);

        // Create a blob and download
        const blob = new Blob([basicCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'adventure.bas';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('export-mucho-btn').addEventListener('click', () => {
        const muchoCode = generateMucho(editor.nodes, editor.connections);
        const blob = new Blob([muchoCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'adventure.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    // Save Project
    document.getElementById('save-btn').addEventListener('click', () => {
        console.log("Save clicked");
        try {
            const projectData = {
                nodes: editor.nodes.map(n => {
                    const data = {
                        id: n.id,
                        x: n.x,
                        y: n.y,
                        type: n.type,
                        title: n.title
                    };
                    if (n instanceof ScreenNode) data.text = n.text;
                    if (n instanceof DecisionNode) data.question = n.question;
                    return data;
                }),
                connections: editor.connections
            };

            const json = JSON.stringify(projectData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'project.json';
            a.click();
            URL.revokeObjectURL(url);
            console.log("Save completed");
        } catch (e) {
            console.error("Save error:", e);
            alert("Save failed: " + e.message);
        }
    });

    // Load Project
    const loadInput = document.getElementById('load-input');
    document.getElementById('load-btn').addEventListener('click', () => {
        console.log("Load clicked");
        loadInput.click();
    });

    loadInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                // Clear existing
                editor.nodes = [];
                editor.connections = [];
                editor.selectNode(null);

                // Restore Nodes
                if (data.nodes) {
                    data.nodes.forEach(n => {
                        let newNode;
                        if (n.type === 'Screen') {
                            newNode = new ScreenNode(n.id, n.x, n.y);
                            newNode.text = n.text || "";
                        } else if (n.type === 'Decision') {
                            newNode = new DecisionNode(n.id, n.x, n.y);
                            newNode.question = n.question || "";
                        }

                        if (newNode) {
                            newNode.title = n.title || n.type;
                            editor.nodes.push(newNode);
                        }
                    });
                }

                // Restore Connections
                if (data.connections) {
                    editor.connections = data.connections;
                }

                editor.draw();
                alert("Project loaded successfully!");
            } catch (err) {
                console.error(err);
                alert("Error loading project: " + err.message);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        loadInput.value = '';
    });

    function updatePropertyPanel(node) {
        propertyContent.innerHTML = '';
        if (!node) {
            propertyContent.innerHTML = '<p>Select a node to edit properties.</p>';
            return;
        }

        const createInput = (label, value, onChange) => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const inputEl = document.createElement('input');
            inputEl.value = value || '';
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            group.appendChild(labelEl);
            group.appendChild(inputEl);
            return group;
        };

        const createTextarea = (label, value, onChange) => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const inputEl = document.createElement('textarea');
            inputEl.value = value || '';
            inputEl.rows = 4;
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            group.appendChild(labelEl);
            group.appendChild(inputEl);
            return group;
        };

        const titleInput = createInput('Node Title', node.title, (val) => {
            node.title = val;
            editor.draw();
        });
        propertyContent.appendChild(titleInput);

        if (node instanceof ScreenNode) {
            const textInput = createTextarea('Screen Text', node.text, (val) => {
                node.text = val;
                editor.draw();
            });
            propertyContent.appendChild(textInput);
        } else if (node instanceof DecisionNode) {
            const questionInput = createInput('Question', node.question, (val) => {
                node.question = val;
                editor.draw();
            });
            propertyContent.appendChild(questionInput);

            // Options Container
            const optsHeader = document.createElement('h4');
            optsHeader.textContent = "Options";
            optsHeader.style.marginTop = "15px";
            propertyContent.appendChild(optsHeader);

            const renderOptions = () => {
                // Remove old options UI if exists
                const oldContainer = document.getElementById('options-container');
                if (oldContainer) oldContainer.remove();

                const container = document.createElement('div');
                container.id = 'options-container';

                node.outputs.forEach((opt, idx) => {
                    const row = document.createElement('div');
                    row.style.display = 'flex';
                    row.style.marginBottom = '5px';

                    const inp = document.createElement('input');
                    inp.value = opt.label;
                    inp.style.flex = "1";
                    inp.style.marginRight = "5px";
                    inp.addEventListener('input', (e) => {
                        opt.label = e.target.value;
                        editor.draw();
                    });

                    const del = document.createElement('button');
                    del.textContent = "X";
                    del.style.backgroundColor = "#d00000";
                    del.style.color = "white";
                    del.style.border = "none";
                    del.addEventListener('click', () => {
                        // Remove option
                        // Also need to remove connections that used this port index!
                        // And shift connections for higher indices down?
                        // This connection management is tricky.
                        // Simplest: Just remove, let editor clean up invalid connections on next draw/action?
                        // NodeEditor connection filtering:
                        // this.connections = this.connections.filter(c => c.fromNodeId !== node.id && c.toNodeId !== node.id);
                        // We need to filter specific port index.

                        // Let's ask Node to remove it
                        node.removeOption(idx);

                        // Cleanup connections in Editor
                        // 1. Remove connections from the deleted index
                        // 2. Decrement index for connections > idx
                        editor.connections = editor.connections.filter(c => {
                            if (c.fromNodeId === node.id && c.fromPortIndex === idx) return false;
                            return true;
                        });
                        editor.connections.forEach(c => {
                            if (c.fromNodeId === node.id && c.fromPortIndex > idx) {
                                c.fromPortIndex--;
                            }
                        });

                        editor.draw();
                        renderOptions(); // Re-render UI
                    });

                    row.appendChild(inp);
                    row.appendChild(del);
                    container.appendChild(row);
                });

                // Add Option Button
                const addBtn = document.createElement('button');
                addBtn.textContent = "+ Add Option";
                addBtn.style.width = "100%";
                addBtn.style.marginTop = "5px";
                addBtn.addEventListener('click', () => {
                    node.addOption(`Option ${node.outputs.length + 1}`);
                    editor.draw();
                    renderOptions();
                });
                container.appendChild(addBtn);

                propertyContent.appendChild(container);
            };

            renderOptions();
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete Node";
        deleteBtn.style.marginTop = "20px";
        deleteBtn.style.backgroundColor = "#d00000";
        deleteBtn.style.color = "#fff";
        deleteBtn.style.border = "none";
        deleteBtn.style.padding = "10px";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.width = "100%";
        deleteBtn.addEventListener('click', () => {
            editor.removeNode(node);
        });
        propertyContent.appendChild(deleteBtn);
    }
});
