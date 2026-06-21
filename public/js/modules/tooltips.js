// ==============================================================================
// ✅ public/js/modules/tooltips.js — Tooltip Customizado
// ==============================================================================

const customTooltip = document.getElementById('customTooltip');

export function showCustomTooltip(element, text) {
  if (!customTooltip) return;

  const rect = element.getBoundingClientRect();
  customTooltip.textContent = text;
  customTooltip.style.display = 'block';
  customTooltip.style.left = `${rect.left + rect.width / 2 - customTooltip.offsetWidth / 2}px`;
  customTooltip.style.top = `${rect.top - customTooltip.offsetHeight - 8}px`;
}

export function hideCustomTooltip() {
  if (!customTooltip) return;
  customTooltip.style.display = 'none';
}

export function initTooltipListeners() {
  document.querySelectorAll('th input[type="checkbox"]').forEach((checkbox) => {
    checkbox.addEventListener('mouseenter', (e) => {
      showCustomTooltip(e.target, 'Marcar todas como já calculadas');
    });
    checkbox.addEventListener('mouseleave', () => {
      hideCustomTooltip();
    });
  });
}
