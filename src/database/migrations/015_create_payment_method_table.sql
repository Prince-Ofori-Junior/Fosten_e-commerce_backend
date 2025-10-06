CREATE TABLE IF NOT EXISTS payment_methods (
    code VARCHAR(50) PRIMARY KEY,   -- 'card', 'momo', 'cod'
    label VARCHAR(100) NOT NULL,    -- e.g. 'Payment Card'
    description TEXT,
    icon VARCHAR(255),              -- icon path like '/uploads/payment-icons/card.png'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
