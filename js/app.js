// ZX Story Flow - Visual BASIC Adventure Creator for ZX Spectrum
// Copyright (C) 2026 Raül Torralba Adsuara
// Licensed under the GNU Affero General Public License v3.0 or later
// See LICENSE file for details

import { NodeEditor } from './node-editor.js';
import { ScreenNode, Group, NodeReference } from './nodes.js';
import { generateBasicFromMucho } from './basic-generator.js';
import { generateBasicFromCYD } from './cyd-basic-generator.js';
import { generateMucho } from './mucho-generator.js';
import { generateTapFromBasic } from './tap-generator.js';
import { generateCYD } from './cyd-generator.js';
import { MuchoEditor } from './mucho-editor.js';
import { CYDEditor } from './cyd-editor.js';
import { i18n, t } from './translations.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize i18n first
    await i18n.init();

    // Update language display in header
    const currentLangDisplay = document.getElementById('current-lang');
    if (currentLangDisplay) currentLangDisplay.textContent = i18n.currentLang.toUpperCase();
    const canvas = document.getElementById('node-canvas');
    const propertyContent = document.getElementById('properties-content');
    let projectName = 'Untitled';
    let projectType = 'MuCho';

    // Configuración global (por defecto)
    let globalConfig = {
        page: { ink: 'white', paper: 'black', bright: false, flash: false },
        separator: { ink: 'white', paper: 'black', bright: false, flash: false },
        interface: { ink: 'white', paper: 'black', bright: false, flash: false },
        border: 'black',
        viewMode: 'simple',
        basicGraphics: {
            separator: Array(64).fill(false), // 8x8 matrix for BASIC separator
            selector: Array(64).fill(false)   // 8x8 matrix for BASIC selector
        }
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
    const globalProjectType = document.getElementById('global-project-type');
    const globalBorderColor = document.getElementById('global-border-color');
    const separatorMatrixEl = document.getElementById('separator-matrix');
    const selectorMatrixEl = document.getElementById('selector-matrix');

    // Helper: Convert color name to CSS color value
    function zxColorToCSS(colorName, bright = false) {
        const brightColors = { 'black': '#000000', 'blue': '#0000FF', 'red': '#FF0000', 'magenta': '#FF00FF', 'green': '#00FF00', 'cyan': '#00FFFF', 'yellow': '#FFFF00', 'white': '#FFFFFF' };
        const normalColors = { 'black': '#000000', 'blue': '#0000CD', 'red': '#CD0000', 'magenta': '#CD00CD', 'green': '#00CD00', 'cyan': '#00CDCD', 'yellow': '#CDCD00', 'white': '#CDCDCD' };
        return bright ? (brightColors[colorName] || '#FFFFFF') : (normalColors[colorName] || '#CDCDCD');
    }

    // Inicializar matrices UI
    function initMatrixUI(containerEl, key, cfgSection, onChangeCallback) {
        if (!containerEl) return;
        containerEl.innerHTML = '';

        // Apply styling to parent container directly to cascade colors via CSS vars
        const cConfig = globalConfig[cfgSection];
        const inkCSS = zxColorToCSS(cConfig.ink, cConfig.bright);
        const paperCSS = zxColorToCSS(cConfig.paper, cConfig.bright);
        containerEl.style.setProperty('--pixel-ink', inkCSS);
        containerEl.style.setProperty('--pixel-paper', paperCSS);

        for (let i = 0; i < 64; i++) {
            const cell = document.createElement('div');
            cell.className = 'pixel-cell';
            if (globalConfig.basicGraphics && globalConfig.basicGraphics[key] && globalConfig.basicGraphics[key][i]) cell.classList.add('active');

            cell.addEventListener('mousedown', (e) => {
                if (!globalConfig.basicGraphics) return;
                const newState = !globalConfig.basicGraphics[key][i];
                globalConfig.basicGraphics[key][i] = newState;
                if (newState) cell.classList.add('active');
                else cell.classList.remove('active');
                if (onChangeCallback) onChangeCallback();
            });
            // Support dragging to draw (simple implementation)
            cell.addEventListener('mouseenter', (e) => {
                if (e.buttons === 1) { // Left mouse button pressed
                    if (!globalConfig.basicGraphics) return;
                    const newState = !cell.classList.contains('active');
                    globalConfig.basicGraphics[key][i] = !globalConfig.basicGraphics[key][i];
                    if (globalConfig.basicGraphics[key][i]) cell.classList.add('active');
                    else cell.classList.remove('active');
                    if (onChangeCallback) onChangeCallback();
                }
            });

            containerEl.appendChild(cell);
        }
    }

    function updateMatricesUI() {
        if (!globalConfig.basicGraphics) {
            globalConfig.basicGraphics = {
                separator: Array(64).fill(false),
                selector: Array(64).fill(false)
            };
        }

        const onMatrixDrawn = () => {
            saveGlobalConfig();
            if (typeof autoSave === 'function') autoSave();
        };

        initMatrixUI(separatorMatrixEl, 'separator', 'separator', onMatrixDrawn);
        initMatrixUI(selectorMatrixEl, 'selector', 'interface', onMatrixDrawn);
    }

    // Actualiza la visibilidad de los botones de exportación según tipo de proyecto
    function updateExportButtons() {
        const isCYD = projectType === 'CYD';
        const cydBtn = document.getElementById('export-cyd-btn');
        const muchoBtn = document.getElementById('export-mucho-btn');
        const importMucho = document.getElementById('import-mucho-btn');
        const basicBtn = document.getElementById('export-btn');
        const tapBtn = document.getElementById('export-tap-btn');
        if (cydBtn) cydBtn.style.display = isCYD ? '' : 'none';
        if (muchoBtn) muchoBtn.style.display = !isCYD ? '' : 'none';
        if (importMucho) importMucho.style.display = !isCYD ? '' : 'none';
        if (basicBtn) basicBtn.style.display = !isCYD ? '' : 'none';
        if (tapBtn) tapBtn.style.display = !isCYD ? '' : 'none';
    }

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
        if (globalBorderColor) globalBorderColor.value = globalConfig.border || 'black';
        if (globalViewMode) globalViewMode.value = globalConfig.viewMode || 'simple';
        if (globalProjectType) globalProjectType.value = (globalConfig.projectType || projectType || 'MuCho');

        updateMatricesUI();
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
        if (globalBorderColor) globalConfig.border = globalBorderColor.value;
        if (globalViewMode) globalConfig.viewMode = globalViewMode.value;
        // project type selector
        if (globalProjectType) {
            projectType = globalProjectType.value || projectType;
            globalConfig.projectType = projectType;
        }

        // basicGraphics ya se actualiza en tiempo real en los arrays al hacer mousedown/drag, 
        // pero asegurémonos de que el objeto existe si no estaba
        if (!globalConfig.basicGraphics) {
            globalConfig.basicGraphics = {
                separator: Array(64).fill(false),
                selector: Array(64).fill(false)
            };
        }
    }

    // Abrir modal de configuración global
    document.getElementById('config-btn').addEventListener('click', () => {
        loadGlobalConfig();
        // Mostrar/ocultar secciones según tipo de proyecto
        const cydGeneralSection = document.getElementById('cyd-general-code-section');
        const muchoSections = document.getElementById('mucho-sections');
        if ((globalProjectType.value || projectType) === 'CYD') {
            if (muchoSections) muchoSections.style.display = 'none';
            if (cydGeneralSection) cydGeneralSection.style.display = 'block';
            if (window.showCYDEditor) window.showCYDEditor();
        } else {
            if (muchoSections) muchoSections.style.display = '';
            if (cydGeneralSection) cydGeneralSection.style.display = 'none';
        }
        globalConfigModal.style.display = 'flex';
    });

    // Cerrar modal con botón X
    document.getElementById('modal-close-btn').addEventListener('click', () => {
        saveGlobalConfig();
        globalConfigModal.style.display = 'none';
    });

    // Event listeners para configuración global
    const onGlobalConfigChange = () => {
        saveGlobalConfig();
        // Actualizar visibilidad de secciones al cambiar tipo de proyecto
        const cydGeneralSection = document.getElementById('cyd-general-code-section');
        const muchoSections = document.getElementById('mucho-sections');
        if ((globalProjectType.value || projectType) === 'CYD') {
            if (muchoSections) muchoSections.style.display = 'none';
            if (cydGeneralSection) cydGeneralSection.style.display = 'block';
            if (window.showCYDEditor) window.showCYDEditor();
        } else {
            if (muchoSections) muchoSections.style.display = '';
            if (cydGeneralSection) cydGeneralSection.style.display = 'none';
        }
        if (typeof autoSave === 'function') autoSave();
        updateExportButtons();
        updateMatricesUI();
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
    if (globalBorderColor) globalBorderColor.addEventListener('change', onGlobalConfigChange);
    if (globalViewMode) globalViewMode.addEventListener('change', onGlobalConfigChange);
    if (globalProjectType) globalProjectType.addEventListener('change', onGlobalConfigChange);
    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const lang = e.target.getAttribute('data-lang');
            await i18n.loadLanguage(lang);
            if (currentLangDisplay) currentLangDisplay.textContent = lang.toUpperCase();
        });
    });

    // Language changed event listener for dynamic updates
    window.addEventListener('languageChanged', (e) => {
        // Redraw editor to update nodes if needed, though they are mostly graphical
        editor.draw();
        // If a modal is open, we might need to refresh its content
        if (currentEditingNode) {
            openNodeEditModal(currentEditingNode);
        }
    });

    // Funciones para el modal de edición de nodos
    const nodeEditModal = document.getElementById('node-edit-modal');
    const nodeEditModalContent = document.getElementById('node-edit-modal-content');
    const nodeEditModalTitle = document.getElementById('node-edit-modal-title');
    // Compact modal for groups and references
    const compactEditModal = document.getElementById('compact-edit-modal');
    const compactEditModalContent = document.getElementById('compact-edit-modal-content');
    const compactEditModalTitle = document.getElementById('compact-edit-modal-title');
    let currentEditingNode = null;
    let editorViewMode = globalConfig.viewMode || 'simple'; // Use preference
    let editorRulerWidth = '32ch'; // '32ch', '28ch', '24ch', '20ch', or 'hidden'

    function closeCompactEditModal() {
        if (!compactEditModal) return;
        compactEditModal.style.display = 'none';
        currentEditingNode = null;
    }

    function setupCompactEditableTitle(fallbackText, obj, prop) {
        if (!compactEditModalTitle) return;
        compactEditModalTitle.innerHTML = '';
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
        inputField.style.width = '100%';
        inputField.style.padding = '4px 6px';

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
            inputField.select();
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
                inputField.value = obj[prop] || '';
                stopEditing();
            }
        });

        compactEditModalTitle.appendChild(titleSpan);
        compactEditModalTitle.appendChild(editIcon);
        compactEditModalTitle.appendChild(inputField);
    }

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
        labelSimple.textContent = t('editor.view_simple');
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
        labelAdvanced.textContent = t('editor.view_advanced');
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

        // Toggle Tags (Title Actions) - hide for CYD projects
        const tagsInput = nodeEditModalTitle.querySelector('.advanced-only');
        if (tagsInput) {
            tagsInput.style.display = (projectType === 'CYD') ? 'none' : (isAdvanced ? 'block' : 'none');
        }

        // Toggle Flags (Option Actions) - hide for CYD projects
        const flagsInputs = nodeEditModalContent.querySelectorAll('.advanced-only-flags');
        flagsInputs.forEach(el => {
            el.style.display = (projectType === 'CYD') ? 'none' : (isAdvanced ? 'block' : 'none');
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
            // Use compact modal for groups (narrower, no view switch)
            if (nodeEditModal) nodeEditModal.style.display = 'none';
            if (compactEditModalTitle) setupCompactEditableTitle(t('editor.edit_group'), nodeOrGroup, 'name');
        } else if (nodeOrGroup instanceof NodeReference) {
            // Use compact modal for references (narrower, no view switch)
            if (nodeEditModal) nodeEditModal.style.display = 'none';
            if (compactEditModalTitle) {
                compactEditModalTitle.innerHTML = '';
                compactEditModalTitle.setAttribute('data-i18n', 'editor.edit_reference');
                compactEditModalTitle.textContent = t('editor.edit_reference');
            }
        } else {
            setupEditableModalTitle(t('editor.node_no_title'), nodeOrGroup, 'title');

            // Add actions input next to the title
            const actionsInput = document.createElement('input');
            actionsInput.type = 'text';
            actionsInput.value = nodeOrGroup.actions || '';
            actionsInput.setAttribute('data-i18n', 'editor.actions_placeholder');
            actionsInput.placeholder = t('editor.actions_placeholder');
            actionsInput.setAttribute('data-i18n-title', 'editor.actions_title');
            actionsInput.title = t('editor.actions_title');
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
            // Hide title actions input for CYD projects; otherwise show in advanced view
            actionsInput.style.display = (projectType === 'CYD') ? 'none' : (editorViewMode === 'advanced' ? 'block' : 'none');
            nodeEditModalTitle.appendChild(actionsInput);

            // Toggle must be added LAST
            setupViewToggle();
        }

        // Generar y mostrar contenido según el tipo
        if (nodeOrGroup instanceof Group) {
            // compact container
            compactEditModalContent.innerHTML = '';
            updateGroupProperties(nodeOrGroup, compactEditModalContent);
            compactEditModal.style.display = 'flex';
        } else if (nodeOrGroup instanceof NodeReference) {
            compactEditModalContent.innerHTML = '';
            updateReferenceProperties(nodeOrGroup, compactEditModalContent);
            compactEditModal.style.display = 'flex';
        } else {
            // full node editor
            nodeEditModalContent.innerHTML = '';
            updateNodeProperties(nodeOrGroup, nodeEditModalContent);
            nodeEditModal.style.display = 'flex';
            applyViewMode();
        }
    }

    function closeNodeEditModal() {
        nodeEditModal.style.display = 'none';
        currentEditingNode = null;
    }

    // Event listeners para cerrar el modal
    document.getElementById('node-edit-modal-close-btn').addEventListener('click', closeNodeEditModal);

    // Cerrar modal al hacer clic fuera de él
    // Eliminado: no cerrar modal al hacer clic fuera

    // Compact modal close handlers
    const compactCloseBtn = document.getElementById('compact-edit-modal-close-btn');
    if (compactCloseBtn) compactCloseBtn.addEventListener('click', closeCompactEditModal);
    if (compactEditModal) {
        // Eliminado: no cerrar modal al hacer clic fuera
        // El cierre solo será posible con el botón X/cruz
        // (no hay llave de cierre aquí)
    }

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
            // Si se deselecciona, cerrar cualquier modal de edición
            closeNodeEditModal();
            closeCompactEditModal();
        }
    });

    // Auto-save logic
    const STORAGE_KEY = 'zx_story_flow_project';
    let isInitialized = false;

    function getProjectData() {
        return {
            name: projectName,
            projectType: projectType,
            globalConfig: globalConfig,
            nodes: editor.nodes.map(n => {
                const nodeData = {
                    id: n.id,
                    x: n.x,
                    y: n.y,
                    width: n.width,
                    height: n.height,
                    type: n.type,
                    title: n.title,
                    text: n.text,
                    outputs: n.outputs ? n.outputs.map(o => ({
                        label: o.label,
                        target: o.target,
                        flag: o.flag,
                        eligible: o.eligible !== false
                    })) : [],
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
                    nodeData.borderColor = n.borderColor;
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
            cydGeneralCode: document.getElementById('cyd-general-code')?.value || '',
            cydGeneralCodeEnd: document.getElementById('cyd-general-code-end')?.value || '',
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
                // if project type stored in globalConfig prefer it
                if (globalConfig.projectType) projectType = globalConfig.projectType;
                editorViewMode = globalConfig.viewMode || 'simple';
                loadGlobalConfig();
            }
            // If file explicitly sets projectType at root, prefer it
            if (data.projectType) {
                projectType = data.projectType;
                if (globalProjectType) globalProjectType.value = projectType;
            }

            // Restore CYD general code
            const cydGeneralTextarea = document.getElementById('cyd-general-code');
            if (cydGeneralTextarea && data.cydGeneralCode != null) {
                if (cydGeneralTextarea._cmInstance) {
                    cydGeneralTextarea._cmInstance.setValue(data.cydGeneralCode);
                } else {
                    cydGeneralTextarea.value = data.cydGeneralCode;
                    cydGeneralTextarea.dispatchEvent(new Event('input'));
                }
            }
            const cydGeneralTextareaEnd = document.getElementById('cyd-general-code-end');
            if (cydGeneralTextareaEnd && data.cydGeneralCodeEnd != null) {
                if (cydGeneralTextareaEnd._cmInstance) {
                    cydGeneralTextareaEnd._cmInstance.setValue(data.cydGeneralCodeEnd);
                } else {
                    cydGeneralTextareaEnd.value = data.cydGeneralCodeEnd;
                    cydGeneralTextareaEnd.dispatchEvent(new Event('input'));
                }
            }

            // Restore Nodes
            if (data.nodes) {
                data.nodes.forEach(n => {
                    let newNode;
                    if (n.type === 'Reference' || n.type === 'reference') {
                        newNode = new NodeReference(n.id, n.x, n.y, n.targetNodeId);
                        if (n.width) newNode.width = n.width;
                        if (n.height) newNode.height = n.height;
                    } else {
                        newNode = new ScreenNode(n.id, n.x, n.y);
                        newNode.text = n.text || "";
                        newNode.title = n.title || n.type;
                        newNode.actions = n.actions || "";
                        newNode.width = n.width || newNode.width;
                        newNode.height = n.height || newNode.height;
                        if (n.outputs) {
                            newNode.outputs = n.outputs.map(o => ({
                                label: o.label,
                                target: o.target,
                                flag: o.flag,
                                eligible: o.eligible !== false
                            }));
                        }
                        if (n.conditionalParagraphs) newNode.conditionalParagraphs = n.conditionalParagraphs;
                        if (n.paragraphImages) newNode.paragraphImages = n.paragraphImages;
                        if (n.useCustomConfig) {
                            newNode.useCustomConfig = true;
                            if (n.pageConfig) newNode.pageConfig = n.pageConfig;
                            if (n.separatorConfig) newNode.separatorConfig = n.separatorConfig;
                            if (n.interfaceConfig) newNode.interfaceConfig = n.interfaceConfig;
                            if (n.borderColor) newNode.borderColor = n.borderColor;
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
            updateExportButtons();
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
                alert(t('messages.storage_full'));
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
        updateExportButtons();
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

    // Helper: validate no duplicated labels
    function hasDuplicateLabels() {
        const screenNodes = editor.nodes.filter(n => n && (n.type === 'screen' || n.type === 'Screen' || n.constructor.name === 'ScreenNode'));
        const slugify = (text) => (text || '').toString().replace(/[^a-zA-Z0-9_]/g, '') || null;
        const labels = {};
        const duplicates = [];

        screenNodes.forEach(node => {
            const lbl = slugify(node.title) || `Node${node.id}`;
            const lblLower = lbl.toLowerCase();
            if (labels[lblLower]) {
                if (!duplicates.includes(lbl)) duplicates.push(lbl);
            } else {
                labels[lblLower] = true;
            }
        });

        if (duplicates.length > 0) {
            const title = window.translate ? window.translate('messages.duplicate_labels_title') : 'No se puede exportar. Hay pantallas con nombres que resultan en etiquetas duplicadas:\n';
            const desc = window.translate ? window.translate('messages.duplicate_labels_desc') : '\n\nPor favor, asegúrate de que cada pantalla tenga un nombre único.';
            alert(`${title}- ${duplicates.join('\n- ')}${desc}`);
            return true;
        }
        return false;
    }

    document.getElementById('export-png-btn').addEventListener('click', () => {
        const exportName = (projectName || 'workflow').replace(/\s+/g, '_');
        editor.exportToPNG(exportName);
    });

    document.getElementById('export-tap-btn').addEventListener('click', () => {
        if (hasDuplicateLabels()) return;
        try {
            const cydGeneralCode = document.getElementById('cyd-general-code')?.value || '';
            const cydGeneralCodeEnd = document.getElementById('cyd-general-code-end')?.value || '';
            const basicCode = projectType === 'CYD'
                ? generateBasicFromCYD(editor.nodes, globalConfig, cydGeneralCode, cydGeneralCodeEnd)
                : generateBasicFromMucho(editor.nodes, globalConfig);

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

            // Usar el nombre del proyecto, reemplazando espacios por _
            const exportName = (projectName || 'adventure').replace(/\s+/g, '_');
            const tapData = generateTapFromBasic(basicCode, exportName, screenImages);

            const blob = new Blob([tapData], { type: 'application/x-tap' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportName + '.tap';
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
        if (hasDuplicateLabels()) return;
        const cydGeneralCode = document.getElementById('cyd-general-code')?.value || '';
        const cydGeneralCodeEnd = document.getElementById('cyd-general-code-end')?.value || '';
        const basicCode = projectType === 'CYD'
            ? generateBasicFromCYD(editor.nodes, globalConfig, cydGeneralCode, cydGeneralCodeEnd)
            : generateBasicFromMucho(editor.nodes, globalConfig);
        const exportName = (projectName || 'adventure').replace(/\s+/g, '_');
        const blob = new Blob([basicCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportName + '.bas';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('export-mucho-btn').addEventListener('click', () => {
        if (hasDuplicateLabels()) return;
        const muchoCode = generateMucho(editor.nodes, globalConfig);
        const exportName = (projectName || 'adventure').replace(/\s+/g, '_');
        const blob = new Blob([muchoCode], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = exportName + '.txt';
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('export-cyd-btn').addEventListener('click', () => {
        try {
            const cydCodeResult = generateCYD(editor.nodes, globalConfig);
            let cydCode = cydCodeResult;
            // Prepend CYD general code if present
            const cydGeneralCode = (document.getElementById('cyd-general-code')?.value || '').trim();
            const cydGeneralCodeEnd = (document.getElementById('cyd-general-code-end')?.value || '').trim();
            if (cydGeneralCode) cydCode = cydGeneralCode + '\n\n' + cydCode;
            cydCode = cydCode + '\n\n[[ END ]]';
            if (cydGeneralCodeEnd) cydCode = cydCode + '\n\n' + cydGeneralCodeEnd;
            const exportName = (projectName || 'adventure').replace(/\s+/g, '_');
            const blob = new Blob([cydCode], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportName + '.cyd';
            a.click();
            URL.revokeObjectURL(url);
            console.log('CYD export successful');
        } catch (e) {
            console.error('CYD export failed:', e);
            alert('CYD export failed: ' + e.message);
        }
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
            alert(t('messages.save_failed') + e.message);
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
                alert(t('messages.load_failed') + err.message);
            }
        };
        reader.readAsText(file);
        // Reset input so same file can be selected again
        loadInput.value = '';
    });

    // Import from MuCho text file
    function parseMuchoToNodes(text) {
        const lines = text.split(/\r?\n/);
        const blocks = [];
        let currentBlock = null;
        let lastOptionIdx = -1;

        lines.forEach(line => {
            if (line.startsWith('$Q ')) {
                if (currentBlock) blocks.push(currentBlock);
                const rest = line.substring(3).trim();
                // label is the first token; rest may contain attr:N dattr:N iattr:N ...
                const firstSpace = rest.search(/\s/);
                const label = firstSpace > 0 ? rest.substring(0, firstSpace) : rest;
                currentBlock = { label, descLines: [], options: [], inOptions: false };
                lastOptionIdx = -1;
            } else if (currentBlock) {
                if (line.startsWith('$A ')) {
                    currentBlock.inOptions = true;
                    const afterA = line.substring(3).trim();
                    const spaceIdx = afterA.search(/\s/);
                    const targetLabel = spaceIdx > 0 ? afterA.substring(0, spaceIdx) : afterA;
                    const flag = spaceIdx > 0 ? afterA.substring(spaceIdx + 1).trim() : '';
                    currentBlock.options.push({ targetLabel, flag, text: '' });
                    lastOptionIdx = currentBlock.options.length - 1;
                } else if (currentBlock.inOptions && lastOptionIdx >= 0 &&
                    currentBlock.options[lastOptionIdx].text === '') {
                    currentBlock.options[lastOptionIdx].text = line.trim();
                } else if (!currentBlock.inOptions) {
                    currentBlock.descLines.push(line);
                }
            }
        });
        if (currentBlock) blocks.push(currentBlock);

        if (blocks.length === 0) return [];

        // Build label -> nodeId map first
        const labelToId = {};
        blocks.forEach((block, idx) => {
            const nodeId = 'n' + (idx + 1);
            labelToId[block.label.toLowerCase()] = nodeId;
        });

        // Create ScreenNode instances
        const COLS = 5;
        const COL_SPACING = 220;
        const ROW_SPACING = 200;
        const nodes = blocks.map((block, idx) => {
            const nodeId = 'n' + (idx + 1);
            const col = idx % COLS;
            const row = Math.floor(idx / COLS);
            const node = new ScreenNode(nodeId, 80 + col * COL_SPACING, 80 + row * ROW_SPACING);
            node.title = block.label;
            node.text = block.descLines.join('\n').replace(/^\n+|\n+$/g, '');

            if (block.options.length > 0) {
                node.outputs = block.options.map(opt => ({
                    label: opt.text || opt.targetLabel,
                    target: labelToId[opt.targetLabel.toLowerCase()] || null,
                    flag: opt.flag || ''
                }));
            } else {
                node.outputs = [{ label: 'Next', target: null }];
            }
            return node;
        });

        return nodes;
    }

    const importMuchoInput = document.getElementById('import-mucho-input');
    document.getElementById('import-mucho-btn').addEventListener('click', () => {
        importMuchoInput.click();
    });

    importMuchoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const nodes = parseMuchoToNodes(event.target.result);
                if (nodes.length === 0) {
                    alert(t('messages.import_mucho_empty') || 'No MuCho blocks ($Q) found in the file.');
                    return;
                }
                // Replace current project content
                const wasInitialized = isInitialized;
                isInitialized = false;
                editor.nodes = [];
                editor.groups = [];
                editor.selectNode(null);
                editor.selectGroup(null);
                nodes.forEach(n => editor.nodes.push(n));
                updateProjectName(file.name.replace(/\.[^.]+$/, ''));
                editor.draw();
                isInitialized = wasInitialized;
                updateExportButtons();
                autoSave();
            } catch (err) {
                console.error(err);
                alert((t('messages.import_mucho_failed') || 'Import failed: ') + err.message);
            }
        };
        reader.readAsText(file);
        importMuchoInput.value = '';
    });

    // New Project
    document.getElementById('new-btn').addEventListener('click', () => {
        if (confirm(t('messages.new_confirm'))) {
            // Temporary block auto-save to ensure clean wipe
            isInitialized = false;
            editor.nodes = [];
            editor.groups = [];
            editor.selectNode(null);
            editor.selectGroup(null);
            updateProjectName('Untitled');
            editor.draw();

            isInitialized = true;
            updateExportButtons();
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



        const colorInput = createColorInput(t('properties.group_color'), group.color, (val) => {
            group.color = val;
            editor.draw();
        });
        targetContainer.appendChild(colorInput);

        // Show member nodes count
        const infoDiv = document.createElement('div');
        infoDiv.className = 'form-group';
        infoDiv.innerHTML = `<p style="color: #aaa; font-size: 0.9em;">${t('properties.contains_nodes').replace('{n}', group.nodeIds.length)}</p>`;
        targetContainer.appendChild(infoDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = t('properties.delete_group');
        deleteBtn.style.marginTop = "20px";
        deleteBtn.style.backgroundColor = "#d00000";
        deleteBtn.style.color = "#fff";
        deleteBtn.style.border = "none";
        deleteBtn.style.padding = "10px";
        deleteBtn.style.cursor = "pointer";
        deleteBtn.style.width = "100%";
        deleteBtn.addEventListener('click', () => {
            editor.removeGroup(group);
            if (container) {
                if (container.id === 'compact-edit-modal-content') {
                    closeCompactEditModal();
                } else {
                    closeNodeEditModal();
                }
            }
        });
        targetContainer.appendChild(deleteBtn);
    }

    function updateReferenceProperties(reference, container = null) {
        const targetContainer = container || propertyContent;
        targetContainer.innerHTML = '';

        const title = document.createElement('h3');
        title.textContent = t('properties.node_reference');
        targetContainer.appendChild(title);

        // Dropdown to select target node
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = t('properties.target_node');
        formGroup.appendChild(label);

        const select = document.createElement('select');

        // Add "None" option
        const noneOption = document.createElement('option');
        noneOption.value = '';
        noneOption.textContent = t('properties.none');
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
        insertImageBtn.innerHTML = t('editor.insert_image');
        insertImageBtn.style.padding = '5px 10px';
        insertImageBtn.style.fontSize = '12px';
        if (projectType === 'CYD') insertImageBtn.style.display = 'none';

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
        rulerSelect.title = t('editor.ruler_title');

        const rulerOptions = [
            { label: t('editor.ruler_off'), value: 'hidden' },
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

        let editorWidget = null;

        const updateRuler = (val) => {
            editorRulerWidth = val;
            if (val === 'hidden') {
                editorContainer.style.setProperty('--ruler-display', 'none');
            } else {
                editorContainer.style.setProperty('--ruler-display', 'block');
                editorContainer.style.setProperty('--ruler-width', val);
            }

            if (editorWidget && editorWidget.cm) {
                if (val === 'hidden') {
                    editorWidget.cm.setOption('rulers', []);
                } else {
                    const cols = parseInt(val);
                    if (!isNaN(cols)) {
                        editorWidget.cm.setOption('rulers', [{ column: cols, color: 'rgba(255, 255, 255, 0.3)', lineStyle: 'dashed' }]);
                    }
                }
            }
        };

        rulerSelect.addEventListener('change', (e) => updateRuler(e.target.value));
        editorToolbar.appendChild(rulerSelect);

        mainColumn.appendChild(editorToolbar);

        const editorContainer = document.createElement('div');
        // Aplicar estado inicial de la regla
        updateRuler(editorRulerWidth);
        mainColumn.appendChild(editorContainer);

        // Choose editor implementation based on project type (MuCho or CYD)
        const EditorClass = (projectType === 'CYD') ? CYDEditor : MuchoEditor;
        const initialText = EditorClass.generateFromNode(node);
        editorWidget = new EditorClass(editorContainer, initialText, (newText) => {
            EditorClass.parseToNode(newText, node);
            editor.draw();
            autoSave();
        });

        // Apply ruler to the newly created CodeMirror instance
        updateRuler(editorRulerWidth);

        hiddenFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const cm = editorWidget.cm;
                if (cm) {
                    // Usar API CodeMirror para insertar en la posición del cursor
                    const cursor = cm.getCursor();
                    const line = cm.getLine(cursor.line);
                    const prepend = (line.length > 0) ? '\n' : '';
                    cm.replaceRange(prepend + '$I ' + file.name + '\n', cursor);
                    EditorClass.parseToNode(cm.getValue(), node);
                } else {
                    // Fallback textarea
                    const ta = editorWidget.textarea;
                    const start = ta.selectionStart;
                    const text = editorWidget.value;
                    const textBefore = text.substring(0, start);
                    const textAfter = text.substring(ta.selectionEnd);
                    const prepend = (textBefore.length > 0 && !textBefore.endsWith('\n')) ? '\n' : '';
                    editorWidget.value = textBefore + prepend + '$I ' + file.name + '\n' + textAfter;
                    ta.value = editorWidget.value;
                    editorWidget.updateHighlights();
                    EditorClass.parseToNode(editorWidget.value, node);
                }
                editor.draw();

                const reader = new FileReader();
                reader.onload = (event) => {
                    const imageData = event.target.result;
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
        if (projectType === 'CYD') {
            helpPanel.innerHTML = `
                <h5>CYD Syntax Help</h5>
                <div class="mucho-help-section">
                    <h6>Directives</h6>
                    <ul>
                        <li><code>[[ DECLARE 0 AS name ]]</code> Declare variables</li>
                        <li><code>[[ PICTURE 1 ]]</code> / <code>[[ DISPLAY 1 ]]</code> Show image</li>
                        <li><code>[[ LABEL name ]]</code> Define label</li>
                        <li><code>[[ IF @name = 1 THEN ]] ... [[ ENDIF ]]</code> Conditionals</li>
                        <li><code>[[ OPTION GOTO label ]]Choice text</code> Options &amp; <code>[[ CHOOSE ]]</code></li>
                    </ul>
                </div>
                <div class="mucho-help-section">
                    <h6>Layout</h6>
                    <ul>
                        <li><code>[[ MARGINS left,top,width,height ]]</code> Restrict text area</li>
                        <li><code>[[ CLEAR ]]</code> Clear screen</li>
                        <li><code>[[ WAITKEY : END ]]</code> Wait and end</li>
                    </ul>
                </div>
                <p style="margin-top:10px; font-size:11px; color:#888;"><em>Click code snippets to insert.</em></p>
            `;
        } else {
            helpPanel.innerHTML = `
                <h5>${t('help.title')}</h5>

                <div class="mucho-help-section">
                    <h6>${t('help.flags_logic')}</h6>
                    <ul>
                        <li><code>has:name</code> (${t('help.or')} <code>name</code>) ${t('help.flags_has')}</li>
                        <li><code>not:name</code> (${t('help.or')} <code>!name</code>) ${t('help.flags_not')}</li>
                        <li><code>rnd:128</code> ${t('help.flags_rnd')}</li>
                        <li><code>AND</code> ${t('help.flags_and')} <code>has:A AND has:B</code>.</li>
                    </ul>
                </div>

                <div class="mucho-help-section">
                    <h6>${t('help.ops_title')}</h6>
                    <ul>
                        <li><code>set:flag</code> ${t('help.ops_set')}</li>
                        <li><code>clear:flag</code> (${t('help.or')} <code>clr:</code>) ${t('help.ops_clear')}</li>
                        <li><code>toggle:flag</code> ${t('help.ops_toggle')}</li>
                    </ul>
                </div>

                <div class="mucho-help-section">
                    <h6>${t('help.nums_title')}</h6>
                    <ul>
                        <li><code>v=10</code> ${t('help.nums_assign')}</li>
                        <li><code>v+5</code> / <code>v-2</code> ${t('help.nums_add_sub')}</li>
                        <li><code>v==10</code> / <code>v!=5</code> ${t('help.nums_compare')}</li>
                        <li><code>v&gt;5</code> / <code>v&lt;=20</code> ${t('help.nums_compare')}</li>
                        <li><code>&lt;&lt;v&gt;&gt;</code> ${t('help.nums_print')}</li>
                    </ul>
                </div>

                <div class="mucho-help-section">
                    <h6>${t('help.style_title')}</h6>
                    <ul>
                        <li><code>$I img.scr</code> ${t('help.style_img')}</li>
                        <li><code>attr:71</code> ${t('help.style_attr')}</li>
                        <li><code>dattr:N</code> / <code>iattr:N</code> ${t('help.style_div_int')}</li>
                        <li><code>border:N</code> ${t('help.style_border')}</li>
                        <li><code>cls:0</code> ${t('help.style_cls')}</li>
                    </ul>
                </div>

                <p style="margin-top:10px; font-size:11px; color:#888;">
                    <em>${t('help.click_to_insert')}</em>
                </p>
            `;
        }

        // Add click listeners to code tags to insert text
        helpPanel.querySelectorAll('code').forEach(codeEl => {
            codeEl.addEventListener('click', () => {
                let insertText = codeEl.textContent + ' ';
                const ta = editorWidget.textarea;
                const start = ta.selectionStart;
                const end = ta.selectionEnd;
                editorWidget.value = editorWidget.value.substring(0, start) + insertText + editorWidget.value.substring(end);
                ta.value = editorWidget.value;
                editorWidget.updateHighlights();
                EditorClass.parseToNode(editorWidget.value, node);
                editor.draw();
                ta.focus();

                // If the inserted fragment contains a placeholder like 'name' or 'label', select it
                const lower = insertText.toLowerCase();
                const placeholderMatch = lower.match(/\b(name|label)\b/);
                if (placeholderMatch) {
                    const ph = placeholderMatch[0];
                    const idx = lower.indexOf(ph);
                    const selStart = start + idx;
                    const selEnd = selStart + ph.length;
                    ta.setSelectionRange(selStart, selEnd);
                } else {
                    ta.setSelectionRange(start + insertText.length, start + insertText.length);
                }
            });
        });

        sidebarColumn.appendChild(helpPanel);

        editorLayout.appendChild(mainColumn);
        editorLayout.appendChild(sidebarColumn);
        targetContainer.appendChild(editorLayout);

        // Options Section (always shown; flag inputs hidden for CYD projects)
        const optionsSection = document.createElement('div');
        optionsSection.style.marginTop = '15px';
        optionsSection.style.padding = '10px';
        optionsSection.style.backgroundColor = '#2a2a2a';
        optionsSection.style.borderRadius = '4px';

        const optionsTitle = document.createElement('h4');
        optionsTitle.textContent = t('editor.options_title');
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
                inp.placeholder = t('editor.option_placeholder');
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
                flagInp.title = t('editor.actions_option_title');
                flagInp.classList.add('advanced-only-flags');
                if (projectType === 'CYD') {
                    // In CYD projects options remain, but option flags are not applicable
                    flagInp.style.display = 'none';
                } else {
                    flagInp.style.display = editorViewMode === 'advanced' ? 'block' : 'none';
                }
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
                del.title = t('editor.delete_option');
                del.addEventListener('click', () => {
                    node.removeOption(idx);
                    editor.draw();
                    renderOptions();
                    autoSave();
                });

                inputsRow.appendChild(inp);
                inputsRow.appendChild(flagInp);

                // "Eligible" switch for CYD projects
                if (projectType === 'CYD') {
                    const eligibleContainer = document.createElement('div');
                    eligibleContainer.style.display = 'flex';
                    eligibleContainer.style.alignItems = 'center';
                    eligibleContainer.style.gap = '5px';
                    eligibleContainer.style.backgroundColor = '#2a2a2a';
                    eligibleContainer.style.padding = '2px 8px';
                    eligibleContainer.style.borderRadius = '3px';
                    eligibleContainer.style.border = '1px solid #444';

                    const eligibleLabel = document.createElement('span');
                    eligibleLabel.textContent = t('editor.eligible');
                    eligibleLabel.style.fontSize = '11px';
                    eligibleLabel.style.color = '#ccc';

                    const eligibleSwitch = document.createElement('input');
                    eligibleSwitch.type = 'checkbox';
                    eligibleSwitch.checked = (opt.eligible !== false); // Default true
                    eligibleSwitch.style.cursor = 'pointer';
                    eligibleSwitch.addEventListener('change', (e) => {
                        opt.eligible = e.target.checked;
                        editor.draw();
                        autoSave();
                    });

                    eligibleContainer.appendChild(eligibleLabel);
                    eligibleContainer.appendChild(eligibleSwitch);
                    inputsRow.appendChild(eligibleContainer);
                }

                inputsRow.appendChild(del);

                row.appendChild(inputsRow);
                container.appendChild(row);
            });

            // Add Option Button
            const addBtn = document.createElement('button');
            addBtn.textContent = t('editor.add_option');
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
        if (projectType === 'CYD') colorConfigSection.style.display = 'none';

        const colorConfigTitle = document.createElement('h4');
        colorConfigTitle.textContent = '▼ 🎨 ' + t('editor.color_config_title');
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
            colorConfigTitle.textContent = (isColorConfigExpanded ? '▼' : '▶') + ' 🎨 ' + t('editor.color_config_title');
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
        useCustomText.textContent = t('editor.use_custom_node');

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
            inkLabel.textContent = t('properties.ink');
            inkLabel.style.minWidth = '40px';

            const inkSelect = document.createElement('select');
            inkSelect.style.flex = '1';
            ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
                const opt = document.createElement('option');
                opt.value = color;
                opt.textContent = t(`colors.${color}`);
                if (currentConfig.ink === color) opt.selected = true;
                inkSelect.appendChild(opt);
            });

            const paperLabel = document.createElement('label');
            paperLabel.textContent = t('properties.paper');
            paperLabel.style.minWidth = '50px';
            paperLabel.style.marginLeft = '5px';

            const paperSelect = document.createElement('select');
            paperSelect.style.flex = '1';
            ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
                const opt = document.createElement('option');
                opt.value = color;
                opt.textContent = t(`colors.${color}`);
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
            brightText.textContent = t('properties.bright');

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
            flashText.textContent = t('properties.flash');

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

        // Border Color Config (Special simplified version of createColorConfig)
        const borderSection = document.createElement('div');
        borderSection.style.marginTop = '15px';
        borderSection.style.padding = '10px';
        borderSection.style.backgroundColor = '#1a1a1a';
        borderSection.style.borderRadius = '4px';

        const borderTitle = document.createElement('h5');
        borderTitle.textContent = t('config.border_section') || 'Border';
        borderTitle.style.margin = '0 0 10px 0';
        borderTitle.style.color = '#4a9eff';
        borderSection.appendChild(borderTitle);

        const borderRow = document.createElement('div');
        borderRow.style.display = 'flex';
        borderRow.style.gap = '10px';
        borderRow.style.alignItems = 'center';

        const borderLabel = document.createElement('label');
        borderLabel.textContent = t('properties.color') || 'Color';
        borderLabel.style.minWidth = '50px';

        const borderSelect = document.createElement('select');
        borderSelect.style.flex = '1';
        ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
            const opt = document.createElement('option');
            opt.value = color;
            opt.textContent = t(`colors.${color}`);
            if ((node.borderColor || 'black') === color) opt.selected = true;
            borderSelect.appendChild(opt);
        });

        borderSelect.addEventListener('change', () => {
            node.borderColor = borderSelect.value;
            autoSave();
        });

        borderRow.appendChild(borderLabel);
        borderRow.appendChild(borderSelect);
        borderSection.appendChild(borderRow);
        customConfigContainer.appendChild(borderSection);

        customConfigContainer.appendChild(createColorConfig(t('properties.page'), 'pageConfig'));
        customConfigContainer.appendChild(createColorConfig(t('properties.separator'), 'separatorConfig'));
        customConfigContainer.appendChild(createColorConfig(t('properties.options'), 'interfaceConfig'));

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
                node.borderColor = globalConfig.border || 'black';

                // Recreate the config UI with new values
                customConfigContainer.innerHTML = '';

                // Re-create border section
                const newBorderSection = document.createElement('div');
                newBorderSection.style.marginTop = '15px';
                newBorderSection.style.padding = '10px';
                newBorderSection.style.backgroundColor = '#1a1a1a';
                newBorderSection.style.borderRadius = '4px';
                const newBorderTitle = document.createElement('h5');
                newBorderTitle.textContent = t('config.border_section') || 'Border';
                newBorderTitle.style.margin = '0 0 10px 0';
                newBorderTitle.style.color = '#4a9eff';
                newBorderSection.appendChild(newBorderTitle);
                const newBorderRow = document.createElement('div');
                newBorderRow.style.display = 'flex';
                newBorderRow.style.gap = '10px';
                newBorderRow.style.alignItems = 'center';
                const newBorderLabel = document.createElement('label');
                newBorderLabel.textContent = t('properties.color') || 'Color';
                newBorderLabel.style.minWidth = '50px';
                const newBorderSelect = document.createElement('select');
                newBorderSelect.style.flex = '1';
                ['black', 'blue', 'red', 'magenta', 'green', 'cyan', 'yellow', 'white'].forEach(color => {
                    const opt = document.createElement('option');
                    opt.value = color;
                    opt.textContent = t(`colors.${color}`);
                    if ((node.borderColor || 'black') === color) opt.selected = true;
                    newBorderSelect.appendChild(opt);
                });
                newBorderSelect.addEventListener('change', () => { node.borderColor = newBorderSelect.value; autoSave(); });
                newBorderRow.appendChild(newBorderLabel);
                newBorderRow.appendChild(newBorderSelect);
                newBorderSection.appendChild(newBorderRow);
                customConfigContainer.appendChild(newBorderSection);

                customConfigContainer.appendChild(createColorConfig(t('properties.page'), 'pageConfig'));
                customConfigContainer.appendChild(createColorConfig(t('properties.separator'), 'separatorConfig'));
                customConfigContainer.appendChild(createColorConfig(t('properties.options'), 'interfaceConfig'));
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

    // Auto-save cuando se edita el Código general CYD
    const cydGeneralTextareaEl = document.getElementById('cyd-general-code');
    if (cydGeneralTextareaEl) {
        cydGeneralTextareaEl.addEventListener('input', () => {
            if (typeof autoSave === 'function') autoSave();
        });
    }
    const cydGeneralTextareaEndEl = document.getElementById('cyd-general-code-end');
    if (cydGeneralTextareaEndEl) {
        cydGeneralTextareaEndEl.addEventListener('input', () => {
            if (typeof autoSave === 'function') autoSave();
        });
    }
});
