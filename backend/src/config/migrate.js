const isProduction = process.env.NODE_ENV === 'production';

const migrationsSQLite = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'passenger',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  vehicle_type TEXT DEFAULT 'sedan',
  plate TEXT NOT NULL,
  license TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  current_lat REAL,
  current_lng REAL,
  approved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rides (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passenger_id INTEGER,
  driver_id INTEGER,
  status TEXT DEFAULT 'pending',
  pickup_lat REAL NOT NULL,
  pickup_lng REAL NOT NULL,
  pickup_address TEXT,
  dropoff_lat REAL,
  dropoff_lng REAL,
  dropoff_address TEXT,
  fare_estimate REAL,
  fare_final REAL,
  payment_method TEXT DEFAULT 'cash',
  distance_km REAL,
  duration_min INTEGER,
  rating INTEGER,
  rating_comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (passenger_id) REFERENCES users(id),
  FOREIGN KEY (driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id INTEGER,
  amount REAL NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  mp_payment_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ride_id) REFERENCES rides(id)
);

CREATE TABLE IF NOT EXISTS pricing (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  base_fare REAL DEFAULT 500,
  per_km REAL DEFAULT 150,
  per_minute REAL DEFAULT 25,
  minimum_fare REAL DEFAULT 1000,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO pricing (base_fare, per_km, per_minute, minimum_fare)
VALUES (500, 150, 25, 1000);
`;

const migrationsPG = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'passenger',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50) DEFAULT 'sedan',
  plate VARCHAR(20) NOT NULL,
  license VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'offline',
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rides (
  id SERIAL PRIMARY KEY,
  passenger_id INTEGER REFERENCES users(id),
  driver_id INTEGER REFERENCES drivers(id),
  status VARCHAR(20) DEFAULT 'pending',
  pickup_lat DECIMAL(10, 8) NOT NULL,
  pickup_lng DECIMAL(11, 8) NOT NULL,
  pickup_address TEXT,
  dropoff_lat DECIMAL(10, 8),
  dropoff_lng DECIMAL(11, 8),
  dropoff_address TEXT,
  fare_estimate DECIMAL(10, 2),
  fare_final DECIMAL(10, 2),
  payment_method VARCHAR(20) DEFAULT 'cash',
  distance_km DECIMAL(8, 2),
  duration_min INTEGER,
  rating INTEGER,
  rating_comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  ride_id INTEGER REFERENCES rides(id),
  amount DECIMAL(10, 2) NOT NULL,
  method VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  mp_payment_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pricing (
  id SERIAL PRIMARY KEY,
  base_fare DECIMAL(10, 2) DEFAULT 500,
  per_km DECIMAL(10, 2) DEFAULT 150,
  per_minute DECIMAL(10, 2) DEFAULT 25,
  minimum_fare DECIMAL(10, 2) DEFAULT 1000,
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO pricing (base_fare, per_km, per_minute, minimum_fare)
VALUES (500, 150, 25, 1000)
ON CONFLICT DO NOTHING;
`;

async function migrate() {
  if (isProduction) {
    const { pool } = require('./database');
    try {
      await pool.query(migrationsPG);
      console.log('Migración PostgreSQL completada');
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  } else {
    const { db } = require('./database');
    try {
      db.exec(migrationsSQLite);
      console.log('Migración SQLite completada');
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  }
}

migrate();
