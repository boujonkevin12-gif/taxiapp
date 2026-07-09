# Taxi App - Concepción del Uruguay

Aplicación web tipo Uber para empresa de taxis local.

## Tecnologías

- **Frontend**: React.js + Tailwind CSS + Leaflet (mapas)
- **Backend**: Node.js + Express
- **Base de datos**: SQLite (local) / PostgreSQL (producción)
- **Tiempo real**: Socket.io
- **Pagos**: Mercado Pago (transferencia) + Efectivo

## Instalación Local

### 1. Clonar e instalar
```bash
git clone https://github.com/TU_USUARIO/taxi-app.git
cd taxi-app

# Instalar backend
cd backend
npm install

# Instalar frontend
cd ../frontend
npm install
```

### 2. Configurar backend
```bash
cd backend
cp .env.example .env
# Editar .env si es necesario (los valores por defecto funcionan)
```

### 3. Iniciar
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 4. Abrir
- **App**: http://localhost:5173

### Usuarios por defecto
| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | admin@taxi.com | admin123 |
| Conductor | carlos@test.com | 123456 |
| Pasajero | juan@test.com | 123456 |

## Funcionalidades

### Pasajero
- Solicitar viaje tocando el mapa
- Ver estimación de tarifa
- Pagar con transferencia Mercado Pago o efectivo
- Calificar viaje
- Ver historial

### Conductor
- Aceptar/rechazar viajes
- Iniciar y completar viaje
- Ver ganancias del día
- Modo disponible/no disponible

### Administrador
- Dashboard con estadísticas en tiempo real
- Crear y gestionar conductores
- Configurar tarifas (base, por km, por minuto)
- Ver historial de viajes
- Reportes diarios

## Deploy a Producción

### Opción A: Render (Recomendada)

El proyecto incluye `render.yaml` para deploy automático.

1. Subir código a GitHub
2. Crear cuenta en [render.com](https://render.com)
3. **New > Blueprint** y conectar el repositorio
4. Render crea automáticamente:
   - Backend (Web Service)
   - Base de datos PostgreSQL
   - Frontend (Static Site)

### Opción B: Manual

#### Backend en Render:
1. **New > Web Service**
2. Conectar repositorio GitHub
3. Configurar:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm run db:migrate && npm run db:seed && npm start`
4. Agregar variable de entorno:
   - `NODE_ENV` = `production`
   - `DATABASE_URL` = URL de PostgreSQL de Render
   - `JWT_SECRET` = cualquier texto secreto

#### Frontend en Netlify:
1. **New site from Git**
2. Configurar:
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/dist`
3. Agregar variable de entorno:
   - `VITE_API_URL` = URL de tu backend en Render

### Después del deploy
1. Abrir la app
2. Ir a **Panel Admin** → **Conductores** → **Agregar conductor**
3. Crear conductores reales
4. Los pasajeros se registran solos desde la app

## Estructura del proyecto

```
taxi-app/
├── backend/
│   ├── src/
│   │   ├── config/        # Database, migraciones, seed
│   │   ├── middleware/     # Auth JWT
│   │   ├── routes/        # API endpoints
│   │   ├── socket/        # Tiempo real (Socket.io)
│   │   └── server.js      # Servidor principal
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Mapa y UI reutilizable
│   │   ├── context/       # Auth y Socket
│   │   ├── pages/         # Pasajero, Conductor, Admin
│   │   ├── services/      # Llamadas API
│   │   └── App.jsx
│   └── package.json
├── render.yaml            # Deploy automático en Render
└── README.md
```

## Licencia

MIT
