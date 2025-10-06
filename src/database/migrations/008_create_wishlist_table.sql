-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================== WISHLIST TABLE ==================
CREATE TABLE IF NOT EXISTS wishlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_product UNIQUE (user_id, product_id)
);

-- Indexes for fast lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_wishlist_user') THEN
        CREATE INDEX idx_wishlist_user ON wishlists(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_wishlist_product') THEN
        CREATE INDEX idx_wishlist_product ON wishlists(product_id);
    END IF;
END $$;
