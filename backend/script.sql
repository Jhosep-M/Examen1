-- Script SQL para recrear la base de datos desde cero
-- Backend Gestión de Productos - Programación Web II - UPDS
-- Estudiante: Emerson Mollo (Jhosep-M) / Emerson Raphae Mollo Isla
-- Compatible con SQL Server (LocalDB y SQL Server estándar)

-- Crear base de datos si no existe
IF NOT EXISTS (SELECT name FROM master.dbo.sysdatabases WHERE name = 'WEB2DB')
BEGIN
    CREATE DATABASE WEB2DB;
END
GO

USE WEB2DB;
GO

-- Eliminar tabla si ya existe (para recreación limpia)
IF OBJECT_ID('dbo.Productos', 'U') IS NOT NULL
    DROP TABLE dbo.Productos;
GO

-- Crear tabla Productos con las mismas columnas y restricciones que el modelo Sequelize
CREATE TABLE dbo.Productos (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(255) NULL,
    precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
    stock INT NOT NULL CHECK (stock >= 0),
    estado BIT NOT NULL DEFAULT 1
);
GO

-- Índices opcionales para búsqueda
CREATE INDEX IX_Productos_nombre ON dbo.Productos(nombre);
GO

-- Datos de ejemplo (opcional)
INSERT INTO dbo.Productos (nombre, descripcion, precio, stock, estado) VALUES
('Laptop Toshiba Satellite', 'Laptop i5 16GB RAM 512GB SSD', 4500.00, 10, 1),
('Monitor Samsung 24"', 'Monitor curvo Full HD', 1200.50, 25, 1),
('Teclado Mecánico RGB', 'Switches blue, retroiluminado', 350.00, 50, 1);
GO

-- Verificar datos
SELECT * FROM dbo.Productos;
GO
