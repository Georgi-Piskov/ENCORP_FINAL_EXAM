// =============================================
// TechCorp Expense Tracker - Main Application
// =============================================

// State Management
const state = {
    currentUser: null,
    expenses: [],
    isLoading: false,
    autoRefreshInterval: null
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
    headerLogoutBtn: document.getElementById('headerLogoutBtn'),
    
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
    inputMode: document.getElementById('inputMode'),
    
    // Manual Entry Fields
    manualMerchant: document.getElementById('manualMerchant'),
    manualReceiptNumber: document.getElementById('manualReceiptNumber'),
    manualDate: document.getElementById('manualDate'),
    manualAmount: document.getElementById('manualAmount'),
    manualCurrency: document.getElementById('manualCurrency'),
    manualCategory: document.getElementById('manualCategory'),
    manualDescription: document.getElementById('manualDescription'),
    
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),
    
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
    
    // Director Dashboard
    directorSection: document.getElementById('directorSection'),
    chatMessages: document.getElementById('chatMessages'),
    chatInput: document.getElementById('chatInput'),
    sendChatBtn: document.getElementById('sendChatBtn'),
    dirTotalExpenses: document.getElementById('dirTotalExpenses'),
    dirTotalCount: document.getElementById('dirTotalCount'),
    dirApprovedCount: document.getElementById('dirApprovedCount'),
    dirPendingCount: document.getElementById('dirPendingCount'),
    dirRejectedCount: document.getElementById('dirRejectedCount'),
    pendingList: document.getElementById('pendingList'),
    noPendingMessage: document.getElementById('noPendingMessage'),
    
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
    
    // Scroll to message so user can see it
    element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Auto hide after 8 seconds (longer for better visibility)
    setTimeout(() => {
        element.classList.add('hidden');
    }, 8000);
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
        
        // Check if user is admin/director (is_admin flag OR ID starts with FIN)
        const isDirector = user.is_admin === true || 
                          (user.employee_id && user.employee_id.toUpperCase().startsWith('FIN'));
        
        if (isDirector) {
            showDirectorDashboard();
            // Hide expense form for directors - they only view/analyze
            elements.expenseSection.classList.add('hidden');
        }
        
        // Make login form read-only
        elements.firstName.disabled = true;
        elements.lastName.disabled = true;
        elements.employeeId.disabled = true;
        elements.loginForm.querySelector('button').textContent = 'Изход';
        elements.loginForm.querySelector('button').innerHTML = '<i class="fas fa-sign-out-alt"></i> Изход';
        
        showMessage(elements.loginMessage, `Добре дошли, ${firstName} ${lastName}!`, 'success');
        
        // Load expenses
        await loadExpenses();
        
        // Start auto-refresh every 30 seconds
        startAutoRefresh();
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(elements.loginMessage, 'Грешка при вход. Моля, опитайте отново.', 'error');
    }
    
    hideLoading();
}

