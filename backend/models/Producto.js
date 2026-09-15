const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Producto = sequelize.define(
  'Producto',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'El nombre es obligatorio',
        },
        notNull: {
          msg: 'El nombre es obligatorio',
        },
      },
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    },
    precio: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        notNull: { msg: 'El precio es obligatorio' },
        isDecimal: { msg: 'El precio debe ser un número válido' },
        min: {
          args: [0.01],
          msg: 'El precio debe ser mayor a 0',
        },
      },
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'El stock es obligatorio' },
        isInt: { msg: 'El stock debe ser un número entero' },
        min: {
          args: [0],
          msg: 'El stock no puede ser negativo',
        },
      },
    },
    estado: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
  },
  {
    tableName: 'Productos',
    timestamps: false,
    // Opcional: si prefieres timestamps, cambia a true y Sequelize creará createdAt/updatedAt
  }
);

module.exports = Producto;
