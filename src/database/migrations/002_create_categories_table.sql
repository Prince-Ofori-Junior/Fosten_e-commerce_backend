CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================
-- 📂 CATEGORIES TABLE
-- ==============================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Helpful index for sorting & lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_categories_name') THEN
        CREATE INDEX idx_categories_name ON categories(name);
    END IF;
END $$;