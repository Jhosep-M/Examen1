require('dotenv').config();
const { Sequelize } = require('sequelize');

// Configuración simple — lee todo desde .env
// .env debe tener: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, DB_INSTANCE (opcional)
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: true,                 // requerido por Tedious
        trustServerCertificate: true,  // lab / desarrollo
        instanceName: process.env.DB_INSTANCE || undefined,
      },
    },
    logging: false,
  }
);

module.exports = sequelize;
