// ZX Story Flow - Visual BASIC Adventure Creator for ZX Spectrum
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { NodeEditor } from './node-editor.js';
import { ScreenNode, Group, NodeReference } from './nodes.js';
import { generateBasic } from './basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { generateTapFromBasic } from './tap-generator.js';
import { MuchoEditor } from './mucho-editor.js';

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');
    let projectName = 'Untitled';

    // Configuración global (por defecto)
    let globalConfig = {
        page: { ink: 'white', paper: 'black', bright: false, flash: false },
        separator: { ink: 'white', paper: 'black', bright: false, flash: false },
        interface: { ink: 'white', paper: 'black', bright: false, flash: false },
        viewMode: 'simple'
    };

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
    const globalViewMode = document.getElementById('global-view-mode');

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
        if (globalViewMode) globalViewMode.value = globalConfig.viewMode || 'simple';
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
        if (globalViewMode) globalConfig.viewMode = globalViewMode.value;
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
    const onGlobalConfigChange = () => {
        saveGlobalConfig();
        if (typeof autoSave === 'function') autoSave();
    };

    globalPageInk.addEventListener('change', onGlobalConfigChange);
    globalPagePaper.addEventListener('change', onGlobalConfigChange);
    globalPageBright.addEventListener('change', onGlobalConfigChange);
    globalPageFlash.addEventListener('change', onGlobalConfigChange);
    globalSeparatorInk.addEventListener('change', onGlobalConfigChange);
    globalSeparatorPaper.addEventListener('change', onGlobalConfigChange);
    globalSeparatorBright.addEventListener('change', onGlobalConfigChange);
    globalSeparatorFlash.addEventListener('change', onGlobalConfigChange);
    globalInterfaceInk.addEventListener('change', onGlobalConfigChange);
    globalInterfacePaper.addEventListener('change', onGlobalConfigChange);
    globalInterfaceBright.addEventListener('change', onGlobalConfigChange);
    globalInterfaceFlash.addEventListener('change', onGlobalConfigChange);
    if (globalViewMode) globalViewMode.addEventListener('change', onGlobalConfigChange);

    // Funciones para el modal de edición de nodos
    const nodeEditModal = document.getElementById('node-edit-modal');
    const nodeEditModalContent = document.getElementById('node-edit-modal-content');
    const nodeEditModalTitle = document.getElementById('node-edit-modal-title');
    let currentEditingNode = null;
    let editorViewMode = globalConfig.viewMode || 'simple'; // Use preference
    let editorRulerWidth = '32ch'; // '32ch', '28ch', '24ch', '20ch', or 'hidden'

    function setupEditableModalTitle(fallbackText, obj, prop) {
        nodeEditModalTitle.innerHTML = '';
        nodeEditModalTitle.style.display = 'flex';
        nodeEditModalTitle.style.alignItems = 'center';
        nodeEditModalTitle.style.width = '100%';

        let titleText = obj[prop] || fallbackText;

        const titleSpan = document.createElement('span');
        titleSpan.textContent = titleText;
        titleSpan.style.marginRight = '10px';
        titleSpan.style.cursor = 'pointer';

        const editIcon = document.createElement('span');
        editIcon.textContent = '✏️';
        editIcon.style.cursor = 'pointer';
        editIcon.style.fontSize = '0.8em';

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.value = obj[prop] || '';
        inputField.style.display = 'none';
        inputField.style.fontSize = 'inherit';
        inputField.style.fontFamily = 'inherit';
        inputField.style.fontWeight = 'inherit';
        inputField.style.width = '200px';
        inputField.style.padding = '2px 5px';

        const updateTitle = () => {
            obj[prop] = inputField.value;
            titleSpan.textContent = obj[prop] || fallbackText;
            editor.draw();
        };

        const startEditing = () => {
            titleSpan.style.display = 'none';
            editIcon.style.display = 'none';
            inputField.style.display = 'inline-block';
            inputField.focus();
        };

        const stopEditing = () => {
            updateTitle();
            titleSpan.style.display = 'inline-block';
            editIcon.style.display = 'inline-block';
            inputField.style.display = 'none';
        };

        editIcon.addEventListener('click', startEditing);
        titleSpan.addEventListener('click', startEditing);

        inputField.addEventListener('blur', stopEditing);
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') stopEditing();
            if (e.key === 'Escape') {
                inputField.value = obj[prop] || ''; // cancel
                stopEditing();
            }
        });

        nodeEditModalTitle.appendChild(titleSpan);
        nodeEditModalTitle.appendChild(editIcon);
        nodeEditModalTitle.appendChild(inputField);
    }

    function setupViewToggle() {
        // Remove existing toggle if any
        const existing = document.getElementById('editor-view-mode-container');
        if (existing) existing.remove();

        // Add View Toggle Switch
        const container = document.createElement('label');
        container.id = 'editor-view-mode-container';
        container.className = 'switch-container';
        container.style.marginLeft = 'auto';

        const labelSimple = document.createElement('span');
        labelSimple.className = 'switch-label';
        labelSimple.textContent = 'Sencilla';
        if (editorViewMode === 'simple') labelSimple.classList.add('active');

        const switchDiv = document.createElement('div');
        switchDiv.className = 'switch';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = editorViewMode === 'advanced';

        const slider = document.createElement('span');
        slider.className = 'slider';

        switchDiv.appendChild(input);
        switchDiv.appendChild(slider);

        const labelAdvanced = document.createElement('span');
        labelAdvanced.className = 'switch-label';
        labelAdvanced.textContent = 'Avanzada';
        if (editorViewMode === 'advanced') labelAdvanced.classList.add('active');

        input.addEventListener('change', (e) => {
            editorViewMode = e.target.checked ? 'advanced' : 'simple';

            // Sync with global config
            globalConfig.viewMode = editorViewMode;
            if (globalViewMode) globalViewMode.value = editorViewMode;

            // Update labels active state
            if (editorViewMode === 'simple') {
                labelSimple.classList.add('active');
                labelAdvanced.classList.remove('active');
            } else {
                labelSimple.classList.remove('active');
                labelAdvanced.classList.add('active');
            }

            applyViewMode();
        });

        container.appendChild(labelSimple);
        container.appendChild(switchDiv);
        container.appendChild(labelAdvanced);
        nodeEditModalTitle.appendChild(container);
    }

    function applyViewMode() {
        const isAdvanced = editorViewMode === 'advanced';
        const modalContent = nodeEditModal.querySelector('.modal-content');

        // Toggle Modal Width
        if (isAdvanced) {
            modalContent.classList.remove('modal-simple-view');
        } else {
            modalContent.classList.add('modal-simple-view');
        }

        // Toggle Help Panel (Sidebar Column)
        const sidebarColumn = nodeEditModalContent.querySelector('.node-editor-sidebar');
        if (sidebarColumn) {
            sidebarColumn.style.display = isAdvanced ? 'block' : 'none';
        }

        // Toggle Tags (Title Actions)
        const tagsInput = nodeEditModalTitle.querySelector('.advanced-only');
        if (tagsInput) {
            tagsInput.style.display = isAdvanced ? 'block' : 'none';
        }

        // Toggle Flags (Option Actions)
        const flagsInputs = nodeEditModalContent.querySelectorAll('.advanced-only-flags');
        flagsInputs.forEach(el => {
            el.style.display = isAdvanced ? 'block' : 'none';
        });
    }

    // Function to update project name in header (now interactive)
    const updateProjectName = (name) => {
        projectName = name || 'Untitled';
        const display = document.getElementById('project-name-display');
        if (!display) return;

        display.innerHTML = '';
        display.style.display = 'inline-flex';
        display.style.alignItems = 'center';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = projectName;
        nameSpan.style.cursor = 'pointer';

        const editIcon = document.createElement('span');
        editIcon.textContent = ' ✏️';
        editIcon.style.cursor = 'pointer';
        editIcon.style.fontSize = '0.7em';
        editIcon.style.marginLeft = '8px';
        editIcon.style.opacity = '0.6';

        const inputField = document.createElement('input');
        inputField.type = 'text';
        inputField.value = projectName;
        inputField.style.display = 'none';
        inputField.style.fontSize = 'inherit';
        inputField.style.fontFamily = 'inherit';
        inputField.style.color = 'inherit';
        inputField.style.background = 'rgba(255,255,255,0.1)';
        inputField.style.border = '1px solid #555';
        inputField.style.padding = '2px 5px';
        inputField.style.width = '250px';

        const saveName = () => {
            const newName = inputField.value.trim() || 'Untitled';
            projectName = newName;
            nameSpan.textContent = projectName;
            nameSpan.style.display = 'inline';
            editIcon.style.display = 'inline';
            inputField.style.display = 'none';
            if (typeof autoSave === 'function') autoSave();
        };

        const startEditing = () => {
            nameSpan.style.display = 'none';
            editIcon.style.display = 'none';
            inputField.style.display = 'inline-block';
            inputField.focus();
            inputField.select();
        };

        editIcon.addEventListener('click', startEditing);
        nameSpan.addEventListener('click', startEditing);
        inputField.addEventListener('blur', saveName);
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') saveName();
            if (e.key === 'Escape') {
                inputField.value = projectName;
                saveName();
            }
        });

        display.appendChild(nameSpan);
        display.appendChild(editIcon);
        display.appendChild(inputField);
    };

    function openNodeEditModal(nodeOrGroup) {
        if (!nodeOrGroup) return;
        currentEditingNode = nodeOrGroup;
        editorViewMode = globalConfig.viewMode || 'simple';

        // Actualizar título del modal
        if (nodeOrGroup instanceof Group) {
            setupEditableModalTitle('Editar Grupo', nodeOrGroup, 'name');
            setupViewToggle();
        } else if (nodeOrGroup instanceof NodeReference) {
            nodeEditModalTitle.innerHTML = '';
            nodeEditModalTitle.textContent = 'Editar Referencia';
            setupViewToggle();
        } else {
            setupEditableModalTitle('Nodo Sin Título', nodeOrGroup, 'title');

            // Add actions input next to the title
            const actionsInput = document.createElement('input');
            actionsInput.type = 'text';
            actionsInput.value = nodeOrGroup.actions || '';
            actionsInput.placeholder = 'ej: set:key clear:lock rnd:50';
            actionsInput.title = 'Acciones MuCho que van junto al $Q';
            actionsInput.style.marginLeft = '12px';
            actionsInput.style.fontSize = '14px';
            actionsInput.style.fontFamily = 'Courier New, monospace';
            actionsInput.style.padding = '4px 8px';
            actionsInput.style.flex = '1';
            actionsInput.style.maxWidth = '400px';
            actionsInput.style.backgroundColor = '#1a1a1a';
            actionsInput.style.border = '1px solid #555';
            actionsInput.style.color = '#f1fa8c';
            actionsInput.style.borderRadius = '3px';
            actionsInput.addEventListener('input', (e) => {
                nodeOrGroup.actions = e.target.value;
            });
            actionsInput.classList.add('advanced-only');
            actionsInput.style.display = editorViewMode === 'advanced' ? 'block' : 'none';
            nodeEditModalTitle.appendChild(actionsInput);

            // Toggle must be added LAST
            setupViewToggle();
        }

        // Limpiar contenido anterior
        nodeEditModalContent.innerHTML = '';

        // Generar contenido según el tipo
        if (nodeOrGroup instanceof Group) {
            updateGroupProperties(nodeOrGroup, nodeEditModalContent);
        } else if (nodeOrGroup instanceof NodeReference) {
            updateReferenceProperties(nodeOrGroup, nodeEditModalContent);
        } else {
            updateNodeProperties(nodeOrGroup, nodeEditModalContent);
        }

        // Mostrar modal
        nodeEditModal.style.display = 'flex';
        applyViewMode();
    }

    function closeNodeEditModal() {
        nodeEditModal.style.display = 'none';
        currentEditingNode = null;
    }

    // Event listeners para cerrar el modal
    document.getElementById('node-edit-modal-close-btn').addEventListener('click', closeNodeEditModal);
    document.getElementById('node-edit-modal-close').addEventListener('click', closeNodeEditModal);

    // Cerrar modal al hacer clic fuera de él
    nodeEditModal.addEventListener('click', (e) => {
        if (e.target === nodeEditModal) {
            closeNodeEditModal();
        }
    });

    // Initialize Editor
    const editor = new NodeEditor(canvas, (selectedNode) => {
        // Cuando se selecciona un nodo, abrir el modal de edición
        if (selectedNode && (selectedNode.type === 'screen' || selectedNode.type === 'Screen')) {
            openNodeEditModal(selectedNode);
        } else if (selectedNode instanceof Group) {
            openNodeEditModal(selectedNode);
        } else if (selectedNode instanceof NodeReference) {
            openNodeEditModal(selectedNode);
        } else {
            // Si se deselecciona, cerrar el modal
            closeNodeEditModal();
        }
    });

    // Auto-save logic
    const STORAGE_KEY = 'zx_story_flow_project';
    let isInitialized = false;

    function getProjectData() {
        return {
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
                    outputs: n.outputs,
                    actions: n.actions
                };

                if (n instanceof NodeReference) {
                    nodeData.targetNodeId = n.targetNodeId;
                }

                if (n.conditionalParagraphs && n.conditionalParagraphs.length > 0) {
                    nodeData.conditionalParagraphs = n.conditionalParagraphs;
                }

                if (n.paragraphImages && n.paragraphImages.length > 0) {
                    nodeData.paragraphImages = n.paragraphImages;
                }

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
            }),
            lastSaved: Date.now()
        };
    }

    function loadProjectData(data) {
        if (!data) return false;

        console.log("Restoring project data...", data.name);

        try {
            // Suppress auto-save during restoration to prevent overwriting with partial state
            const originalOnStateChange = editor.onStateChange;
            editor.onStateChange = null;

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
                editorViewMode = globalConfig.viewMode || 'simple';
                loadGlobalConfig();
            }

            // Restore Nodes
            if (data.nodes) {
                data.nodes.forEach(n => {
                    let newNode;
                    if (n.type === 'Reference' || n.type === 'reference') {
                        newNode = new NodeReference(n.id, n.x, n.y, n.targetNodeId);
                    } else {
                        newNode = new ScreenNode(n.id, n.x, n.y);
                        newNode.text = n.text || "";
                        newNode.title = n.title || n.type;
                        newNode.actions = n.actions || "";
                        if (n.outputs) newNode.outputs = n.outputs;
                        if (n.conditionalParagraphs) newNode.conditionalParagraphs = n.conditionalParagraphs;
                        if (n.paragraphImages) newNode.paragraphImages = n.paragraphImages;
                        if (n.useCustomConfig) {
                            newNode.useCustomConfig = true;
                            if (n.pageConfig) newNode.pageConfig = n.pageConfig;
                            if (n.separatorConfig) newNode.separatorConfig = n.separatorConfig;
                            if (n.interfaceConfig) newNode.interfaceConfig = n.interfaceConfig;
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

            editor.onStateChange = originalOnStateChange;
            editor.draw();
            console.log("Restoration successful");
            return true;
        } catch (e) {
            console.error("Critical error during project restoration:", e);
            return false;
        }
    }

    function autoSave() {
        if (!isInitialized) return;

        try {
            const data = getProjectData();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            // Log intermittently to avoid console clutter
            if (Math.random() < 0.05) console.log("Auto-save completed at " + new Date().toLocaleTimeString());
        } catch (e) {
            console.error("Auto-save FAILED:", e);
            if (e.name === 'QuotaExceededError') {
                alert("Storage full! Try removing some images or large text blocks.");
            }
        }
    }

    function loadFromLocalStorage() {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                if (loadProjectData(data)) {
                    console.log("Project successfully restored from localStorage");
                } else {
                    console.warn("Project found in localStorage but restoration failed.");
                }
            } catch (e) {
                console.error("Failed to parse localStorage data:", e);
            }
        } else {
            console.log("No saved project found in localStorage");
        }

        // Mark as initialized so FUTURE changes trigger auto-save
        isInitialized = true;
        editor.onStateChange = autoSave;
    }


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

            // Collect all images from nodes
            const screenImages = [];
            editor.nodes.forEach(node => {
                if (node.paragraphImages && node.paragraphImages.length > 0) {
                    node.paragraphImages.forEach(pi => {
                        if (pi.imageName && pi.imageData) {
                            // Check if not already added
                            if (!screenImages.find(img => img.name === pi.imageName)) {
                                screenImages.push({
                                    name: pi.imageName,
                                    data: pi.imageData
                                });
                            }
                        }
                    });
                }
            });

            const tapData = generateTapFromBasic(basicCode, "adventure", screenImages);

            const blob = new Blob([tapData], { type: 'application/x-tap' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'adventure.tap';
            a.click();
            URL.revokeObjectURL(url);
            console.log("TAP Export successful");

            if (screenImages.length > 0) {
                console.log(`Included ${screenImages.length} SCREEN$ images in TAP`);
            }
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
            const projectData = getProjectData();
            const json = JSON.stringify(projectData, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (projectName || 'project') + '.json';
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
                loadProjectData(data);
                autoSave();
            } catch (err) {
                console.error(err);
                alert("Error loading project: " + err.message);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        loadInput.value = '';
    });

    // New Project
    document.getElementById('new-btn').addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres empezar un proyecto nuevo? Se borrará el progreso actual no guardado en disco.')) {
            // Temporary block auto-save to ensure clean wipe
            isInitialized = false;
            editor.nodes = [];
            editor.groups = [];
            editor.selectNode(null);
            editor.selectGroup(null);
            updateProjectName('Untitled');
            editor.draw();

            isInitialized = true;
            autoSave();
        }
    });

    function updateGroupProperties(group, container = null) {
        const targetContainer = container || propertyContent;
        targetContainer.innerHTML = '';

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



        const colorInput = createColorInput('Group Color', group.color, (val) => {
            group.color = val;
            editor.draw();
        });
        targetContainer.appendChild(colorInput);

        // Show member nodes count
        const infoDiv = document.createElement('div');
        infoDiv.className = 'form-group';
        infoDiv.innerHTML = `<p style="color: #aaa; font-size: 0.9em;">Contains ${group.nodeIds.length} node(s)</p>`;
        targetContainer.appendChild(infoDiv);

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
            if (container) closeNodeEditModal(); // Cerrar modal si se está usando
        });
        targetContainer.appendChild(deleteBtn);
    }

    function updateReferenceProperties(reference, container = null) {
        const targetContainer = container || propertyContent;
        targetContainer.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = 'Node Reference';
        targetContainer.appendChild(title);

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
        targetContainer.appendChild(formGroup);
    }

    function updatePropertyPanel(nodeOrGroup, container = null) {
        const targetContainer = container || propertyContent;
        const propertyPanel = document.getElementById('property-panel');
        targetContainer.innerHTML = '';
        if (!nodeOrGroup) {
            if (!container) propertyPanel.classList.add('hidden');
            return;
        }
        if (!container) propertyPanel.classList.remove('hidden');

        // Check if it's a Group
        if (nodeOrGroup instanceof Group) {
            updateGroupProperties(nodeOrGroup, targetContainer);
            return;
        }

        // Check if it's a NodeReference
        if (nodeOrGroup instanceof NodeReference) {
            updateReferenceProperties(nodeOrGroup, targetContainer);
            return;
        }

        // Otherwise, it's a normal node
        const node = nodeOrGroup;

        // Create/Update global datalist for flags
        let datalistId = 'globalFlagsDatalist';
        let flagDatalist = document.getElementById(datalistId);
        if (!flagDatalist) {
            flagDatalist = document.createElement('datalist');
            flagDatalist.id = datalistId;
            document.body.appendChild(flagDatalist);
        }
        flagDatalist.innerHTML = '';

        const allAvailableFlags = new Set();
        editor.nodes.forEach(n => {
            if (n.outputs) {
                n.outputs.forEach(opt => {
                    if (opt.flag && opt.flag.trim()) {
                        const parts = opt.flag.split(':');
                        const name = parts.length === 2 ? parts[1] : opt.flag;
                        allAvailableFlags.add(name);
                    }
                });
            }
        });

        allAvailableFlags.forEach(flag => {
            const opt = document.createElement('option');
            opt.value = flag;
            flagDatalist.appendChild(opt);
        });

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

        const createTextarea = (label, value, onChange, onCursorChange) => {
            const group = document.createElement('div');
            group.className = 'form-group';

            const labelEl = document.createElement('label');
            labelEl.textContent = label;

            const inputEl = document.createElement('textarea');
            inputEl.value = value || '';
            inputEl.rows = 12; // Más grande para edición directa
            inputEl.style.fontFamily = 'Courier New, monospace';
            inputEl.style.fontSize = '14px';
            inputEl.style.width = '100%';
            inputEl.style.resize = 'vertical';
            inputEl.addEventListener('input', (e) => onChange(e.target.value));

            if (onCursorChange) {
                inputEl.addEventListener('click', onCursorChange);
                inputEl.addEventListener('keyup', onCursorChange);
                inputEl.addEventListener('select', onCursorChange);
            }

            group.appendChild(labelEl);
            group.appendChild(inputEl);
            return { group, inputEl };
        };

        // Initialize conditionalParagraphs with new structure (array of conditions)
        if (!node.conditionalParagraphs) {
            node.conditionalParagraphs = [];
        }
        // Migrate old structure to new if needed
        node.conditionalParagraphs.forEach(cp => {
            if (cp.flag && !cp.conditions) {
                // Old structure: {paragraphIndex: 0, flag: "has:key"}
                // New structure: {paragraphIndex: 0, conditions: [{type: "has", flag: "key"}]}
                cp.conditions = [];
                if (cp.flag) {
                    const parts = cp.flag.split(':');
                    if (parts.length === 2) {
                        cp.conditions.push({ type: parts[0], flag: parts[1] });
                    }
                }
                delete cp.flag;
                delete cp.inverted;
            }
        });

        // Initialize paragraphImages if not exists
        if (!node.paragraphImages) {
            node.paragraphImages = [];
        }



        // Create two-column layout
        const editorLayout = document.createElement('div');
        editorLayout.className = 'node-editor-layout';

        // Main column (left)
        const mainColumn = document.createElement('div');
        mainColumn.className = 'node-editor-main';

        // Dummy variable to prevent ReferenceError in older code that checked this
        const renderConditionalParagraphs = null;

        // Initialize Mucho Editor

        // Toolbar for Editor
        const editorToolbar = document.createElement('div');
        editorToolbar.style.display = 'flex';
        editorToolbar.style.gap = '5px';
        editorToolbar.style.marginBottom = '5px';
        editorToolbar.style.padding = '5px';
        editorToolbar.style.backgroundColor = '#2a2a2a';
        editorToolbar.style.borderRadius = '4px';

        const insertImageBtn = document.createElement('button');
        insertImageBtn.innerHTML = '🖼️ Insertar Imagen';
        insertImageBtn.style.padding = '5px 10px';
        insertImageBtn.style.fontSize = '12px';

        const hiddenFileInput = document.createElement('input');
        hiddenFileInput.type = 'file';
        hiddenFileInput.accept = '.scr';
        hiddenFileInput.style.display = 'none';

        insertImageBtn.addEventListener('click', () => {
            hiddenFileInput.click();
        });

        editorToolbar.appendChild(insertImageBtn);
        editorToolbar.appendChild(hiddenFileInput);

        // Selector de Regla de Guía
        const rulerSelect = document.createElement('select');
        rulerSelect.style.marginLeft = 'auto';
        rulerSelect.style.fontSize = '12px';
        rulerSelect.style.padding = '2px 5px';
        rulerSelect.style.backgroundColor = '#1a1a1a';
        rulerSelect.style.color = '#eee';
        rulerSelect.style.border = '1px solid #555';
        rulerSelect.title = 'Regla de guía (ancho de columna)';

        const rulerOptions = [
            { label: '📏 Regla: Off', value: 'hidden' },
            { label: '32 cols', value: '32ch' },
            { label: '42 cols', value: '42ch' },
            { label: '64 cols', value: '64ch' }
        ];

        rulerOptions.forEach(opt => {
            const el = document.createElement('option');
            el.value = opt.value;
            el.textContent = opt.label;
            if (opt.value === editorRulerWidth) el.selected = true;
            rulerSelect.appendChild(el);
        });

        const updateRuler = (val) => {
            editorRulerWidth = val;
            if (val === 'hidden') {
                editorContainer.style.setProperty('--ruler-display', 'none');
            } else {
                editorContainer.style.setProperty('--ruler-display', 'block');
                editorContainer.style.setProperty('--ruler-width', val);
            }
        };

        rulerSelect.addEventListener('change', (e) => updateRuler(e.target.value));
        editorToolbar.appendChild(rulerSelect);

        mainColumn.appendChild(editorToolbar);

        const editorContainer = document.createElement('div');
        // Aplicar estado inicial de la regla
        updateRuler(editorRulerWidth);
        mainColumn.appendChild(editorContainer);

        const initialMuchoText = MuchoEditor.generateFromNode(node);
        const muchoEditor = new MuchoEditor(editorContainer, initialMuchoText, (newText) => {
            MuchoEditor.parseToNode(newText, node);
            editor.draw();
            autoSave();
        });

        hiddenFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const ta = muchoEditor.textarea;
                const start = ta.selectionStart;
                const text = muchoEditor.value;

                // Analizar el contexto alrededor del cursor para no meter saltos de linea de mas
                const textBefore = text.substring(0, start);
                const textAfter = text.substring(ta.selectionEnd);

                let prepend = "";

                if (textBefore.length > 0 && !textBefore.endsWith('\n')) {
                    prepend = "\n";
                }

                // Siempre incluir salto de linea final
                const insertText = prepend + "$I " + file.name + "\n";

                muchoEditor.value = textBefore + insertText + textAfter;
                ta.value = muchoEditor.value;
                muchoEditor.updateHighlights();
                MuchoEditor.parseToNode(muchoEditor.value, node);
                editor.draw();

                // Read the image file and attach to paragraphImages array based on parsed index
                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
                    // Find the image node we just parsed to attach the raw data
                    const imgObj = node.paragraphImages.find(img => img.imageName === file.name);
                    if (imgObj) {
                        imgObj.imageData = imageData;
                        autoSave();
                    }
                };
                reader.readAsDataURL(file);
            }
        });

        // Sidebar column (right) - for Help Panel
        const sidebarColumn = document.createElement('div');
        sidebarColumn.className = 'node-editor-sidebar';

        const helpPanel = document.createElement('div');
        helpPanel.className = 'mucho-help-panel';
        helpPanel.innerHTML = `
            <h5>Ayuda Sintaxis MuCho</h5>

            <div class="mucho-help-section">
                <h6>Lógica de Flags</h6>
                <ul>
                    <li><code>has:name</code> (o <code>name</code>) Si tiene el flag.</li>
                    <li><code>not:name</code> (o <code>!name</code>) Si NO lo tiene.</li>
                    <li><code>rnd:128</code> Probabilidad (128 = 50%).</li>
                    <li><code>AND</code> Combinar: <code>has:A AND has:B</code>.</li>
                </ul>
            </div>

            <div class="mucho-help-section">
                <h6>Operaciones (Flags)</h6>
                <ul>
                    <li><code>set:flag</code> Activa un flag.</li>
                    <li><code>clear:flag</code> (o <code>clr:</code>) Desactiva un flag.</li>
                    <li><code>toggle:flag</code> Invierte el estado.</li>
                </ul>
            </div>

            <div class="mucho-help-section">
                <h6>Números y Variables</h6>
                <ul>
                    <li><code>v=10</code> Asignar (0-255).</li>
                    <li><code>v+5</code> / <code>v-2</code> Sumar o restar.</li>
                    <li><code>v==10</code> / <code>v!=5</code> Comparación.</li>
                    <li><code>v&gt;5</code> / <code>v&lt;=20</code> Comparación.</li>
                    <li><code>&lt;&lt;v&gt;&gt;</code> Imprimir valor en el texto.</li>
                </ul>
            </div>

            <div class="mucho-help-section">
                <h6>Pantalla y Estilo</h6>
                <ul>
                    <li><code>$I img.scr</code> Mostrar imagen (SCREEN$).</li>
                    <li><code>attr:71</code> Color texto (White on Black).</li>
                    <li><code>dattr:N</code> / <code>iattr:N</code> Divisor / Interfaz.</li>
                    <li><code>border:N</code> Cambiar color del borde.</li>
                    <li><code>cls:0</code> Limpiar la pantalla.</li>
                </ul>
            </div>

            <p style="margin-top:10px; font-size:11px; color:#888;">
                <em>Haz clic en el código para insertarlo.</em>
            </p>
        `;

        // Add click listeners to code tags to insert text
        helpPanel.querySelectorAll('code').forEach(codeEl => {
            codeEl.addEventListener('click', () => {
                const insertText = codeEl.textContent + ' ';
                const ta = muchoEditor.textarea;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                muchoEditor.value = muchoEditor.value.substring(0, start) + insertText + muchoEditor.value.substring(end);
                ta.value = muchoEditor.value;
                muchoEditor.updateHighlights();
                MuchoEditor.parseToNode(muchoEditor.value, node);
                editor.draw();
                ta.focus();
                ta.setSelectionRange(start + insertText.length, start + insertText.length);
            });
        });

        sidebarColumn.appendChild(helpPanel);

        editorLayout.appendChild(mainColumn);
        editorLayout.appendChild(sidebarColumn);
        targetContainer.appendChild(editorLayout);

        // Options Section
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

                // Label and actions in the same row
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
                    autoSave();
                });

                // Single freeform actions textbox (replaces old select + flag input)
                const flagInp = document.createElement('input');
                flagInp.type = 'text';
                flagInp.value = opt.flag || '';
                flagInp.placeholder = 'ej: set:key clear:lock toggle:door';
                flagInp.style.flex = "2";
                flagInp.style.fontFamily = 'Courier New, monospace';
                flagInp.style.fontSize = '12px';
                flagInp.style.color = '#f1fa8c';
                flagInp.style.backgroundColor = '#000';
                flagInp.style.border = '1px solid #555';
                flagInp.style.borderRadius = '3px';
                flagInp.title = 'Acciones al elegir esta opción';
                flagInp.classList.add('advanced-only-flags');
                flagInp.style.display = editorViewMode === 'advanced' ? 'block' : 'none';
                flagInp.addEventListener('input', (e) => {
                    opt.flag = e.target.value.trim() || undefined;
                    editor.draw();
                    autoSave();
                });

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
                    autoSave();
                });

                inputsRow.appendChild(inp);
                inputsRow.appendChild(flagInp);
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
                autoSave();
            });
            container.appendChild(addBtn);

            optionsSection.appendChild(container);
        };

        renderOptions();
        mainColumn.appendChild(optionsSection);

        // Color Configuration Section (collapsible)
        const colorConfigSection = document.createElement('div');
        colorConfigSection.style.marginTop = '15px';
        colorConfigSection.style.padding = '10px';
        colorConfigSection.style.backgroundColor = '#2a2a2a';
        colorConfigSection.style.borderRadius = '4px';

        const colorConfigTitle = document.createElement('h4');
        colorConfigTitle.textContent = '▼ 🎨 Configuración de Colores';
        colorConfigTitle.style.margin = '0 0 10px 0';
        colorConfigTitle.style.color = '#4a9eff';
        colorConfigTitle.style.cursor = 'pointer';
        colorConfigTitle.style.userSelect = 'none';

        const colorConfigContent = document.createElement('div');
        colorConfigContent.style.display = 'block';

        // Toggle collapse
        let isColorConfigExpanded = true;
        colorConfigTitle.addEventListener('click', () => {
            isColorConfigExpanded = !isColorConfigExpanded;
            colorConfigContent.style.display = isColorConfigExpanded ? 'block' : 'none';
            colorConfigTitle.textContent = (isColorConfigExpanded ? '▼' : '▶') + ' 🎨 Configuración de Colores';
        });

        // Use custom config checkbox
        const useCustomRow = document.createElement('div');
        useCustomRow.style.marginBottom = '10px';

        const useCustomLabel = document.createElement('label');
        useCustomLabel.style.display = 'flex';
        useCustomLabel.style.alignItems = 'center';
        useCustomLabel.style.cursor = 'pointer';

        const useCustomCheckbox = document.createElement('input');
        useCustomCheckbox.type = 'checkbox';
        useCustomCheckbox.checked = node.useCustomConfig || false;
        useCustomCheckbox.style.marginRight = '8px';

        const useCustomText = document.createElement('span');
        useCustomText.textContent = 'Usar configuración específica para este nodo';

        useCustomLabel.appendChild(useCustomCheckbox);
        useCustomLabel.appendChild(useCustomText);
        useCustomRow.appendChild(useCustomLabel);
        colorConfigContent.appendChild(useCustomRow);

        // Custom config container
        const customConfigContainer = document.createElement('div');
        customConfigContainer.style.display = node.useCustomConfig ? 'block' : 'none';

        // Helper function to create color selects
        const createColorConfig = (sectionTitle, configKey) => {
            const section = document.createElement('div');
            section.style.marginTop = '15px';
            section.style.padding = '10px';
            section.style.backgroundColor = '#1a1a1a';
            section.style.borderRadius = '4px';

            const title = document.createElement('h5');
            title.textContent = sectionTitle;
            title.style.margin = '0 0 10px 0';
            title.style.color = '#4a9eff';
            section.appendChild(title);

            // Get current config or defaults
            const currentConfig = node.useCustomConfig && node[configKey]
                ? node[configKey]
                : globalConfig[configKey.replace('Config', '')];

            // INK and PAPER row
            const colorRow = document.createElement('div');
            colorRow.style.display = 'flex';
            colorRow.style.gap = '10px';
            colorRow.style.marginBottom = '8px';
            colorRow.style.alignItems = 'center';

            const inkLabel = document.createElement('label');
            inkLabel.textContent = 'INK:';
            inkLabel.style.minWidth = '40px';

            const inkSelect = document.createElement('select');
            inkSelect.style.flex = '1';
            ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
                const opt = document.createElement('option');
                opt.value = color;
                opt.textContent = color.charAt(0).toUpperCase() + color.slice(1);
                if (currentConfig.ink === color) opt.selected = true;
                inkSelect.appendChild(opt);
            });

            const paperLabel = document.createElement('label');
            paperLabel.textContent = 'PAPER:';
            paperLabel.style.minWidth = '50px';
            paperLabel.style.marginLeft = '5px';

            const paperSelect = document.createElement('select');
            paperSelect.style.flex = '1';
            ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
                const opt = document.createElement('option');
                opt.value = color;
                opt.textContent = color.charAt(0).toUpperCase() + color.slice(1);
                if (currentConfig.paper === color) opt.selected = true;
                paperSelect.appendChild(opt);
            });

            colorRow.appendChild(inkLabel);
            colorRow.appendChild(inkSelect);
            colorRow.appendChild(paperLabel);
            colorRow.appendChild(paperSelect);
            section.appendChild(colorRow);

            // Bright and Flash row
            const flagsRow = document.createElement('div');
            flagsRow.style.display = 'flex';
            flagsRow.style.gap = '15px';
            flagsRow.style.alignItems = 'center';

            const brightLabel = document.createElement('label');
            brightLabel.style.display = 'flex';
            brightLabel.style.alignItems = 'center';
            brightLabel.style.cursor = 'pointer';

            const brightCheckbox = document.createElement('input');
            brightCheckbox.type = 'checkbox';
            brightCheckbox.checked = currentConfig.bright || false;
            brightCheckbox.style.marginRight = '5px';

            const brightText = document.createElement('span');
            brightText.textContent = 'Bright';

            brightLabel.appendChild(brightCheckbox);
            brightLabel.appendChild(brightText);

            const flashLabel = document.createElement('label');
            flashLabel.style.display = 'flex';
            flashLabel.style.alignItems = 'center';
            flashLabel.style.cursor = 'pointer';

            const flashCheckbox = document.createElement('input');
            flashCheckbox.type = 'checkbox';
            flashCheckbox.checked = currentConfig.flash || false;
            flashCheckbox.style.marginRight = '5px';

            const flashText = document.createElement('span');
            flashText.textContent = 'Flash';

            flashLabel.appendChild(flashCheckbox);
            flashLabel.appendChild(flashText);

            flagsRow.appendChild(brightLabel);
            flagsRow.appendChild(flashLabel);
            section.appendChild(flagsRow);

            // Save changes
            const saveConfig = () => {
                if (node.useCustomConfig) {
                    node[configKey] = {
                        ink: inkSelect.value,
                        paper: paperSelect.value,
                        bright: brightCheckbox.checked,
                        flash: flashCheckbox.checked
                    };
                }
            };

            inkSelect.addEventListener('change', () => { saveConfig(); autoSave(); });
            paperSelect.addEventListener('change', () => { saveConfig(); autoSave(); });
            brightCheckbox.addEventListener('change', () => { saveConfig(); autoSave(); });
            flashCheckbox.addEventListener('change', () => { saveConfig(); autoSave(); });

            return section;
        };

        customConfigContainer.appendChild(createColorConfig('Página', 'pageConfig'));
        customConfigContainer.appendChild(createColorConfig('Separador', 'separatorConfig'));
        customConfigContainer.appendChild(createColorConfig('Opciones', 'interfaceConfig'));

        colorConfigContent.appendChild(customConfigContainer);

        // Toggle custom config
        useCustomCheckbox.addEventListener('change', (e) => {
            node.useCustomConfig = e.target.checked;
            customConfigContainer.style.display = e.target.checked ? 'block' : 'none';
            autoSave();

            if (e.target.checked) {
                // Initialize with current global values
                node.pageConfig = {
                    ink: globalConfig.page.ink,
                    paper: globalConfig.page.paper,
                    bright: globalConfig.page.bright,
                    flash: globalConfig.page.flash
                };
                node.separatorConfig = {
                    ink: globalConfig.separator.ink,
                    paper: globalConfig.separator.paper,
                    bright: globalConfig.separator.bright,
                    flash: globalConfig.separator.flash
                };
                node.interfaceConfig = {
                    ink: globalConfig.interface.ink,
                    paper: globalConfig.interface.paper,
                    bright: globalConfig.interface.bright,
                    flash: globalConfig.interface.flash
                };
                // Recreate the config UI with new values
                customConfigContainer.innerHTML = '';
                customConfigContainer.appendChild(createColorConfig('Página', 'pageConfig'));
                customConfigContainer.appendChild(createColorConfig('Separador', 'separatorConfig'));
                customConfigContainer.appendChild(createColorConfig('Opciones', 'interfaceConfig'));
            } else {
                delete node.pageConfig;
                delete node.separatorConfig;
                delete node.interfaceConfig;
            }
        });

        colorConfigSection.appendChild(colorConfigTitle);
        colorConfigSection.appendChild(colorConfigContent);
        mainColumn.appendChild(colorConfigSection);
    }

    // Wrapper for modal editing
    function updateNodeProperties(node, container) {
        return updatePropertyPanel(node, container);
    }
    // FINAL STARTUP: Ensure everything is ready before loading
    loadFromLocalStorage();
});
