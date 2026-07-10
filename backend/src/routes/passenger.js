const express = require('express');
const { query } = require('../config/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/pricing', async (req, res) => {
  try {
    const result = await query('SELECT * FROM pricing ORDER BY id DESC LIMIT 1');
    res.json(result.rows[0] || { base_fare: 500, per_km: 150, per_minute: 25, minimum_fare: 1000 });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener tarifas' });
  }
});

router.post('/estimate', async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng } = req.body;
    
    const pricing = await query('SELECT * FROM pricing ORDER BY id DESC LIMIT 1');
    const p = pricing.rows[0] || { base_fare: 500, per_km: 150, per_minute: 25, minimum_fare: 1000 };

    const R = 6371;
    const dLat = (dropoff_lat - pickup_lat) * Math.PI / 180;
    const dLng = (dropoff_lng - pickup_lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pickup_lat * Math.PI / 180) * Math.cos(dropoff_lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    const duration = Math.ceil(distance / 0.5);
    let fare = parseFloat(p.base_fare) + (distance * parseFloat(p.per_km)) + (duration * parseFloat(p.per_minute));
    fare = Math.max(fare, parseFloat(p.minimum_fare));

    res.json({
      distance_km: Math.round(distance * 100) / 100,
      duration_min: duration,
      fare_estimate: Math.round(fare),
      pricing: p
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al estimar viaje' });
  }
});

router.post('/rides', auth, async (req, res) => {
  try {
    const { pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, fare_estimate, payment_method } = req.body;

    const result = await query(
      `INSERT INTO rides (passenger_id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, fare_estimate, payment_method, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending') RETURNING *`,
      [req.user.id, pickup_lat, pickup_lng, pickup_address, dropoff_lat, dropoff_lng, dropoff_address, fare_estimate, payment_method || 'cash']
    );

    const ride = result.rows[0];

    const io = req.app.get('io');
    if (io) {
      io.emit('new_ride', ride);
    }

    res.status(201).json(ride);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear viaje' });
  }
});

router.get('/rides/:id', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.name as driver_name, d.plate, d.vehicle_type
       FROM rides r
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE r.id = ? AND r.passenger_id = ?`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viaje' });
  }
});

router.post('/rides/:id/cancel', auth, async (req, res) => {
  try {
    const result = await query(
      `UPDATE rides SET status = 'cancelled' WHERE id = ? AND passenger_id = ? AND status IN ('pending', 'accepted') RETURNING *`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No se puede cancelar este viaje' });
    }

    const ride = result.rows[0];
    const io = req.app.get('io');
    if (io) {
      const payload = { rideId: ride.id, status: 'cancelled', ...ride };
      io.to(`ride_${ride.id}`).emit('ride_status_update', payload);
      io.emit('ride_update_global', payload);
    }

    if (ride.driver_id) {
      await query('UPDATE drivers SET status = ? WHERE id = ?', ['available', ride.driver_id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al cancelar viaje' });
  }
});

router.post('/rides/:id/rate', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const result = await query(
      `UPDATE rides SET rating = ?, rating_comment = ? WHERE id = ? AND passenger_id = ? AND status = 'completed' RETURNING *`,
      [rating, comment, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Viaje no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Error al calificar' });
  }
});

router.get('/rides', auth, async (req, res) => {
  try {
    const result = await query(
      `SELECT r.*, u.name as driver_name FROM rides r
       LEFT JOIN drivers d ON r.driver_id = d.id
       LEFT JOIN users u ON d.user_id = u.id
       WHERE r.passenger_id = ? ORDER BY r.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener viajes' });
  }
});

module.exports = router;