function handleLogout() {
    state.currentUser = null;
    state.expenses = [];
    
    // Stop auto-refresh
    stopAutoRefresh();
    
    // Reset UI
    updateUserStatus(false);
    elements.expenseSection.classList.add('hidden');
    elements.historySection.classList.add('hidden');
    
    // Hide director dashboard
    if (elements.directorSection) {
        elements.directorSection.classList.add('hidden');
    }
    
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
        // Show logout button
        if (elements.headerLogoutBtn) {
            elements.headerLogoutBtn.classList.remove('hidden');
        }
    } else {
        statusDot.classList.remove('online');
        statusDot.classList.add('offline');
        statusText.textContent = 'Не сте влезли';
        // Hide logout button
        if (elements.headerLogoutBtn) {
            elements.headerLogoutBtn.classList.add('hidden');
        }
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
// Tab Functions
// =============================================
function initTabs() {
    elements.tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update active tab button
            elements.tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active tab content
            elements.tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId + 'Tab').classList.add('active');
            
            // Update input mode
            elements.inputMode.value = tabId;
        });
    });
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
    
    const inputMode = elements.inputMode.value;
    const formData = new FormData();
    
    // Common data
    formData.append('firstName', state.currentUser.first_name);
    formData.append('lastName', state.currentUser.last_name);
    formData.append('employeeId', state.currentUser.employee_id);
    formData.append('userId', state.currentUser.id);
    formData.append('inputMode', inputMode);
    
    if (inputMode === 'receipt') {
        // Receipt mode - upload image
        const file = elements.receiptFile.files[0];
        const comment = elements.comment.value.trim();
        
        if (!file && !comment) {
            showMessage(elements.expenseMessage, 'Моля, качете снимка или добавете коментар.', 'error');
            return;
        }
        
        if (file) {
            formData.append('receipt', file);
        }
        formData.append('comment', comment);
        
    } else {
        // Manual mode - validate required fields
        const merchant = elements.manualMerchant.value.trim();
        const receiptNumber = elements.manualReceiptNumber ? elements.manualReceiptNumber.value.trim() : '';
        const date = elements.manualDate.value;
        const amount = elements.manualAmount.value;
        const currency = elements.manualCurrency.value;
        const category = elements.manualCategory.value;
        const description = elements.manualDescription.value.trim();
        
        if (!merchant || !date || !amount || !category || !description) {
            showMessage(elements.expenseMessage, 'Моля, попълнете всички задължителни полета.', 'error');
            return;
        }
        
        if (parseFloat(amount) <= 0) {
            showMessage(elements.expenseMessage, 'Моля, въведете валидна сума.', 'error');
            return;
        }
        
        formData.append('merchant', merchant);
        formData.append('receiptNumber', receiptNumber);
        formData.append('date', date);
        formData.append('amount', amount);
        formData.append('currency', currency);
        formData.append('category', category);
        formData.append('description', description);
    }
    
    showLoading();
    
    try {
        // Send to n8n webhook
        if (CONFIG.N8N_WEBHOOK_URL !== 'YOUR_N8N_WEBHOOK_URL') {
            const response = await fetch(CONFIG.N8N_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Webhook request failed with status: ' + response.status);
            }
            
            // Try to parse JSON response, handle empty or invalid responses
            let result;
            const responseText = await response.text();
            console.log('n8n RAW response text:', responseText);
            
            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch (parseError) {
                console.warn('Could not parse JSON response:', parseError);
                // If we can't parse but response was OK, assume success
                result = { success: true, message: 'Разходът е записан успешно!' };
            }
            
            console.log('n8n parsed response:', JSON.stringify(result));
            
            // Функция за извличане на реалните данни от n8n отговора
            function extractData(obj) {
                if (!obj || typeof obj !== 'object') return obj;
                
                // Ако има директно error или success поле, това са данните
                if (obj.hasOwnProperty('error') || obj.hasOwnProperty('success') || obj.hasOwnProperty('errorCode')) {
                    return obj;
                }
                
                // Ако е масив, вземаме първия елемент
                if (Array.isArray(obj)) {
                    return extractData(obj[0]);
                }
                
                // Вземаме първия ключ и проверяваме дали стойността е обект
                const keys = Object.keys(obj);
                if (keys.length >= 1) {
                    const firstValue = obj[keys[0]];
                    if (firstValue && typeof firstValue === 'object') {
                        // Рекурсивно извличаме
                        return extractData(firstValue);
                    }
                }
                
                return obj;
            }
            
            let data = extractData(result);
            console.log('Extracted data:', JSON.stringify(data));
            console.log('data.error:', data.error, 'data.success:', data.success, 'data.errorCode:', data.errorCode);
            
            // Проверяваме за грешка
            const isError = data.error === true || 
                           data.success === false || 
                           data.errorCode === 'INVALID_RECEIPT' ||
                           data.valid === false;
            
            console.log('isError result:', isError);
            
            if (isError) {
                // Показваме грешката с детайли
                let errorMessage = data.message || 'Грешка при обработка на разхода.';
                if (data.details) {
                    errorMessage += '\n\n📋 Детайли: ' + data.details;
                }
                if (data.error_reason) {
                    errorMessage += '\n\n📋 Причина: ' + data.error_reason;
                }
                if (data.suggestions && typeof data.suggestions === 'object') {
                    const suggestionsArr = Object.values(data.suggestions);
                    if (suggestionsArr.length > 0) {
                        errorMessage += '\n\n💡 Съвети:\n• ' + suggestionsArr.join('\n• ');
                    }
                } else if (Array.isArray(data.suggestions)) {
                    errorMessage += '\n\n💡 Съвети:\n• ' + data.suggestions.join('\n• ');
                }
                showMessage(elements.expenseMessage, errorMessage, 'error');
            } else {
                // Show appropriate message based on status
                let messageType = 'success';
                let message = data.message || 'Разходът е записан успешно!';
                
                if (data.expense && data.expense.status === 'Rejected') {
                    messageType = 'error';
                    message = `${data.message}\nПричина: ${data.expense.status_reason || 'Не отговаря на фирмената политика'}`;
                } else if (data.expense && data.expense.status === 'Manual Review') {
                    messageType = 'warning';
                }
                
                showMessage(elements.expenseMessage, message, messageType);
                
                // Reset form
                resetExpenseForm();
                
                // Reload expenses after a short delay
                setTimeout(() => loadExpenses(), 2000);
            }
        } else {
            // Demo mode
            console.log('Demo mode: Симулация на изпращане на разход', formData);
            showMessage(elements.expenseMessage, 'Demo режим: n8n webhook не е конфигуриран.', 'error');
        }
        
    } catch (error) {
        console.error('Expense submit error:', error);
        showMessage(elements.expenseMessage, 'Грешка при изпращане на разхода. Моля, опитайте отново.', 'error');
    }
    
    hideLoading();
}

