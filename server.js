require('dotenv').config();
const express = require('express');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database/init');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Trust proxy para obtener IP real detrás de nginx/cloudflare
app.set('trust proxy', 1);

// Rate limiting para prevenir abuso
const voteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 requests por IP
  message: { error: 'Demasiadas solicitudes, intenta más tarde' }
});

// Inicializar base de datos y luego configurar rutas
async function startServer() {
  await initDatabase();
  
  // Importar rutas después de inicializar la DB
  const adminRoutes = require('./routes/admin');
  const voteRoutes = require('./routes/vote');
  
  // Rutas API
  app.use('/api/admin', adminRoutes);
  app.use('/api/vote', voteLimiter, voteRoutes);

  // Ruta para la página de votación
  app.get('/votar/:token', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vote.html'));
  });

  // Ruta para el panel de admin
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
  });

  // Ruta principal
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Health check para monitoreo
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Manejo de errores
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🍕 Servidor de votación corriendo en puerto ${PORT}`);
    console.log(`📊 Panel de admin: /admin`);
    console.log(`🌐 Dominio configurado: ${process.env.DOMAIN || 'http://localhost:' + PORT}`);
  });
}

startServer().catch(err => {
  console.error('Error iniciando servidor:', err);
  process.exit(1);
});
