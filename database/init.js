const mysql = require('mysql2/promise');

let pool = null;

// Opciones de pizza (hardcoded ya que son fijas)
const pizzaOptions = [
  {
    id: 'pizza_1',
    name: 'Beato Braseada',
    description: 'Bondiola de cerdo desmechada, lactonesa de ajo y miel picante. Decorada con cebolla de verdeo.',
    image: '/images/beatobraseada.png'
  },
  {
    id: 'pizza_2', 
    name: 'Pizza Churri',
    description: 'Al estilo cordobés. Chorizo de cerdo, pimiento rojo asado, cebollas encurtidas, queso provolone y el chimichurri de la casa.',
    image: '/images/churri.png'
  }
];

async function initDatabase() {
  // Crear pool de conexiones usando la URL de MySQL
  pool = mysql.createPool({
    uri: process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // Verificar conexión
  const connection = await pool.getConnection();
  console.log('✅ Conectado a MySQL en Railway');
  connection.release();

  // Crear tablas
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS voting_links (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_used TINYINT(1) DEFAULT 0,
      used_at TIMESTAMP NULL
    )
  `);
  
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS votes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      link_token VARCHAR(255) NOT NULL,
      vote_1 VARCHAR(50) NOT NULL,
      vote_2 VARCHAR(50) NOT NULL,
      voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ip_address VARCHAR(45),
      FOREIGN KEY (link_token) REFERENCES voting_links(token)
    )
  `);
  
  // Crear índice si no existe
  try {
    await pool.execute(`CREATE INDEX idx_token ON voting_links(token)`);
  } catch (err) {
    // El índice ya existe, ignorar error
  }
  
  console.log('✅ Base de datos MySQL inicializada');
  return pool;
}

function getDb() {
  return pool;
}

module.exports = { initDatabase, getDb, pizzaOptions };
