// Global variables
let yearSelect, calendarDiv, container;
let auth, db;

const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Todo status constants
const TODO_STATUS = {
    PENDING: 'pending',
    IN_PROGRESS: 'in-progress',
    COMPLETED: 'Done',
    FAILED: 'Not Done'
};

// Status colors for light theme
const STATUS_COLORS_LIGHT = {
    [TODO_STATUS.PENDING]: 'rgba(255, 255, 255, 0.9)',
    [TODO_STATUS.IN_PROGRESS]: 'rgba(255, 193, 7, 0.2)',
    [TODO_STATUS.COMPLETED]: 'rgba(76, 175, 80, 0.2)',
    [TODO_STATUS.FAILED]: 'rgba(244, 67, 54, 0.2)'
};

// Status colors for dark theme
const STATUS_COLORS_DARK = {
    [TODO_STATUS.PENDING]: 'rgba(45, 55, 72, 0.9)',
    [TODO_STATUS.IN_PROGRESS]: 'rgba(255, 193, 7, 0.3)',
    [TODO_STATUS.COMPLETED]: 'rgba(76, 175, 80, 0.3)',
    [TODO_STATUS.FAILED]: 'rgba(244, 67, 54, 0.3)'
};

// Status icons
const STATUS_ICONS = {
    [TODO_STATUS.PENDING]: '⏳',
    [TODO_STATUS.IN_PROGRESS]: '🔄',
    [TODO_STATUS.COMPLETED]: '✅',
    [TODO_STATUS.FAILED]: '❌'
};

// Status labels
const STATUS_LABELS = {
    [TODO_STATUS.PENDING]: 'Pending',
    [TODO_STATUS.IN_PROGRESS]: 'In Progress',
    [TODO_STATUS.COMPLETED]: 'Done',
    [TODO_STATUS.FAILED]: 'Not Done'
};

// Notification system
let notificationCheckInterval;
let lastCheckedDate = '';

// Drag and drop variables
let draggedTodo = null;
let dragPreview = null;
let currentYear = new Date().getFullYear();

