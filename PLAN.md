# Plan de Desarrollo: App de Taxis - Concepción del Uruguay

## Resumen del Proyecto
App web tipo Uber para empresa de taxis local (6-20 unidades). PWA que funciona como app en cualquier celular.

## Stack Tecnológico
- **Frontend**: React.js + Tailwind CSS + Leaflet (mapas)
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL
- **Tiempo real**: Socket.io
- **Pagos**: Mercado Pago SDK
- **Hosting**: Render.com (gratis tier)

## Estructura del Proyecto
```
taxi-app/
├── backend/
│   ├── src/
│   │   ├── config/        # DB, mercadopago, socket config
│   │   ├── middleware/     # Auth, validation
│   │   ├── models/        # User, Driver, Ride, Payment
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Business logic
│   │   └── socket/        # Real-time handlers
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Passenger, Driver, Admin views
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API calls
│   │   └── context/       # Auth, Socket context
│   └── package.json
└── README.md
```

## Base de Datos (PostgreSQL)

### Tablas principales:

**users** (pasajeros)
- id, name, email, phone, password_hash, created_at

**drivers** (choferes)
- id, user_id, vehicle_type, plate, license, status (available/busy/offline), current_lat, current_lng

**rides** (viajes)
- id, passenger_id, driver_id, status (pending/accepted/arrived/in_progress/completed/cancelled)
- pickup_lat, pickup_lng, pickup_address
- dropoff_lat, dropoff_lng, dropoff_address
- fare_estimate, fare_final, payment_method, created_at, completed_at

**payments** (pagos)
- id, ride_id, amount, method (cash/mercadopago_transfer), status, mp_payment_id

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Passengers
- GET /api/rides/estimate (calcular tarifa)
- POST /api/rides (solicitar viaje)
- GET /api/rides/:id (estado del viaje)
- POST /api/rides/:id/cancel
- POST /api/rides/:id/rate

### Drivers
- PUT /api/drivers/location (actualizar ubicación)
- PUT /api/drivers/status (cambiar estado)
- POST /api/rides/:id/accept
- POST /api/rides/:id/start
- POST /api/rides/:id/complete
- GET /api/drivers/earnings

### Admin
- GET /api/admin/rides (todos los viajes)
- GET /api/admin/drivers (gestionar choferes)
- PUT /api/drivers/:id/approve
- PUT /api/admin/pricing (configurar tarifas)
- GET /api/admin/reports

## Funcionalidades por Rol

### Pasajero
1. Ver mapa con ubicación actual
2. Ingresar destino (autocomplete)
3. Ver estimación de tarifa
4. Solicitar viaje
5. Seguir conductor en tiempo real
6. Pagar (transferencia Mercado Pago o efectivo)
7. Calificar viaje
8. Ver historial

### Conductor
1. Ver mapa con solicitudes pendientes
2. Aceptar/rechazar viaje
3. Navegar al pasajero
4. Iniciar viaje
5. Completar viaje
6. Ver ganancias del día
7. Cambiar estado (disponible/no disponible)

### Administrador
1. Dashboard con viajes activos
2. Lista de conductores (aprobar/rechazar)
3. Historial de viajes
4. Configurar tarifa base, por km, por minuto
5. Reportes diarios/semanales

## Tarifas Configurables
- Tarifa base: $XXX
- Por kilómetro: $XXX
- Por minuto: $XXX
- Mínimo: $XXX

## Pasos de Desarrollo

### Semana 1: Backend
1. [ ] Configurar proyecto Node.js
2. [ ] Crear esquemas de BD
3. [ ] Implementar auth (JWT)
4. [ ] CRUD de usuarios y conductores
5. [ ] Lógica de viajes
6. [ ] Integración Socket.io
7. [ ] Integración Mercado Pago

### Semana 2: Frontend - App Pasajero
1. [ ] Configurar React + Tailwind
2. [ ] Componente de mapa (Leaflet)
3. [ ] Flujo de solicitud de viaje
4. [ ] Vista de viaje activo
5. [ ] Sistema de pagos
6. [ ] Historial y calificaciones

### Semana 3: Frontend - App Conductor + Admin
1. [ ] App del conductor
2. [ ] Panel de administración
3. [ ] Gestión de conductores
4. [ ] Reportes básicos

### Semana 4: Testing y Deploy
1. [ ] Pruebas integradas
2. [ ] Deploy en Render
3. [ ] Configurar dominio
4. [ ] Capacitación básica

## Costos

### Desarrollo
- Código y configuración: $0 (lo hago yo)

### Infraestructura mensual
- Hosting: $0 (Render free tier)
- BD: $0 (Render free tier)
- Total: $0/mes

### A futuro (si crece)
- Hosting Pro: ~$7 USD/mes
- BD Pro: ~$7 USD/mes
- Dominio: ~$10 USD/año

## Próximos Pasos
1. Aprobar este plan
2. Crear cuenta en Render.com
3. Crear cuenta en Mercado Pago (developer)
4. Empezar desarrollo

## Notas
- Los datos de la empresa (nombre, logo, colores) se agregarán después
- La lista de conductores se cargará después del desarrollo
- El sistema viene preparado para recibir esa información cuando esté disponible
