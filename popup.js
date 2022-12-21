let tasks = [], config = {}
let userInput = document.querySelector("#userInput")
const resultContainer = document.querySelector("#result")
const errorContainer = document.querySelector("#error")

window.onload = load_data()

userInput.addEventListener('keypress', (event) => {
    if (event.key === "Enter") {
        add_task()
    }
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
    renderTask(task)
}



function storage(action, data) {
    switch(action) {
        case 'read': {
            chrome.storage.local.get(['dash-todo'], function(data) {
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
            chrome.storage.local.set({'dash-todo': data}, function() {
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
}

function renderTasks(tasks) {
    for(let task of tasks)
        renderTask(task)
}

function renderTask(task) {
    const el = document.createElement('div')
    el.id = `task-${task.id}`
    el.className = 'taskItem'
    const title = document.createElement('div')
    title.innerHTML = task.val
    el.appendChild(title)

    const container  = document.querySelector('#tasks')
    container.appendChild(el)
}
