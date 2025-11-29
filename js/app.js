// =============================================
// TechCorp Expense Tracker - Main Application
// =============================================

// State Management
const state = {
    currentUser: null,
    expenses: [],
    isLoading: false
};

// DOM Elements
const elements = {
    // Login
    loginSection: document.getElementById('loginSection'),
    loginForm: document.getElementById('loginForm'),
    loginMessage: document.getElementById('loginMessage'),
    firstName: document.getElementById('firstName'),
    lastName: document.getElementById('lastName'),
    employeeId: document.getElementById('employeeId'),
    userStatus: document.getElementById('userStatus'),
    
    // Expense Form
    expenseSection: document.getElementById('expenseSection'),
    expenseForm: document.getElementById('expenseForm'),
    expenseMessage: document.getElementById('expenseMessage'),
    receiptFile: document.getElementById('receiptFile'),
    fileUploadArea: document.getElementById('fileUploadArea'),
    filePreview: document.getElementById('filePreview'),
    previewImage: document.getElementById('previewImage'),
    removeFile: document.getElementById('removeFile'),
    comment: document.getElementById('comment'),
    
    // History
    historySection: document.getElementById('historySection'),
    refreshBtn: document.getElementById('refreshBtn'),
    totalAmount: document.getElementById('totalAmount'),
    approvedAmount: document.getElementById('approvedAmount'),
    pendingAmount: document.getElementById('pendingAmount'),
    rejectedAmount: document.getElementById('rejectedAmount'),
    categoryList: document.getElementById('categoryList'),
    expensesTableBody: document.getElementById('expensesTableBody'),
    noDataMessage: document.getElementById('noDataMessage'),
    
    // Modal
    detailsModal: document.getElementById('detailsModal'),
    modalClose: document.getElementById('modalClose'),
    modalBody: document.getElementById('modalBody'),
    
    // Loading
    loadingOverlay: document.getElementById('loadingOverlay')
};

// =============================================
// Supabase Client Initialization
// =============================================
let supabase = null;

function initSupabase() {
    if (CONFIG.SUPABASE_URL === 'YOUR_SUPABASE_URL') {
        console.warn('Supabase не е конфигуриран. Моля, добавете credentials в config.js');
        return false;
    }
    
    supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    return true;
}

// =============================================
// Utility Functions
// =============================================
function showLoading() {
    elements.loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingOverlay.classList.add('hidden');
}

function showMessage(element, message, type = 'error') {
    element.textContent = message;
    element.className = `${element.className.split(' ')[0]} ${type}`;
    element.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        element.classList.add('hidden');
    }, 5000);
}

function formatCurrency(amount, currency = 'BGN') {
    return `${parseFloat(amount).toFixed(2)} ${currency === 'BGN' ? 'лв' : currency}`;
}

