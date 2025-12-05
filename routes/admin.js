const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const { getDb, pizzaOptions } = require('../database/init');
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
router.post('/generate-link', async (req, res) => {
  try {
    const db = getDb();
    
    // Generar token seguro: UUID + bytes aleatorios
    const uuid = uuidv4().replace(/-/g, '');
    const randomBytes = crypto.randomBytes(16).toString('hex');
    const token = `${uuid}${randomBytes}`;

    // Insertar en la base de datos
    await db.execute('INSERT INTO voting_links (token) VALUES (?)', [token]);

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
router.get('/links', async (req, res) => {
  try {
    const db = getDb();
    const baseUrl = getBaseUrl(req);
    
    const [links] = await db.execute(`
      SELECT 
        token,
        created_at,
        is_used,
        used_at
      FROM voting_links 
      ORDER BY created_at DESC
    `);

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
router.get('/results', async (req, res) => {
  try {
    const db = getDb();
    
    // Contar votos totales por pizza
    const [rawVotes] = await db.execute(`
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

    // Agregar los votos
    const voteCounts = {};
    pizzaOptions.forEach(pizza => {
      voteCounts[pizza.id] = 0;
    });

    rawVotes.forEach(row => {
      if (voteCounts.hasOwnProperty(row.pizza)) {
        voteCounts[row.pizza] += Number(row.count);
      }
    });

    // Estadísticas generales
    const [statsResult] = await db.execute(`
      SELECT 
        (SELECT COUNT(*) FROM voting_links) as total_links,
        (SELECT COUNT(*) FROM voting_links WHERE is_used = 1) as used_links,
        (SELECT COUNT(*) FROM votes) as total_votes
    `);
    const stats = statsResult[0];

    res.json({
      success: true,
      results: pizzaOptions.map(pizza => ({
        id: pizza.id,
        name: pizza.name,
        votes: voteCounts[pizza.id]
      })),
      stats: {
        totalLinks: Number(stats.total_links),
        usedLinks: Number(stats.used_links),
        availableLinks: Number(stats.total_links) - Number(stats.used_links),
        totalVotes: Number(stats.total_votes)
      }
    });
  } catch (error) {
    console.error('Error obteniendo resultados:', error);
    res.status(500).json({ error: 'Error al obtener los resultados' });
  }
});

// Obtener participantes del sorteo
router.get('/raffle-participants', async (req, res) => {
  try {
    const db = getDb();
    
    const [participants] = await db.execute(`
      SELECT 
        id,
        link_token,
        person1_name,
        person1_dni,
        person2_name,
        person2_dni,
        created_at
      FROM raffle_participants 
      ORDER BY created_at DESC
    `);

    // Contar total de participantes (personas individuales)
    let totalPeople = 0;
    participants.forEach(p => {
      totalPeople += 1; // Persona 1 siempre existe
      if (p.person2_name && p.person2_dni) {
        totalPeople += 1; // Persona 2 es opcional
      }
    });

    res.json({
      success: true,
      participants,
      stats: {
        totalEntries: participants.length,
        totalPeople: totalPeople
      }
    });
  } catch (error) {
    console.error('Error obteniendo participantes del sorteo:', error);
    res.status(500).json({ error: 'Error al obtener los participantes' });
  }
});

module.exports = router;
