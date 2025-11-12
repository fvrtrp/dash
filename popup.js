// Import utility functions from utils.js
import {
    wrapTextAtSelection,
    prefixLineAtSelection,
    insertLinkAtSelection,
    insertCodeBlockAtSelection,
    handleTabKey,
    toggleNotesView,
    renderMarkdownPreview,
    configureMarkedOptions,
    applyTheme,
    resetUI,
    createTaskElement
} from './utils.js';

let tasks = [], notes = {}
let config = {
    theme: 'blues',
    mode: 'tasks',
    noteId: 0,
}
const defaultNotes = {
    0: {
        name: 'default',
        value: '',
        storageType: 'sync' // 'sync' or 'local'
    }
}

let userInput = document.querySelector("#userInput")
let userNotes = document.querySelector("#userNotes")
let markdownPreview = document.querySelector("#markdownPreview")
let notesList = document.querySelector('#notesList')
const tasksContainer = document.querySelector('#tasksContainer')
const notesContainer = document.querySelector('#notesContainer')
let themeButtons = document.querySelectorAll('.theme-btn')
const modeToggle = document.querySelector('#mode-toggle')
const notesSearch = document.querySelector('#notes-search')
const resultContainer = document.querySelector("#result")
const errorContainer = document.querySelector("#error")
let typingTimer; // Timer identifier for delayed preview
let searchResults = []; // Array to store search results
let currentSearchTerm = ''; // Current search term for highlighting
let searchDebounceTimer = null; // Timer for debouncing search input

window.addEventListener('DOMContentLoaded', function() {
    init();
});

function init() {
    // Reset UI state first
    reset()
    
    // Configure Markdown options
    configureMarkedOptions()
    
    // chrome.storage.sync.clear()
    load_data()
    add_eventlisteners()
    
    // Remove these lines since they're now handled in the storage flow
    // Initialize notes content structure right away to prevent layout issues
    // initNotesContent()
    
    // Apply the correct mode
    // applyConfig()
}

function reset() {
    // Use the resetUI utility function
    resetUI(tasksContainer, notesContainer, config.theme);
}

function load_data() {
    storage('read')
}

function add_eventlisteners() {
    userInput.addEventListener('keypress', (event) => {
        if (event.key === "Enter") {
            add_task()
        }
    })
    
    // Enhanced input handling for userNotes with Markdown formatting shortcuts
    userNotes.addEventListener('input', () => {
        save_notes()
        renderMarkdownPreview(userNotes, markdownPreview)
        
        // Clear any existing timer
        clearTimeout(typingTimer);
        
        // Make sure we're in edit mode during typing
        toggleNotesView('edit', userNotes, markdownPreview);
    })
    
    // Set timer to show preview after typing stops, but ignore navigation keys
    userNotes.addEventListener('keyup', (event) => {
        // Skip preview mode transition for navigation keys
        const navigationKeys = [
            'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
            'Home', 'End', 'PageUp', 'PageDown',
            'Shift', 'Control', 'Alt', 'Meta',
            'Tab', 'CapsLock', 'Escape'
        ];
        
        if (navigationKeys.includes(event.key)) {
            // Don't trigger preview mode for navigation keys
            clearTimeout(typingTimer);
            return;
        }
        
        clearTimeout(typingTimer);
        if (userNotes.value.trim() !== '') {
            typingTimer = setTimeout(() => {
                // Always switch to preview after inactivity timeout
                toggleNotesView('preview', userNotes, markdownPreview);
            }, 3000);
        }
    });
    
    // Add focus/blur events to handle seamless preview
    userNotes.addEventListener('focus', () => {
        clearTimeout(typingTimer);
        toggleNotesView('edit', userNotes, markdownPreview);
    });
    
    userNotes.addEventListener('blur', () => {
        clearTimeout(typingTimer);
        // Only switch to preview mode if there's content
        if (userNotes.value.trim() !== '') {
            typingTimer = setTimeout(() => {
                toggleNotesView('preview', userNotes, markdownPreview);
            }, 300); // 0.3 second delay on blur (reduced for responsiveness)
        }
    });

    // Update the tab key handler to use the new utility function
    userNotes.addEventListener('keydown', (event) => {
        // Handle Tab key to insert tab character instead of changing focus
        if (event.key === 'Tab') {
            event.preventDefault();
            
            // Use the handleTabKey utility function
            handleTabKey(userNotes);
            
            // Save the notes after inserting tab
            save_notes();
            return;
        }
        
        // Only handle keyboard shortcuts when Ctrl/Cmd key is pressed
        if (!(event.ctrlKey || event.metaKey)) return;
        
        let handled = true;
        const textarea = userNotes;
        
        switch(event.key) {
            case 'b': // Bold
                wrapTextAtSelection(textarea, '**', '**');
                break;
            case 'i': // Italic
                wrapTextAtSelection(textarea, '*', '*');
                break;
            case 'k': // Link
                insertLinkAtSelection(textarea);
                break;
            case '1': // Header 1
                prefixLineAtSelection(textarea, '# ');
                break;
            case '2': // Header 2
                prefixLineAtSelection(textarea, '## ');
                break;
            case '3': // Header 3
                prefixLineAtSelection(textarea, '### ');
                break;
            case 'l': // List item
                prefixLineAtSelection(textarea, '- ');
                break;
            case 'e': // Code inline (changed from preview to code)
                wrapTextAtSelection(textarea, '`', '`');
                break;
            case 'd': // Code block
                insertCodeBlockAtSelection(textarea);
                break;
            default:
                handled = false;
        }
        
        if (handled) {
            event.preventDefault();
            save_notes();
            renderMarkdownPreview(userNotes, markdownPreview);
        }
    });
    
    // Add click event on the preview to easily switch back to editing
    if (markdownPreview) {
        markdownPreview.addEventListener('click', () => {
            toggleNotesView('edit', userNotes, markdownPreview);
            userNotes.focus();
        });
    }
    
    themeButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            // Update the config object with the new theme
            config = Object.assign(config, {theme: event.target.id })
            
            // First save the updated config to storage
            storage('update-config', config)
            
            // Then apply the theme changes
            applyConfig()
        })
    })
    modeToggle.addEventListener('click', () => {
        config = Object.assign(config, {mode: config.mode === 'notes' ? 'tasks' : 'notes'})
        applyConfig()
        storage('update-config', config)
    })
    
    // Add event listener for notes search with debouncing
    if (notesSearch) {
        notesSearch.addEventListener('input', (e) => {
            // Clear any existing timer
            if (searchDebounceTimer) {
                clearTimeout(searchDebounceTimer);
            }
            
            const searchValue = e.target.value;
            
            // If search is empty, handle immediately
            if (!searchValue.trim()) {
                handleNotesSearch('');
                return;
            }
            
            // Otherwise, debounce the search
            searchDebounceTimer = setTimeout(() => {
                handleNotesSearch(searchValue);
            }, 300); // 300ms delay
        });
        
        // Clear search on Escape key
        notesSearch.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (searchDebounceTimer) {
                    clearTimeout(searchDebounceTimer);
                }
                notesSearch.value = '';
                handleNotesSearch('');
            }
        });
    }
}

