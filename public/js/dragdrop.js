// ==============================================================================
// ✅ public/js/dragdrop.js — Lógica de Movimentação e Ordenação
// ==============================================================================

// Versões com debounce para evitar flood de requisições no backend
const salvarOrdemCardsDebounced = debounce(() => salvarOrdemCards(), 800);
const salvarOrdemDebounced = debounce((container) => salvarOrdem(container), 800);

// ===========================
// ✅ DRAG & DROP CARDS (PC Anti-Flicker)
// ===========================
function initCardDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable-card');
  const container = document.querySelector('.drag-container-cards');
  if (!container) return;

  draggables.forEach((draggable) => {
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });
    draggable.addEventListener('dragend', () => {
      draggable.classList.remove('dragging');
      salvarOrdemCardsDebounced();
    });
  });
  container.addEventListener('dragover', (e) => {
    e.preventDefault();
    const draggable = document.querySelector('.draggable-card.dragging');
    if (!draggable) return;

    const siblings = [...container.querySelectorAll('.draggable-card:not(.dragging)')];
    let hoverCard = null;

    for (let child of siblings) {
      const box = child.getBoundingClientRect();
      if (e.clientX >= box.left && e.clientX <= box.right && e.clientY >= box.top && e.clientY <= box.bottom) {
        hoverCard = child;
        break;
      }
    }

    if (hoverCard) {
      const box = hoverCard.getBoundingClientRect();
      if (e.clientX > box.left + box.width / 2) container.insertBefore(draggable, hoverCard.nextSibling);
      else container.insertBefore(draggable, hoverCard);
    }
  });
}

// ===========================
// ✅ DRAG & DROP CARDS (MOBILE)
// ===========================
function initTouchCardDragAndDrop() {
  if (window.__touchCardDndInicializado) return;
  window.__touchCardDndInicializado = true;

  let draggingCard = null;
  let activeContainer = null;

  function onTouchMove(e) {
    if (!draggingCard || !activeContainer) return;
    e.preventDefault();
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;
    const siblings = [...activeContainer.querySelectorAll('.draggable-card:not(.dragging)')];
    let hoverCard = null;
    for (let child of siblings) {
      const box = child.getBoundingClientRect();
      if (touchX >= box.left && touchX <= box.right && touchY >= box.top && touchY <= box.bottom) {
        hoverCard = child;
        break;
      }
    }
    if (hoverCard) {
      const box = hoverCard.getBoundingClientRect();
      if (touchX > box.left + box.width / 2) activeContainer.insertBefore(draggingCard, hoverCard.nextSibling);
      else activeContainer.insertBefore(draggingCard, hoverCard);
    }
  }

  async function onTouchEnd() {
    if (!draggingCard || !activeContainer) return;
    draggingCard.classList.remove('dragging');
    salvarOrdemCardsDebounced();
    draggingCard = null;
    activeContainer = null;
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  const container = document.querySelector('.drag-container-cards');
  if (container) {
    container.addEventListener(
      'touchstart',
      (e) => {
        if (!e.target.closest('.drag-handle-card')) return;
        const card = e.target.closest('.draggable-card');
        if (!card) return;
        draggingCard = card;
        activeContainer = container;
        draggingCard.classList.add('dragging');
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
      },
      { passive: true }
    );
  }
}

async function salvarOrdemCards() {
  const container = document.querySelector('.drag-container-cards');
  if (!container) return;
  const nomes = [...container.querySelectorAll('.draggable-card')].map((card) => card.dataset.nome);
  try {
    await fetch('/api/cards/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nomes }),
    });
  } catch (err) {
    console.error(err);
  }
}

// ===========================
// ✅ DRAG & DROP LINHAS (PC & MOBILE)
// ===========================
function initDragAndDrop() {
  const draggables = document.querySelectorAll('.draggable-row');
  const containers = document.querySelectorAll('.drag-container');
  draggables.forEach((draggable) => {
    draggable.addEventListener('dragstart', () => {
      draggable.classList.add('dragging');
    });
    draggable.addEventListener('dragend', () => {
      draggable.classList.remove('dragging');
      salvarOrdemDebounced(draggable.parentElement);
    });
  });
  containers.forEach((container) => {
    container.ondragover = (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(container, e.clientY);
      const draggable = document.querySelector('.dragging');
      if (afterElement == null) container.appendChild(draggable);
      else container.insertBefore(draggable, afterElement);
    };
  });
}

function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.draggable-row:not(.dragging)')];
  return draggableElements.reduce(
    (closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
      else return closest;
    },
    { offset: Number.NEGATIVE_INFINITY }
  ).element;
}

function initTouchDragAndDrop() {
  if (window.__touchDndInicializado) return;
  window.__touchDndInicializado = true;

  let draggingRow = null;
  let activeContainer = null;

  function onTouchMove(e) {
    if (!draggingRow || !activeContainer) return;
    e.preventDefault();

    const touchY = e.touches[0].clientY;
    const afterElement = getDragAfterElement(activeContainer, touchY);

    if (afterElement == null) activeContainer.appendChild(draggingRow);
    else activeContainer.insertBefore(draggingRow, afterElement);
  }

  async function onTouchEnd() {
    if (!draggingRow || !activeContainer) return;
    draggingRow.classList.remove('dragging');
    salvarOrdemDebounced(activeContainer);
    draggingRow = null;
    activeContainer = null;

    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
  }

  document.querySelectorAll('.drag-container').forEach((container) => {
    container.addEventListener(
      'touchstart',
      (e) => {
        if (!e.target.closest('.drag-handle')) return;

        const row = e.target.closest('.draggable-row');
        if (!row) return;

        draggingRow = row;
        activeContainer = container;
        draggingRow.classList.add('dragging');

        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd, { passive: true });
      },
      { passive: true }
    );
  });
}

async function salvarOrdem(container) {
  const itens = [...container.querySelectorAll('.draggable-row')].map((row) => ({ id: row.dataset.id }));
  if (itens.length === 0) return;
  try {
    await fetch('/api/lancamentos/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itens }),
    });
  } catch (err) {
    console.error('Erro', err);
  }
}
