/**
 * utils.js — Funções auxiliares puras, usadas por todo o jogo.
 */

/** Espera em milissegundos (usado para dar ritmo às animações de combate). */
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Número aleatório entre min e max (inclusivo nos inteiros). */
export const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

/** Sorteio ponderado: recebe [[valor, peso], ...] e devolve o valor sorteado. */
export function weightedPick(entries) {
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return entries[0]?.[0] ?? null;
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/** Embaralha uma cópia da lista (Fisher-Yates). */
export function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** 1234 -> "1.234" (pt-BR). */
export const fmt = (value) => Math.round(value).toLocaleString('pt-BR');

/** Formata segundos como "12m 30s". */
export function fmtDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (minutes <= 0) return `${rest}s`;
  return `${minutes}m ${rest.toString().padStart(2, '0')}s`;
}

/** Escapa texto para inserir com segurança em HTML. */
export function esc(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Cria um elemento a partir de uma string HTML (primeiro nó). */
export function htmlToElement(markup) {
  const template = document.createElement('template');
  template.innerHTML = markup.trim();
  return template.content.firstElementChild;
}

/** Remove todos os filhos de um nó. */
export function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

/** Atalho de querySelector restrito a um escopo. */
export const qs = (selector, scope = document) => scope.querySelector(selector);
export const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];
