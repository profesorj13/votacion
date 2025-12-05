// Estado
let selectedPizzas = [];
let pizzaOptions = [];

// Elementos del DOM
const loadingState = document.getElementById('loading-state');
const invalidState = document.getElementById('invalid-state');
const votingState = document.getElementById('voting-state');
const successState = document.getElementById('success-state');
const invalidReason = document.getElementById('invalid-reason');
const pizzaGrid = document.getElementById('pizza-options');
const submitBtn = document.getElementById('submit-vote');
const voteError = document.getElementById('vote-error');

// Elementos del sorteo
const participateRaffle = document.getElementById('participate-raffle');
const raffleForm = document.getElementById('raffle-form');
const person1Name = document.getElementById('person1-name');
const person1Dni = document.getElementById('person1-dni');
const person2Name = document.getElementById('person2-name');
const person2Dni = document.getElementById('person2-dni');

// Toggle del formulario de sorteo
participateRaffle.addEventListener('change', () => {
  if (participateRaffle.checked) {
    raffleForm.classList.remove('hidden');
  } else {
    raffleForm.classList.add('hidden');
  }
});

// Obtener token de la URL
function getToken() {
  const path = window.location.pathname;
  const parts = path.split('/');
  return parts[parts.length - 1];
}

// Mostrar estado
function showState(state) {
  loadingState.classList.add('hidden');
  invalidState.classList.add('hidden');
  votingState.classList.add('hidden');
  successState.classList.add('hidden');
  
  state.classList.remove('hidden');
}

// Verificar token
async function verifyToken() {
  const token = getToken();
  
  try {
    const response = await fetch(`/api/vote/verify/${token}`);
    const data = await response.json();
    
    if (data.valid) {
      pizzaOptions = data.options;
      renderPizzaOptions();
      showState(votingState);
    } else {
      invalidReason.textContent = data.reason || 'Este link no es válido';
      showState(invalidState);
    }
  } catch (error) {
    invalidReason.textContent = 'Error al verificar el link';
    showState(invalidState);
  }
}

// Renderizar opciones de pizza
function renderPizzaOptions() {
  pizzaGrid.innerHTML = pizzaOptions.map(pizza => `
    <div class="pizza-card" data-id="${pizza.id}">
      <div class="pizza-image-container">
        <div class="pizza-image">
          <img src="${pizza.image}" alt="${pizza.name}" class="pizza-img">
        </div>
        <div class="selection-indicator">
          <span class="check-mark">✓</span>
        </div>
      </div>
      <div class="pizza-info">
        <h3 class="pizza-name">${pizza.name}</h3>
        <p class="pizza-description">${pizza.description}</p>
      </div>
      <button class="btn btn-select" onclick="togglePizza('${pizza.id}')">
        Seleccionar
      </button>
    </div>
  `).join('');
}

// Toggle selección de pizza - permite votar 2 veces por la misma
function togglePizza(pizzaId) {
  const count = selectedPizzas.filter(p => p === pizzaId).length;
  
  if (selectedPizzas.length < 2) {
    // Agregar voto
    selectedPizzas.push(pizzaId);
  } else {
    // Ya hay 2 votos, reemplazar el primero
    selectedPizzas.shift();
    selectedPizzas.push(pizzaId);
  }
  
  updateUI();
}

