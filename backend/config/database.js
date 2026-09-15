require('dotenv').config();
const { Sequelize } = require('sequelize');

// Detectar si se usa LocalDB (Windows) o SQL Server estándar
const isLocalDB =
  (process.env.DB_HOST && process.env.DB_HOST.toLowerCase().includes('localdb')) ||
  (process.env.DB_USER && process.env.DB_USER.toLowerCase().includes('localdb'));

let sequelize;

if (isLocalDB) {
  // ==========================================
  // MODO LocalDB - Sequelize con tedious no resuelve (localdb)\MSSQLLocalDB por DNS.
  // Usamos mssql + msnodesqlv8 vía ODBC Driver 17 con shim que imita API Sequelize.
  // Mantiene 100% compatibilidad con el flujo Route → Controller → Model → Sequelize → SQL Server
  // ==========================================
  console.log('Modo LocalDB detectado -> usando shim mssql/msnodesqlv8 (ODBC Driver 17) + API Sequelize');

  const sql = require('mssql/msnodesqlv8');
  const connectionString = `Driver={ODBC Driver 17 for SQL Server};Server=(localdb)\\MSSQLLocalDB;Database=${process.env.DB_NAME || 'WEB2DB'};Trusted_Connection=Yes;`;
  const config = {
    connectionString,
    driver: 'msnodesqlv8',
    options: { trustedConnection: true },
  };

  let pool;
  let poolConnect;

  const getPool = async () => {
    if (pool && pool.connected) return pool;
    if (poolConnect) return poolConnect;
    poolConnect = sql.connect(config).then((p) => {
      pool = p;
      return p;
    });
    return poolConnect;
  };

  // Helper para crear instancia con métodos update/destroy
  const wrapInstance = (row, table) => {
    if (!row) return null;
    const instance = { ...row };
    instance.update = async (data) => {
      const p = await getPool();
      const req = p.request();
      const sets = [];
      if (data.nombre !== undefined) { req.input('nombre', sql.NVarChar, data.nombre); sets.push('nombre = @nombre'); }
      if (data.descripcion !== undefined) { req.input('descripcion', sql.NVarChar, data.descripcion); sets.push('descripcion = @descripcion'); }
      if (data.precio !== undefined) { req.input('precio', sql.Decimal(10, 2), data.precio); sets.push('precio = @precio'); }
      if (data.stock !== undefined) { req.input('stock', sql.Int, data.stock); sets.push('stock = @stock'); }
      if (data.estado !== undefined) { req.input('estado', sql.Bit, data.estado ? 1 : 0); sets.push('estado = @estado'); }
      if (sets.length === 0) return instance;
      req.input('id', sql.Int, instance.id);
      const res = await req.query(`UPDATE ${table} SET ${sets.join(', ')} OUTPUT INSERTED.* WHERE id = @id`);
      const updated = res.recordset[0];
      // mutar la instancia actual para que el controller vea los cambios al retornar `producto`
      Object.assign(instance, updated);
      return instance;
    };
    instance.destroy = async () => {
      const p = await getPool();
      await p.request().input('id', sql.Int, instance.id).query(`DELETE FROM ${table} WHERE id = @id`);
    };
    return instance;
  };

  sequelize = {
    _sql: sql,
    _getPool: getPool,
    authenticate: async () => {
      const p = await getPool();
      await p.request().query('SELECT 1 as ok');
      return true;
    },
    sync: async (opts) => {
      const p = await getPool();
      await p.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Productos' and xtype='U')
        CREATE TABLE Productos (
          id INT IDENTITY(1,1) PRIMARY KEY,
          nombre NVARCHAR(100) NOT NULL,
          descripcion NVARCHAR(255) NULL,
          precio DECIMAL(10,2) NOT NULL CHECK (precio > 0),
          stock INT NOT NULL CHECK (stock >= 0),
          estado BIT NOT NULL DEFAULT 1
        )
      `);
      // Si alter:true, asegurar columnas existan (por si tabla vieja sin estado)
      try {
        await p.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Productos') AND name = 'estado')
            ALTER TABLE Productos ADD estado BIT NOT NULL DEFAULT 1
        `);
      } catch (e) { /* ignorar */ }
      return true;
    },
    define: (modelName, attributes, options) => {
      const table = (options && options.tableName) || modelName;

      // Modelo shim que expone API Sequelize usada en el proyecto
      const Model = {
        findAll: async (queryOpts) => {
          const p = await getPool();
          // Soporte para where: { nombre: { [Op.like]: '%texto%' } }
          if (queryOpts && queryOpts.where && queryOpts.where.nombre) {
            const cond = queryOpts.where.nombre;
            // Detectar Op.like (Symbol) o Op.substring
            const keys = Reflect.ownKeys(cond);
            let likeVal = null;
            for (const k of keys) {
              const v = cond[k];
              if (typeof v === 'string' && v.includes('%')) {
                likeVal = v;
                break;
              }
            }
            // Fallback: si es string directo
            if (!likeVal && typeof cond === 'string') likeVal = cond;
            if (likeVal) {
              // likeVal ya viene como %texto%
              const res = await p.request().input('nombre', sql.NVarChar, likeVal).query(`SELECT * FROM ${table} WHERE nombre LIKE @nombre`);
              return res.recordset.map((r) => wrapInstance(r, table));
            }
            // Op.substring case: cond[Op.substring] = 'texto'
            // Sequelize transforma substring en LIKE %texto%
            // Buscamos cualquier valor string sin %
            for (const k of keys) {
              const v = cond[k];
              if (typeof v === 'string') {
                const pattern = `%${v}%`;
                const res2 = await p.request().input('nombre', sql.NVarChar, pattern).query(`SELECT * FROM ${table} WHERE nombre LIKE @nombre`);
                return res2.recordset.map((r) => wrapInstance(r, table));
              }
            }
          }
          const res = await p.request().query(`SELECT * FROM ${table} ORDER BY id ASC`);
          return res.recordset.map((r) => wrapInstance(r, table));
        },
        findByPk: async (id) => {
          const p = await getPool();
          const res = await p.request().input('id', sql.Int, id).query(`SELECT * FROM ${table} WHERE id = @id`);
          const row = res.recordset[0] || null;
          return wrapInstance(row, table);
        },
        findOne: async (opts) => {
          const all = await Model.findAll(opts);
          return all[0] || null;
        },
        create: async (data) => {
          const p = await getPool();
          const res = await p.request()
            .input('nombre', sql.NVarChar, data.nombre)
            .input('descripcion', sql.NVarChar, data.descripcion || null)
            .input('precio', sql.Decimal(10, 2), data.precio)
            .input('stock', sql.Int, data.stock)
            .input('estado', sql.Bit, data.estado !== undefined && data.estado !== null ? (data.estado ? 1 : 0) : 1)
            .query(`INSERT INTO ${table} (nombre, descripcion, precio, stock, estado) OUTPUT INSERTED.* VALUES (@nombre, @descripcion, @precio, @stock, @estado)`);
          return wrapInstance(res.recordset[0], table);
        },
        count: async () => {
          const p = await getPool();
          const res = await p.request().query(`SELECT COUNT(*) as c FROM ${table}`);
          return res.recordset[0].c;
        },
      };
      return Model;
    },
    close: async () => {
      try { await sql.close(); } catch (e) {}
    },
  };
} else {
  // ==========================================
  // MODO SQL Server estándar (TCP) — Sequelize nativo con tedious
  // ==========================================
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT, 10) || 1433;
  const database = process.env.DB_NAME;
  const username = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const instanceName = process.env.DB_INSTANCE || undefined;

  if (!database) {
    console.warn('ADVERTENCIA: DB_NAME no está definido en .env');
  }

  sequelize = new Sequelize(database, username, password, {
    host,
    port,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        encrypt: true,
        trustServerCertificate: true,
        instanceName,
        cryptoCredentialsDetails: { minVersion: 'TLSv1' },
      },
    },
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
  });
}

module.exports = sequelize;