// Add loading state
function showLoading() {
    if (calendarDiv) {
        calendarDiv.innerHTML = `
            <div class="calendar-loading">
                <div class="loading-spinner"></div>
            </div>
        `;
    }
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getTodos(year, month, day) {
    const key = `todos-${year}-${month}-${day}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
}

function setTodos(year, month, day, todos) {
    const key = `todos-${year}-${month}-${day}`;
    localStorage.setItem(key, JSON.stringify(todos));
}

// Sort todos by start time
function sortTodosByTime(todos) {
    // Handle null/undefined todos
    if (!todos || !Array.isArray(todos)) {
        console.log('sortTodosByTime: Invalid todos array:', todos);
        return [];
    }
    
    return todos.sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
    });
}

// Get all todos for a specific date
async function getAllTodosForDate(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    return await getTodos(year, month, day);
}

// Check if a todo is about to start (within 5 minutes)
function isTodoAboutToStart(todo, currentDate) {
    if (!todo.startTime) return false;
    
    const [hours, minutes] = todo.startTime.split(':').map(Number);
    const todoTime = new Date(currentDate);
    todoTime.setHours(hours, minutes, 0, 0);
    
    const timeDiff = todoTime.getTime() - currentDate.getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    const shouldNotify = timeDiff >= 0 && timeDiff <= fiveMinutes;
    
    // Notification logic handled silently
    
    return shouldNotify;
}

// Show desktop notification
function showTodoNotification(todo, date) {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notifications');
        return;
    }
    
    // Request permission if not granted
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showNotification(todo, date);
            } else {
                console.log('Notification permission denied');
            }
        });
    } else if (Notification.permission === 'granted') {
        showNotification(todo, date);
    } else {
        console.log('Notification permission denied');
    }
}

function showNotification(todo, date) {
    const notification = new Notification('📅 Todo Reminder', {
        body: `${todo.title} starts at ${todo.startTime} (${todo.duration})`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>',
        tag: `todo-${date.getTime()}-${todo.startTime}`,
        requireInteraction: false,
        silent: false,
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📅</text></svg>'
    });
    
    // Auto close after 15 seconds
    setTimeout(() => {
        notification.close();
    }, 15000);
    
    // Handle click
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
    
    // Handle errors
    notification.onerror = (error) => {
        console.error('Notification error:', error);
    };
}

// Check for upcoming todos
async function checkUpcomingTodos() {
    const now = new Date();
    const currentDate = now.toDateString();
    
    try {
        // Check today's todos
        const todayTodos = await getAllTodosForDate(now);
        const sortedTodos = sortTodosByTime(todayTodos);
        
        sortedTodos.forEach(todo => {
            if (isTodoAboutToStart(todo, now)) {
                showTodoNotification(todo, now);
            }
        });
        
        // Update last checked date
        lastCheckedDate = currentDate;
    } catch (error) {
        console.error('Error checking upcoming todos:', error);
    }
}

// Start notification checking
function startNotificationChecking() {
    // Check immediately
    checkUpcomingTodos();
    
    // Check every 30 seconds for more responsive notifications
    notificationCheckInterval = setInterval(() => {
        checkUpcomingTodos();
    }, 30000);
}

// Stop notification checking
function stopNotificationChecking() {
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
}

function renderCalendar(year) {
    showLoading();
    currentYear = year;
    
    // Simulate loading for smooth transition
    setTimeout(() => {
        calendarDiv.innerHTML = '';
        
        for (let m = 0; m < 12; m++) {
            const monthSection = document.createElement('div');
            monthSection.className = 'month';
            monthSection.id = `month-${m}`;
            monthSection.style.animationDelay = `${m * 0.1}s`;
            
            const monthTitle = document.createElement('div');
            monthTitle.className = 'month-title';
            monthTitle.textContent = monthNames[m];
            monthSection.appendChild(monthTitle);

            const daysGrid = document.createElement('div');
            daysGrid.className = 'days';
            const daysInMonth = getDaysInMonth(year, m);
            const firstDay = new Date(year, m, 1).getDay();

            // Fill empty slots for the first week
            for (let i = 0; i < firstDay; i++) {
                const empty = document.createElement('div');
                empty.className = 'day';
                empty.style.background = 'transparent';
                empty.style.boxShadow = 'none';
                empty.style.border = 'none';
                daysGrid.appendChild(empty);
            }

            for (let d = 1; d <= daysInMonth; d++) {
                const dayTile = createDayTile(year, m, d);
                daysGrid.appendChild(dayTile);
            }
            
            monthSection.appendChild(daysGrid);
            calendarDiv.appendChild(monthSection);
        }
        
        // Create month navigation after calendar is rendered
        createMonthNavigation();
    }, 300);
}

function createDayTile(year, month, day) {
    const dayTile = document.createElement('div');
    dayTile.className = 'day';
    dayTile.setAttribute('data-year', year);
    dayTile.setAttribute('data-month', month);
    dayTile.setAttribute('data-day', day);

    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayTile.appendChild(dayNumber);

    // Add day of week
    const dayOfWeek = new Date(year, month, day).getDay();
    const dayName = document.createElement('div');
    dayName.className = 'day-name';
    dayName.textContent = dayNames[dayOfWeek];
    dayTile.appendChild(dayName);

    const addBtn = document.createElement('button');
    addBtn.className = 'add-todo';
    addBtn.innerHTML = '+';
    addBtn.title = 'Add To-Do';
    dayTile.appendChild(addBtn);

    const todoList = document.createElement('div');
    todoList.className = 'todo-list';
    dayTile.appendChild(todoList);

    async function renderTodos() {
        todoList.innerHTML = '';
        try {
            const todos = await getTodos(year, month, day);
            const sortedTodos = sortTodosByTime(todos);
            
            sortedTodos.forEach((todo, idx) => {
                const todoItem = createTodoItem(todo, idx, year, month, day, renderTodos, resizeDayTile);
                todoList.appendChild(todoItem);
            });
            await resizeDayTile();
        } catch (error) {
            console.error('Error rendering todos:', error);
        }
    }

    async function resizeDayTile() {
        try {
            const todos = await getTodos(year, month, day);
            const baseHeight = 140;
            const extraHeight = todos.length > 0 ? todos.length * 60 : 0;
            dayTile.style.minHeight = (baseHeight + extraHeight) + 'px';
        } catch (error) {
            console.error('Error resizing day tile:', error);
        }
    }

    addBtn.onclick = () => {
        if (dayTile.querySelector('.add-todo-pane')) return;
        
        const pane = createAddTodoPane(year, month, day, renderTodos, resizeDayTile, dayTile);
        dayTile.appendChild(pane);
        
        // Focus with animation
        setTimeout(() => {
            const titleInput = pane.querySelector('.add-todo-title');
            titleInput.focus();
            titleInput.style.transform = 'scale(1.02)';
            setTimeout(() => titleInput.style.transform = 'scale(1)', 200);
        }, 100);
    };

    renderTodos().catch(error => {
        // Silent error handling
    });
    return dayTile;
}

function createTodoItem(todo, idx, year, month, day, renderTodos, resizeDayTile) {
    const todoItem = document.createElement('div');
    todoItem.className = 'todo-item';
    todoItem.style.animationDelay = `${idx * 0.1}s`;
    
    // Make todo item draggable
    todoItem.draggable = true;
    todoItem.setAttribute('data-todo-idx', idx);
    todoItem.setAttribute('data-todo-year', year);
    todoItem.setAttribute('data-todo-month', month);
    todoItem.setAttribute('data-todo-day', day);
    
    // Store Firebase ID if it exists
    if (todo.id) {
        todoItem.setAttribute('data-todo-firebase-id', todo.id);
    }
    
    // Set status-based background color based on current theme
    const status = todo.status || TODO_STATUS.PENDING;
    const isDarkTheme = document.body.classList.contains('theme-dark');
    const statusColors = isDarkTheme ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
    todoItem.style.background = statusColors[status];
    
    // Add time indicator if todo has start time
    const timeIndicator = todo.startTime ? `<span class="time-indicator">⏰ ${todo.startTime}</span>` : '';
    
    // Add status indicator
    const statusIndicator = `<span class="status-indicator ${status}">${STATUS_ICONS[status]} ${STATUS_LABELS[status]}</span>`;
    
    todoItem.innerHTML = `
        <div class="todo-title">${todo.title || ''}</div>
        <div class="todo-meta">
            ${todo.duration || ''} 
            ${timeIndicator}
            ${statusIndicator}
        </div>
    `;
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-todo';
    removeBtn.innerHTML = '🗑️';
    removeBtn.title = 'Remove To-Do';
    removeBtn.onclick = async () => {
        // Add removal animation
        todoItem.style.transform = 'translateX(20px)';
        todoItem.style.opacity = '0';
        
        setTimeout(async () => {
            try {
                const user = auth.currentUser;
                if (user && todo.id) {
                    // Delete from Firebase
                    await deleteTodoFromFirebase(todo.id);
                } else {
                    // Use local storage approach
                    const newTodos = await getTodos(year, month, day);
                    newTodos.splice(idx, 1);
                    await setTodos(year, month, day, newTodos);
                }
                await renderTodos();
                await resizeDayTile();
            } catch (error) {
                console.error('Error removing todo:', error);
                alert('Failed to remove todo. Please try again.');
            }
        }, 300);
    };
    
    // Create status buttons container
    const statusButtons = document.createElement('div');
    statusButtons.className = 'status-buttons';
    
    // Create status buttons with better visible icons
    const statusButtonData = [
        { status: TODO_STATUS.COMPLETED, icon: '✓', title: 'Mark as Done', color: '#4caf50' },
        { status: TODO_STATUS.IN_PROGRESS, icon: '⟳', title: 'Mark as In Progress', color: '#ff9800' },
        { status: TODO_STATUS.FAILED, icon: '✗', title: 'Mark as Not Done', color: '#f44336' }
    ];
    
    statusButtonData.forEach(buttonData => {
        const statusBtn = document.createElement('button');
        statusBtn.className = 'status-btn';
        statusBtn.innerHTML = buttonData.icon;
        statusBtn.title = buttonData.title;
        statusBtn.style.background = buttonData.color;
        statusBtn.onclick = () => {
            updateTodoStatus(year, month, day, idx, buttonData.status, renderTodos, resizeDayTile);
        };
        statusButtons.appendChild(statusBtn);
    });
    
    // Add elements in the correct order: content first, then buttons
    todoItem.appendChild(statusButtons);
    todoItem.appendChild(removeBtn);
    return todoItem;
}

async function updateTodoStatus(year, month, day, idx, newStatus, renderTodos, resizeDayTile) {
    try {
        const todos = await getTodos(year, month, day);
        
        if (todos[idx]) {
            const todo = todos[idx];
            const user = auth.currentUser;
            
            if (user && todo.id) {
                // Update directly in Firebase
                await updateTodoInFirebase(todo.id, { status: newStatus });
            } else {
                // Use local storage approach
                todo.status = newStatus;
                await setTodos(year, month, day, todos);
            }
            
            await renderTodos();
            await resizeDayTile();
            
            // Add success animation
            const todoItem = document.querySelector(`.todo-item:nth-child(${idx + 1})`);
            if (todoItem) {
                todoItem.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    todoItem.style.transform = 'scale(1)';
                }, 200);
            }
        }
    } catch (error) {
        console.error('Error updating todo status:', error);
        alert('Failed to update todo status. Please try again.');
    }
}

function createAddTodoPane(year, month, day, renderTodos, resizeDayTile, dayTile) {
    const pane = document.createElement('div');
    pane.className = 'add-todo-pane';
    pane.innerHTML = `
        <input class="add-todo-title" type="text" placeholder="Enter todo title..." />
        <select class="add-todo-duration">
            <option value="15 mins">15 mins</option>
            <option value="30 mins">30 mins</option>
            <option value="45 mins">45 mins</option>
            <option value="1 hour">1 hour</option>
            <option value="2 hours">2 hours</option>
            <option value="4 hours">4 hours</option>
            <option value="8 hours">8 hours</option>
        </select>
        <div class="add-todo-time">
            <select class="add-todo-hour">
                ${Array.from({length: 24}, (_, i) => `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`).join('')}
            </select>
            :
            <select class="add-todo-minute">
                ${Array.from({length: 60}, (_, i) => `<option value="${i.toString().padStart(2, '0')}">${i.toString().padStart(2, '0')}</option>`).join('')}
            </select>
        </div>
        <div class="button-group">
            <button class="save-todo">💾</button>
            <button class="cancel-todo">❌</button>
        </div>
    `;

    pane.querySelector('.save-todo').onclick = async () => {
        const title = pane.querySelector('.add-todo-title').value.trim();
        const duration = pane.querySelector('.add-todo-duration').value;
        const hour = pane.querySelector('.add-todo-hour').value;
        const minute = pane.querySelector('.add-todo-minute').value;
        const startTime = `${hour}:${minute}`;
        
        if (!title) {
            pane.querySelector('.add-todo-title').focus();
            pane.querySelector('.add-todo-title').style.borderColor = '#f56565';
            setTimeout(() => {
                pane.querySelector('.add-todo-title').style.borderColor = '';
            }, 1000);
            return;
        }
        
        try {
            const user = auth.currentUser;
            if (user) {
                // Save directly to Firebase for new todos
                await saveTodoToFirebase({ 
                    title, 
                    duration, 
                    startTime, 
                    status: TODO_STATUS.PENDING 
                }, year, month, day);
            } else {
                // Use local storage
                const todos = await getTodos(year, month, day);
                todos.push({ 
                    title, 
                    duration, 
                    startTime, 
                    status: TODO_STATUS.PENDING 
                });
                await setTodos(year, month, day, todos);
            }
            await renderTodos();
        } catch (error) {
            console.error('Error saving todo:', error);
            alert('Failed to save todo. Please try again.');
            return;
        }
        
        // Add success animation
        pane.style.transform = 'scale(0.95)';
        pane.style.opacity = '0';
        setTimeout(() => {
            pane.remove();
            resizeDayTile();
        }, 200);
    };
    
    pane.querySelector('.cancel-todo').onclick = () => {
        pane.style.transform = 'scale(0.95)';
        pane.style.opacity = '0';
        setTimeout(() => {
            pane.remove();
            resizeDayTile();
        }, 200);
    };
    
    return pane;
}

function populateYearDropdown() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
        const option = document.createElement('option');
        option.value = y;
        option.textContent = y;
        if (y === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
}

function setFontSizeClass(size) {
    if (container) {
        container.classList.remove('font-small', 'font-medium', 'font-large');
        container.classList.add('font-' + size);
    }
    
    const fontSizeIcons = document.querySelectorAll('.font-size-icon');
    fontSizeIcons.forEach(icon => {
        icon.classList.toggle('active', icon.getAttribute('data-size') === size);
    });
}

// Update all todos' colors when theme changes
function updateAllTodoColors() {
    if (!yearSelect) return;
    
    const year = parseInt(yearSelect.value);
    const isDarkTheme = document.body.classList.contains('theme-dark');
    const statusColors = isDarkTheme ? STATUS_COLORS_DARK : STATUS_COLORS_LIGHT;
    
    // Update all todo items with new colors
    const todoItems = document.querySelectorAll('.todo-item');
    todoItems.forEach(todoItem => {
        const statusIndicator = todoItem.querySelector('.status-indicator');
        if (statusIndicator) {
            const status = statusIndicator.className.split(' ').find(cls => 
                ['pending', 'in-progress', 'Done', 'Not Done'].includes(cls)
            );
            if (status) {
                todoItem.style.background = statusColors[status];
            }
        }
    });
}

// Patch theme change logic to update todo colors
function setTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + theme);
    
    const themeIcons = document.querySelectorAll('.theme-icon');
    themeIcons.forEach(icon => {
        icon.classList.toggle('active', icon.getAttribute('data-theme') === theme);
    });
    updateAllTodoColors();
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
            case '1':
                e.preventDefault();
                setFontSizeClass('small');
                break;
            case '2':
                e.preventDefault();
                setFontSizeClass('medium');
                break;
            case '3':
                e.preventDefault();
                setFontSizeClass('large');
                break;
            case 'l':
                e.preventDefault();
                setTheme('light');
                break;
            case 'd':
                e.preventDefault();
                setTheme('dark');
                break;
        }
    }
});

// Add smooth scroll behavior (will be set up after DOM is ready)

// Start notification system when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM references
    yearSelect = document.getElementById('year-select');
    calendarDiv = document.getElementById('calendar');
    container = document.querySelector('.container');
    
    // Wait a bit for Firebase to initialize
    setTimeout(() => {
        // Initialize Firebase auth
        setupAuth();
        
        // Start notification checking
        startNotificationChecking();
        
        // Initialize app components
        initializeApp();
        
        // Request notification permission on page load
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
                // Permission handled silently
            });
        }
    }, 100);
});

function initializeApp() {
    // Set up year selector
    if (yearSelect) {
        yearSelect.addEventListener('change', () => {
            renderCalendar(parseInt(yearSelect.value));
        });
        populateYearDropdown();
    }
    
    // Set up font size controls
    const fontSizeIcons = document.querySelectorAll('.font-size-icon');
    fontSizeIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            setFontSizeClass(this.getAttribute('data-size'));
        });
    });
    
    // Set up theme controls
    const themeIcons = document.querySelectorAll('.theme-icon');
    themeIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            setTheme(this.getAttribute('data-theme'));
        });
    });
    
    // Set default font size and theme
    setFontSizeClass('medium');
    setTheme('light');
    
    // Render initial calendar
    if (yearSelect) {
        renderCalendar(parseInt(yearSelect.value));
    }
    
    // Add smooth scroll behavior
    if (calendarDiv) {
        calendarDiv.addEventListener('wheel', (e) => {
            e.preventDefault();
            calendarDiv.scrollTop += e.deltaY;
        }, { passive: false });
    }
}

// Test notification function (for debugging)
function testNotification() {
    const testTodo = {
        title: 'Test Todo',
        startTime: '12:00',
        duration: '30 mins'
    };
    showTodoNotification(testTodo, new Date());
}

// Clean up when page unloads
window.addEventListener('beforeunload', () => {
    stopNotificationChecking();
});

// Month Navigation Functions
function createMonthNavigation() {
    const monthNavContainer = document.querySelector('.month-nav-container');
    if (!monthNavContainer) return;
    
    monthNavContainer.innerHTML = '';
    
    monthNames.forEach((monthName, index) => {
        const monthBtn = document.createElement('button');
        monthBtn.className = 'month-nav-btn';
        monthBtn.textContent = monthName;
        monthBtn.setAttribute('data-month', index);
        
        monthBtn.addEventListener('click', () => {
            scrollToMonth(index);
        });
        
        monthNavContainer.appendChild(monthBtn);
    });
}

function scrollToMonth(monthIndex) {
    const monthElement = document.getElementById(`month-${monthIndex}`);
    if (monthElement) {
        // Update active button
        document.querySelectorAll('.month-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-month="${monthIndex}"]`).classList.add('active');
        
        // Smooth scroll to month
        monthElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// Drag and Drop Functions
function initializeDragAndDrop() {
    // Clean up any existing drag preview
    cleanupDragPreview();
    
    // Add drag event listeners to todo items
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('dragend', handleDragEnd);
    document.addEventListener('dragover', handleDragOver);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragenter', handleDragEnter);
    document.addEventListener('dragleave', handleDragLeave);
    document.addEventListener('mousemove', updateDragPreview);
}

function cleanupDragPreview() {
    // Remove ALL drag previews (in case multiple exist)
    const allDragPreviews = document.querySelectorAll('.drag-preview');
    allDragPreviews.forEach(preview => {
        preview.remove();
    });
    dragPreview = null;
    
    // Reset dragged todo
    draggedTodo = null;
    
    // Remove drag-over class from all days
    document.querySelectorAll('.day.drag-over').forEach(day => {
        day.classList.remove('drag-over');
    });
    
    // Remove dragging class from all todo items
    document.querySelectorAll('.todo-item.dragging').forEach(item => {
        item.classList.remove('dragging');
    });
    
    // Force cleanup any remaining elements immediately
    const remainingPreviews = document.querySelectorAll('.drag-preview');
    remainingPreviews.forEach(preview => preview.remove());
    
    // Additional cleanup after a short delay
    setTimeout(() => {
        const finalPreviews = document.querySelectorAll('.drag-preview');
        finalPreviews.forEach(preview => preview.remove());
    }, 50);
}

function handleDragStart(e) {
    if (e.target.classList.contains('todo-item')) {
        draggedTodo = e.target;
        e.target.classList.add('dragging');
        
        // Create drag preview with better positioning
        dragPreview = document.createElement('div');
        dragPreview.className = 'drag-preview';
        dragPreview.textContent = e.target.querySelector('.todo-title').textContent;
        dragPreview.style.position = 'fixed';
        dragPreview.style.pointerEvents = 'none';
        dragPreview.style.zIndex = '10000';
        dragPreview.style.left = (e.clientX + 10) + 'px';
        dragPreview.style.top = (e.clientY - 10) + 'px';
        document.body.appendChild(dragPreview);
        
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
        
        // Add event listeners for better cleanup
        document.addEventListener('mouseup', handleMouseUp, { once: true });
        document.addEventListener('keydown', handleEscapeKey, { once: true });
    }
}

function updateDragPreview(e) {
    if (dragPreview && draggedTodo) {
        dragPreview.style.left = (e.clientX + 10) + 'px';
        dragPreview.style.top = (e.clientY - 10) + 'px';
    } else if (dragPreview && !draggedTodo) {
        // Clean up if drag preview exists but no dragged todo
        cleanupDragPreview();
    }
}

function handleDragEnd(e) {
    if (e.target.classList.contains('todo-item')) {
        e.target.classList.remove('dragging');
    }
    
    // Always clean up drag preview
    cleanupDragPreview();
    
    // Remove drag-over class from all days
    document.querySelectorAll('.day.drag-over').forEach(day => {
        day.classList.remove('drag-over');
    });
}

function handleMouseUp(e) {
    // Clean up if mouse is released outside of drop zones
    if (!e.target.classList.contains('day') && !e.target.closest('.day')) {
        cleanupDragPreview();
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        cleanupDragPreview();
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    if (e.target.classList.contains('day')) {
        e.target.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    if (e.target.classList.contains('day')) {
        e.target.classList.remove('drag-over');
    }
}

async function handleDrop(e) {
    e.preventDefault();
    
    if (e.target.classList.contains('day')) {
        e.target.classList.remove('drag-over');
        
        if (draggedTodo) {
            const todoData = extractTodoData(draggedTodo);
            const targetDay = e.target;
            
            // Get target day coordinates
            const targetCoords = getDayCoordinates(targetDay);
            
            if (targetCoords) {
                try {
                    // Get original coordinates from dragged todo
                    const originalYear = parseInt(draggedTodo.getAttribute('data-todo-year'));
                    const originalMonth = parseInt(draggedTodo.getAttribute('data-todo-month'));
                    const originalDay = parseInt(draggedTodo.getAttribute('data-todo-day'));
                    const originalIdx = parseInt(draggedTodo.getAttribute('data-todo-idx'));
                    
                                    // Handle Firebase vs Local Storage differently
                const user = auth.currentUser;
                if (user && todoData.id) {
                    // Update the Firebase document with new coordinates
                    await updateTodoInFirebase(todoData.id, {
                        year: targetCoords.year,
                        month: targetCoords.month,
                        day: targetCoords.day
                    });
                } else {
                    // Use local storage approach
                    // Remove todo from original location
                    const originalTodos = await getTodos(originalYear, originalMonth, originalDay);
                    if (originalTodos[originalIdx]) {
                        originalTodos.splice(originalIdx, 1);
                        await setTodos(originalYear, originalMonth, originalDay, originalTodos);
                    }
                    
                    // Add todo to new location
                    const targetTodos = await getTodos(targetCoords.year, targetCoords.month, targetCoords.day);
                    targetTodos.push(todoData);
                    await setTodos(targetCoords.year, targetCoords.month, targetCoords.day, targetTodos);
                }
                    
                    // Store current scroll position and target month
                    const currentScrollTop = calendarDiv.scrollTop;
                    const targetMonthId = `month-${targetCoords.month}`;
                    
                    // Update UI without full re-render
                    await updateCalendarAfterDrop(originalYear, originalMonth, originalDay, targetCoords);
                    
                    // Restore scroll position and scroll to target month
                    setTimeout(() => {
                        calendarDiv.scrollTop = currentScrollTop;
                        scrollToMonth(targetCoords.month);
                    }, 100);
                    
                    // Show success feedback
                    showDropSuccess(targetDay);
                    
                    // Auto-cleanup after successful drop
                    setTimeout(() => {
                        forceCleanup();
                    }, 100);
                } catch (error) {
                    console.error('Error during drag and drop:', error);
                    alert('Failed to move todo. Please try again.');
                }
            }
        }
    }
}

function extractTodoData(todoElement) {
    const title = todoElement.querySelector('.todo-title').textContent;
    const meta = todoElement.querySelector('.todo-meta');
    
    // Extract duration (the text before the time indicator)
    const metaText = meta.textContent;
    const durationMatch = metaText.match(/(\d+\s*mins?)/);
    const duration = durationMatch ? durationMatch[1] : '';
    
    // Extract start time (from time indicator)
    const timeIndicator = meta.querySelector('.time-indicator');
    const startTime = timeIndicator ? timeIndicator.textContent.replace('⏰ ', '') : '';
    
    // Extract status
    const statusIndicator = todoElement.querySelector('.status-indicator');
    const status = statusIndicator ? 
        statusIndicator.className.split(' ').find(cls => 
            ['pending', 'in-progress', 'Done', 'Not Done'].includes(cls)
        ) || TODO_STATUS.PENDING : TODO_STATUS.PENDING;
    
    // Extract Firebase ID if it exists
    const firebaseId = todoElement.getAttribute('data-todo-firebase-id');
    
    return { 
        title, 
        duration, 
        startTime, 
        status,
        id: firebaseId || null // Preserve Firebase ID if it exists
    };
}

function getDayCoordinates(dayElement) {
    const dayNumber = dayElement.querySelector('.day-number').textContent;
    const monthElement = dayElement.closest('.month');
    const monthIndex = parseInt(monthElement.id.split('-')[1]);
    
    return {
        year: currentYear,
        month: monthIndex,
        day: parseInt(dayNumber)
    };
}

async function updateCalendarAfterDrop(originalYear, originalMonth, originalDay, targetCoords) {
    try {
        // Update original day's todo list
        const originalDayElement = document.querySelector(`[data-year="${originalYear}"][data-month="${originalMonth}"][data-day="${originalDay}"]`);
        if (originalDayElement) {
            const originalTodos = await getTodos(originalYear, originalMonth, originalDay);
            const todoList = originalDayElement.querySelector('.todo-list');
            if (todoList) {
                todoList.innerHTML = '';
                const sortedTodos = sortTodosByTime(originalTodos);
                sortedTodos.forEach((todo, idx) => {
                    const todoItem = createTodoItem(todo, idx, originalYear, originalMonth, originalDay, 
                        () => updateTodosForDay(originalYear, originalMonth, originalDay, originalDayElement), 
                        () => resizeDayTile(originalDayElement));
                    todoList.appendChild(todoItem);
                });
            }
        }
        
        // Update target day's todo list
        const targetDayElement = document.querySelector(`[data-year="${targetCoords.year}"][data-month="${targetCoords.month}"][data-day="${targetCoords.day}"]`);
        if (targetDayElement) {
            const targetTodos = await getTodos(targetCoords.year, targetCoords.month, targetCoords.day);
            const todoList = targetDayElement.querySelector('.todo-list');
            if (todoList) {
                todoList.innerHTML = '';
                const sortedTodos = sortTodosByTime(targetTodos);
                sortedTodos.forEach((todo, idx) => {
                    const todoItem = createTodoItem(todo, idx, targetCoords.year, targetCoords.month, targetCoords.day, 
                        () => updateTodosForDay(targetCoords.year, targetCoords.month, targetCoords.day, targetDayElement), 
                        () => resizeDayTile(targetDayElement));
                    todoList.appendChild(todoItem);
                });
            }
        }
    } catch (error) {
        console.error('Error updating calendar after drop:', error);
    }
}

async function updateTodosForDay(year, month, day, dayElement) {
    try {
        const todos = await getTodos(year, month, day);
        const todoList = dayElement.querySelector('.todo-list');
        if (todoList) {
            todoList.innerHTML = '';
            const sortedTodos = sortTodosByTime(todos);
            sortedTodos.forEach((todo, idx) => {
                const todoItem = createTodoItem(todo, idx, year, month, day, 
                    () => updateTodosForDay(year, month, day, dayElement), 
                    () => resizeDayTile(dayElement));
                todoList.appendChild(todoItem);
            });
            await resizeDayTile(dayElement);
        }
    } catch (error) {
        console.error('Error updating todos for day:', error);
    }
}

async function resizeDayTile(dayElement) {
    try {
        const todos = dayElement.querySelectorAll('.todo-item');
        const baseHeight = 140;
        const extraHeight = todos.length > 0 ? todos.length * 60 : 0;
        dayElement.style.minHeight = (baseHeight + extraHeight) + 'px';
    } catch (error) {
        console.error('Error resizing day tile:', error);
    }
}

function showDropSuccess(targetDay) {
    // Add a brief success animation
    targetDay.style.transform = 'scale(1.05)';
    targetDay.style.boxShadow = '0 8px 25px rgba(76, 175, 80, 0.3)';
    
    setTimeout(() => {
        targetDay.style.transform = 'scale(1)';
        targetDay.style.boxShadow = '';
    }, 500);
}

// Initialize drag and drop when calendar is rendered
document.addEventListener('DOMContentLoaded', () => {
    initializeDragAndDrop();
});

// Clean up drag preview if window loses focus
window.addEventListener('blur', cleanupDragPreview);

// Global cleanup function for any stuck elements
function forceCleanup() {
    // Remove all drag previews
    const allDragPreviews = document.querySelectorAll('.drag-preview');
    allDragPreviews.forEach(preview => preview.remove());
    
    // Remove all drag-over classes
    document.querySelectorAll('.day.drag-over').forEach(day => {
        day.classList.remove('drag-over');
    });
    
    // Remove all dragging classes
    document.querySelectorAll('.todo-item.dragging').forEach(item => {
        item.classList.remove('dragging');
    });
    
    // Reset global variables
    dragPreview = null;
    draggedTodo = null;
}

// Async refresh function (lightweight)
function asyncRefresh() {
    // Store current scroll position
    const currentScrollTop = calendarDiv.scrollTop;
    const currentYear = parseInt(yearSelect.value);
    
    // Force cleanup first
    forceCleanup();
    
    // Re-render calendar
    renderCalendar(currentYear);
    
    // Restore scroll position
    setTimeout(() => {
        calendarDiv.scrollTop = currentScrollTop;
    }, 200);
}

// Add keyboard shortcut for manual cleanup (Escape key)
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        forceCleanup();
    }
});

