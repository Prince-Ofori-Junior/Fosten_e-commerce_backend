-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================== NOTIFICATIONS ==================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    target_user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- optional link to users
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for fast lookups
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_notifications_target_user') THEN
        CREATE INDEX idx_notifications_target_user ON notifications(target_user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_notifications_is_read') THEN
        CREATE INDEX idx_notifications_is_read ON notifications(is_read);
    END IF;
END $$;