function add_task() {
    const input = document.querySelector('#userInput')
    const val = input.value
    if (!val) val = ''
    
    // Generate a unique ID for the task - use timestamp to guarantee uniqueness
    const taskId = Date.now()
    
    const task = {
        val: val,
        id: taskId
    }
    // Add to the beginning of the array
    tasks.unshift(task)
    
    // Save to storage
    storage('update-tasks', tasks)
    
    // Clear input
    input.value = ''
    
    // Render the new task at the top
    renderTask(task, 'new')
}

function edit_task(id, value) {
    for (let task of tasks) {
        if (task.id === id) task.val = value
    }
    storage('update-tasks', tasks)
}

function delete_task(id) {
    // First find the task element
    const target = document.querySelector(`#task-${id}`)
    if (!target) {
        console.error(`Task element with ID ${id} not found`)
        return
    }
    
    // Add deletion animation class
    target.classList.add('deleted')
    
    // After animation completes, remove from DOM and update the array
    setTimeout(() => {
        // Remove the element from DOM
        target.remove()
        
        // Remove the task from the array
        tasks = tasks.filter(task => task.id !== id)
        
        // Update storage
        storage('update-tasks', tasks)
    }, 500) // Match this with the CSS transition duration
}

function save_notes() {
    const input = document.querySelector('#userNotes')
    let val = input.value
    if (!val) val = ''
    notes[config.noteId].value = val
    storage('update-notes')
    updateStorageIndicator()
}


function storage(action, data) {
    switch (action) {
        case 'read': {
            // First, ensure the UI is in a stable state while loading
            // Set default mode at startup to prevent flashing
            applyMode(config.mode);
            
            // Load config first, then load tasks and notes
            chrome.storage.sync.get(['dash-config'], function (data) {
                if (!data || Object.keys(data).length === 0) {
                    // Keep default config as initialized
                } else {
                    config = data['dash-config'];
                    // Apply config immediately after loading it
                    applyConfig();
                }
                
                // Now load tasks
                chrome.storage.sync.get(['dash-tasks'], function (data) {
                    if (!data || Object.keys(data).length === 0) {
                        // Keep default empty tasks array
                    } else {
                        tasks = data['dash-tasks'];
                    }
                    renderTasks();
                    
                    // First get the notes list to ensure we load in the correct order
                    chrome.storage.sync.get(['dash-notes-list'], function (data) {
                        let noteIds = [];
                        let noteOrders = {};
                        
                        if (!data || Object.keys(data).length === 0) {
                            noteIds = [0]; // Start with at least one default note
                            noteOrders = { 0: 1 }; // Give it order 1
                        } else {
                            noteIds = data['dash-notes-list'];
                            
                            // Create an order mapping based on the position in the list
                            // This ensures all notes have an order even if they didn't before
                            noteIds.forEach((id, index) => {
                                // Reverse the index for display order (highest first)
                                noteOrders[id] = noteIds.length - index;
                            });
                        }
                        
                        let loaded = 0;
                        noteIds.forEach(id => {
                            // Try sync storage first, then local storage
                            chrome.storage.sync.get([`dash-notes-${id}`], function (syncData) {
                                if (syncData && Object.keys(syncData).length > 0) {
                                    // Found in sync storage
                                    notes[id] = syncData[`dash-notes-${id}`];
                                    if (!notes[id].storageType) notes[id].storageType = 'sync';
                                    if (notes[id].order === undefined) {
                                        notes[id].order = noteOrders[id];
                                        const currentNoteId = config.noteId;
                                        config.noteId = id;
                                        storage('update-notes');
                                        config.noteId = currentNoteId;
                                    }
                                    checkIfAllLoaded();
                                } else {
                                    // Try local storage
                                    chrome.storage.local.get([`dash-notes-${id}`], function (localData) {
                                        if (localData && Object.keys(localData).length > 0) {
                                            notes[id] = localData[`dash-notes-${id}`];
                                            if (!notes[id].storageType) notes[id].storageType = 'local';
                                            if (notes[id].order === undefined) {
                                                notes[id].order = noteOrders[id];
                                                const currentNoteId = config.noteId;
                                                config.noteId = id;
                                                storage('update-notes');
                                                config.noteId = currentNoteId;
                                            }
                                        } else {
                                            // Not found in either storage, create default
                                            if (id === 0) {
                                                notes[id] = defaultNotes[0];
                                            } else {
                                                notes[id] = {
                                                    name: `Note ${id + 1}`,
                                                    value: '',
                                                    storageType: 'sync'
                                                };
                                            }
                                            notes[id].order = noteOrders[id];
                                        }
                                        checkIfAllLoaded();
                                    });
                                }
                            });
                        });
                        
                        function checkIfAllLoaded() {
                            loaded++;
                            if (loaded === noteIds.length) {
                                // Ensure there's at least one note
                                if (Object.keys(notes).length === 0) {
                                    notes[0] = defaultNotes[0];
                                    notes[0].order = 1;
                                    config.noteId = 0;
                                }
                                
                                // Make sure config.noteId points to an existing note
                                if (!notes[config.noteId]) {
                                    config.noteId = parseInt(Object.keys(notes)[0]);
                                }
                                
                                // Save the updated order to ensure persistence
                                storage('update-notes-list');
                                
                                loadNotesDropdown();
                                
                                // Re-apply mode one final time after all data is loaded
                                // This ensures the UI is in the correct state
                                applyConfig();
                                applyActiveNote();
                            }
                        }
                    });
                });
            });
            break;
        }
        //update config, tasks, notes

        case 'update-tasks': {
            chrome.storage.sync.set({ 'dash-tasks': data }, function () {
                // console.log('Value is set to ' + data)
            })
            break
        }
        case 'update-notes': {
            const note = notes[config.noteId];
            // Ensure storageType exists
            if (!note.storageType) {
                note.storageType = 'sync';
            }
            
            // Save to the appropriate storage
            const storageApi = note.storageType === 'sync' ? chrome.storage.sync : chrome.storage.local;
            storageApi.set({ [`dash-notes-${config.noteId}`]: note }, function () {
                // console.log('Value is set to ' + config.noteId, note)
            })
            break
        }
        case 'update-config': {
            chrome.storage.sync.set({ 'dash-config': data }, function () {
                // console.log('Mode is set to ' + data)
            })
            break
        }
        case 'update-notes-list': {
            // Get all notes with their order
            const noteIds = Object.keys(notes).map(Number);
            
            // Sort the note IDs based on order property (which all notes should have now)
            const sortedNoteIds = noteIds.sort((a, b) => {
                return notes[b].order - notes[a].order; // Higher order value first
            });
            
            chrome.storage.sync.set({ 'dash-notes-list': sortedNoteIds }, function () {
                // console.log('Notes list updated')
            });
            break;
        }
    }
}

