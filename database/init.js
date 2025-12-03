const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'votacion.db');

let db = null;

// Opciones de pizza (hardcoded ya que son fijas)
const pizzaOptions = [
  {
    id: 'pizza_1',
    name: 'Margherita Clásica',
    description: 'La reina de las pizzas: salsa de tomate San Marzano, mozzarella fresca de búfala, albahaca fresca y un toque de aceite de oliva extra virgen.',
    image: '/images/margherita.png'
  },
  {
    id: 'pizza_2', 
    name: 'Pepperoni Suprema',
    description: 'Para los amantes del sabor intenso: generosas capas de pepperoni crujiente sobre mozzarella derretida, con un toque de orégano italiano.',
    image: '/images/pepperoni.png'
  }
];

async function initDatabase() {
  const SQL = await initSqlJs();
  
  // Cargar base de datos existente o crear nueva
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  
  // Crear tablas
  db.run(`
    CREATE TABLE IF NOT EXISTS voting_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_used INTEGER DEFAULT 0,
      used_at DATETIME
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_token TEXT NOT NULL,
      vote_1 TEXT NOT NULL,
      vote_2 TEXT NOT NULL,
      voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (link_token) REFERENCES voting_links(token)
    )
  `);
  
  // Crear índice
  db.run(`CREATE INDEX IF NOT EXISTS idx_token ON voting_links(token)`);
  
  // Guardar cambios
  saveDatabase();
  
  console.log('✅ Base de datos inicializada');
  return db;
}

function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDatabase, pizzaOptions };