// Auto-cleanup is now handled automatically after drag operations

// Firebase Authentication Functions
function setupAuth() {
    console.log('Setting up authentication...');
    
    // Get Firebase references
    auth = window.auth;
    db = window.db;
    
    if (!auth || !db) {
        console.error('Firebase not initialized');
        console.log('Auth available:', !!auth);
        console.log('DB available:', !!db);
        return;
    }
    
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (!loginBtn || !signupBtn || !logoutBtn) {
        console.error('Auth buttons not found');
        console.log('Available buttons:', {
            loginBtn: !!loginBtn,
            signupBtn: !!signupBtn,
            logoutBtn: !!logoutBtn
        });
        return;
    }
    
   
    
    // Login handler
    loginBtn.onclick = () => {
        console.log('Login button clicked');
        const email = prompt('Enter email:');
        const password = prompt('Enter password:');
        
        if (email && password) {
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('Logged in:', userCredential.user.uid);
                    updateAuthUI();
                })
                .catch((error) => {
                    alert('Login failed: ' + error.message);
                });
        }
    };
    
    // Signup handler
    signupBtn.onclick = () => {
        alert('Signup button clicked!'); // Test if button click is detected
        
        
        const email = prompt('Enter email:');
        const password = prompt('Enter password:');
        
        if (email && password) {
            console.log('Attempting to create user with email:', email);
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('User created successfully:', userCredential.user.uid);
                    updateAuthUI();
                })
                .catch((error) => {
                    console.error('Signup error:', error);
                    alert('Signup failed: ' + error.message);
                });
        } else {
            console.log('Email or password was empty');
        }
    };
    
    
    
    // Logout handler
    logoutBtn.onclick = () => {
        console.log('Logout button clicked');
        auth.signOut().then(() => {
            updateAuthUI();
        });
    };
    
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        console.log('Auth state changed:', user ? user.email : 'No user');
        updateAuthUI();
    });
    
    console.log('Authentication setup complete');
}

