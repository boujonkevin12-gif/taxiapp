const { query } = require('../config/database');

const drivers = new Map();

function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('driver_location', async (data) => {
      const { userId, lat, lng } = data;
      drivers.set(userId, { lat, lng, socketId: socket.id });
      
      try {
        await query(
          'UPDATE drivers SET current_lat = ?, current_lng = ? WHERE user_id = ?',
          [lat, lng, userId]
        );
      } catch (error) {
        console.error('Error updating driver location:', error);
      }

      io.emit('driver_moved', { userId, lat, lng });
    });

    socket.on('passenger_track_ride', (data) => {
      const { rideId } = data;
      socket.join(`ride_${rideId}`);
    });

    socket.on('driver_track_ride', (data) => {
      const { rideId } = data;
      socket.join(`ride_${rideId}`);
    });

    socket.on('new_ride_request', (data) => {
      io.emit('new_ride', data);
    });

    socket.on('ride_update', (data) => {
      const { rideId, status, ...rest } = data;
      io.to(`ride_${rideId}`).emit('ride_status_update', { rideId, status, ...rest });
      io.emit('ride_update_global', { rideId, status, ...rest });
    });

    socket.on('disconnect', () => {
      for (const [userId, driver] of drivers) {
        if (driver.socketId === socket.id) {
          drivers.delete(userId);
          break;
        }
      }
    });
  });

  return io;
}

module.exports = { setupSocket };
