// =============================================
// TechCorp Expense Tracker - Configuration
// =============================================

const CONFIG = {
    // Supabase Configuration
    SUPABASE_URL: 'https://iwgjhbtsjkhomvvlysln.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3Z2poYnRzamtob212dmx5c2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NjY0MjgsImV4cCI6MjA3NTQ0MjQyOH0.PJxCqGConjxbwNPgIBBHegey9CDt9DrI1qLD95ALTW0',
    
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
