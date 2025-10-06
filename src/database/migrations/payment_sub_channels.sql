CREATE TABLE IF NOT EXISTS payment_sub_channels (
    id SERIAL PRIMARY KEY,
    method_code VARCHAR(50) REFERENCES payment_methods(code) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,      -- e.g. 'visa', 'mastercard', 'mtn', 'vodafone'
    label VARCHAR(100) NOT NULL,    -- e.g. 'Visa', 'Vodafone Cash'
    description TEXT,
    icon VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (method_code, code)
);
