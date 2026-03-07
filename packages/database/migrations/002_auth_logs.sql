-- Add auth_logs table for tracking failed authentication attempts
-- This supports Requirement 10.5: Failed authentication logging

CREATE TABLE auth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason VARCHAR(500) NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying recent failed attempts by username
CREATE INDEX idx_auth_logs_username_timestamp ON auth_logs(username, timestamp DESC);
