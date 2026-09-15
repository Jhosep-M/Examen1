require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/database');

// Importar modelo para que se registre en Sequelize antes del sync
require('./models/Producto');
const productoRoutes = require('./routes/productoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// =======================
// Middlewares (ANTES de rutas)
// =======================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =======================
// Rutas
// =======================
app.use('/api/productos', productoRoutes);

// Ruta de salud
app.get('/', (req, res) => {
  res.json({
    mensaje: 'API Gestión de Productos - Programación Web II - UDS',
    version: '1.0.0',
    endpoints: {
      'GET /api/productos': 'Listar todos',
      'GET /api/productos/:id': 'Obtener por ID',
      'POST /api/productos': 'Crear',
      'PUT /api/productos/:id': 'Actualizar',
      'DELETE /api/productos/:id': 'Eliminar',
      'GET /api/productos/buscar?nombre=texto': 'Búsqueda parcial',
    },
  });
});

// Middleware 404 para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// =======================
// Conexión a BD + Sync + Listen
// =======================
async function iniciarServidor() {
  try {
    await sequelize.authenticate();
    console.log('✔ Conexión a SQL Server establecida correctamente.');

    // Sincroniza modelos (crea tabla Productos si no existe)
    // alter:true no borra datos, solo ajusta esquema
    await sequelize.sync({ alter: true });
    console.log('✔ Tablas sincronizadas correctamente (Productos).');

    app.listen(PORT, () => {
      console.log(`✔ Servidor escuchando en http://localhost:${PORT}`);
      console.log(`  → GET    http://localhost:${PORT}/api/productos`);
      console.log(`  → GET    http://localhost:${PORT}/api/productos/:id`);
      console.log(`  → POST   http://localhost:${PORT}/api/productos`);
      console.log(`  → PUT    http://localhost:${PORT}/api/productos/:id`);
      console.log(`  → DELETE http://localhost:${PORT}/api/productos/:id`);
      console.log(`  → GET    http://localhost:${PORT}/api/productos/buscar?nombre=texto`);
    });
  } catch (error) {
    console.error('✖ Error al conectar/sincronizar la base de datos:');
    console.error(error.message);
    // Mostrar detalle completo en desarrollo
    console.error(error);
    process.exit(1);
  }
}

iniciarServidor();

module.exports = app;
