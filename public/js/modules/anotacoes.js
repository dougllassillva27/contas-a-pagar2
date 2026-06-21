// ==============================================================================
// ✅ ANOTAÇÕES — Abas, salvar, checklist, formatação
// ==============================================================================

import { getCurrentMonth, getCurrentYear } from './dashboard.js';

export let isAnotacaoGlobal = true;
export let isAnotacaoEditMode = false;
export let currentAnotacaoText = '';
let timeoutAnotacao = null;

export async function carregarAnotacoes() {
  const area = document.getElementById('anotacoesArea');
  if (!area) return;

  // Usa dados pré-carregados no HTML (data-global e data-mensal)
  if (isAnotacaoGlobal) {
    currentAnotacaoText = area.dataset.global || '';
  } else {
    currentAnotacaoText = area.dataset.mensal || '';
  }

  area.value = currentAnotacaoText;
  renderAnotacoesPreview();
}

export function alternarAbaAnotacao(global) {
  isAnotacaoGlobal = global;
  document.getElementById('btnAnotacaoMensal').classList.toggle('active', !global);
  document.getElementById('btnAnotacaoGlobal').classList.toggle('active', global);
  carregarAnotacoes();
}

export function alternarModoAnotacao() {
  isAnotacaoEditMode = !isAnotacaoEditMode;
  const area = document.getElementById('anotacoesArea');
  const preview = document.getElementById('anotacoesPreview');
  const toolbar = document.getElementById('anotacoesToolbar');
  const btn = document.getElementById('btnAnotacaoModo');

  if (isAnotacaoEditMode) {
    area.style.display = 'block';
    toolbar.style.display = 'flex';
    preview.style.display = 'none';
    btn.innerHTML = '<span class="material-icons" style="font-size:16px;">visibility</span>';
    btn.title = 'Modo Leitura';
    area.focus();
  } else {
    area.style.display = 'none';
    toolbar.style.display = 'none';
    preview.style.display = 'block';
    btn.innerHTML = '<span class="material-icons" style="font-size:16px;">edit</span>';
    btn.title = 'Modo Edição';
    renderAnotacoesPreview();
  }
}

export function initAnotacoes() {
  if (document.getElementById('anotacoesArea')) {
    currentAnotacaoText = document.getElementById('anotacoesArea').value;
    renderAnotacoesPreview();
  }
}

export function renderAnotacoesPreview() {
  const preview = document.getElementById('anotacoesPreview');
  if (!preview) return;

  if (!currentAnotacaoText.trim()) {
    preview.innerHTML =
      '<div style="color: var(--text-secondary); font-style: italic; text-align: center; padding: 20px;">Nenhuma anotação. Clique em editar para começar.</div>';
    return;
  }

  const lines = currentAnotacaoText.split('\n');
  let html = '';

  lines.forEach((line, index) => {
    let parsed = line
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>');

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    parsed = parsed.replace(urlRegex, function (url) {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--blue); text-decoration: underline;">${url}</a>`;
    });

    if (parsed.trim().startsWith('- [ ]')) {
      const text = parsed.replace('- [ ]', '').trim();
      html += `<div class="checklist-item"><input type="checkbox" onchange="toggleChecklist(${index}, true)"> <span>${text}</span></div>`;
    } else if (parsed.trim().startsWith('- [x]')) {
      const text = parsed.replace('- [x]', '').trim();
      html += `<div class="checklist-item"><input type="checkbox" checked onchange="toggleChecklist(${index}, false)"> <span style="text-decoration: line-through; opacity: 0.6">${text}</span></div>`;
    } else {
      html += `<div style="min-height: 20px;">${parsed}</div>`;
    }
  });

  preview.innerHTML = html;
}

export function toggleChecklist(index, isChecked) {
  const lines = currentAnotacaoText.split('\n');
  if (isChecked) {
    lines[index] = lines[index].replace('- [ ]', '- [x]');
  } else {
    lines[index] = lines[index].replace('- [x]', '- [ ]');
  }
  currentAnotacaoText = lines.join('\n');
  document.getElementById('anotacoesArea').value = currentAnotacaoText;
  renderAnotacoesPreview();
  salvarAnotacao();
}

export function inserirFormatacao(prefix, suffix) {
  const area = document.getElementById('anotacoesArea');
  const start = area.selectionStart;
  const end = area.selectionEnd;
  const text = area.value;
  const selectedText = text.substring(start, end);

  const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
  area.value = newText;
  currentAnotacaoText = newText;

  area.focus();
  area.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);

  salvarAnotacao();
}

export function salvarAnotacao() {
  const area = document.getElementById('anotacoesArea');
  if (!area) return;

  currentAnotacaoText = area.value;
  const m = isAnotacaoGlobal ? 0 : getCurrentMonth();
  const y = isAnotacaoGlobal ? 0 : getCurrentYear();

  const statusIcon = document.getElementById('statusSaveIcon');

  if (statusIcon) {
    statusIcon.innerText = 'cloud_upload';
    statusIcon.style.color = 'var(--text-secondary)';
    statusIcon.style.opacity = '0.7';
  }

  clearTimeout(timeoutAnotacao);
  timeoutAnotacao = setTimeout(async () => {
    try {
      await fetch('/api/anotacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conteudo: currentAnotacaoText, month: m, year: y }),
      });
      if (statusIcon) {
        statusIcon.innerText = 'cloud_done';
        statusIcon.style.color = 'var(--green)';
        statusIcon.style.opacity = '1';
      }
    } catch (err) {
      console.error(err);
      if (statusIcon) {
        statusIcon.innerText = 'cloud_off';
        statusIcon.style.color = 'var(--red)';
      }
    }
  }, 800);
}
