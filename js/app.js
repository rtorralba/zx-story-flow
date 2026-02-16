import { NodeEditor } from './node-editor.js';
import { ScreenNode, DecisionNode } from './nodes.js';
import { generateBasic } from './basic-generator.js';
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
