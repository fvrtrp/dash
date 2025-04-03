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
    
    // Enhanced input handling for userNotes with Markdown formatting shortcuts
    userNotes.addEventListener('input', () => {
        save_notes()
        renderMarkdownPreview()
        
        // Clear any existing timer
        clearTimeout(typingTimer);
        
        // Make sure we're in edit mode during typing
        toggleNotesView('edit');
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
                toggleNotesView('preview');
            }, 3000);
        }
    });
    
    // Add focus/blur events to handle seamless preview
    userNotes.addEventListener('focus', () => {
        clearTimeout(typingTimer);
        toggleNotesView('edit');
    });
    
    userNotes.addEventListener('blur', () => {
        clearTimeout(typingTimer);
        // Only switch to preview mode if there's content
        if (userNotes.value.trim() !== '') {
            typingTimer = setTimeout(() => {
                toggleNotesView('preview');
            }, 300); // 0.3 second delay on blur (reduced for responsiveness)
        }
    });

    // Add keyboard shortcuts for common Markdown formatting
    userNotes.addEventListener('keydown', (event) => {
        // Handle Tab key to insert tab character instead of changing focus
        if (event.key === 'Tab') {
            event.preventDefault();
            const start = userNotes.selectionStart;
            const end = userNotes.selectionEnd;
            
            // Insert tab character at cursor position
            userNotes.value = userNotes.value.substring(0, start) + '\t' + userNotes.value.substring(end);
            
            // Move cursor after the inserted tab
            userNotes.selectionStart = userNotes.selectionEnd = start + 1;
            
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
            case 'o': // Ordered list item
                prefixLineAtSelection(textarea, '1. ');
                break;
            case 'c': // Code inline
                wrapTextAtSelection(textarea, '`', '`');
                break;
            case 'd': // Code block
                insertCodeBlockAtSelection(textarea);
                break;
            case 'e': // Toggle edit/preview mode
                toggleNotesView();
                break;
            default:
                handled = false;
        }
        
        if (handled) {
            event.preventDefault();
            save_notes();
            renderMarkdownPreview();
        }
    });
    
    // Add click event on the preview to easily switch back to editing
    if (markdownPreview) {
        markdownPreview.addEventListener('click', () => {
            toggleNotesView('edit');
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

// Toggle between edit and preview views
function toggleNotesView(mode) {
    if (!userNotes || !markdownPreview) return;
    
    const notesContent = document.querySelector('.notes-content');
    if (!notesContent) return;
    
    // If no mode is specified, toggle the current mode
    if (!mode) {
        mode = notesContent.classList.contains('preview-mode') ? 'edit' : 'preview';
    }
    
    if (mode === 'edit') {
        notesContent.classList.remove('preview-mode');
        notesContent.classList.add('edit-mode');
        userNotes.style.display = 'block';
        markdownPreview.style.display = 'none';
    } else {
        notesContent.classList.remove('edit-mode');
        notesContent.classList.add('preview-mode');
        userNotes.style.display = 'none';
        markdownPreview.style.display = 'block';
        renderMarkdownPreview();
    }
}

// Helper functions for Markdown formatting
function wrapTextAtSelection(textarea, prefix, suffix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    
    // Set the cursor position to after the inserted text
    textarea.selectionStart = start + replacement.length;
    textarea.selectionEnd = textarea.selectionStart;
    textarea.focus();
}

function prefixLineAtSelection(textarea, prefix) {
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find the beginning of the line
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
        lineStart--;
    }
    
    // Check if the line already has the prefix
    const hasPrefix = text.substring(lineStart, lineStart + prefix.length) === prefix;
    
    if (!hasPrefix) {
        // Insert the prefix at the beginning of the line
        textarea.value = text.substring(0, lineStart) + prefix + text.substring(lineStart);
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = textarea.selectionStart;
    } else {
        // Remove the prefix if it's already there
        textarea.value = text.substring(0, lineStart) + text.substring(lineStart + prefix.length);
        textarea.selectionStart = start - prefix.length;
        textarea.selectionEnd = textarea.selectionStart;
    }
    
    textarea.focus();
}

function insertLinkAtSelection(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let linkText = selectedText || 'link text';
    const replacement = `[${linkText}](https://)`;
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    
    // Set the cursor position to the URL position
    const cursorPos = start + linkText.length + 3;
    textarea.selectionStart = cursorPos;
    textarea.selectionEnd = cursorPos + 8; // Select the "https://" part
    textarea.focus();
}

// Insert a code block
function insertCodeBlockAtSelection(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // Format for code block with language hint
    const replacement = `\`\`\`javascript\n${selectedText}\n\`\`\``;
    
    textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
    
    // Position cursor for empty code block
    if (selectedText === '') {
        const cursorPos = start + 13; // After the language hint
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
    } else {
        // Position cursor after the inserted code block
        textarea.selectionStart = start + replacement.length;
        textarea.selectionEnd = textarea.selectionStart;
    }
    
    textarea.focus();
}

// Function to render markdown preview
function renderMarkdownPreview() {
    if (!markdownPreview || !userNotes) return;
    
    const markdown = userNotes.value;
    try {
        // Use marked.js library to convert markdown to HTML
        markdownPreview.innerHTML = marked.parse(markdown);
        
        // If the preview is empty, show a placeholder message
        if (markdown.trim() === '') {
            markdownPreview.innerHTML = '<p class="placeholder">Start typing to create a markdown note...</p>';
        }
    } catch (error) {
        console.error("Error parsing markdown:", error);
        markdownPreview.innerHTML = "<p>Error rendering markdown</p>";
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
            // Sort note IDs in descending order (newest first) before storing
            const noteIds = Object.keys(notes).map(Number).sort((a, b) => b - a);
            chrome.storage.sync.set({ 'dash-notes-list': noteIds }, function () {
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

function applyTheme(theme) {
    // Preserve the notes-mode class if it exists
    const isNotesMode = document.body.classList.contains('notes-mode');
    
    document.body.className = `theme-${theme}${isNotesMode ? ' notes-mode' : ''}`;
    
    const themeButtons = document.querySelectorAll('.theme-btn')
    themeButtons.forEach(i => i.classList.remove('active'))
    document.querySelector(`#${theme}`).classList.add('active')
    
    // If in notes mode, recreate note actions to ensure the delete button is visible
    // and reapply the current note to refresh the content
    if (isNotesMode) {
        createNoteActions();
        applyActiveNote();
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
    renderMarkdownPreview();
    
    // Start in preview mode if there's content, otherwise in edit mode
    if (notes[config.noteId].value.trim() !== '') {
        toggleNotesView('preview');
    } else {
        toggleNotesView('edit');
        userNotes.focus();
    }
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
    
    // If this is a new task (indicated by the flag), insert at the top
    // Otherwise, append to the bottom (for initial loading)
    if (flag === 'new') {
        // Insert at the top - if there are existing tasks, insert before the first child
        if (container.firstChild) {
            container.insertBefore(el, container.firstChild)
        } else {
            container.appendChild(el)
        }
    } else {
        // For initial loading of tasks, append to the bottom
        container.appendChild(el)
    }
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
    
    // Add options for each note - sort in descending order (newest first)
    const sortedNoteIds = Object.keys(notes).map(Number).sort((a, b) => b - a);
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
        <div><kbd>Cmd+O</kbd> Numbers</div>
        <div><kbd>Cmd+C</kbd> Code</div>
        <div><kbd>Cmd+D</kbd> Block</div>
        <div><kbd>Cmd+E</kbd> Preview</div>
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
            renderMarkdownPreview();
            clearTimeout(typingTimer);
            toggleNotesView('edit');
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
                    toggleNotesView('preview');
                }, 1500);
            }
        });
        
        userNotes.addEventListener('focus', () => {
            clearTimeout(typingTimer);
            toggleNotesView('edit');
        });
        
        userNotes.addEventListener('blur', () => {
            clearTimeout(typingTimer);
            // Only switch to preview mode if there's content
            if (userNotes.value.trim() !== '') {
                typingTimer = setTimeout(() => {
                    toggleNotesView('preview');
                }, 300); // 0.3 second delay on blur (reduced for responsiveness)
            }
        });
        
        // Add keyboard shortcuts
        userNotes.addEventListener('keydown', (event) => {
            // Handle Tab key to insert tab character instead of changing focus
            if (event.key === 'Tab') {
                event.preventDefault();
                const start = userNotes.selectionStart;
                const end = userNotes.selectionEnd;
                
                // Insert tab character at cursor position
                userNotes.value = userNotes.value.substring(0, start) + '\t' + userNotes.value.substring(end);
                
                // Move cursor after the inserted tab
                userNotes.selectionStart = userNotes.selectionEnd = start + 1;
                
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
                case 'o': prefixLineAtSelection(textarea, '1. '); break;
                case 'c': wrapTextAtSelection(textarea, '`', '`'); break;
                case 'd': insertCodeBlockAtSelection(textarea); break;
                case 'e': toggleNotesView(); break;
                default: handled = false;
            }
            
            if (handled) {
                event.preventDefault();
                save_notes();
                renderMarkdownPreview();
            }
        });
    }
    
    // Set up the textarea
    notesEditArea.appendChild(userNotes);
    
    // Set up the preview element
    if (!markdownPreview) {
        markdownPreview = document.createElement('div');
        markdownPreview.id = 'markdownPreview';
        markdownPreview.className = 'markdown-preview';
        
        // Add click event to switch back to edit mode
        markdownPreview.addEventListener('click', () => {
            toggleNotesView('edit');
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
    renderMarkdownPreview();
}

// Configure marked options for better code highlighting
function configureMarkedOptions() {
    marked.setOptions({
        gfm: true,
        breaks: true,
        sanitize: false,
        smartLists: true,
        smartypants: true,
        xhtml: false
    });
}
