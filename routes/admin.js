const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getDb, saveDatabase, pizzaOptions } = require('../database/init');
const { basicAuth } = require('../middleware/auth');

const router = express.Router();

// Todas las rutas de admin requieren autenticación
router.use(basicAuth);

// Helper para obtener la URL base
function getBaseUrl(req) {
  // Usar dominio configurado en producción
  if (process.env.DOMAIN) {
    return process.env.DOMAIN;
  }
  // Fallback para desarrollo
  return `${req.protocol}://${req.get('host')}`;
}

// Generar un nuevo link de votación
router.post('/generate-link', (req, res) => {
  try {
    const db = getDb();
    
    // Generar token seguro: UUID + bytes aleatorios
    const uuid = uuidv4().replace(/-/g, '');
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const token = `${uuid}${randomBytes}`;

    // Insertar en la base de datos
    db.run('INSERT INTO voting_links (token) VALUES (?)', [token]);
    saveDatabase();

    const baseUrl = getBaseUrl(req);
    const voteUrl = `${baseUrl}/votar/${token}`;

    res.json({
      success: true,
      token,
      url: voteUrl,
      message: 'Link de votación generado exitosamente'
    });
  } catch (error) {
    console.error('Error generando link:', error);
    res.status(500).json({ error: 'Error al generar el link' });
  }
});

// Obtener todos los links generados
router.get('/links', (req, res) => {
  try {
    const db = getDb();
    const baseUrl = getBaseUrl(req);
    
    const stmt = db.prepare(`
      SELECT 
        token,
        created_at,
        is_used,
        used_at
      FROM voting_links 
      ORDER BY created_at DESC
    `);
    
    const links = [];
    while (stmt.step()) {
      links.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({
      success: true,
      links: links.map(link => ({
        ...link,
        url: `${baseUrl}/votar/${link.token}`,
        is_used: Boolean(link.is_used)
      }))
    });
  } catch (error) {
    console.error('Error obteniendo links:', error);
    res.status(500).json({ error: 'Error al obtener los links' });
  }
});

// Obtener resultados de votación
router.get('/results', (req, res) => {
  try {
    const db = getDb();
    
    // Contar votos totales por pizza
    const votesStmt = db.prepare(`
      SELECT 
        vote_1 as pizza,
        COUNT(*) as count
      FROM votes
      GROUP BY vote_1
      UNION ALL
      SELECT 
        vote_2 as pizza,
        COUNT(*) as count
      FROM votes
      GROUP BY vote_2
    `);
    
    const rawVotes = [];
    while (votesStmt.step()) {
      rawVotes.push(votesStmt.getAsObject());
    }
    votesStmt.free();

    // Agregar los votos
    const voteCounts = {};
    pizzaOptions.forEach(pizza => {
      voteCounts[pizza.id] = 0;
    });

    rawVotes.forEach(row => {
      if (voteCounts.hasOwnProperty(row.pizza)) {
        voteCounts[row.pizza] += row.count;
      }
    });

    // Estadísticas generales
    const statsStmt = db.prepare(`
      SELECT 
        (SELECT COUNT(*) FROM voting_links) as total_links,
        (SELECT COUNT(*) FROM voting_links WHERE is_used = 1) as used_links,
        (SELECT COUNT(*) FROM votes) as total_votes
    `);
    statsStmt.step();
    const stats = statsStmt.getAsObject();
    statsStmt.free();

    res.json({
      success: true,
      results: pizzaOptions.map(pizza => ({
        id: pizza.id,
        name: pizza.name,
        votes: voteCounts[pizza.id]
      })),
      stats: {
        totalLinks: stats.total_links,
        usedLinks: stats.used_links,
        availableLinks: stats.total_links - stats.used_links,
        totalVotes: stats.total_votes
      }
    });
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ error: 'Error al obtener los resultados' });
  }
});

module.exports = router;