// Actualizar UI
function updateUI() {
  // Contar votos por pizza
  const voteCounts = {};
  pizzaOptions.forEach(p => voteCounts[p.id] = 0);
  selectedPizzas.forEach(id => voteCounts[id]++);
  
  // Actualizar cards
  document.querySelectorAll('.pizza-card').forEach(card => {
    const id = card.dataset.id;
    const count = voteCounts[id];
    const isSelected = count > 0;
    card.classList.toggle('selected', isSelected);
    
    const btn = card.querySelector('.btn-select');
    if (count === 2) {
      btn.textContent = '¡2 votos! ✓✓';
      btn.classList.add('btn-selected', 'btn-double');
    } else if (count === 1) {
      btn.textContent = 'Seleccionada ✓';
      btn.classList.add('btn-selected');
      btn.classList.remove('btn-double');
    } else {
      btn.textContent = 'Seleccionar';
      btn.classList.remove('btn-selected', 'btn-double');
    }
    
    // Mostrar contador en la card
    const indicator = card.querySelector('.selection-indicator');
    if (count > 0) {
      indicator.querySelector('.check-mark').textContent = count === 2 ? '2' : '✓';
    }
  });
  
  // Actualizar resumen
  const slot1 = document.getElementById('slot-1');
  const slot2 = document.getElementById('slot-2');
  
  if (selectedPizzas[0]) {
    const pizza1 = pizzaOptions.find(p => p.id === selectedPizzas[0]);
    slot1.innerHTML = `Voto 1: <strong>${pizza1.name}</strong>`;
    slot1.classList.add('filled');
  } else {
    slot1.innerHTML = 'Voto 1: <em>Sin seleccionar</em>';
    slot1.classList.remove('filled');
  }
  
  if (selectedPizzas[1]) {
    const pizza2 = pizzaOptions.find(p => p.id === selectedPizzas[1]);
    slot2.innerHTML = `Voto 2: <strong>${pizza2.name}</strong>`;
    slot2.classList.add('filled');
  } else {
    slot2.innerHTML = 'Voto 2: <em>Sin seleccionar</em>';
    slot2.classList.remove('filled');
  }
  
  // Habilitar/deshabilitar botón
  submitBtn.disabled = selectedPizzas.length !== 2;
  
  // Ocultar error
  voteError.classList.add('hidden');
}

// Validar datos del sorteo
function validateRaffleData() {
  if (!participateRaffle.checked) {
    return { valid: true, data: null };
  }
  
  const p1Name = person1Name.value.trim();
  const p1Dni = person1Dni.value.trim();
  const p2Name = person2Name.value.trim();
  const p2Dni = person2Dni.value.trim();
  
  // Si participa, al menos el participante 1 es obligatorio
  if (!p1Name || !p1Dni) {
    return { 
      valid: false, 
      error: 'Para participar del sorteo, completá nombre y DNI del participante 1' 
    };
  }
  
  // Si completa datos del participante 2, deben estar ambos
  if ((p2Name && !p2Dni) || (!p2Name && p2Dni)) {
    return { 
      valid: false, 
      error: 'Si agregás participante 2, completá nombre y DNI' 
    };
  }
  
  return {
    valid: true,
    data: {
      person1_name: p1Name,
      person1_dni: p1Dni,
      person2_name: p2Name || null,
      person2_dni: p2Dni || null
    }
  };
}

// Enviar voto
submitBtn.addEventListener('click', async () => {
  if (selectedPizzas.length !== 2) return;
  
  // Validar datos del sorteo
  const raffleValidation = validateRaffleData();
  if (!raffleValidation.valid) {
    voteError.textContent = raffleValidation.error;
    voteError.classList.remove('hidden');
    return;
  }
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Enviando...';
  
  const token = getToken();
  
  try {
    const response = await fetch(`/api/vote/submit/${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vote1: selectedPizzas[0],
        vote2: selectedPizzas[1],
        raffle: raffleValidation.data
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showState(successState);
      createConfetti();
    } else {
      voteError.textContent = data.error || 'Error al registrar el voto';
      voteError.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirmar Voto';
    }
  } catch (error) {
    voteError.textContent = 'Error de conexión';
    voteError.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Confirmar Voto';
  }
});

// Confetti para celebrar
function createConfetti() {
  const confettiContainer = document.getElementById('confetti');
  const colors = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti-piece';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.animationDelay = Math.random() * 2 + 's';
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    confettiContainer.appendChild(confetti);
  }
}

// Inicializar
verifyToken();

