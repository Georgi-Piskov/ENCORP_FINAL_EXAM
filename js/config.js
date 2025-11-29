// =============================================
// TechCorp Expense Tracker - Configuration
// =============================================

const CONFIG = {
    // Supabase Configuration
    // ВАЖНО: Заменете с вашите Supabase credentials
    SUPABASE_URL: 'YOUR_SUPABASE_URL',
    SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    
    // n8n Webhook URL
    // ВАЖНО: Заменете с вашия n8n webhook URL
    N8N_WEBHOOK_URL: 'YOUR_N8N_WEBHOOK_URL',
    
    // File upload settings
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    
    // Currency
    DEFAULT_CURRENCY: 'BGN',
    
    // Categories (for display)
    CATEGORIES: {
        'food': 'Храна',
        'business_meal': 'Служебен обяд/вечеря',
        'transport': 'Градски транспорт/Такси',
        'travel': 'Командировка',
        'equipment': 'Оборудване',
        'training': 'Обучение/Курсове',
        'cigarettes': 'Цигари',
        'other': 'Други'
    },
    
    // Status labels (for display)
    STATUSES: {
        'Approved': 'Одобрен',
        'Rejected': 'Отказан',
        'Manual Review': 'Чака одобрение'
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
