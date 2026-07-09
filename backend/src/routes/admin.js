const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { auth, isAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(auth, isAdmin);

router.get('/rides', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let sql = `
      SELECT r.*, u.name as passenger_name, 
             d.name as driver_name, d2.plate
      FROM rides r
      JOIN users u ON r.passenger_id = u.id
      LEFT JOIN drivers d2 ON r.driver_id = d2.id
      LEFT JOIN users d ON d2.user_id = d.id
    `;
    const params = [];
    
    if (status) {
      sql += ' WHERE r.status = ?';
      params.push(status);
    }
    
    sql += ` ORDER BY r.created_at DESC LIMIT ?`;
    params.push(limit);

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
});

router.get('/drivers', async (req, res) => {
  try {
    const result = await query(
      `SELECT d.*, u.name, u.email, u.phone
       FROM drivers d
       JOIN users u ON d.user_id = u.id
       ORDER BY d.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener conductores' });
  }
});

router.post('/drivers', async (req, res) => {
  try {
    const { name, email, phone, password, plate, license, vehicle_type } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email ya registrado' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await query(
      'INSERT INTO users (name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [name, email, phone, password_hash, 'driver']
    );

    const userId = userResult.rows[0].id;

    const driverResult = await query(
      'INSERT INTO drivers (user_id, vehicle_type, plate, license, approved) VALUES (?, ?, ?, ?, 1) RETURNING *',
      [userId, vehicle_type || 'sedan', plate, license]
    );

    res.status(201).json({
      id: driverResult.rows[0].id,
      user_id: userId,
      name,
      email,
      phone,
      plate,
      license,
      vehicle_type: vehicle_type || 'sedan',
      approved: 1
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear conductor' });
  }
});

router.put('/drivers/:id/approve', async (req, res) => {
  try {
    const result = await query(
      'UPDATE drivers SET approved = 1 WHERE id = ? RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al aprobar conductor' });
  }
});

router.put('/drivers/:id/reject', async (req, res) => {
  try {
    const result = await query(
      'UPDATE drivers SET approved = 0 WHERE id = ? RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al rechazar conductor' });
  }
});

router.put('/pricing', async (req, res) => {
  try {
    const { base_fare, per_km, per_minute, minimum_fare } = req.body;
    const result = await query(
      `UPDATE pricing SET 
        base_fare = COALESCE(?, base_fare),
        per_km = COALESCE(?, per_km),
        per_minute = COALESCE(?, per_minute),
        minimum_fare = COALESCE(?, minimum_fare),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = (SELECT id FROM pricing ORDER BY id DESC LIMIT 1)
       RETURNING *`,
      [base_fare, per_km, per_minute, minimum_fare]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar tarifas' });
  }
});

router.get('/reports/daily', async (req, res) => {
  try {
    const result = await query(
      `SELECT 
         DATE(completed_at) as date,
         COUNT(*) as total_rides,
         COALESCE(SUM(fare_final), 0) as total_revenue,
         COALESCE(AVG(fare_final), 0) as avg_fare,
         COUNT(CASE WHEN payment_method = 'cash' THEN 1 END) as cash_rides,
         COUNT(CASE WHEN payment_method = 'mercadopago_transfer' THEN 1 END) as mp_rides
       FROM rides 
       WHERE status = 'completed'
       GROUP BY DATE(completed_at)
       ORDER BY date DESC
       LIMIT 30`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener reportes' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const rides = await query(`SELECT COUNT(*) as total, COALESCE(SUM(fare_final), 0) as revenue FROM rides WHERE status = 'completed'`);
    const drivers = await query(`SELECT COUNT(*) as total, COUNT(CASE WHEN status = 'available' THEN 1 END) as available FROM drivers WHERE approved = 1`);
    const active = await query(`SELECT COUNT(*) as active FROM rides WHERE status IN ('pending', 'accepted', 'in_progress')`);
    
    res.json({
      rides: rides.rows[0],
      drivers: drivers.rows[0],
      active_rides: active.rows[0].active
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
