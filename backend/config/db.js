const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'farm_operations',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const initDB = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database.');

    // Users Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'user') NOT NULL,
        name VARCHAR(255)
      )
    `);

    // Trainees Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS trainees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        group_name VARCHAR(255),
        efficiency VARCHAR(50),
        status VARCHAR(50)
      )
    `);

    // Farm Tasks Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS farm_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        zone VARCHAR(255),
        urgency VARCHAR(50),
        status VARCHAR(50),
        scheduled_date DATE,
        assignee VARCHAR(255)
      )
    `);

    // Crops Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS crops (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        stage VARCHAR(255),
        health VARCHAR(255),
        type VARCHAR(255),
        image VARCHAR(1000)
      )
    `);

    // Seed Crops if empty
    const [cropRows] = await connection.query('SELECT count(*) as count FROM crops');
    if (cropRows[0].count === 0) {
      await connection.query(`
        INSERT INTO crops (name, stage, health, type, image) VALUES 
        ('Tomatoes', 'Flowering', 'Healthy', 'Vegetable', '/crops/tomato.png'),
        ('Green Chillies', 'Harvesting', 'Healthy', 'Vegetable', '/crops/chilli.png'),
        ('Eggplant', 'Fruiting', 'At Risk', 'Vegetable', '/crops/eggplant.png'),
        ('Cabbage', 'Growth', 'Healthy', 'Vegetable', '/crops/cabbage.png')
      `);
    }

    // Attendance Sessions Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Attendance Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        session_id INT,
        date DATE,
        time TIME,
        status VARCHAR(50),
        activity VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE SET NULL
      )
    `);

    // Inventory Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item VARCHAR(255) NOT NULL,
        category VARCHAR(255),
        stock VARCHAR(50),
        unit VARCHAR(50)
      )
    `);

    // Modules Table (Quiz Questions)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        question TEXT NOT NULL,
        options JSON,
        correct_index INT
      )
    `);

    // Reports Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        type VARCHAR(255),
        data JSON,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings Table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        setting_key VARCHAR(255),
        setting_value VARCHAR(255),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Seed dummy data if tables are empty
    const [userRows] = await connection.query('SELECT count(*) as count FROM users');
    if (userRows[0].count === 0) {
      await connection.query("INSERT INTO users (username, password, role, name) VALUES ('admin', 'admin123', 'admin', 'Admin User'), ('user', 'user123', 'user', 'Demo Trainee')");
    }

    connection.release();
  } catch (err) {
    console.error('Database initialization failed:', err.message);
  }
};

module.exports = { pool, initDB };

