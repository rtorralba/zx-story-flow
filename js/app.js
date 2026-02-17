import { NodeEditor } from './node-editor.js';
import { ScreenNode } from './nodes.js';
import { generateBasic } from './basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { createTap } from './bas2tap.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');
    let projectName = 'Untitled';

    // Initialize Editor
    const editor = new NodeEditor(canvas, (selectedNode) => {
        updatePropertyPanel(selectedNode);
    });

    // Function to update project name in header
    const updateProjectName = (name) => {
        projectName = name || 'Untitled';
        document.querySelector('h1').textContent = `ZX Adventure Builder - ${projectName}`;
    };

    // Toolbar Buttons
    document.getElementById('add-screen-btn').addEventListener('click', () => {
        editor.addNode('screen');
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
                name: projectName,
                nodes: editor.nodes.map(n => {
                    return {
                        id: n.id,
                        x: n.x,
                        y: n.y,
                        type: n.type,
                        title: n.title,
                        text: n.text,
                        outputs: n.outputs
                    };
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

                // Restore project name
                updateProjectName(data.name || 'Untitled');

                // Restore Nodes
                if (data.nodes) {
                    data.nodes.forEach(n => {
                        const newNode = new ScreenNode(n.id, n.x, n.y);
                        newNode.text = n.text || "";
                        newNode.title = n.title || n.type;

                        // Restore outputs if present, else default
                        if (n.outputs) {
                            newNode.outputs = n.outputs;
                        }

                        // Compatibility: if loading old DecisionNode (type 'Decision'), 
                        // convert question to text and options to output?
                        // Or if old ScreenNode, ensure outputs is set.
                        if (n.type === 'Decision') {
                            newNode.text = n.question || "Choice";
                            // It should have outputs already if we saved it as new structure, 
                            // but if loading old JSON:
                            // Old JSON didn't have outputs saved explicitly in the node object usually?
                            // Actually previous save logic was:
                            /*
                              if (n instanceof DecisionNode) data.question = n.question;
                              return data;
                            */
                            // Outputs are on the instance. `JSON.stringify` includes them by default if they are properties.
                            // So `n.outputs` *should* be there if it was a DecisionNode.
                        }

                        editor.nodes.push(newNode);
                    });
                }

                // Restore Connections
                if (data.connections) {
                    editor.connections = data.connections;
                }

                editor.draw();
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
            inputEl.rows = 8; // Increased from 4
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            const editBtn = document.createElement('button');
            editBtn.textContent = '✎ Edit in Window';
            editBtn.style.marginTop = '5px';
            editBtn.style.width = '100%';
            editBtn.addEventListener('click', () => {
                openTextEditor(value, onChange);
            });

            group.appendChild(labelEl);
            group.appendChild(inputEl);
            group.appendChild(editBtn);
            return group;
        };

        const openTextEditor = (currentText, onChange) => {
            // Create modal
            const modal = document.createElement('div');
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '10000';

            const modalContent = document.createElement('div');
            modalContent.style.backgroundColor = 'var(--panel-bg)';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '8px';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.maxHeight = '80%';
            modalContent.style.display = 'flex';
            modalContent.style.flexDirection = 'column';

            const title = document.createElement('h3');
            title.textContent = 'Edit Screen Text';
            title.style.marginTop = '0';

            const textarea = document.createElement('textarea');
            textarea.value = currentText || '';
            textarea.style.flex = '1';
            textarea.style.minHeight = '300px';
            textarea.style.fontFamily = 'Courier New, monospace';
            textarea.style.fontSize = '14px';
            textarea.style.backgroundColor = '#222';
            textarea.style.color = 'var(--text-color)';
            textarea.style.border = '1px solid #555';
            textarea.style.padding = '10px';
            textarea.style.resize = 'vertical';

            const btnContainer = document.createElement('div');
            btnContainer.style.marginTop = '15px';
            btnContainer.style.display = 'flex';
            btnContainer.style.gap = '10px';
            btnContainer.style.justifyContent = 'flex-end';

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.style.padding = '8px 16px';
            saveBtn.addEventListener('click', () => {
                onChange(textarea.value);
                document.body.removeChild(modal);
            });

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.padding = '8px 16px';
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modal);
            });

            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(saveBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(textarea);
            modalContent.appendChild(btnContainer);
            modal.appendChild(modalContent);
            document.body.appendChild(modal);

            textarea.focus();
        };

        const titleInput = createInput('Node Title', node.title, (val) => {
            node.title = val;
            editor.draw();
        });
        propertyContent.appendChild(titleInput);

        const textInput = createTextarea('Screen Text', node.text, (val) => {
            node.text = val;
            editor.draw();
        });
        propertyContent.appendChild(textInput);

        // Options Container
        const optsHeader = document.createElement('h4');
        optsHeader.textContent = "Options / Exits";
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
                    // Let's ask Node to remove it
                    node.removeOption(idx);

                    // Cleanup connections in Editor
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
