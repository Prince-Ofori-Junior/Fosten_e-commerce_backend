-- Login attempts
CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    success BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW()
);

--  ALTER TABLE login_attempts
-- ADD COLUMN ip_address VARCHAR(50);