function updateAuthUI() {
    const user = auth.currentUser;
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    const userEmail = document.getElementById('user-email');
    
    if (user) {
        // User is signed in
        loginBtn.style.display = 'none';
        signupBtn.style.display = 'none';
        logoutBtn.style.display = 'inline-block';
        userInfo.style.display = 'block';
        userEmail.textContent = user.email;
        
        // Update storage notice
        updateStorageNotice(true);
        
        // Load user's todos
        loadUserTodos(user.uid);
    } else {
        // User is signed out
        loginBtn.style.display = 'inline-block';
        signupBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'none';
        userInfo.style.display = 'none';
        
        // Update storage notice
        updateStorageNotice(false);
        
        // Clear todos
        clearTodos();
    }
}

// Load user's todos from Firebase
async function loadUserTodos(userId) {
    console.log('Loading todos for user:', userId);
    // This will be called when user logs in
    // For now, just re-render the calendar
    renderCalendar(parseInt(yearSelect.value));
}

function updateStorageNotice(isCloud) {
    const noticeText = document.querySelector('.notice-text');
    if (isCloud) {
        noticeText.textContent = 'Data is stored in the cloud. Your todos are safe and sync across devices.';
    } else {
        noticeText.textContent = 'Data is stored locally in your browser. Don\'t clear cache to avoid losing your todos.';
    }
}

