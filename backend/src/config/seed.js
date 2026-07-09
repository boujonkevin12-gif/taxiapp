const bcrypt = require('bcryptjs');
const { query } = require('./database');
const isProduction = process.env.NODE_ENV === 'production';

async function seed() {
  try {
    const adminPassword = bcrypt.hashSync('admin123', 10);
    
    const existing = await query('SELECT id FROM users WHERE email = ?', ['admin@taxi.com']);
    
    if (existing.rows.length === 0) {
      await query(
        'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        ['Administrador', 'admin@taxi.com', '00000000', adminPassword, 'admin']
      );
      console.log('Admin creado: admin@taxi.com / admin123');
    } else {
      console.log('Admin ya existe: admin@taxi.com');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error en seed:', error);
    process.exit(1);
  }
}

seed();
