-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================== ORDER_ITEMS TABLE ==================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- safer unique ID
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for faster queries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_items_order') THEN
        CREATE INDEX idx_order_items_order ON order_items(order_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_order_items_product') THEN
        CREATE INDEX idx_order_items_product ON order_items(product_id);
    END IF;
END $$;
