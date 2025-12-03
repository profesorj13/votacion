// Credenciales del supervisor desde variables de entorno
const ADMIN_USER = process.env.ADMIN_USER || 'supervisor';
const ADMIN_PASS = process.env.ADMIN_PASS || 'pizza2024';

function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
  const [username, password] = credentials.split(':');

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    next();
  } else {
    res.status(401).json({ error: 'Credenciales inválidas' });
  }
}

module.exports = { basicAuth, ADMIN_USER, ADMIN_PASS };
