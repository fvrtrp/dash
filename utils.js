// Text manipulation utilities

/**
 * Wraps selected text with prefix and suffix
 * Supports undo with Cmd+Z
 */
function wrapTextAtSelection(textarea, prefix, suffix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const replacement = prefix + selectedText + suffix;
    
    // Use execCommand to make changes undoable
    textarea.focus();
    
    // Save the selection range
    const savedSelection = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
    };
    
    // Delete the current selection if any
    if (start !== end) {
        document.execCommand('delete');
    }
    
    // Insert the new text with formatting
    document.execCommand('insertText', false, replacement);
    
    // Set the cursor position after the inserted text if no text was selected
    if (selectedText === '') {
        const newPosition = start + prefix.length;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
    }
    
    textarea.focus();
}

/**
 * Adds or removes a prefix at the beginning of the current line
 * Supports undo with Cmd+Z
 */
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
    
    textarea.focus();
    
    if (!hasPrefix) {
        // Save current selection
        const savedSelection = start;
        
        // Set selection to the beginning of the line
        textarea.selectionStart = lineStart;
        textarea.selectionEnd = lineStart;
        
        // Insert the prefix at the beginning of the line using execCommand
        document.execCommand('insertText', false, prefix);
        
        // Restore cursor position after the inserted prefix
        const newPosition = savedSelection + prefix.length;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
    } else {
        // Set selection to include the prefix
        textarea.selectionStart = lineStart;
        textarea.selectionEnd = lineStart + prefix.length;
        
        // Remove the prefix if it's already there
        document.execCommand('delete');
        
        // Restore cursor position
        const newPosition = savedSelection - prefix.length;
        textarea.selectionStart = newPosition;
        textarea.selectionEnd = newPosition;
    }
    
    textarea.focus();
}

/**
 * Inserts a Markdown link at the current cursor position
 * Supports undo with Cmd+Z
 */
function insertLinkAtSelection(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    let linkText = selectedText || 'link text';
    const replacement = `[${linkText}](https://)`;
    
    textarea.focus();
    
    // Delete the current selection if any
    if (start !== end) {
        document.execCommand('delete');
    }
    
    // Insert the link text
    document.execCommand('insertText', false, replacement);
    
    // Set the cursor position to the URL position
    const cursorPos = start + linkText.length + 3;
    textarea.selectionStart = cursorPos;
    textarea.selectionEnd = cursorPos + 8; // Select the "https://" part
    
    textarea.focus();
}

/**
 * Inserts a code block at the current cursor position
 * Supports undo with Cmd+Z
 */
function insertCodeBlockAtSelection(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    
    // Format for code block without language hint
    const replacement = `\`\`\`\n${selectedText}\n\`\`\``;
    
    textarea.focus();
    
    // Delete the current selection if any
    if (start !== end) {
        document.execCommand('delete');
    }
    
    // Insert the code block
    document.execCommand('insertText', false, replacement);
    
    // Position cursor for empty code block
    if (selectedText === '') {
        const cursorPos = start + 4; // After the backticks, at the newline
        textarea.selectionStart = cursorPos;
        textarea.selectionEnd = cursorPos;
    } else {
        // Position cursor after the inserted code block
        textarea.selectionStart = start + replacement.length;
        textarea.selectionEnd = textarea.selectionStart;
    }
    
    textarea.focus();
}

/**
 * Handles tab key press in a textarea
 * Inserts a tab character instead of moving focus
 * @param {HTMLTextAreaElement} textarea - The textarea element
 * @returns {boolean} - Whether the event was handled
 */
function handleTabKey(textarea) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert tab character at cursor position
    textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
    
    // Move cursor after the inserted tab
    textarea.selectionStart = textarea.selectionEnd = start + 1;
    
    return true;
}

// UI helper functions

/**
 * Toggles between edit and preview modes
 */
function toggleNotesView(mode, userNotes, markdownPreview) {
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
        renderMarkdownPreview(userNotes, markdownPreview);
    }
}

/**
 * Renders Markdown preview from the textarea content
 */
function renderMarkdownPreview(userNotes, markdownPreview) {
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

/**
 * Configures options for the marked Markdown parser
 */
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

/**
 * Applies a theme to the body and updates theme button active states
 * @param {string} theme - The theme name
 */
function applyTheme(theme, themeButtons) {
    // Preserve the notes-mode class if it exists
    const isNotesMode = document.body.classList.contains('notes-mode');
    
    document.body.className = `theme-${theme}${isNotesMode ? ' notes-mode' : ''}`;
    
    // Update active state on theme buttons
    if (themeButtons) {
        themeButtons.forEach(i => i.classList.remove('active'));
        const activeButton = document.querySelector(`#${theme}`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
    
    return isNotesMode;
}

/**
 * Resets UI state
 * @param {HTMLElement} tasksContainer - The tasks container element
 * @param {HTMLElement} notesContainer - The notes container element
 * @param {string} theme - The current theme
 */
function resetUI(tasksContainer, notesContainer, theme) {
    // Remove inline styles and use classes instead
    if (tasksContainer) tasksContainer.classList.remove('active');
    if (notesContainer) notesContainer.classList.remove('active');
    
    // Set default width 
    document.body.style.width = '400px';
    
    // Apply default theme in case config isn't loaded yet
    document.body.className = `theme-${theme}`;
}

/**
 * Creates a task element
 * @param {Object} task - The task object with id and val properties
 * @param {string} flag - Optional flag for new task animation
 * @param {Function} editCallback - Callback function for task editing
 * @param {Function} deleteCallback - Callback function for task deletion
 * @returns {HTMLElement} - The created task element
 */
function createTaskElement(task, flag, editCallback, deleteCallback) {
    const el = document.createElement('div');
    el.id = `task-${task.id}`;
    el.className = 'taskItem';
    
    if (flag) {
        el.classList.add('new');
        setTimeout(() => el.classList.remove('new'), 100);
    }
    
    // Create marker
    const marker = document.createElement('div');
    marker.className = 'taskMarker';
    el.appendChild(marker);
    
    // Create input for task value
    const title = document.createElement('input');
    title.value = task.val;
    title.setAttribute('placeholder', '...');
    
    if (editCallback) {
        title.addEventListener('change', (e) => editCallback(task.id, e.target.value));
    }
    
    el.appendChild(title);
    
    // Create delete button
    const del = document.createElement('div');
    del.innerHTML = 'x';
    del.className = "deleteTask";
    del.setAttribute('title', 'Delete');
    
    if (deleteCallback) {
        del.addEventListener('click', () => deleteCallback(task.id));
    }
    
    el.appendChild(del);
    
    return el;
}

// Export the utility functions
export {
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
}; 