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
    },
    1: {
        name: 'note 2',
        value: ''
    },
    2: {
        name: 'note 3',
        value: ''
    },
    3: {
        name: 'note 4',
        value: ''
    },
    4: {
        name: 'note 5',
        value: ''
    },
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

window.onload = init()

function init() {
    reset()
    // chrome.storage.sync.clear()
    load_data()
    add_eventlisteners()
}

function reset() {
    tasksContainer.style.display = 'none';
    notesContainer.style.display = 'none';
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
    const val = input.value
    if (!val) val = ''
    notes[config.noteId].value = val
    storage('update-notes')
}


function storage(action, data) {
    switch (action) {
        case 'read': {
            //read config, tasks, notes
            chrome.storage.sync.get(['dash-config'], function (data) {
                if (!data || Object.keys(data).length === 0);
                else config = data['dash-config']
                applyConfig()
            })

            chrome.storage.sync.get(['dash-tasks'], function (data) {
                if (!data || Object.keys(data).length === 0);
                else {
                    tasks = data['dash-tasks']
                }
                renderTasks()
            })

            for(let i=0; i<5; i++) {
                chrome.storage.sync.get([`dash-notes-${i}`], function (data) {
                    if (!data || Object.keys(data).length === 0) {
                        notes[i] = defaultNotes[i]
                    }
                    else {
                        notes[i] = data[`dash-notes-${i}`]
                    }
                    if(i === 4) {
                        loadnotesList()
                        applyActiveNote()
                    }
                })
            }
            break
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
    }
}

function applyConfig() {
    applyTheme(config.theme)
    applyMode(config.mode)
}

function applyMode(mode) {
    reset()
    if (mode === 'tasks') {
        tasksContainer.style.display = 'block'
        userInput.focus()
        modeToggle.innerText = 'Switch to notes'
        document.body.style.width = '400px'
    }
    else if (mode === 'notes') {
        notesContainer.style.display = 'block'
        userNotes.focus()
        modeToggle.innerText = 'Switch to tasks'
        document.body.style.width = '700px'
    }
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`
    const themeButtons = document.querySelectorAll('.theme-btn')
    themeButtons.forEach(i => i.classList.remove('active'))
    document.querySelector(`#${theme}`).classList.add('active')
}

function applyActiveNote() {
    for(let i=0; i<5; i++) {
        const note = document.querySelector(`#note-${i}`)
        if(!note) break
        if (i!==config.noteId) note.classList.remove('active')
        else note.classList.add('active')
    }
    renderNotes(notes[config.noteId])
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

function loadnotesList() {
    for(let i=0; i<5; i++) {
        const note = Object.values(notes)[i]
        const nameContainer = document.createElement('div')
        nameContainer.className = 'nameContainer'
        nameContainer.id = `note-${i}`
        nameContainer.addEventListener('click', function() {
            config.noteId = i
            applyActiveNote()
            storage('update-config', config)
        })
        const nameInput = document.createElement('input')
        nameInput.setAttribute('type', 'text')
        nameInput.addEventListener('input', function(e) {
            notes[config.noteId].name = e.target.value
            storage('update-notes')
        })
        nameInput.className = 'nameInput'
        nameInput.value = note.name
        nameContainer.appendChild(nameInput)
        notesList.appendChild(nameContainer)
    }
}

function renderNotes(data) {
    userNotes.value = data.value
}
