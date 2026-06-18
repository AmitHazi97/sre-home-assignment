-- Database structure (imported automatically on load by the API init function)

CREATE DATABASE IF NOT EXISTS appdb;
USE appdb;

CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(64)  NOT NULL UNIQUE,
  email         VARCHAR(128) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auth tokens are stored in the DB and sent back as HTTP headers by the client.
CREATE TABLE IF NOT EXISTS tokens (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT NOT NULL,
  token      VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);
