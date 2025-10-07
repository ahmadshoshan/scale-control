CREATE DATABASE scale_control;

USE scale_control;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL
);

-- إضافة مستخدم جديد (استبدل القيمة بالرمز المشفر باستخدام bcrypt)
INSERT INTO users (username, password) VALUES ('admin', '$2b$10$vjT1u7fSsQsiq7dMr61rdOwvBTe/JA3KyPETYSIaW4kSIqSXWXEzu');