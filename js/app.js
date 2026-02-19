// ZX Story Flow - Visual BASIC Adventure Creator for ZX Spectrum
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { NodeEditor } from './node-editor.js';
import { ScreenNode, Group } from './nodes.js';
import { generateBasic } from './basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { generateTapFromBasic } from './tap-generator.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');
    let projectName = 'Untitled';

    // Referencias a las secciones de configuración
    const separatorConfigSection = document.getElementById('separator-config');
    const interfaceConfigSection = document.getElementById('interface-config');
    const separatorInk = document.getElementById('separator-ink');
    const separatorPaper = document.getElementById('separator-paper');
    const separatorBright = document.getElementById('separator-bright');
    const separatorFlash = document.getElementById('separator-flash');
    const interfaceInk = document.getElementById('interface-ink');
    const interfacePaper = document.getElementById('interface-paper');
    const interfaceBright = document.getElementById('interface-bright');
    const interfaceFlash = document.getElementById('interface-flash');

    // Initialize Editor
    const editor = new NodeEditor(canvas, (selectedNode) => {
        updatePropertyPanel(selectedNode);
        
        // Mostrar opciones solo si hay página seleccionada
        if (selectedNode && (selectedNode.type === 'screen' || selectedNode.type === 'Screen')) {
            separatorConfigSection.style.display = 'block';
            interfaceConfigSection.style.display = 'block';
            
            // Cargar configuraciones guardadas
            if (selectedNode.separatorConfig) {
                separatorInk.value = selectedNode.separatorConfig.ink || 'black';
                separatorPaper.value = selectedNode.separatorConfig.paper || 'white';
                separatorBright.checked = !!selectedNode.separatorConfig.bright;
                separatorFlash.checked = !!selectedNode.separatorConfig.flash;
            } else {
                separatorInk.value = 'black';
                separatorPaper.value = 'white';
                separatorBright.checked = false;
                separatorFlash.checked = false;
            }
            
            if (selectedNode.interfaceConfig) {
                interfaceInk.value = selectedNode.interfaceConfig.ink || 'black';
                interfacePaper.value = selectedNode.interfaceConfig.paper || 'white';
                interfaceBright.checked = !!selectedNode.interfaceConfig.bright;
                interfaceFlash.checked = !!selectedNode.interfaceConfig.flash;
            } else {
                interfaceInk.value = 'black';
                interfacePaper.value = 'white';
                interfaceBright.checked = false;
                interfaceFlash.checked = false;
            }
        } else {
            separatorConfigSection.style.display = 'none';
            interfaceConfigSection.style.display = 'none';
        }
    });

    // Función para guardar configuraciones en el nodo seleccionado
    function saveConfigToNode(node) {
        if (!node || (node.type !== 'screen' && node.type !== 'Screen')) return;
        node.separatorConfig = {
            ink: separatorInk.value,
            paper: separatorPaper.value,
            bright: separatorBright.checked,
            flash: separatorFlash.checked
        };
        node.interfaceConfig = {
            ink: interfaceInk.value,
            paper: interfacePaper.value,
            bright: interfaceBright.checked,
            flash: interfaceFlash.checked
        };
    }

    // Event listeners para guardar configuraciones
    separatorInk.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    separatorPaper.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    separatorBright.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    separatorFlash.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    interfaceInk.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    interfacePaper.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    interfaceBright.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    interfaceFlash.addEventListener('change', () => saveConfigToNode(editor.selectedNode));

    // Function to update project name in header
    const updateProjectName = (name) => {
        projectName = name || 'Untitled';
        const display = document.getElementById('project-name-display');
        if (display) {
            display.textContent = projectName;
        }
    };

    // Toolbar Buttons
    document.getElementById('add-screen-btn').addEventListener('click', () => {
        editor.addNode('screen');
    });

    document.getElementById('add-group-btn').addEventListener('click', () => {
        editor.addGroup(200, 150);
    });

    // Fullscreen button
    document.getElementById('fullscreen-btn').addEventListener('click', () => {
        const app = document.getElementById('app');
        if (!document.fullscreenElement) {
            app.requestFullscreen().catch(err => {
                console.error('Error attempting to enable fullscreen:', err);
            });
        } else {
            document.exitFullscreen();
        }
    });

    document.getElementById('export-png-btn').addEventListener('click', () => {
        editor.exportToPNG();
    });

    document.getElementById('export-tap-btn').addEventListener('click', () => {
        try {
            const basicCode = generateBasic(editor.nodes);
            const tapData = generateTapFromBasic(basicCode, "adventure");

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
        const basicCode = generateBasic(editor.nodes);

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
        const muchoCode = generateMucho(editor.nodes);
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
                        outputs: n.outputs,
                        separatorConfig: n.separatorConfig || null,
                        interfaceConfig: n.interfaceConfig || null
                    };
                }),
                groups: editor.groups.map(g => {
                    return {
                        id: g.id,
                        x: g.x,
                        y: g.y,
                        width: g.width,
                        height: g.height,
                        name: g.name,
                        color: g.color,
                        nodeIds: g.nodeIds
                    };
                })
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
                editor.groups = [];
                editor.selectNode(null);
                editor.selectGroup(null);

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

                        // Restaurar configuraciones
                        if (n.separatorConfig) {
                            newNode.separatorConfig = n.separatorConfig;
                        }
                        if (n.interfaceConfig) {
                            newNode.interfaceConfig = n.interfaceConfig;
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

                // Restore Groups
                if (data.groups) {
                    data.groups.forEach(g => {
                        const newGroup = new Group(g.id, g.x, g.y, g.width, g.height);
                        newGroup.name = g.name || "New Group";
                        newGroup.color = g.color || "#4a90e2";
                        newGroup.nodeIds = g.nodeIds || [];
                        editor.groups.push(newGroup);
                    });
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

    function updateGroupProperties(group) {
        propertyContent.innerHTML = '';

        const createInput = (label, value, onChange) => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const inputEl = document.createElement('input');
            inputEl.value = value || '';
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            formGroup.appendChild(labelEl);
            formGroup.appendChild(inputEl);
            return formGroup;
        };

        const createColorInput = (label, value, onChange) => {
            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const inputEl = document.createElement('input');
            inputEl.type = 'color';
            inputEl.value = value || '#4a90e2';
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            formGroup.appendChild(labelEl);
            formGroup.appendChild(inputEl);
            return formGroup;
        };

        const nameInput = createInput('Group Name', group.name, (val) => {
            group.name = val;
            editor.draw();
        });
        propertyContent.appendChild(nameInput);

        const colorInput = createColorInput('Group Color', group.color, (val) => {
            group.color = val;
            editor.draw();
        });
        propertyContent.appendChild(colorInput);

        // Show member nodes count
        const infoDiv = document.createElement('div');
        infoDiv.className = 'form-group';
        infoDiv.innerHTML = `<p style="color: #aaa; font-size: 0.9em;">Contains ${group.nodeIds.length} node(s)</p>`;
        propertyContent.appendChild(infoDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = "Delete Group";
        deleteBtn.style.marginTop = "20px";
        deleteBtn.style.backgroundColor = "#d00000";
        deleteBtn.style.color = "#fff";
        deleteBtn.style.border = "none";
        deleteBtn.style.padding = "10px";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.width = "100%";
        deleteBtn.addEventListener('click', () => {
            editor.removeGroup(group);
        });
        propertyContent.appendChild(deleteBtn);
    }

    function updatePropertyPanel(nodeOrGroup) {
        propertyContent.innerHTML = '';
        if (!nodeOrGroup) {
            propertyContent.innerHTML = '<p>Select a node or group to edit properties.</p>';
            return;
        }

        // Check if it's a Group
        if (nodeOrGroup instanceof Group) {
            updateGroupProperties(nodeOrGroup);
            return;
        }

        // Otherwise, it's a node
        const node = nodeOrGroup;

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
            inputEl.readOnly = true; // Make readonly - force users to use the window editor
            inputEl.className = 'screen-text-readonly';
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            const editBtn = document.createElement('button');
            editBtn.textContent = '✎ Edit in Window';
            editBtn.style.marginTop = '5px';
            editBtn.style.width = '100%';
            editBtn.addEventListener('click', () => {
                // Use the CURRENT value from the textarea, not the initial 'value' closure
                openTextEditor(inputEl.value, (newVal) => {
                    inputEl.value = newVal;
                    onChange(newVal);
                });
            });

            group.appendChild(labelEl);
            group.appendChild(inputEl);
            group.appendChild(editBtn);
            return group;
        };

        const openTextEditor = (currentText, onSave) => {
            // Create modal
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            const title = document.createElement('h3');
            title.textContent = 'Edit Screen Text';

            const crtTv = document.createElement('div');
            crtTv.className = 'crt-tv';

            const crtScreen = document.createElement('div');
            crtScreen.className = 'crt-screen';

            const textarea = document.createElement('textarea');
            textarea.value = currentText || '';
            textarea.className = 'spectrum-textarea';
            textarea.cols = 32;
            textarea.rows = 24;
            textarea.setAttribute('maxlength', 32 * 24);

            // Transliterate non-ASCII characters to ZX Spectrum compatible ASCII
            const transliterateToASCII = (text) => {
                const charMap = {
                    'á': 'a', 'à': 'a', 'ä': 'a', 'â': 'a', 'ã': 'a', 'å': 'a',
                    'é': 'e', 'è': 'e', 'ë': 'e', 'ê': 'e',
                    'í': 'i', 'ì': 'i', 'ï': 'i', 'î': 'i',
                    'ó': 'o', 'ò': 'o', 'ö': 'o', 'ô': 'o', 'õ': 'o', 'ø': 'o',
                    'ú': 'u', 'ù': 'u', 'ü': 'u', 'û': 'u',
                    'ñ': 'n',
                    'ç': 'c',
                    'Á': 'A', 'À': 'A', 'Ä': 'A', 'Â': 'A', 'Ã': 'A', 'Å': 'A',
                    'É': 'E', 'È': 'E', 'Ë': 'E', 'Ê': 'E',
                    'Í': 'I', 'Ì': 'I', 'Ï': 'I', 'Î': 'I',
                    'Ó': 'O', 'Ò': 'O', 'Ö': 'O', 'Ô': 'O', 'Õ': 'O', 'Ø': 'O',
                    'Ú': 'U', 'Ù': 'U', 'Ü': 'U', 'Û': 'U',
                    'Ñ': 'N',
                    'Ç': 'C',
                    '¿': '?', '¡': '!',
                    '€': 'E', '£': 'L', '¥': 'Y',
                    '\u201C': '"', '\u201D': '"', '\u2018': "'", '\u2019': "'",
                    '–': '-', '—': '-', '…': '...'
                };
                
                return text.replace(/[^\x00-\x7F]/g, (char) => charMap[char] || '');
            };

            textarea.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const originalLength = e.target.value.length;
                const transliterated = transliterateToASCII(e.target.value);
                
                if (transliterated !== e.target.value) {
                    e.target.value = transliterated;
                    // Adjust cursor position if text length changed
                    const lengthDiff = originalLength - transliterated.length;
                    e.target.setSelectionRange(cursorPos - lengthDiff, cursorPos - lengthDiff);
                }
            });

            crtScreen.appendChild(textarea);
            crtTv.appendChild(crtScreen);

            const btnContainer = document.createElement('div');
            btnContainer.className = 'modal-buttons';

            const saveBtn = document.createElement('button');
            saveBtn.className = 'save-btn';
            saveBtn.textContent = 'Save';
            saveBtn.addEventListener('click', () => {
                onSave(textarea.value);
                overlay.remove();
            });

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.addEventListener('click', () => {
                overlay.remove();
            });

            btnContainer.appendChild(cancelBtn);
            btnContainer.appendChild(saveBtn);
            modalContent.appendChild(title);
            modalContent.appendChild(crtTv);
            modalContent.appendChild(btnContainer);
            overlay.appendChild(modalContent);

            // Append to #app instead of body to support fullscreen visibility
            const app = document.getElementById('app');
            app.appendChild(overlay);

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
