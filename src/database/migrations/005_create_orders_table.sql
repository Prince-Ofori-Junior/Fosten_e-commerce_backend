-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================== ORDERS TABLE ==================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),       -- unique order ID
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who placed the order
    address VARCHAR(255) NOT NULL,                        -- delivery address
    
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'failed')), 
    
    approved_by_admin BOOLEAN DEFAULT false,              -- track if admin approved order
    
    total_amount NUMERIC(10,2) DEFAULT 0.00,              -- calculated order total
    payment_method VARCHAR(50) DEFAULT 'paystack',        -- payment method (paystack, stripe, cod, etc.)
    payment_channel VARCHAR(50) DEFAULT 'card:visa',      -- payment channel (card, momo, etc.)
    payment_reference VARCHAR(100),                       -- unique reference from payment gateway
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,       -- when order was placed
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP        -- when order was last updated
);

-- Indexes for fast lookup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_orders_user') THEN
        CREATE INDEX idx_orders_user ON orders(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_orders_status') THEN
        CREATE INDEX idx_orders_status ON orders(status);
    END IF;
END $$;
