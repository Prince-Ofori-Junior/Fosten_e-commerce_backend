CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================
-- 🛒 PRODUCTS TABLE
-- ==============================
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),          -- unique product ID
    name VARCHAR(255) NOT NULL,                              -- product name
    description TEXT,                                        -- product description
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),         -- price must be non-negative
    stock INT NOT NULL CHECK (stock >= 0),                   -- stock quantity
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL, -- linked category
    image_url TEXT,                                          -- image file path or URL
    type VARCHAR(50) CHECK (type IN ('Physical', 'Digital', 'Service')), -- product type
    is_active BOOLEAN DEFAULT TRUE,                          -- soft delete flag
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,           -- created timestamp
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP            -- last updated timestamp
); 

-- Helpful indexes for performance
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_category') THEN
        CREATE INDEX idx_products_category ON products(category_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_name') THEN
        CREATE INDEX idx_products_name ON products(name);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_type') THEN
        CREATE INDEX idx_products_type ON products(type);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_products_active') THEN
        CREATE INDEX idx_products_active ON products(is_active);
    END IF;
END $$;