function applyConfig() {
    // Apply the theme - note that we need to pass themeButtons to the applyTheme function
    const isNotesMode = applyTheme(config.theme, themeButtons);
    
    // Apply the mode
    applyMode(config.mode);
    
    // Ensure note actions are recreated if in notes mode
    if (config.mode === 'notes') {
        setTimeout(() => {
            createNoteActions();
            
            // If in notes mode, also reapply the current note to refresh the content
            if (isNotesMode) {
                applyActiveNote();
            }
        }, 0);
    }
}

function applyMode(mode) {
    reset()
    
    // Get the current theme
    const currentTheme = config.theme;
    
    if (mode === 'tasks') {
        // Update container visibility
        tasksContainer.classList.add('active')
        notesContainer.classList.remove('active')
        
        // Update button text
        modeToggle.innerText = 'Switch to notes'
        
        // Update body properties
        document.body.style.width = '400px'
        document.body.className = `theme-${currentTheme}`
        
        // Focus the input
        userInput.focus()
    }
    else if (mode === 'notes') {
        // Update container visibility
        notesContainer.classList.add('active')
        tasksContainer.classList.remove('active')
        
        // Update body properties first
        document.body.style.width = '700px'
        document.body.className = `theme-${currentTheme} notes-mode`
        
        // Clear search when switching to notes mode
        if (notesSearch) {
            notesSearch.value = '';
            searchResults = [];
        }
        
        // Ensure notes content is initialized
        initNotesContent()
        
        // Update button text
        modeToggle.innerText = 'Switch to tasks'
        
        // Apply the currently selected note
        if (notes && config.noteId !== undefined && notes[config.noteId]) {
            applyActiveNote()
        }
    }
}

