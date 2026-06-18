-- Default user (Part 2.4). Created automatically on load.
-- Credentials:  username: admin  |  email: admin@example.com  |  password: Admin123!
-- The password is stored as a bcrypt hash, never in plaintext.
-- ON DUPLICATE KEY UPDATE makes this idempotent (safe to run on every startup).

USE appdb;

INSERT INTO users (username, email, password_hash)
VALUES ('admin', 'admin@example.com', '$2b$10$LBvi/AEomjP2iBtwCPlSKeK1fxDRLv41UvWQYidsJw1aIl4U35co2')
ON DUPLICATE KEY UPDATE username = username;
