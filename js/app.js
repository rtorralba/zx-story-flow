// ZX Story Flow - Visual BASIC Adventure Creator for ZX Spectrum
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { NodeEditor } from './node-editor.js';
import { ScreenNode, Group, NodeReference } from './nodes.js';
import { generateBasic } from './basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { generateTapFromBasic } from './tap-generator.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');
    let projectName = 'Untitled';

    // Configuración global (por defecto)
    let globalConfig = {
        page: { ink: 'white', paper: 'black', bright: false, flash: false },
        separator: { ink: 'white', paper: 'black', bright: false, flash: false },
        interface: { ink: 'white', paper: 'black', bright: false, flash: false }
    };

    // Referencias a las secciones de configuración específica
    const separatorConfigSection = document.getElementById('separator-config');
    const useCustomConfigCheckbox = document.getElementById('use-custom-config');
    const customConfigContent = document.getElementById('custom-config-content');
    const pageInk = document.getElementById('page-ink');
    const pagePaper = document.getElementById('page-paper');
    const pageBright = document.getElementById('page-bright');
    const pageFlash = document.getElementById('page-flash');
    const separatorInk = document.getElementById('separator-ink');
    const separatorPaper = document.getElementById('separator-paper');
    const separatorBright = document.getElementById('separator-bright');
    const separatorFlash = document.getElementById('separator-flash');
    const interfaceInk = document.getElementById('interface-ink');
    const interfacePaper = document.getElementById('interface-paper');
    const interfaceBright = document.getElementById('interface-bright');
    const interfaceFlash = document.getElementById('interface-flash');

    // Referencias a la configuración global
    const globalConfigModal = document.getElementById('global-config-modal');
    const globalPageInk = document.getElementById('global-page-ink');
    const globalPagePaper = document.getElementById('global-page-paper');
    const globalPageBright = document.getElementById('global-page-bright');
    const globalPageFlash = document.getElementById('global-page-flash');
    const globalSeparatorInk = document.getElementById('global-separator-ink');
    const globalSeparatorPaper = document.getElementById('global-separator-paper');
    const globalSeparatorBright = document.getElementById('global-separator-bright');
    const globalSeparatorFlash = document.getElementById('global-separator-flash');
    const globalInterfaceInk = document.getElementById('global-interface-ink');
    const globalInterfacePaper = document.getElementById('global-interface-paper');
    const globalInterfaceBright = document.getElementById('global-interface-bright');
    const globalInterfaceFlash = document.getElementById('global-interface-flash');

    // Cargar configuración global en los controles
    function loadGlobalConfig() {
        globalPageInk.value = globalConfig.page.ink;
        globalPagePaper.value = globalConfig.page.paper;
        globalPageBright.checked = globalConfig.page.bright;
        globalPageFlash.checked = globalConfig.page.flash;
        globalSeparatorInk.value = globalConfig.separator.ink;
        globalSeparatorPaper.value = globalConfig.separator.paper;
        globalSeparatorBright.checked = globalConfig.separator.bright;
        globalSeparatorFlash.checked = globalConfig.separator.flash;
        globalInterfaceInk.value = globalConfig.interface.ink;
        globalInterfacePaper.value = globalConfig.interface.paper;
        globalInterfaceBright.checked = globalConfig.interface.bright;
        globalInterfaceFlash.checked = globalConfig.interface.flash;
    }

    // Guardar configuración global desde los controles
    function saveGlobalConfig() {
        globalConfig.page = {
            ink: globalPageInk.value,
            paper: globalPagePaper.value,
            bright: globalPageBright.checked,
            flash: globalPageFlash.checked
        };
        globalConfig.separator = {
            ink: globalSeparatorInk.value,
            paper: globalSeparatorPaper.value,
            bright: globalSeparatorBright.checked,
            flash: globalSeparatorFlash.checked
        };
        globalConfig.interface = {
            ink: globalInterfaceInk.value,
            paper: globalInterfacePaper.value,
            bright: globalInterfaceBright.checked,
            flash: globalInterfaceFlash.checked
        };
    }

    // Abrir modal de configuración global
    document.getElementById('config-btn').addEventListener('click', () => {
        loadGlobalConfig();
        globalConfigModal.style.display = 'flex';
    });

    // Cerrar modal de configuración global
    document.getElementById('close-global-config').addEventListener('click', () => {
        saveGlobalConfig();
        globalConfigModal.style.display = 'none';
    });

    // Cerrar modal con botón X
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        saveGlobalConfig();
        globalConfigModal.style.display = 'none';
    });

    // Event listeners para configuración global
    globalPageInk.addEventListener('change', saveGlobalConfig);
    globalPagePaper.addEventListener('change', saveGlobalConfig);
    globalPageBright.addEventListener('change', saveGlobalConfig);
    globalPageFlash.addEventListener('change', saveGlobalConfig);
    globalSeparatorInk.addEventListener('change', saveGlobalConfig);
    globalSeparatorPaper.addEventListener('change', saveGlobalConfig);
    globalSeparatorBright.addEventListener('change', saveGlobalConfig);
    globalSeparatorFlash.addEventListener('change', saveGlobalConfig);
    globalInterfaceInk.addEventListener('change', saveGlobalConfig);
    globalInterfacePaper.addEventListener('change', saveGlobalConfig);
    globalInterfaceBright.addEventListener('change', saveGlobalConfig);
    globalInterfaceFlash.addEventListener('change', saveGlobalConfig);

    // Initialize Editor
    const editor = new NodeEditor(canvas, (selectedNode) => {
        updatePropertyPanel(selectedNode);
        
        // Mostrar opciones solo si hay página seleccionada
        if (selectedNode && (selectedNode.type === 'screen' || selectedNode.type === 'Screen')) {
            separatorConfigSection.style.display = 'block';
            
            // Verificar si usa configuración específica
            const useCustom = selectedNode.useCustomConfig || false;
            useCustomConfigCheckbox.checked = useCustom;
            customConfigContent.style.display = useCustom ? 'block' : 'none';
            
            // Cargar configuración de página (específica o global)
            if (useCustom && selectedNode.pageConfig) {
                pageInk.value = selectedNode.pageConfig.ink;
                pagePaper.value = selectedNode.pageConfig.paper;
                pageBright.checked = selectedNode.pageConfig.bright;
                pageFlash.checked = selectedNode.pageConfig.flash;
            } else {
                pageInk.value = globalConfig.page.ink;
                pagePaper.value = globalConfig.page.paper;
                pageBright.checked = globalConfig.page.bright;
                pageFlash.checked = globalConfig.page.flash;
            }
            
            // Cargar configuración de separador (específica o global)
            if (useCustom && selectedNode.separatorConfig) {
                separatorInk.value = selectedNode.separatorConfig.ink;
                separatorPaper.value = selectedNode.separatorConfig.paper;
                separatorBright.checked = selectedNode.separatorConfig.bright;
                separatorFlash.checked = selectedNode.separatorConfig.flash;
            } else {
                separatorInk.value = globalConfig.separator.ink;
                separatorPaper.value = globalConfig.separator.paper;
                separatorBright.checked = globalConfig.separator.bright;
                separatorFlash.checked = globalConfig.separator.flash;
            }
            
            // Cargar configuración de interfaz (específica o global)
            if (useCustom && selectedNode.interfaceConfig) {
                interfaceInk.value = selectedNode.interfaceConfig.ink;
                interfacePaper.value = selectedNode.interfaceConfig.paper;
                interfaceBright.checked = selectedNode.interfaceConfig.bright;
                interfaceFlash.checked = selectedNode.interfaceConfig.flash;
            } else {
                interfaceInk.value = globalConfig.interface.ink;
                interfacePaper.value = globalConfig.interface.paper;
                interfaceBright.checked = globalConfig.interface.bright;
                interfaceFlash.checked = globalConfig.interface.flash;
            }
        } else {
            separatorConfigSection.style.display = 'none';
        }
    });

    // Toggle configuración específica
    useCustomConfigCheckbox.addEventListener('change', (e) => {
        const node = editor.selectedNode;
        if (!node) return;
        
        node.useCustomConfig = e.target.checked;
        customConfigContent.style.display = e.target.checked ? 'block' : 'none';
        
        if (e.target.checked) {
            // Inicializar con valores actuales de la interfaz
            node.pageConfig = {
                ink: pageInk.value,
                paper: pagePaper.value,
                bright: pageBright.checked,
                flash: pageFlash.checked
            };
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
        } else {
            // Eliminar configuración específica
            delete node.pageConfig;
            delete node.separatorConfig;
            delete node.interfaceConfig;
        }
    });

    // Función para guardar configuraciones en el nodo seleccionado
    function saveConfigToNode(node) {
        if (!node || (node.type !== 'screen' && node.type !== 'Screen')) return;
        if (!node.useCustomConfig) return; // Solo guardar si usa configuración específica
        
        node.pageConfig = {
            ink: pageInk.value,
            paper: pagePaper.value,
            bright: pageBright.checked,
            flash: pageFlash.checked
        };
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
    pageInk.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    pagePaper.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    pageBright.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
    pageFlash.addEventListener('change', () => saveConfigToNode(editor.selectedNode));
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
        editor.addNode('screen'); // No coordinates = center of view
    });

    document.getElementById('add-group-btn').addEventListener('click', () => {
        editor.addGroup(); // No coordinates = center of view
    });

    document.getElementById('add-reference-btn').addEventListener('click', () => {
        editor.addReference(); // No coordinates = center of view
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
            const basicCode = generateBasic(editor.nodes, globalConfig);
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
        const basicCode = generateBasic(editor.nodes, globalConfig);

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
        const muchoCode = generateMucho(editor.nodes, globalConfig);
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
                globalConfig: globalConfig,
                nodes: editor.nodes.map(n => {
                    const nodeData = {
                        id: n.id,
                        x: n.x,
                        y: n.y,
                        type: n.type,
                        title: n.title,
                        text: n.text,
                        outputs: n.outputs
                    };
                    
                    // Si es una referencia, guardar el targetNodeId
                    if (n instanceof NodeReference) {
                        nodeData.targetNodeId = n.targetNodeId;
                    }
                    
                    // Guardar párrafos condicionales si existen
                    if (n.conditionalParagraphs && n.conditionalParagraphs.length > 0) {
                        nodeData.conditionalParagraphs = n.conditionalParagraphs;
                    }
                    
                    // Solo guardar configuración específica si está activada
                    if (n.useCustomConfig) {
                        nodeData.useCustomConfig = true;
                        nodeData.pageConfig = n.pageConfig;
                        nodeData.separatorConfig = n.separatorConfig;
                        nodeData.interfaceConfig = n.interfaceConfig;
                    }
                    return nodeData;
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

                // Restore global config
                if (data.globalConfig) {
                    globalConfig = data.globalConfig;
                    loadGlobalConfig();
                }

                // Restore Nodes
                if (data.nodes) {
                    data.nodes.forEach(n => {
                        let newNode;
                        
                        // Check if it's a Reference
                        if (n.type === 'Reference') {
                            newNode = new NodeReference(n.id, n.x, n.y, n.targetNodeId);
                        } else {
                            // Regular ScreenNode
                            newNode = new ScreenNode(n.id, n.x, n.y);
                            newNode.text = n.text || "";
                            newNode.title = n.title || n.type;

                            // Restore outputs if present, else default
                            if (n.outputs) {
                                newNode.outputs = n.outputs;
                            }

                            // Restaurar párrafos condicionales si existen
                            if (n.conditionalParagraphs) {
                                newNode.conditionalParagraphs = n.conditionalParagraphs;
                            }

                            // Restaurar configuración específica si existe
                            if (n.useCustomConfig) {
                                newNode.useCustomConfig = true;
                                if (n.pageConfig) {
                                    newNode.pageConfig = n.pageConfig;
                                }
                                if (n.separatorConfig) {
                                    newNode.separatorConfig = n.separatorConfig;
                                }
                                if (n.interfaceConfig) {
                                    newNode.interfaceConfig = n.interfaceConfig;
                                }
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

    function updateReferenceProperties(reference) {
        propertyContent.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = 'Node Reference';
        propertyContent.appendChild(title);

        // Dropdown to select target node
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = 'Target Node:';
        formGroup.appendChild(label);

        const select = document.createElement('select');
        
        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = '(None)';
        select.appendChild(noneOption);

        // Add all screen nodes as options
        editor.nodes.forEach(node => {
            if (node instanceof ScreenNode) {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = node.title;
                if (node.id === reference.targetNodeId) {
                    option.selected = true;
                }
                select.appendChild(option);
            }
        });

        select.addEventListener('change', (e) => {
            reference.targetNodeId = e.target.value || null;
            editor.draw();
        });

        formGroup.appendChild(select);
        propertyContent.appendChild(formGroup);
    }

    function updatePropertyPanel(nodeOrGroup) {
        const propertyPanel = document.getElementById('property-panel');
        propertyContent.innerHTML = '';
        if (!nodeOrGroup) {
            propertyPanel.classList.add('hidden');
            return;
        }
        propertyPanel.classList.remove('hidden');

        // Check if it's a Group
        if (nodeOrGroup instanceof Group) {
            updateGroupProperties(nodeOrGroup);
            return;
        }

        // Check if it's a NodeReference
        if (nodeOrGroup instanceof NodeReference) {
            updateReferenceProperties(nodeOrGroup);
            return;
        }

        // Otherwise, it's a normal node
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
            // Get the color configuration for current node
            const pageConfig = (node.useCustomConfig && node.pageConfig) 
                ? node.pageConfig 
                : globalConfig.page;
            const separatorConfig = (node.useCustomConfig && node.separatorConfig) 
                ? node.separatorConfig 
                : globalConfig.separator;
            const interfaceConfig = (node.useCustomConfig && node.interfaceConfig) 
                ? node.interfaceConfig 
                : globalConfig.interface;

            // Helper to convert ZX Spectrum color names to CSS colors
            const colorToCSS = (colorName, bright = false) => {
                const normalColors = {
                    'black': '#000000',
                    'blue': '#0000D7',
                    'red': '#D70000',
                    'magenta': '#D700D7',
                    'green': '#00D700',
                    'cyan': '#00D7D7',
                    'yellow': '#D7D700',
                    'white': '#D7D7D7'
                };
                const brightColors = {
                    'black': '#000000',
                    'blue': '#0000FF',
                    'red': '#FF0000',
                    'magenta': '#FF00FF',
                    'green': '#00FF00',
                    'cyan': '#00FFFF',
                    'yellow': '#FFFF00',
                    'white': '#FFFFFF'
                };
                return bright ? (brightColors[colorName] || '#FFFFFF') : (normalColors[colorName] || '#D7D7D7');
            };

            // Create modal
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';

            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'modal-close-btn';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => {
                overlay.remove();
            });

            const title = document.createElement('h3');
            title.textContent = 'Edit Screen Text';

            const crtTv = document.createElement('div');
            crtTv.className = 'crt-tv';

            const crtScreen = document.createElement('div');
            crtScreen.className = 'crt-screen';

            // Calculate textarea height: 24 lines total - 1 separator - number of options
            const numOptions = (node.outputs && node.outputs.length > 0) ? node.outputs.length : 0;
            const textareaLines = 24 - 1 - numOptions; // 1 line for separator, rest for options
            
            const textarea = document.createElement('textarea');
            textarea.value = currentText || '';
            textarea.className = 'spectrum-textarea';
            textarea.cols = 32;
            textarea.rows = textareaLines;
            textarea.setAttribute('maxlength', 32 * textareaLines);
            
            // Apply page colors
            const pageInkColor = colorToCSS(pageConfig.ink, pageConfig.bright);
            const pagePaperColor = colorToCSS(pageConfig.paper, pageConfig.bright);
            textarea.style.color = pageInkColor;
            textarea.style.backgroundColor = pagePaperColor;
            textarea.style.borderColor = pagePaperColor;
            if (pageConfig.flash) {
                textarea.style.animation = 'flash-effect 1s infinite';
            }

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
            
            // Add separator
            const separator = document.createElement('div');
            separator.className = 'spectrum-separator';
            const sepInkColor = colorToCSS(separatorConfig.ink, separatorConfig.bright);
            const sepPaperColor = colorToCSS(separatorConfig.paper, separatorConfig.bright);
            separator.style.backgroundColor = sepPaperColor;
            separator.style.color = sepInkColor;
            separator.textContent = '─'.repeat(32);
            separator.style.fontFamily = "'ZX Spectrum-7', monospace";
            separator.style.fontSize = '32px';
            separator.style.lineHeight = '0.45';
            separator.style.letterSpacing = '0';
            separator.style.width = '32ch';
            separator.style.textAlign = 'left';
            separator.style.padding = '0';
            separator.style.margin = '0';
            separator.style.boxSizing = 'content-box';
            separator.style.borderLeft = '40px solid ' + sepPaperColor;
            separator.style.borderRight = '40px solid ' + sepPaperColor;
            separator.style.borderTop = '0';
            separator.style.borderBottom = '0';
            separator.style.overflow = 'hidden';
            separator.style.display = 'block';
            if (separatorConfig.flash) {
                separator.style.animation = 'flash-effect 1s infinite';
            }
            crtScreen.appendChild(separator);
            
            // Add options display
            const optionsContainer = document.createElement('div');
            optionsContainer.className = 'spectrum-options';
            const intInkColor = colorToCSS(interfaceConfig.ink, interfaceConfig.bright);
            const intPaperColor = colorToCSS(interfaceConfig.paper, interfaceConfig.bright);
            optionsContainer.style.backgroundColor = intPaperColor;
            optionsContainer.style.color = intInkColor;
            optionsContainer.style.fontFamily = "'ZX Spectrum-7', monospace";
            optionsContainer.style.fontSize = '32px';
            optionsContainer.style.lineHeight = '0.45';
            optionsContainer.style.letterSpacing = '0';
            optionsContainer.style.width = '32ch';
            optionsContainer.style.padding = '0';
            optionsContainer.style.margin = '0';
            optionsContainer.style.boxSizing = 'content-box';
            optionsContainer.style.borderLeft = '40px solid ' + intPaperColor;
            optionsContainer.style.borderRight = '40px solid ' + intPaperColor;
            optionsContainer.style.borderTop = '0';
            optionsContainer.style.borderBottom = '40px solid ' + intPaperColor;
            optionsContainer.style.overflow = 'hidden';
            optionsContainer.style.display = 'block';
            
            // Display node options
            if (node.outputs && node.outputs.length > 0) {
                node.outputs.forEach((opt, idx) => {
                    const optLine = document.createElement('div');
                    optLine.style.margin = '0';
                    optLine.style.padding = '0';
                    optLine.style.lineHeight = '0.45';
                    // Truncate option label to fit 32 chars including number and dot
                    const maxLabelLength = 29; // "1. " takes 3 chars
                    let label = opt.label.replace(/\n/g, ' ').trim();
                    if (label.length > maxLabelLength) {
                        label = label.substring(0, maxLabelLength - 3) + '...';
                    }
                    // Add space at start to respect ZX Spectrum border (1 character width)
                    optLine.textContent = ` ${idx + 1}. ${label}`;
                    optionsContainer.appendChild(optLine);
                });
            }
            
            if (interfaceConfig.flash) {
                optionsContainer.style.animation = 'flash-effect 1s infinite';
            }
            crtScreen.appendChild(optionsContainer);
            
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
            modalContent.appendChild(closeBtn);
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

        // Initialize conditionalParagraphs if not exists
        if (!node.conditionalParagraphs) {
            node.conditionalParagraphs = [];
        }

        // Define renderConditionalParagraphs before using it
        let renderConditionalParagraphs;

        const textInput = createTextarea('Screen Text', node.text, (val) => {
            node.text = val;
            editor.draw();
            // Re-render conditional paragraphs when text changes
            if (renderConditionalParagraphs) {
                renderConditionalParagraphs();
            }
        });
        propertyContent.appendChild(textInput);

        // Conditional Paragraphs Section (collapsible)
        const conditionalSection = document.createElement('div');
        conditionalSection.style.marginTop = '15px';
        conditionalSection.style.padding = '10px';
        conditionalSection.style.backgroundColor = '#2a2a2a';
        conditionalSection.style.borderRadius = '4px';

        const conditionalTitle = document.createElement('h4');
        conditionalTitle.textContent = '▼ 🎯 Párrafos condicionales';
        conditionalTitle.style.margin = '0 0 10px 0';
        conditionalTitle.style.color = '#4a9eff';
        conditionalTitle.style.cursor = 'pointer';
        conditionalTitle.style.userSelect = 'none';
        
        const conditionalContent = document.createElement('div');
        conditionalContent.style.display = 'block';

        const conditionalInfo = document.createElement('div');
        conditionalInfo.style.fontSize = '11px';
        conditionalInfo.style.marginBottom = '10px';
        conditionalInfo.style.color = '#aaa';
        conditionalInfo.textContent = 'Marca párrafos para mostrarlos solo cuando un flag esté activado/desactivado. Los párrafos se separan con doble salto de línea.';
        conditionalContent.appendChild(conditionalInfo);

        // Toggle collapse
        let isConditionalExpanded = true;
        conditionalTitle.addEventListener('click', () => {
            isConditionalExpanded = !isConditionalExpanded;
            conditionalContent.style.display = isConditionalExpanded ? 'block' : 'none';
            conditionalTitle.textContent = (isConditionalExpanded ? '▼' : '▶') + ' 🎯 Párrafos condicionales';
        });

        renderConditionalParagraphs = () => {
            // Remove old container
            const oldContainer = document.getElementById('conditional-paragraphs-container');
            if (oldContainer) oldContainer.remove();

            const container = document.createElement('div');
            container.id = 'conditional-paragraphs-container';

            // Split text into paragraphs
            const paragraphs = node.text.split(/\n\n+/).filter(p => p.trim());

            paragraphs.forEach((paragraph, idx) => {
                const pRow = document.createElement('div');
                pRow.style.marginBottom = '8px';
                pRow.style.padding = '8px';
                pRow.style.backgroundColor = '#1a1a1a';
                pRow.style.borderRadius = '3px';

                // Find if this paragraph is conditional
                const conditional = node.conditionalParagraphs.find(cp => cp.paragraphIndex === idx);

                // Paragraph preview
                const previewRow = document.createElement('div');
                previewRow.style.display = 'flex';
                previewRow.style.justifyContent = 'space-between';
                previewRow.style.alignItems = 'center';
                previewRow.style.marginBottom = conditional ? '5px' : '0';

                const preview = document.createElement('div');
                preview.style.fontSize = '11px';
                preview.style.color = conditional ? '#4a9eff' : '#888';
                preview.style.fontStyle = 'italic';
                preview.style.flex = '1';
                const previewText = paragraph.substring(0, 50) + (paragraph.length > 50 ? '...' : '');
                preview.textContent = `§${idx + 1}: ${previewText}`;
                previewRow.appendChild(preview);

                if (!conditional) {
                    // Show "make conditional" button in the same row
                    const makeCondBtn = document.createElement('button');
                    makeCondBtn.textContent = '+ Hacer condicional';
                    makeCondBtn.style.fontSize = '11px';
                    makeCondBtn.style.padding = '3px 8px';
                    makeCondBtn.style.whiteSpace = 'nowrap';
                    makeCondBtn.addEventListener('click', () => {
                        node.conditionalParagraphs.push({
                            paragraphIndex: idx,
                            flag: '',
                            inverted: false
                        });
                        renderConditionalParagraphs();
                    });
                    previewRow.appendChild(makeCondBtn);
                }

                pRow.appendChild(previewRow);

                if (conditional) {
                    // Show flag editor
                    const flagRow = document.createElement('div');
                    flagRow.style.display = 'flex';
                    flagRow.style.gap = '5px';
                    flagRow.style.alignItems = 'center';
                    flagRow.style.marginBottom = '5px';

                    // Parse current flag (e.g., "has:key" or "not:key")
                    let flagCondition = 'has';
                    let flagName = conditional.flag || '';
                    if (flagName) {
                        const parts = flagName.split(':');
                        if (parts.length === 2 && (parts[0] === 'has' || parts[0] === 'not')) {
                            flagCondition = parts[0];
                            flagName = parts[1];
                        }
                    }

                    // Condition dropdown (has/not)
                    const conditionSelect = document.createElement('select');
                    conditionSelect.style.flex = '0 0 auto';
                    
                    const hasOption = document.createElement('option');
                    hasOption.value = 'has';
                    hasOption.textContent = 'has';
                    conditionSelect.appendChild(hasOption);
                    
                    const notOption = document.createElement('option');
                    notOption.value = 'not';
                    notOption.textContent = 'not';
                    conditionSelect.appendChild(notOption);
                    
                    conditionSelect.value = flagCondition;

                    // Collect available flag NAMES from ALL nodes in the graph (only the name part)
                    const availableFlags = [];
                    editor.nodes.forEach(n => {
                        if (n.outputs) {
                            n.outputs.forEach(opt => {
                                if (opt.flag && opt.flag.trim()) {
                                    // Extract flag name (e.g., "set:key" -> "key")
                                    const parts = opt.flag.split(':');
                                    let name = parts.length === 2 ? parts[1] : opt.flag;
                                    // Remove any set/clear prefix if present
                                    name = name.replace(/^(set|clear):/, '');
                                    if (name && !availableFlags.includes(name)) {
                                        availableFlags.push(name);
                                    }
                                }
                            });
                        }
                    });

                    const flagSelect = document.createElement('select');
                    flagSelect.style.flex = '1';
                    
                    // Add empty option
                    const emptyOption = document.createElement('option');
                    emptyOption.value = '';
                    emptyOption.textContent = '-- Selecciona flag --';
                    flagSelect.appendChild(emptyOption);
                    
                    // Add options from available flags
                    availableFlags.forEach(flag => {
                        const opt = document.createElement('option');
                        opt.value = flag;
                        opt.textContent = flag;
                        if (flagName === flag) {
                            opt.selected = true;
                        }
                        flagSelect.appendChild(opt);
                    });
                    
                    // Set selected value
                    if (flagName && !availableFlags.includes(flagName)) {
                        // If current flag is not in available flags, add it as option
                        const customOpt = document.createElement('option');
                        customOpt.value = flagName;
                        customOpt.textContent = flagName + ' (no está en las opciones)';
                        customOpt.selected = true;
                        flagSelect.appendChild(customOpt);
                    }
                    
                    // Update flag when either changes
                    const updateConditionalFlag = () => {
                        const condition = conditionSelect.value;
                        const name = flagSelect.value;
                        if (name) {
                            conditional.flag = `${condition}:${name}`;
                        } else {
                            conditional.flag = '';
                        }
                    };
                    
                    conditionSelect.addEventListener('change', updateConditionalFlag);
                    flagSelect.addEventListener('change', updateConditionalFlag);

                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = 'Quitar';
                    removeBtn.style.padding = '3px 8px';
                    removeBtn.style.fontSize = '11px';
                    removeBtn.addEventListener('click', () => {
                        node.conditionalParagraphs = node.conditionalParagraphs.filter(cp => cp !== conditional);
                        renderConditionalParagraphs();
                    });

                    flagRow.appendChild(conditionSelect);
                    flagRow.appendChild(flagSelect);
                    flagRow.appendChild(removeBtn);
                    pRow.appendChild(flagRow);
                }

                container.appendChild(pRow);
            });

            if (paragraphs.length === 0) {
                const emptyMsg = document.createElement('div');
                emptyMsg.style.fontSize = '11px';
                emptyMsg.style.color = '#666';
                emptyMsg.textContent = 'Escribe texto arriba y separa párrafos con doble salto de línea.';
                container.appendChild(emptyMsg);
            }

            conditionalContent.appendChild(container);
        };

        renderConditionalParagraphs();
        conditionalSection.appendChild(conditionalTitle);
        conditionalSection.appendChild(conditionalContent);
        propertyContent.appendChild(conditionalSection);

        // Options Section (must come before Conditional Paragraphs)
        const optionsSection = document.createElement('div');
        optionsSection.style.marginTop = '15px';
        optionsSection.style.padding = '10px';
        optionsSection.style.backgroundColor = '#2a2a2a';
        optionsSection.style.borderRadius = '4px';

        const optionsTitle = document.createElement('h4');
        optionsTitle.textContent = '🔗 Opciones';
        optionsTitle.style.margin = '0 0 10px 0';
        optionsTitle.style.color = '#4a9eff';
        optionsSection.appendChild(optionsTitle);

        const renderOptions = () => {
            // Remove old options UI if exists
            const oldContainer = document.getElementById('options-container');
            if (oldContainer) oldContainer.remove();

            const container = document.createElement('div');
            container.id = 'options-container';

            node.outputs.forEach((opt, idx) => {
                const row = document.createElement('div');
                row.style.marginBottom = '10px';
                row.style.padding = '10px';
                row.style.backgroundColor = '#1a1a1a';
                row.style.borderRadius = '4px';

                // Label and Flag in the same row
                const inputsRow = document.createElement('div');
                inputsRow.style.display = 'flex';
                inputsRow.style.gap = '10px';
                inputsRow.style.marginBottom = '5px';

                const inp = document.createElement('input');
                inp.value = opt.label;
                inp.placeholder = 'Etiqueta de la opción';
                inp.style.flex = "2";
                inp.addEventListener('input', (e) => {
                    opt.label = e.target.value;
                    editor.draw();
                });

                // Parse current flag (e.g., "set:key" or "clear:key")
                let flagAction = 'set';
                let flagName = '';
                if (opt.flag) {
                    const parts = opt.flag.split(':');
                    if (parts.length === 2 && (parts[0] === 'set' || parts[0] === 'clear')) {
                        flagAction = parts[0];
                        flagName = parts[1];
                    } else {
                        flagName = opt.flag;
                    }
                }

                // Flag action dropdown
                const flagActionSelect = document.createElement('select');
                flagActionSelect.style.flex = "0 0 auto";
                
                const setOption = document.createElement('option');
                setOption.value = 'set';
                setOption.textContent = 'set';
                flagActionSelect.appendChild(setOption);
                
                const unsetOption = document.createElement('option');
                unsetOption.value = 'clear';
                unsetOption.textContent = 'clear';
                flagActionSelect.appendChild(unsetOption);
                
                flagActionSelect.value = flagAction;

                // Flag name input
                const flagInp = document.createElement('input');
                flagInp.value = flagName;
                flagInp.placeholder = 'nombre flag (ej: key)';
                flagInp.style.flex = "1";
                flagInp.title = 'Nombre del flag a set/clear';

                // Update flag when either changes
                const updateFlag = () => {
                    const action = flagActionSelect.value;
                    const name = flagInp.value.trim();
                    if (name) {
                        opt.flag = `${action}:${name}`;
                    } else {
                        opt.flag = undefined;
                    }
                    editor.draw();
                    // Re-render conditional paragraphs to update flag dropdown
                    if (renderConditionalParagraphs) {
                        renderConditionalParagraphs();
                    }
                };

                flagActionSelect.addEventListener('change', updateFlag);
                flagInp.addEventListener('input', updateFlag);

                inputsRow.appendChild(inp);
                inputsRow.appendChild(flagActionSelect);
                inputsRow.appendChild(flagInp);

                // Delete button
                const del = document.createElement('button');
                del.textContent = "✕";
                del.style.backgroundColor = "#d00000";
                del.style.color = "white";
                del.style.border = "none";
                del.style.padding = "5px 10px";
                del.style.cursor = "pointer";
                del.style.fontSize = "16px";
                del.style.fontWeight = "bold";
                del.style.minWidth = "35px";
                del.title = "Eliminar opción";
                del.addEventListener('click', () => {
                    node.removeOption(idx);
                    editor.draw();
                    renderOptions();
                    // Re-render conditional paragraphs to update flag dropdown
                    if (renderConditionalParagraphs) {
                        renderConditionalParagraphs();
                    }
                });

                inputsRow.appendChild(del);

                row.appendChild(inputsRow);
                container.appendChild(row);
            });

            // Add Option Button
            const addBtn = document.createElement('button');
            addBtn.textContent = "+ Añadir opción";
            addBtn.style.width = "100%";
            addBtn.style.marginTop = "5px";
            addBtn.addEventListener('click', () => {
                node.addOption(`Option ${node.outputs.length + 1}`);
                editor.draw();
                renderOptions();
            });
            container.appendChild(addBtn);

            optionsSection.appendChild(container);
        };

        renderOptions();
        propertyContent.appendChild(optionsSection);
    }
});