function resetExpenseForm() {
    elements.expenseForm.reset();
    handleRemoveFile();
    
    // Set today's date as default for manual entry
    const today = new Date().toISOString().split('T')[0];
    if (elements.manualDate) {
        elements.manualDate.value = today;
    }
}

// =============================================
// Auto-Refresh Functions
// =============================================
function startAutoRefresh() {
    // Clear any existing interval
    stopAutoRefresh();
    
    // Refresh every 30 seconds
    state.autoRefreshInterval = setInterval(async () => {
        if (state.currentUser && !state.isLoading) {
            console.log('Auto-refreshing data...');
            await loadExpenses();
            
            // If user is director, also refresh director stats and pending list
            const isDirector = state.currentUser.is_admin === true || 
                              (state.currentUser.employee_id && state.currentUser.employee_id.toUpperCase().startsWith('FIN'));
            if (isDirector) {
                await loadDirectorStats();
                await loadPendingApprovals();
            }
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (state.autoRefreshInterval) {
        clearInterval(state.autoRefreshInterval);
        state.autoRefreshInterval = null;
    }
}

async function loadExpenses() {
    if (!state.currentUser) return;
    
    showLoading();
    
    try {
        if (supabase) {
            // First try to get expenses by user_id
            let { data, error } = await supabase
                .from('expenses')
                .select('*')
                .eq('user_id', state.currentUser.id)
                .order('created_at', { ascending: false });
            
            // If no expenses found by user_id, try without filter (for records with null user_id)
            if ((!data || data.length === 0) && !error) {
                const allExpenses = await supabase
                    .from('expenses')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (!allExpenses.error) {
                    data = allExpenses.data;
                }
            }
            
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
    
    // Initialize tabs
    initTabs();
    
    // File upload (receipt mode)
    elements.receiptFile.addEventListener('change', handleFileSelect);
    elements.removeFile.addEventListener('click', handleRemoveFile);
    
    // Set default date for manual entry
    if (elements.manualDate) {
        elements.manualDate.value = new Date().toISOString().split('T')[0];
    }
    
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
    
    // Header logout button
    if (elements.headerLogoutBtn) {
        elements.headerLogoutBtn.addEventListener('click', handleLogout);
    }
    
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
    
    // Director Chat
    if (elements.sendChatBtn) {
        elements.sendChatBtn.addEventListener('click', handleSendChat);
    }
    if (elements.chatInput) {
        elements.chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleSendChat();
            }
        });
    }
}

// =============================================
// Director Dashboard Functions
// =============================================

function showDirectorDashboard() {
    if (elements.directorSection) {
        elements.directorSection.classList.remove('hidden');
        loadDirectorStats();
        loadPendingApprovals();
    }
}

async function loadDirectorStats() {
    if (!supabase) return;
    
    try {
        // Get all expenses for stats
        const { data: expenses, error } = await supabase
            .from('expenses')
            .select('*');
        
        if (error) throw error;
        
        if (expenses && expenses.length > 0) {
            const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const approved = expenses.filter(e => e.status === 'Approved');
            const pending = expenses.filter(e => e.status === 'Manual Review');
            const rejected = expenses.filter(e => e.status === 'Rejected');
            
            if (elements.dirTotalExpenses) {
                elements.dirTotalExpenses.textContent = formatCurrency(total);
            }
            if (elements.dirTotalCount) {
                elements.dirTotalCount.textContent = expenses.length;
            }
            if (elements.dirApprovedCount) {
                elements.dirApprovedCount.textContent = approved.length;
            }
            if (elements.dirPendingCount) {
                elements.dirPendingCount.textContent = pending.length;
            }
            if (elements.dirRejectedCount) {
                elements.dirRejectedCount.textContent = rejected.length;
            }
        } else {
            // Reset all stats to 0 if no expenses
            if (elements.dirTotalExpenses) elements.dirTotalExpenses.textContent = '0.00 лв';
            if (elements.dirTotalCount) elements.dirTotalCount.textContent = '0';
            if (elements.dirApprovedCount) elements.dirApprovedCount.textContent = '0';
            if (elements.dirPendingCount) elements.dirPendingCount.textContent = '0';
            if (elements.dirRejectedCount) elements.dirRejectedCount.textContent = '0';
        }
    } catch (error) {
        console.error('Error loading director stats:', error);
    }
}

async function handleSendChat() {
    const message = elements.chatInput.value.trim();
    if (!message) return;
    
    // Add user message to chat
    addChatMessage(message, 'user');
    elements.chatInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        // Check if webhook is configured
        if (CONFIG.N8N_DIRECTOR_CHAT_URL === 'YOUR_DIRECTOR_CHAT_WEBHOOK_URL') {
            hideTypingIndicator();
            addChatMessage('⚠️ AI чатът не е конфигуриран. Моля, добавете N8N_DIRECTOR_CHAT_URL в config.js', 'assistant');
            return;
        }
        
        // Send to n8n webhook
        const response = await fetch(CONFIG.N8N_DIRECTOR_CHAT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                userId: state.currentUser?.id,
                userName: `${state.currentUser?.first_name} ${state.currentUser?.last_name}`,
                timestamp: new Date().toISOString()
            })
        });
        
        hideTypingIndicator();
        
        if (!response.ok) {
            throw new Error('Chat request failed');
        }
        
        const result = await response.json();
        
        // Extract the response message (handle various n8n response formats)
        let botResponse = 'Не можах да обработя заявката.';
        
        if (typeof result === 'string') {
            botResponse = result;
        } else if (result.message) {
            botResponse = result.message;
        } else if (result.response) {
            botResponse = result.response;
        } else if (result.output) {
            botResponse = result.output;
        } else if (result.text) {
            botResponse = result.text;
        } else if (result.answer) {
            botResponse = result.answer;
        } else {
            // Try to find any string value in the response
            const keys = Object.keys(result);
            for (const key of keys) {
                if (typeof result[key] === 'string' && result[key].length > 10) {
                    botResponse = result[key];
                    break;
                }
            }
        }
        
        addChatMessage(botResponse, 'assistant');
        
    } catch (error) {
        hideTypingIndicator();
        console.error('Chat error:', error);
        addChatMessage('❌ Грешка при комуникация със сървъра. Моля, опитайте отново.', 'assistant');
    }
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';
    
    messageDiv.innerHTML = `
        <div class="message-avatar"><i class="fas ${avatarIcon}"></i></div>
        <div class="message-content">
            <p>${formatChatMessage(message)}</p>
        </div>
    `;
    
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function formatChatMessage(message) {
    // Convert line breaks to <br> and handle basic markdown
    return message
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant';
    typingDiv.id = 'typingIndicator';
    typingDiv.innerHTML = `
        <div class="message-avatar"><i class="fas fa-robot"></i></div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span><span></span><span></span>
            </div>
        </div>
    `;
    elements.chatMessages.appendChild(typingDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

// =============================================
// Pending Approvals Functions
// =============================================

async function loadPendingApprovals() {
    if (!supabase || !elements.pendingList) return;
    
    try {
        // Get all expenses with Manual Review status
        const { data: pending, error } = await supabase
            .from('expenses')
            .select('*, users(first_name, last_name)')
            .eq('status', 'Manual Review')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        console.log('Loaded pending expenses:', pending);
        
        if (!pending || pending.length === 0) {
            elements.pendingList.innerHTML = '';
            elements.noPendingMessage.classList.remove('hidden');
            return;
        }
        
        elements.noPendingMessage.classList.add('hidden');
        elements.pendingList.innerHTML = pending.map(expense => renderPendingItem(expense)).join('');
        
    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

function renderPendingItem(expense) {
    const userName = expense.users 
        ? `${expense.users.first_name} ${expense.users.last_name}`
        : 'Неизвестен';
    
    const categoryName = CONFIG.CATEGORIES[expense.category] || expense.category || 'Други';
    
    return `
        <div class="pending-item" id="pending-${expense.id}">
            <div class="pending-info">
                <div class="pending-merchant">${expense.merchant || 'Неизвестен търговец'}</div>
                <div class="pending-details">
                    <span><i class="fas fa-user"></i> ${userName}</span>
                    <span><i class="fas fa-tag"></i> ${categoryName}</span>
                    <span><i class="fas fa-calendar"></i> ${formatDate(expense.receipt_date)}</span>
                </div>
                <div class="pending-amount">${formatCurrency(expense.amount, expense.currency)}</div>
                ${expense.status_reason ? `<div class="pending-reason"><i class="fas fa-info-circle"></i> ${expense.status_reason}</div>` : ''}
                ${expense.description ? `<div class="pending-description" style="margin-top: 8px; font-size: 0.9rem; color: #666;"><i class="fas fa-comment"></i> ${expense.description}</div>` : ''}
            </div>
            <div class="pending-actions">
                <button class="btn-approve" onclick="approveExpense('${expense.id}')">
                    <i class="fas fa-check"></i> Одобри
                </button>
                <button class="btn-reject" onclick="rejectExpense('${expense.id}')">
                    <i class="fas fa-times"></i> Откажи
                </button>
            </div>
        </div>
    `;
}

async function approveExpense(expenseId) {
    console.log('Approving expense via n8n:', expenseId);
    
    try {
        const response = await fetch(CONFIG.N8N_APPROVE_REJECT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'approve',
                expenseId: expenseId,
                reason: 'Ръчно одобрен от финансов директор'
            })
        });
        
        if (!response.ok) {
            throw new Error('Webhook request failed');
        }
        
        const result = await response.json();
        console.log('Approve response:', result);
        
        if (result.success) {
            // Remove item from list with animation
            const item = document.getElementById(`pending-${expenseId}`);
            if (item) {
                item.style.animation = 'fadeOut 0.3s ease';
                setTimeout(async () => {
                    item.remove();
                    checkEmptyPending();
                    await loadDirectorStats();
                }, 300);
            }
        } else {
            throw new Error(result.message || 'Неуспешно одобрение');
        }
        
    } catch (error) {
        console.error('Error approving expense:', error);
        alert('Грешка при одобряване на разхода: ' + error.message);
    }
}

async function rejectExpense(expenseId) {
    const reason = prompt('Причина за отказ (незадължително):');
    if (reason === null) return; // User cancelled
    
    console.log('Rejecting expense via n8n:', expenseId);
    
    try {
        const response = await fetch(CONFIG.N8N_APPROVE_REJECT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'reject',
                expenseId: expenseId,
                reason: reason || 'Отказан от финансов директор'
            })
        });
        
        if (!response.ok) {
            throw new Error('Webhook request failed');
        }
        
        const result = await response.json();
        console.log('Reject response:', result);
        
        if (result.success) {
            // Remove item from list with animation
            const item = document.getElementById(`pending-${expenseId}`);
            if (item) {
                item.style.animation = 'fadeOut 0.3s ease';
                setTimeout(async () => {
                    item.remove();
                    checkEmptyPending();
                    await loadDirectorStats();
                }, 300);
            }
        } else {
            throw new Error(result.message || 'Неуспешен отказ');
        }
        
    } catch (error) {
        console.error('Error rejecting expense:', error);
        alert('Грешка при отказване на разхода: ' + error.message);
    }
}

function checkEmptyPending() {
    if (elements.pendingList && elements.pendingList.children.length === 0) {
        elements.noPendingMessage.classList.remove('hidden');
    }
}

// Make functions globally available
window.approveExpense = approveExpense;
window.rejectExpense = rejectExpense;

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
