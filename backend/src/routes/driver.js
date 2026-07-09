const express = require('express');
const { query } = require('../config/database');
const { auth, isDriver } = require('../middleware/auth');

const router = express.Router();

router.put('/location', auth, isDriver, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    query(
      'UPDATE drivers SET current_lat = ?, current_lng = ? WHERE user_id = ?',
      [lat, lng, req.user.id]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar ubicación' });
  }
});

router.put('/status', auth, isDriver, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['available', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }
    const result = query(
      'UPDATE drivers SET status = ? WHERE user_id = ? RETURNING *',
      [status, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

router.get('/rides/pending', auth, isDriver, async (req, res) => {
  try {
    const result = query(
      `SELECT r.*, u.name as passenger_name, u.phone as passenger_phone
       FROM rides r
       JOIN users u ON r.passenger_id = u.id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
});

router.post('/rides/:id/accept', auth, isDriver, async (req, res) => {
  try {
    const driver = query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    if (driver.rows.length === 0) {
      return res.status(404).json({ error: 'Conductor no encontrado' });
    }

    const result = query(
      `UPDATE rides SET driver_id = ?, status = 'accepted' 
       WHERE id = ? AND status = 'pending' RETURNING *`,
      [driver.rows[0].id, req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Viaje no disponible' });
    }

    query('UPDATE drivers SET status = ? WHERE id = ?', ['busy', driver.rows[0].id]);

    const io = req.app.get('io');
    if (io) {
      io.emit('ride_accepted', { ride: result.rows[0], driver_id: req.user.id });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al aceptar viaje' });
  }
});

router.post('/rides/:id/start', auth, isDriver, async (req, res) => {
  try {
    const driver = query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    const result = query(
      `UPDATE rides SET status = 'in_progress' 
       WHERE id = ? AND driver_id = ? AND status = 'accepted' RETURNING *`,
      [req.params.id, driver.rows[0].id]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No se puede iniciar este viaje' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar viaje' });
  }
});

router.post('/rides/:id/complete', auth, isDriver, async (req, res) => {
  try {
    const { fare_final } = req.body;
    const driver = query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    
    const result = query(
      `UPDATE rides SET status = 'completed', fare_final = ?, completed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND driver_id = ? AND status = 'in_progress' RETURNING *`,
      [fare_final, req.params.id, driver.rows[0].id]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No se puede completar este viaje' });
    }

    query('UPDATE drivers SET status = ? WHERE id = ?', ['available', driver.rows[0].id]);

    if (result.rows[0].payment_method === 'mercadopago_transfer') {
      query(
        'INSERT INTO payments (ride_id, amount, method, status) VALUES (?, ?, ?, ?)',
        [result.rows[0].id, fare_final, 'mercadopago_transfer', 'pending']
      );
    } else {
      query(
        'INSERT INTO payments (ride_id, amount, method, status) VALUES (?, ?, ?, ?)',
        [result.rows[0].id, fare_final, 'cash', 'completed']
      );
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ride_completed', { ride: result.rows[0] });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al completar viaje' });
  }
});

router.get('/earnings', auth, isDriver, async (req, res) => {
  try {
    const driver = query('SELECT id FROM drivers WHERE user_id = ?', [req.user.id]);
    const result = query(
      `SELECT 
         COUNT(*) as total_rides,
         COALESCE(SUM(fare_final), 0) as total_earnings,
         COALESCE(AVG(fare_final), 0) as avg_fare
       FROM rides 
       WHERE driver_id = ? AND status = 'completed' 
       AND completed_at >= DATE('now')`,
      [driver.rows[0].id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener ganancias' });
  }
});

module.exports = router;
