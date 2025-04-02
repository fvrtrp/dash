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
let notesList = document.querySelector('#notesList')
const tasksContainer = document.querySelector('#tasksContainer')
const notesContainer = document.querySelector('#notesContainer')
let themeButtons = document.querySelectorAll('.theme-btn')
const modeToggle = document.querySelector('#mode-toggle')
const resultContainer = document.querySelector("#result")
const errorContainer = document.querySelector("#error")

window.addEventListener('DOMContentLoaded', function() {
    init();
});

function init() {
    // Reset UI state first
    reset()
    
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
    // Remove inline styles and use classes instead
    tasksContainer.classList.remove('active');
    notesContainer.classList.remove('active');
    
    // Set default width 
    document.body.style.width = '400px';
    
    // Apply default theme in case config isn't loaded yet
    document.body.className = `theme-${config.theme}`;
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
    userNotes.addEventListener('input', () => {
        save_notes()
    })
    themeButtons.forEach(btn => {
        btn.addEventListener('click', (event) => {
            config = Object.assign(config, {theme: event.target.id })
            applyConfig()
            storage('update-config', config)
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
    const task = {
        val: val,
        id: tasks.length === 0 ? 0 : tasks[tasks.length - 1]['id'] + 1
    }
    tasks.push(task)
    storage('update-tasks', tasks)
    input.value = ''
    renderTask(task, 'new')
}

function edit_task(id, value) {
    for (let task of tasks) {
        if (task.id === id) task.val = value
    }
    storage('update-tasks', tasks)
}

function delete_task(id) {
    tasks = tasks.filter(i => i.id !== id)
    storage('update-tasks', tasks)
    const target = document.querySelector(`#task-${id}`)
    target.classList.add('deleted')
    setTimeout(() => target.remove(), 500)
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
                    
                    // Finally load notes after tasks
                    chrome.storage.sync.get(['dash-notes-list'], function (data) {
                        let noteIds = [];
                        if (!data || Object.keys(data).length === 0) {
                            noteIds = [0]; // Start with at least one default note
                        } else {
                            noteIds = data['dash-notes-list'];
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
                                } else {
                                    notes[id] = data[`dash-notes-${id}`];
                                }
                                
                                loaded++;
                                if (loaded === noteIds.length) {
                                    // Ensure there's at least one note
                                    if (Object.keys(notes).length === 0) {
                                        notes[0] = defaultNotes[0];
                                        config.noteId = 0;
                                    }
                                    
                                    // Make sure config.noteId points to an existing note
                                    if (!notes[config.noteId]) {
                                        config.noteId = parseInt(Object.keys(notes)[0]);
                                    }
                                    
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
            chrome.storage.sync.set({ 'dash-notes-list': Object.keys(notes).map(Number) }, function () {
                // console.log('Notes list updated')
            })
            break
        }
    }
}

function applyConfig() {
    applyTheme(config.theme)
    applyMode(config.mode)
    
    // Ensure note actions are recreated if in notes mode
    if (config.mode === 'notes') {
        setTimeout(() => createNoteActions(), 0);
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
        
        // Ensure notes content is initialized
        initNotesContent()
        
        // Make sure notes content is displayed correctly
        if (notes[config.noteId]) {
            renderNotes(notes[config.noteId])
        }
        
        // Update button text
        modeToggle.innerText = 'Switch to tasks'
        
        // Update body properties
        document.body.style.width = '700px'
        document.body.className = `theme-${currentTheme} notes-mode`
        
        // Focus after content is loaded
        userNotes.focus()
    }
}

function applyTheme(theme) {
    // Preserve the notes-mode class if it exists
    const isNotesMode = document.body.classList.contains('notes-mode');
    
    document.body.className = `theme-${theme}${isNotesMode ? ' notes-mode' : ''}`;
    
    const themeButtons = document.querySelectorAll('.theme-btn')
    themeButtons.forEach(i => i.classList.remove('active'))
    document.querySelector(`#${theme}`).classList.add('active')
    
    // If in notes mode, recreate note actions to ensure the delete button is visible
    if (isNotesMode) {
        createNoteActions();
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
}

function renderTasks() {
    for (let task of tasks)
        renderTask(task)
}

function renderTask(task, flag) {
    const el = document.createElement('div')
    el.id = `task-${task.id}`
    el.className = 'taskItem'
    if (flag) {
        el.classList.add('new')
        setTimeout(() => el.classList.remove('new'), 100)
    }
    const marker = document.createElement('div')
    marker.className = 'taskMarker'
    // marker.addEventListener('click', () => delete_task(task.id))
    el.appendChild(marker)
    const title = document.createElement('input')
    title.value = task.val
    title.setAttribute('placeholder', '...')
    title.addEventListener('change', (e) => edit_task(task.id, event.target.value))
    el.appendChild(title)
    const del = document.createElement('div')
    del.innerHTML = 'x'
    del.className = "deleteTask"
    del.setAttribute('title', 'Delete')
    del.addEventListener('click', () => delete_task(task.id))
    el.appendChild(del)

    const container = document.querySelector('#tasks')
    container.appendChild(el)
}

function deleteNote(id) {
    // Don't allow deleting the last note
    if (Object.keys(notes).length <= 1) {
        return;
    }
    
    // Delete the note
    delete notes[id];
    
    // If we deleted the active note, switch to another one
    if (id === config.noteId) {
        config.noteId = parseInt(Object.keys(notes)[0]);
        storage('update-config', config);
    }
    
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
    
    // Add options for each note
    const sortedNoteIds = Object.keys(notes).map(Number).sort((a, b) => a - b);
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
        
        noteItem.appendChild(noteName);
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

// Initialize notes content wrapper when loading notes
function initNotesContent() {
    // Make sure all elements are available
    if (!notesContainer || !notesList || !userNotes) {
        notesList = document.querySelector('#notesList');
        userNotes = document.querySelector('#userNotes');
    }
    
    // First, remove all children from the container
    while (notesContainer.firstChild) {
        notesContainer.removeChild(notesContainer.firstChild);
    }
    
    // Re-append the notesList (sidebar)
    notesContainer.appendChild(notesList);
    
    // Create notes content area
    const notesContent = document.createElement('div');
    notesContent.className = 'notes-content';
    
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
    notesContent.appendChild(titleContainer);
    
    // Append textarea to content area
    notesContent.appendChild(userNotes);
    
    // Create the actions container
    const noteActionsContainer = document.createElement('div');
    noteActionsContainer.className = 'note-actions';
    notesContent.appendChild(noteActionsContainer);
    
    // Append content area to container
    notesContainer.appendChild(notesContent);
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
    
    // Create a new note
    notes[newId] = {
        name: `Note ${newId + 1}`,
        value: ''
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
}

function renderNotes(data) {
    userNotes.value = data.value;
}
