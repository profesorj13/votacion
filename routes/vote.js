const express = require('express');
const { getDb, pizzaOptions } = require('../database/init');

const router = express.Router();

// Obtener opciones de pizza
router.get('/options', (req, res) => {
  res.json({
    success: true,
    options: pizzaOptions
  });
});

// Verificar si un token es válido
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const db = getDb();

    const [rows] = await db.execute('SELECT * FROM voting_links WHERE token = ?', [token]);
    const link = rows[0];

    if (!link) {
      return res.json({
        valid: false,
        reason: 'Link no encontrado'
      });
    }

    if (link.is_used) {
      return res.json({
        valid: false,
        reason: 'Este link ya fue utilizado'
      });
    }

    res.json({
      valid: true,
      options: pizzaOptions
    });
  } catch (error) {
    console.error('Error verificando token:', error);
    res.status(500).json({ error: 'Error al verificar el link' });
  }
});

// Registrar votos
router.post('/submit/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { vote1, vote2, raffle } = req.body;
    const db = getDb();

    // Validar que se enviaron los votos
    if (!vote1 || !vote2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Debes seleccionar 2 pizzas' 
      });
    }

    // Validar que las opciones son válidas
    const validIds = pizzaOptions.map(p => p.id);
    if (!validIds.includes(vote1) || !validIds.includes(vote2)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Opción de pizza inválida' 
      });
    }

    // Verificar que el link existe y no ha sido usado
    const [rows] = await db.execute('SELECT * FROM voting_links WHERE token = ? AND is_used = 0', [token]);
    const link = rows[0];

    if (!link) {
      return res.status(400).json({
        success: false,
        error: 'Este link ya fue utilizado o no es válido'
      });
    }

    // Marcar el link como usado
    await db.execute('UPDATE voting_links SET is_used = 1, used_at = CURRENT_TIMESTAMP WHERE token = ?', [token]);

    // Registrar los votos
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    await db.execute('INSERT INTO votes (link_token, vote_1, vote_2, ip_address) VALUES (?, ?, ?, ?)', [token, vote1, vote2, ip]);

    // Registrar participación en el sorteo si hay datos
    if (raffle && raffle.person1_name && raffle.person1_dni) {
      await db.execute(
        'INSERT INTO raffle_participants (link_token, person1_name, person1_dni, person2_name, person2_dni) VALUES (?, ?, ?, ?, ?)',
        [token, raffle.person1_name, raffle.person1_dni, raffle.person2_name, raffle.person2_dni]
      );
    }

    res.json({
      success: true,
      message: '¡Gracias por votar! Tus votos han sido registrados.'
    });
  } catch (error) {
    console.error('Error registrando voto:', error);
    res.status(500).json({ error: 'Error al registrar el voto' });
  }
});

module.exports = router;
