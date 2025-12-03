# 🍕 Sistema de Votación de Pizzas - Beato Sabor

Sistema de votación anti-fraude donde un supervisor genera links únicos que permiten emitir 2 votos entre opciones de pizzas.

## Características

- ✅ **Links únicos y seguros**: Tokens de 64 caracteres no adivinables
- ✅ **Anti-fraude**: Cada link solo puede usarse una vez
- ✅ **Votos flexibles**: Se pueden emitir 2 votos a la misma pizza o a diferentes
- ✅ **Rate limiting**: Protección contra abuso
- ✅ **Panel de supervisor**: Generar links, ver resultados en vivo
- ✅ **Listo para producción**: Configurado para www.beatosabor.com

---

## 🚀 Guía de Deployment en Producción

### Opción 1: VPS (DigitalOcean, Linode, etc.)

#### 1. Preparar el servidor

```bash
# Conectar al servidor
ssh usuario@tu-servidor

# Instalar Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para mantener la app corriendo
sudo npm install -g pm2

# Instalar nginx
sudo apt-get install -y nginx
```

#### 2. Subir el proyecto

```bash
# Desde tu computadora local
scp -r /Users/ivi/Desktop/Beato/votacion1 usuario@tu-servidor:/var/www/

# O usando git (recomendado)
# Primero sube a GitHub y luego:
cd /var/www
git clone https://github.com/tu-usuario/votacion1.git
```

#### 3. Configurar variables de entorno

```bash
cd /var/www/votacion1

# Crear archivo .env
nano .env
```

Contenido del `.env`:
```
PORT=3000
NODE_ENV=production
DOMAIN=https://www.beatosabor.com
ADMIN_USER=supervisor
ADMIN_PASS=TuContraseñaSegura123!
```

#### 4. Instalar dependencias y ejecutar

```bash
cd /var/www/votacion1
npm install

# Iniciar con PM2
pm2 start server.js --name "votacion-pizzas"
pm2 save
pm2 startup  # Para que inicie automáticamente al reiniciar
```

#### 5. Configurar Nginx como reverse proxy

```bash
sudo nano /etc/nginx/sites-available/beatosabor
```

Contenido:
```nginx
server {
    listen 80;
    server_name www.beatosabor.com beatosabor.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Activar el sitio:
```bash
sudo ln -s /etc/nginx/sites-available/beatosabor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Configurar SSL con Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d beatosabor.com -d www.beatosabor.com
```

#### 7. Configurar DNS

En tu proveedor de dominio (donde compraste beatosabor.com), agregar:
- **Registro A**: `@` → IP de tu servidor
- **Registro A**: `www` → IP de tu servidor

---

### Opción 2: Railway (más fácil, hosting gratuito/económico)

1. Ir a [railway.app](https://railway.app)
2. Conectar con GitHub
3. Crear nuevo proyecto → Deploy from GitHub
4. Seleccionar el repositorio
5. En Variables de entorno agregar:
   - `DOMAIN=https://tu-app.railway.app` (o tu dominio custom)
   - `ADMIN_USER=supervisor`
   - `ADMIN_PASS=TuContraseñaSegura123!`
6. En Settings → Domains → Add Custom Domain → `www.beatosabor.com`
7. Configurar DNS en tu proveedor de dominio según las instrucciones de Railway

---

### Opción 3: Render

1. Ir a [render.com](https://render.com)
2. New → Web Service
3. Conectar repositorio de GitHub
4. Configurar:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Agregar variables de entorno
6. En Settings → Custom Domain → agregar `www.beatosabor.com`

---

## 📋 Configuración DNS para beatosabor.com

Independientemente del hosting que elijas, necesitarás configurar los DNS:

| Tipo | Nombre | Valor |
|------|--------|-------|
| A | @ | IP del servidor |
| A | www | IP del servidor |
| CNAME | www | tu-app.railway.app (si usas Railway) |

---

## 🔐 Uso del Sistema

### Panel de Supervisor
- URL: `https://www.beatosabor.com/admin`
- Usuario: El configurado en `ADMIN_USER`
- Contraseña: La configurada en `ADMIN_PASS`

### Flujo de votación
1. El supervisor genera un link desde el panel
2. Comparte el link con el votante
3. El votante accede, selecciona 2 pizzas y confirma
4. El link queda invalidado automáticamente

---

## 🛠️ Comandos útiles

```bash
# Ver logs en PM2
pm2 logs votacion-pizzas

# Reiniciar la app
pm2 restart votacion-pizzas

# Ver estado
pm2 status

# Actualizar código
cd /var/www/votacion1
git pull
npm install
pm2 restart votacion-pizzas
```

---

## 📁 Estructura del Proyecto

```
votacion1/
├── server.js              # Servidor Express
├── database/
│   └── init.js            # Base de datos SQLite
├── routes/
│   ├── admin.js           # Rutas del supervisor
│   └── vote.js            # Rutas de votación
├── middleware/
│   └── auth.js            # Autenticación
├── public/
│   ├── index.html         # Landing
│   ├── admin.html         # Panel supervisor
│   ├── vote.html          # Página de votación
│   ├── css/styles.css     # Estilos
│   ├── js/admin.js        # Lógica admin
│   └── js/vote.js         # Lógica votación
├── env.example            # Ejemplo de variables de entorno
└── README.md
```

---

## 🍕 Personalizar las Pizzas

Editar `database/init.js` y modificar el array `pizzaOptions`:

```javascript
const pizzaOptions = [
  {
    id: 'pizza_1',
    name: 'Tu Pizza 1',
    description: 'Descripción...',
    image: '/images/pizza1.jpg'
  },
  {
    id: 'pizza_2', 
    name: 'Tu Pizza 2',
    description: 'Descripción...',
    image: '/images/pizza2.jpg'
  }
];
```

Las imágenes van en `public/images/`.

---

Desarrollado con ❤️ para Beato Sabor 🍕
