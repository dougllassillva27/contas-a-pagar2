// ==============================================================================
// ✅ public/js/dragdrop.js — Lógica de Movimentação e Ordenação
// ==============================================================================

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
      salvarOrdemCards();
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
    try {
      await salvarOrdemCards();
    } catch (_) {}
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
