const express = require('express');
const router = express.Router();
const {
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  buscarProducto,
} = require('../controllers/productoController');

// IMPORTANTE: /buscar debe declararse ANTES que /:id
// para que Express no interprete "buscar" como un id
router.get('/buscar', buscarProducto);

router.get('/', listarProductos);
router.get('/:id', obtenerProducto);
router.post('/', crearProducto);
router.put('/:id', actualizarProducto);
router.delete('/:id', eliminarProducto);

module.exports = router;