function formatDate(dateString) {
    if (!dateString) return 'Няма дата';
    const date = new Date(dateString);
    return date.toLocaleDateString('bg-BG', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function getStatusBadge(status) {
    const statusMap = {
        'Approved': { class: 'approved', text: 'Одобрен' },
        'Rejected': { class: 'rejected', text: 'Отказан' },
        'Manual Review': { class: 'pending', text: 'Чака одобрение' }
    };
    
    const statusInfo = statusMap[status] || statusMap['Manual Review'];
    return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
}

function getCategoryName(category) {
    return CONFIG.CATEGORIES[category] || category || 'Други';
}

// =============================================
// Authentication Functions
// =============================================
async function verifyUser(firstName, lastName, employeeId) {
    if (!supabase) {
        // Demo mode without Supabase
        console.log('Demo mode: Симулация на проверка на потребител');
        return { 
            id: 'demo-user-id',
            first_name: firstName,
            last_name: lastName,
            employee_id: employeeId,
            is_admin: employeeId.startsWith('FIN')
        };
    }
    
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('first_name', firstName)
        .eq('last_name', lastName)
        .eq('employee_id', employeeId)
        .single();
    
    if (error || !data) {
        return null;
    }
    
    return data;
}

async function handleLogin(e) {
    e.preventDefault();
    
    const firstName = elements.firstName.value.trim();
    const lastName = elements.lastName.value.trim();
    const employeeId = elements.employeeId.value.trim();
    
    if (!firstName || !lastName || !employeeId) {
        showMessage(elements.loginMessage, 'Моля, попълнете всички полета.', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const user = await verifyUser(firstName, lastName, employeeId);
        
        if (!user) {
            showMessage(elements.loginMessage, 'Невалидни данни. Служител с тези имена и ID не е намерен.', 'error');
            hideLoading();
            return;
        }
        
        // Set current user
        state.currentUser = user;
        
        // Update UI
        updateUserStatus(true);
        elements.expenseSection.classList.remove('hidden');
        elements.historySection.classList.remove('hidden');
        
        // Make login form read-only
        elements.firstName.disabled = true;
        elements.lastName.disabled = true;
        elements.employeeId.disabled = true;
        elements.loginForm.querySelector('button').textContent = 'Изход';
        elements.loginForm.querySelector('button').innerHTML = '<i class="fas fa-sign-out-alt"></i> Изход';
        
        showMessage(elements.loginMessage, `Добре дошли, ${firstName} ${lastName}!`, 'success');
        
        // Load expenses
        await loadExpenses();
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(elements.loginMessage, 'Грешка при вход. Моля, опитайте отново.', 'error');
    }
    
    hideLoading();
}

function handleLogout() {
    state.currentUser = null;
    state.expenses = [];
    
    // Reset UI
    updateUserStatus(false);
    elements.expenseSection.classList.add('hidden');
    elements.historySection.classList.add('hidden');
    
    // Enable form
    elements.firstName.disabled = false;
    elements.lastName.disabled = false;
    elements.employeeId.disabled = false;
    elements.firstName.value = '';
    elements.lastName.value = '';
    elements.employeeId.value = '';
    elements.loginForm.querySelector('button').innerHTML = '<i class="fas fa-sign-in-alt"></i> Вход';
    
    elements.loginMessage.classList.add('hidden');
}

function updateUserStatus(isLoggedIn) {
    const statusDot = elements.userStatus.querySelector('.status-dot');
    const statusText = elements.userStatus.querySelector('span:last-child');
    
    if (isLoggedIn && state.currentUser) {
        statusDot.classList.remove('offline');
        statusDot.classList.add('online');
        statusText.textContent = `${state.currentUser.first_name} ${state.currentUser.last_name}`;
    } else {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Не сте влезли';
    }
}

// =============================================
// File Upload Functions
// =============================================
function handleFileSelect(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Validate file type
    if (!CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
        showMessage(elements.expenseMessage, 'Невалиден формат на файла. Позволени: JPG, JPEG, PNG, WEBP, GIF', 'error');
        elements.receiptFile.value = '';
        return;
    }
    
    // Validate file size
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showMessage(elements.expenseMessage, 'Файлът е твърде голям. Максимален размер: 10MB', 'error');
        elements.receiptFile.value = '';
        return;
    }
    
    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
        elements.previewImage.src = event.target.result;
        elements.fileUploadArea.classList.add('hidden');
        elements.filePreview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function handleRemoveFile() {
    elements.receiptFile.value = '';
    elements.previewImage.src = '';
    elements.filePreview.classList.add('hidden');
    elements.fileUploadArea.classList.remove('hidden');
}

// =============================================
// Expense Functions
// =============================================
async function handleExpenseSubmit(e) {
    e.preventDefault();
    
    if (!state.currentUser) {
        showMessage(elements.expenseMessage, 'Моля, влезте в системата първо.', 'error');
        return;
    }
    
    const file = elements.receiptFile.files[0];
    const comment = elements.comment.value.trim();
    
    if (!file && !comment) {
        showMessage(elements.expenseMessage, 'Моля, качете снимка или добавете описание на разхода.', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Prepare form data for n8n webhook
        const formData = new FormData();
        formData.append('firstName', state.currentUser.first_name);
        formData.append('lastName', state.currentUser.last_name);
        formData.append('employeeId', state.currentUser.employee_id);
        formData.append('userId', state.currentUser.id);
        formData.append('comment', comment);
        
        if (file) {
            formData.append('receipt', file);
        }
        
        // Send to n8n webhook
        if (CONFIG.N8N_WEBHOOK_URL !== 'YOUR_N8N_WEBHOOK_URL') {
            const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Webhook request failed');
            }
            
            const result = await response.json();
            
            if (result.error) {
                showMessage(elements.expenseMessage, result.message || 'Грешка при обработка на разхода.', 'error');
            } else {
                showMessage(elements.expenseMessage, 'Разходът е изпратен успешно за обработка!', 'success');
                
                // Reset form
                elements.expenseForm.reset();
                handleRemoveFile();
                
                // Reload expenses after a short delay
                setTimeout(() => loadExpenses(), 2000);
            }
        } else {
            // Demo mode
            console.log('Demo mode: Симулация на изпращане на разход', {
                user: state.currentUser,
                comment,
                hasFile: !!file
            });
            
            showMessage(elements.expenseMessage, 'Demo режим: n8n webhook не е конфигуриран.', 'error');
        }
        
    } catch (error) {
        console.error('Expense submit error:', error);
        showMessage(elements.expenseMessage, 'Грешка при изпращане на разхода. Моля, опитайте отново.', 'error');
    }
    
    hideLoading();
}

async function loadExpenses() {
    if (!state.currentUser) return;
    
    showLoading();
    
    try {
        if (supabase) {
            const { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', state.currentUser.id)
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            state.expenses = data || [];
        } else {
            // Demo data
            state.expenses = [];
        }
        
        renderExpenses();
        updateSummary();
        
    } catch (error) {
        console.error('Load expenses error:', error);
        state.expenses = [];
        renderExpenses();
    }
    
    hideLoading();
}

function renderExpenses() {
    const tbody = elements.expensesTableBody;
    
    if (state.expenses.length === 0) {
        tbody.innerHTML = '';
        elements.noDataMessage.classList.remove('hidden');
        return;
    }
    
    elements.noDataMessage.classList.add('hidden');
    
    tbody.innerHTML = state.expenses.map(expense => `
        <tr>
            <td>${formatDate(expense.receipt_date || expense.created_at)}</td>
            <td>${expense.merchant || 'Неизвестен'}</td>
            <td>${getCategoryName(expense.category)}</td>
            <td><strong>${formatCurrency(expense.amount, expense.currency)}</strong></td>
            <td>${getStatusBadge(expense.status)}</td>
            <td>
                <button class="btn btn-details" onclick="showExpenseDetails('${expense.id}')">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateSummary() {
    const totals = {
        total: 0,
        approved: 0,
        pending: 0,
        rejected: 0
    };
    
    const categoryTotals = {};
    
    state.expenses.forEach(expense => {
        const amount = parseFloat(expense.amount) || 0;
        totals.total += amount;
        
        switch (expense.status) {
            case 'Approved':
                totals.approved += amount;
                break;
            case 'Rejected':
                totals.rejected += amount;
                break;
            default:
                totals.pending += amount;
        }
        
        // Category breakdown
        const category = expense.category || 'other';
        if (!categoryTotals[category]) {
            categoryTotals[category] = 0;
        }
        categoryTotals[category] += amount;
    });
    
    // Update summary cards
    elements.totalAmount.textContent = formatCurrency(totals.total);
    elements.approvedAmount.textContent = formatCurrency(totals.approved);
    elements.pendingAmount.textContent = formatCurrency(totals.pending);
    elements.rejectedAmount.textContent = formatCurrency(totals.rejected);
    
    // Update category breakdown
    elements.categoryList.innerHTML = Object.entries(categoryTotals)
        .map(([category, amount]) => `
            <div class="category-tag">
                <span>${getCategoryName(category)}</span>
                <span class="amount">${formatCurrency(amount)}</span>
            </div>
        `).join('');
}

// =============================================
// Modal Functions
// =============================================
function showExpenseDetails(expenseId) {
    const expense = state.expenses.find(e => e.id === expenseId);
    
    if (!expense) return;
    
    elements.modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Дата</span>
            <span class="detail-value">${formatDate(expense.receipt_date || expense.created_at)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Търговец</span>
            <span class="detail-value">${expense.merchant || 'Неизвестен'}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Категория</span>
            <span class="detail-value">${getCategoryName(expense.category)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Сума</span>
            <span class="detail-value">${formatCurrency(expense.amount, expense.currency)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Статус</span>
            <span class="detail-value">${getStatusBadge(expense.status)}</span>
        </div>
        ${expense.status_reason ? `
        <div class="detail-row">
            <span class="detail-label">Причина</span>
            <span class="detail-value">${expense.status_reason}</span>
        </div>
        ` : ''}
        ${expense.description ? `
        <div class="detail-row">
            <span class="detail-label">Описание</span>
            <span class="detail-value">${expense.description}</span>
        </div>
        ` : ''}
        ${expense.image_url ? `
        <img src="${expense.image_url}" alt="Касова бележка" class="receipt-image">
        ` : ''}
    `;
    
    elements.detailsModal.classList.remove('hidden');
}

function closeModal() {
    elements.detailsModal.classList.add('hidden');
}

// =============================================
// Event Listeners
// =============================================
function initEventListeners() {
    // Login form
    elements.loginForm.addEventListener('submit', (e) => {
        if (state.currentUser) {
            e.preventDefault();
            handleLogout();
        } else {
            handleLogin(e);
        }
    });
    
    // Expense form
    elements.expenseForm.addEventListener('submit', handleExpenseSubmit);
    
    // File upload
    elements.receiptFile.addEventListener('change', handleFileSelect);
    elements.removeFile.addEventListener('click', handleRemoveFile);
    
    // Drag and drop
    elements.fileUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.fileUploadArea.style.borderColor = 'var(--primary)';
    });
    
    elements.fileUploadArea.addEventListener('dragleave', () => {
        elements.fileUploadArea.style.borderColor = 'var(--border-color)';
    });
    
    elements.fileUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.fileUploadArea.style.borderColor = 'var(--border-color)';
        
        if (e.dataTransfer.files.length) {
            elements.receiptFile.files = e.dataTransfer.files;
            handleFileSelect({ target: elements.receiptFile });
        }
    });
    
    // Refresh button
    elements.refreshBtn.addEventListener('click', loadExpenses);
    
    // Modal
    elements.modalClose.addEventListener('click', closeModal);
    elements.detailsModal.addEventListener('click', (e) => {
        if (e.target === elements.detailsModal) {
            closeModal();
        }
    });
    
    // Escape key to close modal
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
}

// =============================================
// Initialize Application
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('TechCorp Expense Tracker - Initializing...');
    
    // Load Supabase client from CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.onload = () => {
        initSupabase();
        console.log('Supabase client loaded');
    };
    document.head.appendChild(script);
    
    initEventListeners();
    
    console.log('TechCorp Expense Tracker - Ready!');
});

// Make showExpenseDetails globally available
window.showExpenseDetails = showExpenseDetails;