// Firebase Database Functions
async function saveTodoToFirebase(todo, year, month, day) {
    const user = auth.currentUser;
    if (!user) {
        return;
    }
    
    try {
        const docRef = await db.collection('todos').add({
            userId: user.uid,
            title: todo.title,
            startTime: todo.startTime,
            duration: todo.duration,
            status: todo.status || TODO_STATUS.PENDING,
            year: year,
            month: month,
            day: day,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error saving todo:', error);
        alert('Failed to save todo. Please try again.');
        throw error;
    }
}

async function getTodosFromFirebase(year, month, day) {
    const user = auth.currentUser;
    if (!user) {
        return [];
    }
    
    try {
        const snapshot = await db.collection('todos')
            .where('userId', '==', user.uid)
            .where('year', '==', year)
            .where('month', '==', month)
            .where('day', '==', day)
            .get();
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error getting todos:', error);
        return [];
    }
}

async function updateTodoInFirebase(todoId, updates) {
    const user = auth.currentUser;
    if (!user) {
        return;
    }
    
    try {
        await db.collection('todos').doc(todoId).update(updates);
    } catch (error) {
        console.error('Error updating todo in Firebase:', error);
        alert('Failed to update todo. Please try again.');
        throw error;
    }
}

async function deleteTodoFromFirebase(todoId) {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        await db.collection('todos').doc(todoId).delete();
        console.log('Todo deleted from Firebase');
    } catch (error) {
        console.error('Error deleting todo:', error);
        alert('Failed to delete todo. Please try again.');
    }
}

// Hybrid storage functions (Firebase + Local fallback)
async function getTodos(year, month, day) {
    const user = auth.currentUser;
    if (user) {
        // Use Firebase
        try {
            return await getTodosFromFirebase(year, month, day);
        } catch (error) {
            console.error('Error getting todos from Firebase:', error);
            return [];
        }
    } else {
        // Use local storage
        const key = `todos-${year}-${month}-${day}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    }
}

async function setTodos(year, month, day, todos) {
    const user = auth.currentUser;
    if (user) {
        // Use Firebase - save each todo individually
        try {
            // First, get existing todos to see what needs to be deleted
            const existingTodos = await getTodosFromFirebase(year, month, day);
            const existingIds = existingTodos.map(todo => todo.id);
            
            // Delete todos that are no longer in the list
            for (const todoId of existingIds) {
                const todoStillExists = todos.some(todo => todo.id === todoId);
                if (!todoStillExists) {
                    await deleteTodoFromFirebase(todoId);
                }
            }
            
            // Add/update todos that are in the list
            for (const todo of todos) {
                if (todo.id) {
                    // Update existing todo
                    await updateTodoInFirebase(todo.id, {
                        title: todo.title,
                        duration: todo.duration,
                        startTime: todo.startTime,
                        status: todo.status || TODO_STATUS.PENDING
                    });
                } else {
                    // Add new todo
                    await saveTodoToFirebase(todo, year, month, day);
                }
            }
        } catch (error) {
            console.error('Error saving todos to Firebase:', error);
            // Fallback to local storage
            const key = `todos-${year}-${month}-${day}`;
            localStorage.setItem(key, JSON.stringify(todos));
        }
    } else {
        // Use local storage
        const key = `todos-${year}-${month}-${day}`;
        localStorage.setItem(key, JSON.stringify(todos));
    }
}

function clearTodos() {
    // Clear local storage todos
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.startsWith('todos-')) {
            localStorage.removeItem(key);
        }
    });
    
    // Re-render calendar
    renderCalendar(parseInt(yearSelect.value));
} 