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
        value: ''
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
const resultContainer = document.querySelector("#result")
const errorContainer = document.querySelector("#error")
let typingTimer; // Timer identifier for delayed preview

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
                            chrome.storage.sync.get([`dash-notes-${id}`], function (data) {
                                if (!data || Object.keys(data).length === 0) {
                                    if (id === 0) {
                                        notes[id] = defaultNotes[0];
                                    } else {
                                        notes[id] = {
                                            name: `Note ${id + 1}`,
                                            value: ''
                                        };
                                    }
                                    // Add the order property
                                    notes[id].order = noteOrders[id];
                                } else {
                                    notes[id] = data[`dash-notes-${id}`];
                                    // If the note doesn't have an order property, add it
                                    if (notes[id].order === undefined) {
                                        notes[id].order = noteOrders[id];
                                        // Save the updated note with order
                                        const currentNoteId = config.noteId;
                                        config.noteId = id;
                                        storage('update-notes');
                                        config.noteId = currentNoteId;
                                    }
                                }
                                
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
                            });
                        });
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
            chrome.storage.sync.set({ [`dash-notes-${config.noteId}`]: notes[config.noteId] }, function () {
                // console.log('Value is set to ' + config.noteId, notes[config.noteId])
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
    
    // Update the note actions
    createNoteActions();
    
    // Render markdown preview and set the correct view mode
    renderMarkdownPreview(userNotes, markdownPreview);
    
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
        if (id === config.noteId) {
            noteItem.classList.add('active');
        }
        
        // Add click handler to select this note
        noteItem.addEventListener('click', function() {
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
        
        // Create note name (non-editable)
        const noteName = document.createElement('span');
        noteName.className = 'note-name';
        noteName.textContent = notes[id].name || 'Untitled';
        
        // Create arrows container
        const arrowsContainer = document.createElement('div');
        arrowsContainer.className = 'note-arrows';
        
        // Create up arrow
        const upArrow = document.createElement('div');
        upArrow.className = 'note-arrow note-arrow-up';
        upArrow.title = 'Move note up';
        upArrow.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 14l5-5 5 5z"/>
        </svg>`;
        
        // Create down arrow
        const downArrow = document.createElement('div');
        downArrow.className = 'note-arrow note-arrow-down';
        downArrow.title = 'Move note down';
        downArrow.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 10l5 5 5-5z"/>
        </svg>`;
        
        // Add event listeners to arrows
        upArrow.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent note selection
            moveNote(id, 'up');
        });
        
        downArrow.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent note selection
            moveNote(id, 'down');
        });
        
        // Add arrows to container
        arrowsContainer.appendChild(upArrow);
        arrowsContainer.appendChild(downArrow);
        
        // Add elements to note item
        noteItem.appendChild(noteName);
        noteItem.appendChild(arrowsContainer);
        notesListItems.appendChild(noteItem);
    });
    
    notesList.appendChild(notesListItems);
    
    // Make sure the note title is updated in the UI (if it exists)
    const titleInput = document.querySelector('.note-title');
    if (titleInput && notes[config.noteId]) {
        titleInput.value = notes[config.noteId].name || '';
    }
    
    // Add the delete button in the note content area
    createNoteActions();
}

/**
 * Reorders notes based on user interaction with up/down arrows
 * @param {number} noteId - The ID of the note to move
 * @param {string} direction - Either 'up' or 'down'
 */
function moveNote(noteId, direction) {
    // Get all note IDs in their current display order
    const noteItems = document.querySelectorAll('.note-item');
    const noteIds = Array.from(noteItems).map(item => parseInt(item.getAttribute('data-note-id')));
    
    // Ensure all notes have order properties based on current position
    // This handles cases where some notes might not have order properties yet
    noteIds.forEach((id, index) => {
        if (notes[id].order === undefined) {
            // Reverse index so highest is at top (0 would be the highest value)
            notes[id].order = noteIds.length - index;
            
            // Save the note with its new order
            const currentNoteId = config.noteId;
            config.noteId = id;
            storage('update-notes');
            config.noteId = currentNoteId;
        }
    });
    
    // Find the current index of the note
    const currentIndex = noteIds.indexOf(noteId);
    
    // Calculate new index based on direction
    let newIndex;
    if (direction === 'up') {
        // Cannot move the first item up further
        if (currentIndex === 0) return;
        newIndex = currentIndex - 1;
    } else { // direction === 'down'
        // Cannot move the last item down further
        if (currentIndex === noteIds.length - 1) return;
        newIndex = currentIndex + 1;
    }
    
    // Get the note we're swapping with
    const otherNoteId = noteIds[newIndex];
    
    // Swap the order values directly
    const tempOrder = notes[noteId].order;
    notes[noteId].order = notes[otherNoteId].order;
    notes[otherNoteId].order = tempOrder;
    
    // Save both updated notes
    const currentNoteId = config.noteId;
    
    // Save the first note
    config.noteId = noteId;
    storage('update-notes');
    
    // Save the second note
    config.noteId = otherNoteId;
    storage('update-notes');
    
    // Restore the active note
    config.noteId = currentNoteId;
    
    // Update the notes list in UI and storage
    storage('update-notes-list');
    loadNotesDropdown();
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

    // Create shortcut help icon in title bar
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
    titleContainer.appendChild(shortcutsContainer);
    
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
    
    // Add the copy button to the notes edit area
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
        order: maxOrder + 1
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
        // Visual feedback - show a temporary tooltip or flash the button
        const copyButton = document.querySelector('.copy-note-btn');
        if (copyButton) {
            // Save the original title
            const originalTitle = copyButton.title;
            
            // Change the title to show feedback
            copyButton.title = 'Copied!';
            
            // Add a visual feedback class
            copyButton.classList.add('copied');
            
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
            
            // Reset after 2 seconds
            setTimeout(() => {
                copyButton.title = originalTitle;
                copyButton.classList.remove('copied');
            }, 2000);
        }
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}
