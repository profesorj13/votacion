// Estado de la aplicación
let authCredentials = null;

// Elementos del DOM
const loginModal = document.getElementById('login-modal');
const adminPanel = document.getElementById('admin-panel');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');
const generateBtn = document.getElementById('generate-btn');
const generatedLinkDiv = document.getElementById('generated-link');
const linkInput = document.getElementById('link-input');
const copyBtn = document.getElementById('copy-btn');

// Verificar si hay credenciales guardadas
function checkAuth() {
  const saved = sessionStorage.getItem('adminAuth');
  if (saved) {
    authCredentials = saved;
    showAdminPanel();
  }
}

// Mostrar panel de admin
function showAdminPanel() {
  loginModal.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  loadResults();
  loadLinks();
  loadRaffleParticipants();
  // Auto-refresh cada 10 segundos
  setInterval(() => {
    loadResults();
    loadLinks();
    loadRaffleParticipants();
  }, 10000);
}

// Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  authCredentials = btoa(`${username}:${password}`);
  
  try {
    const response = await fetch('/api/admin/results', {
      headers: {
        'Authorization': `Basic ${authCredentials}`
      }
    });
    
    if (response.ok) {
      sessionStorage.setItem('adminAuth', authCredentials);
      showAdminPanel();
    } else {
      loginError.textContent = 'Usuario o contraseña incorrectos';
      loginError.classList.remove('hidden');
      authCredentials = null;
    }
  } catch (error) {
    loginError.textContent = 'Error de conexión';
    loginError.classList.remove('hidden');
  }
});

// Logout
logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('adminAuth');
  authCredentials = null;
  location.reload();
});

// Generar nuevo link
generateBtn.addEventListener('click', async () => {
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generando...';
  
  try {
    const response = await fetch('/api/admin/generate-link', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authCredentials}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      linkInput.value = data.url;
      generatedLinkDiv.classList.remove('hidden');
      loadLinks(); // Actualizar lista
    } else {
      alert('Error al generar el link');
    }
  } catch (error) {
    alert('Error de conexión');
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="btn-icon">✨</span> Generar Nuevo Link';
  }
});

// Copiar link
copyBtn.addEventListener('click', () => {
  linkInput.select();
  navigator.clipboard.writeText(linkInput.value);
  copyBtn.textContent = '¡Copiado!';
  setTimeout(() => {
    copyBtn.textContent = 'Copiar';
  }, 2000);
});

// Cargar resultados
async function loadResults() {
  try {
    const response = await fetch('/api/admin/results', {
      headers: {
        'Authorization': `Basic ${authCredentials}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderResults(data.results, data.stats);
    }
  } catch (error) {
    console.error('Error cargando resultados:', error);
  }
}

// Renderizar resultados
function renderResults(results, stats) {
  const container = document.getElementById('results-container');
  const statsContainer = document.getElementById('stats-container');
  
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  
  container.innerHTML = results.map(pizza => {
    const percentage = totalVotes > 0 ? Math.round((pizza.votes / totalVotes) * 100) : 0;
    return `
      <div class="result-item">
        <div class="result-header">
          <span class="result-name">${pizza.name}</span>
          <span class="result-votes">${pizza.votes} votos</span>
        </div>
        <div class="result-bar">
          <div class="result-fill" style="width: ${percentage}%"></div>
        </div>
        <span class="result-percentage">${percentage}%</span>
      </div>
    `;
  }).join('');
  
  statsContainer.innerHTML = `
    <div class="stat-item">
      <span class="stat-value">${stats.totalLinks}</span>
      <span class="stat-label">Links Totales</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.usedLinks}</span>
      <span class="stat-label">Links Usados</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.availableLinks}</span>
      <span class="stat-label">Links Disponibles</span>
    </div>
    <div class="stat-item">
      <span class="stat-value">${stats.totalVotes}</span>
      <span class="stat-label">Votaciones</span>
    </div>
  `;
}

// Cargar links
async function loadLinks() {
  try {
    const response = await fetch('/api/admin/links', {
      headers: {
        'Authorization': `Basic ${authCredentials}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderLinks(data.links);
    }
  } catch (error) {
    console.error('Error cargando links:', error);
  }
}

// Renderizar links
function renderLinks(links) {
  const container = document.getElementById('links-container');
  
  if (links.length === 0) {
    container.innerHTML = '<p class="empty-state">No hay links generados aún</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="links-table">
      <thead>
        <tr>
          <th>Link</th>
          <th>Creado</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        ${links.map(link => `
          <tr class="${link.is_used ? 'used' : 'available'}">
            <td>
              <code class="link-code">${link.token.substring(0, 16)}...</code>
              <button class="btn-small" onclick="copyToClipboard('${link.url}')">Copiar</button>
            </td>
            <td>${formatDate(link.created_at)}</td>
            <td>
              <span class="status-badge ${link.is_used ? 'status-used' : 'status-available'}">
                ${link.is_used ? '✓ Usado' : '○ Disponible'}
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Cargar participantes del sorteo
async function loadRaffleParticipants() {
  try {
    const response = await fetch('/api/admin/raffle-participants', {
      headers: {
        'Authorization': `Basic ${authCredentials}`
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderRaffleParticipants(data.participants, data.stats);
    }
  } catch (error) {
    console.error('Error cargando participantes del sorteo:', error);
  }
}

// Renderizar participantes del sorteo
function renderRaffleParticipants(participants, stats) {
  const container = document.getElementById('raffle-container');
  const statsContainer = document.getElementById('raffle-stats');
  
  // Mostrar estadísticas
  statsContainer.innerHTML = `
    <div class="raffle-stat">
      <span class="raffle-stat-value">${stats.totalEntries}</span>
      <span class="raffle-stat-label">Registros</span>
    </div>
    <div class="raffle-stat">
      <span class="raffle-stat-value">${stats.totalPeople}</span>
      <span class="raffle-stat-label">Personas</span>
    </div>
  `;
  
  if (participants.length === 0) {
    container.innerHTML = '<p class="empty-state">Aún no hay participantes registrados</p>';
    return;
  }
  
  container.innerHTML = `
    <table class="links-table raffle-table">
      <thead>
        <tr>
          <th>Participante 1</th>
          <th>DNI</th>
          <th>Participante 2</th>
          <th>DNI</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        ${participants.map(p => `
          <tr>
            <td><strong>${p.person1_name}</strong></td>
            <td>${p.person1_dni}</td>
            <td>${p.person2_name || '<em class="text-muted">-</em>'}</td>
            <td>${p.person2_dni || '<em class="text-muted">-</em>'}</td>
            <td>${formatDate(p.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

// Utilidades
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  // Feedback visual breve
  const btn = event.target;
  const originalText = btn.textContent;
  btn.textContent = '¡Copiado!';
  setTimeout(() => btn.textContent = originalText, 1500);
}

// Inicializar
checkAuth();


