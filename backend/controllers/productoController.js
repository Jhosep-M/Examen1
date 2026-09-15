const { Op } = require('sequelize');
const Producto = require('../models/Producto');

/**
 * Flujo: Petición HTTP → Express → Route → Controller → Model → Sequelize → SQL Server
 * Cada método consulta realmente la BD, nunca arrays en memoria.
 */

// GET /api/productos — Lista todos
const listarProductos = async (req, res) => {
  try {
    const productos = await Producto.findAll();
    return res.status(200).json(productos);
  } catch (error) {
    console.error('Error al listar productos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al listar productos' });
  }
};

// GET /api/productos/:id — Por ID
const obtenerProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    return res.status(200).json(producto);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al obtener producto' });
  }
};

// POST /api/productos — Crear
const crearProducto = async (req, res) => {
  try {
    const { nombre, descripcion, precio, stock, estado } = req.body;

    // Validaciones explícitas → 400 con mensaje claro
    if (!nombre || String(nombre).trim() === '') {
      return res.status(400).json({ mensaje: 'El campo nombre es obligatorio' });
    }
    if (precio === undefined || precio === null || precio === '') {
      return res.status(400).json({ mensaje: 'El campo precio es obligatorio' });
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum <= 0) {
      return res.status(400).json({ mensaje: 'El precio debe ser un número mayor a 0' });
    }
    if (stock === undefined || stock === null || stock === '') {
      return res.status(400).json({ mensaje: 'El campo stock es obligatorio' });
    }
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ mensaje: 'El stock debe ser un entero mayor o igual a 0' });
    }

    const nuevo = await Producto.create({
      nombre: String(nombre).trim(),
      descripcion: descripcion ? String(descripcion).trim() : null,
      precio: precioNum,
      stock: stockNum,
      estado: estado !== undefined ? Boolean(estado) : true,
    });

    return res.status(201).json(nuevo);
  } catch (error) {
    console.error('Error al crear producto:', error);
    // Si es error de validación de Sequelize, devolver 400
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({ mensaje: msg });
    }
    return res.status(500).json({ mensaje: 'Error interno del servidor al crear producto' });
  }
};

// PUT /api/productos/:id — Actualizar
const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion, precio, stock, estado } = req.body;

    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }

    // Mismas validaciones que POST
    if (!nombre || String(nombre).trim() === '') {
      return res.status(400).json({ mensaje: 'El campo nombre es obligatorio' });
    }
    if (precio === undefined || precio === null || precio === '') {
      return res.status(400).json({ mensaje: 'El campo precio es obligatorio' });
    }
    const precioNum = Number(precio);
    if (Number.isNaN(precioNum) || precioNum <= 0) {
      return res.status(400).json({ mensaje: 'El precio debe ser un número mayor a 0' });
    }
    if (stock === undefined || stock === null || stock === '') {
      return res.status(400).json({ mensaje: 'El campo stock es obligatorio' });
    }
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return res.status(400).json({ mensaje: 'El stock debe ser un entero mayor o igual a 0' });
    }

    await producto.update({
      nombre: String(nombre).trim(),
      descripcion: descripcion !== undefined ? (descripcion ? String(descripcion).trim() : null) : producto.descripcion,
      precio: precioNum,
      stock: stockNum,
      estado: estado !== undefined ? Boolean(estado) : producto.estado,
    });

    return res.status(200).json(producto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    if (error.name === 'SequelizeValidationError') {
      const msg = error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({ mensaje: msg });
    }
    return res.status(500).json({ mensaje: 'Error interno del servidor al actualizar producto' });
  }
};

// DELETE /api/productos/:id — Eliminar físico
const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    if (!producto) {
      return res.status(404).json({ mensaje: 'Producto no encontrado' });
    }
    await producto.destroy();
    return res.status(200).json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al eliminar producto' });
  }
};

// GET /api/productos/buscar?nombre=texto — Búsqueda parcial LIKE
const buscarProducto = async (req, res) => {
  try {
    const { nombre } = req.query;

    // Si no se envía nombre, devolver lista vacía con 200 (no 400 ni 404)
    if (!nombre || String(nombre).trim() === '') {
      return res.status(200).json([]);
    }

    const texto = String(nombre).trim();

    // mssql no soporta iLike, usamos Op.like (case-insensitive según collation) o Op.substring
    const productos = await Producto.findAll({
      where: {
        nombre: {
          [Op.like]: `%${texto}%`,
        },
      },
    });

    return res.status(200).json(productos);
  } catch (error) {
    console.error('Error al buscar productos:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor al buscar productos' });
  }
};

module.exports = {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  buscarProducto,
};
