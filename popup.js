let tasks = [], config = {theme: 'blues'}
let userInput = document.querySelector("#userInput")
let themeButtons = document.querySelectorAll('.theme-btn')
const resultContainer = document.querySelector("#result")
const errorContainer = document.querySelector("#error")

window.onload = load_data()

userInput.addEventListener('keypress', (event) => {
    if (event.key === "Enter") {
        add_task()
    }
})
themeButtons.forEach(btn => {
    btn.addEventListener('click', (event) => {
        const config = {theme: event.target.id}
        applyConfig(config)
        storage('update', {config: config, tasks: tasks})
    })
})

function load_data() {
    storage('read')
}

function add_task() {
    const input = document.querySelector('#userInput')
    const val = input.value
    if(!val) val = ''
    const task = {
        val: val,
        id: tasks.length===0 ? 0 : tasks[tasks.length-1]['id']+1
    }
    tasks.push(task)
    storage('update', {config: config, tasks: tasks})
    input.value = ''
    renderTask(task, 'new')
}

function edit_task(id, value) {
    for(let task of tasks) {
        if(task.id===id) task.val = value
    }
    storage('update', {config: config, tasks: tasks})
}

function delete_task(id) {
    tasks = tasks.filter(i => i.id!==id)
    storage('update', {config: config, tasks: tasks})
    const target = document.querySelector(`#task-${id}`)
    target.classList.add('deleted')
    setTimeout(()=>target.remove(), 500)
}



function storage(action, data) {
    switch(action) {
        case 'read': {
            chrome.storage.sync.get(['dash-todo'], function(data) {
                if(!data || Object.keys(data).length===0) data = {
                    tasks: tasks, config: config
                }
                else {
                    data = data['dash-todo']
                }
                after_load(data)
            })
            break
        }
        case 'update': {
            chrome.storage.sync.set({'dash-todo': data}, function() {
                console.log('Value is set to ' + data)
            })
            break
        }
    }
}

function after_load(data) {
    tasks = data['tasks']
    config = data['config']
    renderTasks(tasks)
    applyConfig(config)
}

function applyConfig(config) {
    applyTheme(config.theme)
}

function applyTheme(theme) {
    document.body.className = `theme-${theme}`
    const themeButtons = document.querySelectorAll('.theme-btn')
    themeButtons.forEach(i => i.classList.remove('active'))
    document.querySelector(`#${theme}`).classList.add('active')
}

function renderTasks(tasks) {
    for(let task of tasks)
        renderTask(task)
}

function renderTask(task, flag) {
    const el = document.createElement('div')
    el.id = `task-${task.id}`
    el.className = 'taskItem'
    if(flag) {
        el.classList.add('new')
        setTimeout(()=>el.classList.remove('new'), 100)
    }
    const marker = document.createElement('div')
    marker.className = 'taskMarker'
    marker.innerHTML = `<svg height="8" width="8">
    <circle cx="4" cy="4" r="3" stroke-width="2" fill="transparent" />
  </svg>`
    marker.addEventListener('click', () => delete_task(task.id))
    el.appendChild(marker)
    const title = document.createElement('input')
    title.value = task.val
    title.setAttribute('placeholder', '...')
    title.addEventListener('change', (e) => edit_task(task.id, event.target.value))
    el.appendChild(title)
    const del = document.createElement('div')
    del.innerHTML = 'x'
    del.className = "deleteTask"
    del.addEventListener('click', () => delete_task(task.id))
    el.appendChild(del)

    const container  = document.querySelector('#tasks')
    container.appendChild(el)
}