function applyActiveNote() {
    renderNotes(notes[config.noteId]);
    
    // Update active class in the sidebar
    document.querySelectorAll('.note-item').forEach(item => {
        const itemId = parseInt(item.getAttribute('data-note-id'));
        if (itemId === config.noteId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Update the note title
    const titleInput = document.querySelector('.note-title');
    if (titleInput && notes[config.noteId]) {
        titleInput.value = notes[config.noteId].name;
    }
    
    // Update storage toggle
    updateStorageToggle();
    
    // Update the note actions
    createNoteActions();
    
    // Render markdown preview and set the correct view mode
    renderMarkdownPreview(userNotes, markdownPreview);
    
    // Update storage indicator
    updateStorageIndicator();
    
    // Reapply search highlights if there's an active search
    if (currentSearchTerm) {
        setTimeout(() => highlightSearchTerm(currentSearchTerm), 50);
    }
    
    // Start in preview mode if there's content, otherwise in edit mode
    if (notes[config.noteId].value.trim() !== '') {
        toggleNotesView('preview', userNotes, markdownPreview);
    } else {
        toggleNotesView('edit', userNotes, markdownPreview);
        userNotes.focus();
    }
}

function renderTasks() {
    for (let task of tasks)
        renderTask(task)
}

function renderTask(task, flag) {
    // Create the task element using the createTaskElement utility function
    const el = createTaskElement(
        task, 
        flag, 
        edit_task,  // Pass the edit callback function
        delete_task // Pass the delete callback function
    );

    const container = document.querySelector('#tasks');
    
    // If this is a new task (indicated by the flag), insert at the top
    // Otherwise, append to the bottom (for initial loading)
    if (flag === 'new') {
        // Insert at the top - if there are existing tasks, insert before the first child
        if (container.firstChild) {
            container.insertBefore(el, container.firstChild);
        } else {
            container.appendChild(el);
        }
    } else {
        // For initial loading of tasks, append to the bottom
        container.appendChild(el);
    }
}

function deleteNote(id) {
    // Don't allow deleting the last note
    if (Object.keys(notes).length <= 1) {
        return;
    }
    
    // Ensure all notes have order properties before proceeding
    Object.keys(notes).forEach(noteId => {
        const numId = parseInt(noteId);
        if (notes[numId].order === undefined) {
            notes[numId].order = Number.MAX_SAFE_INTEGER - numId; // Use high values for unordered notes
        }
    });
    
    // Store the order of the deleted note
    const deletedOrder = notes[id].order;
    
    // Delete the note
    delete notes[id];
    
    // If we deleted the active note, switch to another one
    if (id === config.noteId) {
        // Find the note with the next highest order
        let nextNoteId = null;
        let nextHighestOrder = -1;
        
        Object.keys(notes).forEach(noteId => {
            const numId = parseInt(noteId);
            if (notes[numId].order > nextHighestOrder) {
                nextHighestOrder = notes[numId].order;
                nextNoteId = numId;
            }
        });
        
        config.noteId = nextNoteId !== null ? nextNoteId : parseInt(Object.keys(notes)[0]);
        storage('update-config', config);
    }
    
    // Adjust orders for all notes that had a lower order than the deleted note
    // This maintains the relative order while closing the gap
    Object.keys(notes).forEach(noteId => {
        const numId = parseInt(noteId);
        if (notes[numId].order > deletedOrder) {
            notes[numId].order -= 1;
            
            // Save the updated note
            const currentNoteId = config.noteId;
            config.noteId = numId;
            storage('update-notes');
            config.noteId = currentNoteId;
        }
    });
    
    // Update storage
    storage('update-notes-list');
    
    // Refresh the list
    loadNotesDropdown();
    applyActiveNote();
}

function loadNotesDropdown() {
    // Clear existing notes list
    notesList.innerHTML = '';
    
    // Create header with add button
    const notesHeader = document.createElement('div');
    notesHeader.className = 'notes-header';
    
    // Create add new note button
    const addButton = document.createElement('button');
    addButton.textContent = '+ New';
    addButton.title = 'Add new note';
    addButton.className = 'add-note-btn';
    addButton.addEventListener('click', addNewNote);
    
    notesHeader.appendChild(addButton);
    notesList.appendChild(notesHeader);
    
    // Create container for notes list items
    const notesListItems = document.createElement('div');
    notesListItems.className = 'notes-list-items';
    
    // Get all note IDs
    const noteIds = Object.keys(notes).map(Number);
    
    // Ensure all notes have an order property (for backwards compatibility)
    // Assign default orders based on ID if not present
    let maxOrder = 0;
    noteIds.forEach(id => {
        if (notes[id].order === undefined) {
            // Find the highest existing order value
            maxOrder = Math.max(maxOrder, ...noteIds.filter(nid => notes[nid].order !== undefined)
                .map(nid => notes[nid].order), 0);
            
            // Set this note's order to be higher than any existing order
            // This will place unordered notes at the top initially
            notes[id].order = maxOrder + 1;
            maxOrder = notes[id].order;
            
            // Save the updated note
            const currentNoteId = config.noteId;
            config.noteId = id;
            storage('update-notes');
            config.noteId = currentNoteId;
        }
    });
    
    // Sort notes based on order property
    const sortedNoteIds = noteIds.sort((a, b) => {
        return notes[b].order - notes[a].order; // Higher order value first
    });
    
    sortedNoteIds.forEach(id => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.setAttribute('data-note-id', id);
        noteItem.setAttribute('draggable', 'true');
        if (id === config.noteId) {
            noteItem.classList.add('active');
        }
        
        // Add click handler to select this note
        noteItem.addEventListener('click', function(e) {
            // Don't select if dragging
            if (e.target.classList.contains('drag-handle')) return;
            
            const noteId = parseInt(this.getAttribute('data-note-id'));
            config.noteId = noteId;
            
            // Update active class
            document.querySelectorAll('.note-item').forEach(item => {
                item.classList.remove('active');
            });
            this.classList.add('active');
            
            applyActiveNote();
            storage('update-config', config);
        });
        
        // Add drag event listeners
        noteItem.addEventListener('dragstart', handleNoteDragStart);
        noteItem.addEventListener('dragover', handleNoteDragOver);
        noteItem.addEventListener('drop', handleNoteDrop);
        noteItem.addEventListener('dragend', handleNoteDragEnd);
        noteItem.addEventListener('dragenter', handleNoteDragEnter);
        noteItem.addEventListener('dragleave', handleNoteDragLeave);
        
        // Create drag handle
        const dragHandle = document.createElement('div');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z"/>
        </svg>`;
        dragHandle.title = 'Drag to reorder';
        
        // Create note name (non-editable)
        const noteName = document.createElement('span');
        noteName.className = 'note-name';
        noteName.textContent = notes[id].name || 'Untitled';
        
        // Add elements to note item
        noteItem.appendChild(dragHandle);
        noteItem.appendChild(noteName);
        notesListItems.appendChild(noteItem);
    });
    
    notesList.appendChild(notesListItems);
    
    // Add resize handle to sidebar if it doesn't exist
    if (!notesList.querySelector('.sidebar-resize-handle')) {
        const sidebarResizeHandle = document.createElement('div');
        sidebarResizeHandle.className = 'sidebar-resize-handle';
        sidebarResizeHandle.addEventListener('mousedown', initSidebarResize);
        notesList.appendChild(sidebarResizeHandle);
    }
    
    // Load saved sidebar width from localStorage
    const savedSidebarWidth = localStorage.getItem('dash-sidebar-width');
    if (savedSidebarWidth) {
        notesList.style.width = savedSidebarWidth + 'px';
    }
    
    // Make sure the note title is updated in the UI (if it exists)
    const titleInput = document.querySelector('.note-title');
    if (titleInput && notes[config.noteId]) {
        titleInput.value = notes[config.noteId].name || '';
    }
    
    // Add the delete button in the note content area
    createNoteActions();
}

// Drag and drop state
let draggedNoteElement = null;
let draggedNoteId = null;

/**
 * Handles the start of dragging a note
 */
function handleNoteDragStart(e) {
    draggedNoteElement = this;
    draggedNoteId = parseInt(this.getAttribute('data-note-id'));
    
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

/**
 * Handles drag over event
 */
function handleNoteDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

/**
 * Handles drag enter event
 */
function handleNoteDragEnter(e) {
    if (this !== draggedNoteElement) {
        this.classList.add('drag-over');
    }
}

/**
 * Handles drag leave event
 */
function handleNoteDragLeave(e) {
    this.classList.remove('drag-over');
}

/**
 * Handles dropping a note
 */
function handleNoteDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (draggedNoteElement !== this) {
        const targetNoteId = parseInt(this.getAttribute('data-note-id'));
        
        // Swap order values
        const tempOrder = notes[draggedNoteId].order;
        notes[draggedNoteId].order = notes[targetNoteId].order;
        notes[targetNoteId].order = tempOrder;
        
        // Save both notes
        const currentNoteId = config.noteId;
        
        config.noteId = draggedNoteId;
        storage('update-notes');
        
        config.noteId = targetNoteId;
        storage('update-notes');
        
        config.noteId = currentNoteId;
        
        // Update the list
        storage('update-notes-list');
        loadNotesDropdown();
    }
    
    this.classList.remove('drag-over');
    return false;
}

/**
 * Handles the end of dragging
 */
function handleNoteDragEnd(e) {
    this.classList.remove('dragging');
    
    // Remove drag-over class from all items
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('drag-over');
    });
    
    draggedNoteElement = null;
    draggedNoteId = null;
}

// Initialize notes content wrapper when loading notes
function initNotesContent() {
    // Make sure all elements are available
    if (!notesContainer) {
        notesContainer = document.querySelector('#notesContainer');
        if (!notesContainer) {
            console.error('Notes container not found');
            return;
        }
    }
    
    if (!notesList) {
        notesList = document.querySelector('#notesList');
    }
    
    if (!userNotes) {
        userNotes = document.querySelector("#userNotes");
    }
    
    if (!markdownPreview) {
        markdownPreview = document.querySelector("#markdownPreview");
    }
    
    // First, remove all children from the container
    while (notesContainer.firstChild) {
        notesContainer.removeChild(notesContainer.firstChild);
    }
    
    // Re-append the notesList (sidebar)
    notesContainer.appendChild(notesList);
    
    // Create notes content area
    const notesContent = document.createElement('div');
    notesContent.className = 'notes-content edit-mode';
    
    // Create title container
    const titleContainer = document.createElement('div');
    titleContainer.className = 'note-title-container';
    
    // Create editable title field
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'note-title';
    titleInput.placeholder = 'Note title...';
    
    // Set the title value based on current note
    if (notes[config.noteId]) {
        titleInput.value = notes[config.noteId].name || '';
    }
    
    titleInput.addEventListener('input', function(e) {
        // Update the note title
        if (notes[config.noteId]) {
            notes[config.noteId].name = e.target.value;
            storage('update-notes');
            
            // Also update the title in the sidebar
            const sidebarItem = document.querySelector(`.note-item[data-note-id="${config.noteId}"] span`);
            if (sidebarItem) {
                sidebarItem.textContent = e.target.value || 'Untitled';
            }
        }
    });
    
    titleContainer.appendChild(titleInput);
    
    // Create storage type toggle
    const storageToggleContainer = document.createElement('div');
    storageToggleContainer.className = 'storage-toggle-container';
    
    const storageToggle = document.createElement('label');
    storageToggle.className = 'storage-toggle';
    
    const toggleCheckbox = document.createElement('input');
    toggleCheckbox.type = 'checkbox';
    toggleCheckbox.className = 'storage-toggle-checkbox';
    
    const toggleSlider = document.createElement('span');
    toggleSlider.className = 'storage-toggle-slider';
    
    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'storage-toggle-label';
    toggleLabel.textContent = 'Sync';
    
    storageToggle.appendChild(toggleCheckbox);
    storageToggle.appendChild(toggleSlider);
    storageToggleContainer.appendChild(storageToggle);
    storageToggleContainer.appendChild(toggleLabel);
    
    titleContainer.appendChild(storageToggleContainer);
    
    // Add event listener for toggle
    toggleCheckbox.addEventListener('change', function(e) {
        handleStorageTypeToggle(e.target.checked);
    });
    
    notesContent.appendChild(titleContainer);
    
    // Create a container for the editor/preview area
    const notesEditArea = document.createElement('div');
    notesEditArea.className = 'notes-edit-area';
    
    // Create a new textarea if needed
    if (!userNotes) {
        userNotes = document.createElement('textarea');
        userNotes.id = 'userNotes';
        userNotes.placeholder = 'Write Markdown here. When you pause, it will show the formatted preview.';
        userNotes.setAttribute('spellcheck', 'false');
        
        // Add event listeners to the new textarea
        userNotes.addEventListener('input', () => {
            save_notes();
            renderMarkdownPreview(userNotes, markdownPreview);
            clearTimeout(typingTimer);
            toggleNotesView('edit', userNotes, markdownPreview);
        });
        
        userNotes.addEventListener('keyup', (event) => {
            // Skip preview mode transition for navigation keys
            const navigationKeys = [
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
                'Home', 'End', 'PageUp', 'PageDown',
                'Shift', 'Control', 'Alt', 'Meta',
                'Tab', 'CapsLock', 'Escape'
            ];
            
            if (navigationKeys.includes(event.key)) {
                // Don't trigger preview mode for navigation keys
                clearTimeout(typingTimer);
                return;
            }
            
            clearTimeout(typingTimer);
            if (userNotes.value.trim() !== '') {
                typingTimer = setTimeout(() => {
                    // Always switch to preview after inactivity timeout
                    toggleNotesView('preview', userNotes, markdownPreview);
                }, 1500);
            }
        });
        
        userNotes.addEventListener('focus', () => {
            clearTimeout(typingTimer);
            toggleNotesView('edit', userNotes, markdownPreview);
        });
        
        userNotes.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            // Only switch to preview mode if there's content
            if (userNotes.value.trim() !== '') {
                typingTimer = setTimeout(() => {
                    toggleNotesView('preview', userNotes, markdownPreview);
                }, 300); // 0.3 second delay on blur (reduced for responsiveness)
            }
        });
        
        // Add keyboard shortcuts
        userNotes.addEventListener('keydown', (event) => {
            // Handle Tab key to insert tab character instead of changing focus
            if (event.key === 'Tab') {
                event.preventDefault();
                
                // Use the handleTabKey utility function
                handleTabKey(userNotes);
                
                // Save the notes after inserting tab
                save_notes();
                return;
            }
            
            if (!(event.ctrlKey || event.metaKey)) return;
            
            let handled = true;
            const textarea = userNotes;
            
            switch(event.key) {
                case 'b': wrapTextAtSelection(textarea, '**', '**'); break;
                case 'i': wrapTextAtSelection(textarea, '*', '*'); break;
                case 'k': insertLinkAtSelection(textarea); break;
                case '1': prefixLineAtSelection(textarea, '# '); break;
                case '2': prefixLineAtSelection(textarea, '## '); break;
                case '3': prefixLineAtSelection(textarea, '### '); break;
                case 'l': prefixLineAtSelection(textarea, '- '); break;
                case 'e': wrapTextAtSelection(textarea, '`', '`'); break;
                case 'd': insertCodeBlockAtSelection(textarea); break;
                default: handled = false;
            }
            
            if (handled) {
                event.preventDefault();
                save_notes();
                renderMarkdownPreview(userNotes, markdownPreview);
            }
        });
    }
    
    // Create storage indicator container
    const storageIndicator = document.createElement('div');
    storageIndicator.className = 'storage-indicator';
    storageIndicator.setAttribute('data-tooltip', 'Storage for synced notes is limited to 8KB by the browser.');
    
    // Create the circle indicator
    const storageCircle = document.createElement('div');
    storageCircle.className = 'storage-circle';
    storageIndicator.appendChild(storageCircle);
    
    // Create the text display
    const storageText = document.createElement('div');
    storageText.className = 'storage-text';
    storageIndicator.appendChild(storageText);
    
    // Create copy button for notes
    const copyButton = document.createElement('button');
    copyButton.className = 'copy-note-btn';
    copyButton.title = 'Copy note to clipboard';
    copyButton.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>`;
    
    copyButton.addEventListener('click', function() {
        copyNoteToClipboard();
    });
    
    // Set up the textarea
    notesEditArea.appendChild(userNotes);
    
    // Create shortcut help icon
    const shortcutsContainer = document.createElement('div');
    shortcutsContainer.className = 'shortcuts-container';
    
    const shortcutsIcon = document.createElement('div');
    shortcutsIcon.className = 'shortcuts-icon';
    shortcutsIcon.title = 'View keyboard shortcuts';
    shortcutsIcon.innerHTML = 'Shortcuts';
    
    // Create the shortcuts panel
    const shortcutsPanel = document.createElement('div');
    shortcutsPanel.className = 'shortcuts-panel';
    shortcutsPanel.innerHTML = `
        <div><kbd>Cmd+B</kbd> Bold</div>
        <div><kbd>Cmd+I</kbd> Italic</div>
        <div><kbd>Cmd+K</kbd> Link</div>
        <div><kbd>Cmd+1</kbd> H1</div>
        <div><kbd>Cmd+2</kbd> H2</div>
        <div><kbd>Cmd+3</kbd> H3</div>
        <div><kbd>Cmd+L</kbd> List</div>
        <div><kbd>Cmd+E</kbd> Code</div>
        <div><kbd>Cmd+D</kbd> Block</div>
        <div class="mac-note" colspan="2">Windows: use Ctrl instead of Cmd</div>
    `;
    
    shortcutsContainer.appendChild(shortcutsIcon);
    shortcutsContainer.appendChild(shortcutsPanel);
    
    // Add all buttons to the notes edit area
    notesEditArea.appendChild(shortcutsContainer);
    notesEditArea.appendChild(storageIndicator);
    notesEditArea.appendChild(copyButton);
    
    // Set up the preview element
    if (!markdownPreview) {
        markdownPreview = document.createElement('div');
        markdownPreview.id = 'markdownPreview';
        markdownPreview.className = 'markdown-preview';
        
        // Add click event to switch back to edit mode
        markdownPreview.addEventListener('click', () => {
            toggleNotesView('edit', userNotes, markdownPreview);
            userNotes.focus();
        });
    }
    
    markdownPreview.style.display = 'none';
    notesEditArea.appendChild(markdownPreview);
    
    // Add the "Click to edit" button
    const editButton = document.createElement('div');
    editButton.className = 'edit-button';
    editButton.textContent = 'Click to edit';
    notesEditArea.appendChild(editButton);
    
    notesContent.appendChild(notesEditArea);
    
    // Create the actions container
    const noteActionsContainer = document.createElement('div');
    noteActionsContainer.className = 'note-actions';
    notesContent.appendChild(noteActionsContainer);
    
    // Append content area to container
    notesContainer.appendChild(notesContent);
    
    // Initialize with current note data if available
    if (notes[config.noteId]) {
        renderNotes(notes[config.noteId]);
    }
}

// Sidebar resize functionality
let isResizingSidebar = false;
let sidebarStartX = 0;
let sidebarStartWidth = 0;

/**
 * Initialize sidebar resizing
 */
function initSidebarResize(e) {
    isResizingSidebar = true;
    const notesList = document.querySelector('#notesList');
    sidebarStartX = e.clientX;
    sidebarStartWidth = parseInt(document.defaultView.getComputedStyle(notesList).width, 10);
    
    document.addEventListener('mousemove', doSidebarResize);
    document.addEventListener('mouseup', stopSidebarResize);
    e.preventDefault();
}

/**
 * Perform sidebar resizing
 */
function doSidebarResize(e) {
    if (!isResizingSidebar) return;
    
    const notesList = document.querySelector('#notesList');
    const deltaX = e.clientX - sidebarStartX;
    const newWidth = sidebarStartWidth + deltaX;
    
    // Set min and max widths
    const minWidth = 80;
    const maxWidth = 300;
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
        notesList.style.width = newWidth + 'px';
    }
}

/**
 * Stop sidebar resizing and save to localStorage
 */
function stopSidebarResize(e) {
    if (!isResizingSidebar) return;
    
    isResizingSidebar = false;
    document.removeEventListener('mousemove', doSidebarResize);
    document.removeEventListener('mouseup', stopSidebarResize);
    
    // Save the width to localStorage
    const notesList = document.querySelector('#notesList');
    const width = parseInt(document.defaultView.getComputedStyle(notesList).width, 10);
    localStorage.setItem('dash-sidebar-width', width);
}

function createNoteActions() {
    // Get the actions container
    let noteActionsContainer = document.querySelector('.note-actions');
    
    // If not found, the structure might not be initialized yet
    if (!noteActionsContainer) {
        initNotesContent();
        noteActionsContainer = document.querySelector('.note-actions');
        
        // If still not found, we're not in notes mode
        if (!noteActionsContainer) {
            return;
        }
    }
    
    // Clear existing actions
    noteActionsContainer.innerHTML = '';
    
    // Only show delete button if there's more than one note
    if (Object.keys(notes).length > 1) {
        // Create delete button with SVG icon
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-current-note';
        deleteButton.title = 'Delete note';
        deleteButton.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>`;
        
        deleteButton.addEventListener('click', function() {
            deleteNote(config.noteId);
        });
        
        noteActionsContainer.appendChild(deleteButton);
    }
}

function addNewNote() {
    // Find the next available ID
    const ids = Object.keys(notes).map(Number);
    const newId = ids.length > 0 ? Math.max(...ids) + 1 : 0;
    
    // Find the highest order value
    const maxOrder = Math.max(...ids.map(id => notes[id].order || 0), 0);
    
    // Create a new note with a higher order value (to place it at the top)
    notes[newId] = {
        name: `Note ${newId + 1}`,
        value: '',
        order: maxOrder + 1,
        storageType: 'sync' // Default to sync storage
    };
    
    // Switch to the new note
    config.noteId = newId;
    
    // Update storage
    storage('update-notes');
    storage('update-notes-list');
    storage('update-config', config);
    
    // Refresh the dropdown
    loadNotesDropdown();
    applyActiveNote();
    
    // Focus on the note title to allow immediate renaming
    setTimeout(() => {
        const titleInput = document.querySelector('.note-title');
        if (titleInput) {
            titleInput.focus();
            titleInput.select();
        }
    }, 100);
}

function renderNotes(data) {
    // Make sure we have valid data and the textarea element exists
    if (!data || !userNotes) {
        console.error('Cannot render notes: invalid data or missing element');
        return;
    }
    
    userNotes.value = data.value || '';
    renderMarkdownPreview(userNotes, markdownPreview);
}

/**
 * Handles note search functionality
 * @param {string} searchTerm - The search term to filter notes
 */
function handleNotesSearch(searchTerm) {
    const resultsMessage = document.querySelector('#search-results-message');
    searchTerm = searchTerm.toLowerCase().trim();
    
    // Store current search term for highlighting
    currentSearchTerm = searchTerm;
    
    // If search is empty, show all notes
    if (!searchTerm) {
        searchResults = [];
        if (resultsMessage) resultsMessage.textContent = '';
        loadNotesDropdown();
        removeSearchHighlights();
        return;
    }
    
    // Search through all notes
    searchResults = [];
    Object.keys(notes).forEach(noteId => {
        const note = notes[noteId];
        const nameMatch = note.name && note.name.toLowerCase().includes(searchTerm);
        const valueMatch = note.value && note.value.toLowerCase().includes(searchTerm);
        
        if (nameMatch || valueMatch) {
            searchResults.push({
                id: parseInt(noteId),
                name: note.name,
                order: note.order || 0
            });
        }
    });
    
    // Sort search results by order (same as normal display)
    searchResults.sort((a, b) => b.order - a.order);
    
    // Update results message
    if (resultsMessage) {
        if (searchResults.length === 0) {
            resultsMessage.textContent = 'No results';
        } else {
            resultsMessage.textContent = `Found ${searchResults.length} result${searchResults.length > 1 ? 's' : ''}`;
        }
    }
    
    // If no results found, clear highlights and return
    if (searchResults.length === 0) {
        removeSearchHighlights();
        filterNotesDropdown(searchResults);
        return;
    }
    
    // Filter the notes dropdown to show only matching notes
    filterNotesDropdown(searchResults);
    
    // If there are results, switch to the first matching note
    if (config.noteId !== searchResults[0].id) {
        config.noteId = searchResults[0].id;
        applyActiveNote();
        storage('update-config', config);
    }
    
    // Highlight search term in the current note
    // Use setTimeout to ensure the note has been rendered
    setTimeout(() => highlightSearchTerm(searchTerm), 50);
}

/**
 * Filters the notes dropdown to show only search results
 * @param {Array} results - Array of search result objects
 */
function filterNotesDropdown(results) {
    const noteItems = document.querySelectorAll('.note-item');
    
    if (results.length === 0) {
        // Hide all notes if no results
        noteItems.forEach(item => {
            item.style.display = 'none';
        });
        return;
    }
    
    const resultIds = results.map(r => r.id);
    
    noteItems.forEach(item => {
        const noteId = parseInt(item.getAttribute('data-note-id'));
        if (resultIds.includes(noteId)) {
            item.style.display = ''; // Show matching notes
        } else {
            item.style.display = 'none'; // Hide non-matching notes
        }
    });
}

/**
 * Highlights search term in the markdown preview
 * @param {string} searchTerm - The term to highlight
 */
function highlightSearchTerm(searchTerm) {
    if (!searchTerm || !markdownPreview) return;
    
    const preview = markdownPreview;
    const content = preview.innerHTML;
    
    // Remove any existing highlights first
    removeSearchHighlights();
    
    // Create a case-insensitive regex
    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
    
    // Replace matches with highlighted version
    const highlighted = content.replace(regex, '<mark class="search-highlight">$1</mark>');
    
    preview.innerHTML = highlighted;
}

/**
 * Removes search highlights from the preview
 */
function removeSearchHighlights() {
    if (!markdownPreview) return;
    
    const marks = markdownPreview.querySelectorAll('.search-highlight');
    marks.forEach(mark => {
        const parent = mark.parentNode;
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize(); // Merge adjacent text nodes
    });
}

/**
 * Escapes special regex characters in a string
 * @param {string} string - The string to escape
 * @returns {string} - The escaped string
 */
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Updates the storage indicator for the current note
 */
function updateStorageIndicator() {
    const storageCircle = document.querySelector('.storage-circle');
    const storageText = document.querySelector('.storage-text');
    const storageIndicator = document.querySelector('.storage-indicator');
    
    if (!storageCircle || !storageText || !storageIndicator || !notes[config.noteId]) {
        return;
    }
    
    // Calculate the size of the current note in bytes
    const noteData = JSON.stringify(notes[config.noteId]);
    const noteSize = new Blob([noteData]).size;
    
    // Get the correct limit based on storage type
    const storageType = notes[config.noteId].storageType || 'sync';
    const SYNC_LIMIT = 8192; // 8KB
    const LOCAL_LIMIT = 5242880; // 5MB
    const QUOTA_BYTES_PER_ITEM = storageType === 'sync' ? SYNC_LIMIT : LOCAL_LIMIT;
    
    const percentage = (noteSize / QUOTA_BYTES_PER_ITEM) * 100;
    
    // Update the circle fill based on percentage
    storageCircle.style.setProperty('--fill-percentage', `${Math.min(percentage, 100)}%`);
    
    // Change color based on usage
    if (percentage < 50) {
        storageCircle.style.setProperty('--fill-color', 'rgba(0, 255, 0, 0.6)');
    } else if (percentage < 75) {
        storageCircle.style.setProperty('--fill-color', 'rgba(255, 255, 0, 0.6)');
    } else if (percentage < 90) {
        storageCircle.style.setProperty('--fill-color', 'rgba(255, 165, 0, 0.6)');
    } else {
        storageCircle.style.setProperty('--fill-color', 'rgba(255, 0, 0, 0.6)');
    }
    
    // Update the text display
    const sizeKB = (noteSize / 1024).toFixed(1);
    const maxKB = (QUOTA_BYTES_PER_ITEM / 1024).toFixed(storageType === 'sync' ? 1 : 0);
    storageText.textContent = `${sizeKB}/${maxKB}kb`;
    
    // Update tooltip based on storage type
    if (storageType === 'sync') {
        storageIndicator.setAttribute('data-tooltip', 'Sync storage is limited to 8KB per note by Chrome.');
    } else {
        storageIndicator.setAttribute('data-tooltip', 'Local storage is limited to 5MB per note by Chrome.');
    }
}

/**
 * Updates the storage toggle UI based on current note's storage type
 */
function updateStorageToggle() {
    const toggleCheckbox = document.querySelector('.storage-toggle-checkbox');
    const toggleLabel = document.querySelector('.storage-toggle-label');
    
    if (!toggleCheckbox || !toggleLabel || !notes[config.noteId]) return;
    
    // Ensure storageType exists (for backward compatibility)
    if (!notes[config.noteId].storageType) {
        notes[config.noteId].storageType = 'sync';
    }
    
    const isSync = notes[config.noteId].storageType === 'sync';
    toggleCheckbox.checked = isSync;
    toggleLabel.textContent = isSync ? 'Sync' : 'Local';
}

/**
 * Handles toggling between sync and local storage for a note
 * @param {boolean} isSync - true if switching to sync, false for local
 */
async function handleStorageTypeToggle(isSync) {
    const newStorageType = isSync ? 'sync' : 'local';
    const oldStorageType = notes[config.noteId].storageType || 'sync';
    
    // If it's already the same type, do nothing
    if (newStorageType === oldStorageType) return;
    
    // Calculate note size
    const noteData = JSON.stringify(notes[config.noteId]);
    const noteSize = new Blob([noteData]).size;
    
    // Check size limits
    const SYNC_LIMIT = 8192; // 8KB for sync storage
    const LOCAL_LIMIT = 5242880; // 5MB for local storage (chrome.storage.local has 5MB limit)
    
    const targetLimit = newStorageType === 'sync' ? SYNC_LIMIT : LOCAL_LIMIT;
    
    if (noteSize > targetLimit) {
        const limitKB = (targetLimit / 1024).toFixed(1);
        const currentKB = (noteSize / 1024).toFixed(1);
        showToast(`Note too large (${currentKB}kb) for ${newStorageType} storage (limit: ${limitKB}kb)`, 'error');
        
        // Reset the toggle to previous state
        const toggleCheckbox = document.querySelector('.storage-toggle-checkbox');
        if (toggleCheckbox) {
            toggleCheckbox.checked = oldStorageType === 'sync';
        }
        return;
    }
    
    try {
        // Remove from old storage
        if (oldStorageType === 'sync') {
            await new Promise((resolve) => {
                chrome.storage.sync.remove([`dash-notes-${config.noteId}`], resolve);
            });
        } else {
            await new Promise((resolve) => {
                chrome.storage.local.remove([`dash-notes-${config.noteId}`], resolve);
            });
        }
        
        // Update storage type
        notes[config.noteId].storageType = newStorageType;
        
        // Save to new storage
        storage('update-notes');
        
        // Update UI
        updateStorageToggle();
        updateStorageIndicator();
        
        showToast(`Note moved to ${newStorageType} storage`, 'success');
    } catch (error) {
        showToast(`Error switching storage: ${error.message}`, 'error');
        
        // Reset the toggle to previous state
        const toggleCheckbox = document.querySelector('.storage-toggle-checkbox');
        if (toggleCheckbox) {
            toggleCheckbox.checked = oldStorageType === 'sync';
        }
    }
}

/**
 * Shows a toast notification
 * @param {string} message - The message to display
 * @param {string} type - The type of toast: 'success', 'error', or 'info'
 * @param {number} duration - How long to show the toast in ms (default: 3000)
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.querySelector('#toast-container');
    if (!toastContainer) return;
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Remove toast after duration
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Wait for fade out animation
    }, duration);
}

/**
 * Copies the current note content to clipboard
 */
function copyNoteToClipboard() {
    if (!userNotes || !notes[config.noteId]) {
        console.error('Cannot copy: notes not available');
        return;
    }
    
    const noteContent = notes[config.noteId].value;
    
    // Use the Clipboard API to copy the text
    navigator.clipboard.writeText(noteContent).then(() => {
        // Visual feedback - show toast notification
        const copyButton = document.querySelector('.copy-note-btn');
        if (copyButton) {
            // Add a brief animation effect
            copyButton.animate(
                [
                    { transform: 'scale(1)' },
                    { transform: 'scale(1.2)' },
                    { transform: 'scale(1)' }
                ], 
                { 
                    duration: 300,
                    easing: 'ease-out' 
                }
            );
        }
        
        // Show success toast
        showToast('Note copied to clipboard!', 'success', 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy note', 'error');
    });
}
