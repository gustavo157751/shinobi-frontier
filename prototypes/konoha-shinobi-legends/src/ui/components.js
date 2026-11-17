/**
 * components.js — peças visuais reutilizadas pelas telas.
 * Tudo devolve string HTML para ser injetado nos containers.
 */

import { ELEMENTS, RARITIES, STYLES } from '../data/characters.js';
import { CHARACTER_ART } from '../data/character-art.js';
import { STATUS_META, statusMeta } from '../data/statuses.js';
import { esc, fmt } from '../core/utils.js';

/** Selo circular com o kanji do personagem (funciona como "retrato"). */
export function sigilAvatar(character, { size = 'md', dim = false, extraClass = '' } = {}) {
  const element = ELEMENTS[character.element] ?? ELEMENTS.vento;
  const style = STYLES[character.style] ?? STYLES.ninjutsu;
  return `
    <div class="sigil sigil--${size} ${dim ? 'sigil--dim' : ''} ${extraClass}" style="--sigil-color:${element.color};--sigil-accent:${style.color}">
      <span class="sigil__kanji">${esc(character.sigil ?? '忍')}</span>
      <span class="sigil__ring"></span>
      <span class="sigil__element" title="${esc(element.label)}">${element.kanji}</span>
    </div>
  `;
}

/** Retrato gerado individualmente; o selo existente fica disponível como fallback. */
export function characterPortrait(character, { size = 'md', dim = false, extraClass = '' } = {}) {
  const element = ELEMENTS[character.element] ?? ELEMENTS.vento;
  const src = CHARACTER_ART[character.id];
  const sigilSize = size === 'hero' ? 'xl' : size === 'formation' ? 'md' : size === 'small' ? 'sm' : 'lg';
  return `
    <span class="character-portrait character-portrait--${size} ${src ? 'has-art' : ''} ${dim ? 'character-portrait--dim' : ''} ${extraClass}" style="--portrait-color:${element.color}" aria-hidden="true">
      ${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : ''}
      <span class="character-portrait__fallback">${sigilAvatar(character, { size: sigilSize, dim })}</span>
    </span>
  `;
}

export function rarityTag(rarity) {
  const meta = RARITIES[rarity] ?? RARITIES.comum;
  return `<span class="tag tag--rarity" style="--tag-color:${meta.color}">${meta.label}</span>`;
}

export function elementTag(elementKey) {
  const meta = ELEMENTS[elementKey] ?? ELEMENTS.vento;
  return `<span class="tag" style="--tag-color:${meta.color}">${meta.kanji} ${meta.label}</span>`;
}

export function styleTag(styleKey) {
  const meta = STYLES[styleKey] ?? STYLES.ninjutsu;
  return `<span class="tag" style="--tag-color:${meta.color}">${meta.kanji} ${meta.label}</span>`;
}

/** Barra de progresso genérica. */
export function bar(current, max, { variant = 'hp', label = '', compact = false } = {}) {
  const pct = Math.max(0, Math.min(100, (current / Math.max(1, max)) * 100));
  return `
    <div class="bar bar--${variant} ${compact ? 'bar--compact' : ''}">
      <div class="bar__fill" style="width:${pct}%"></div>
      ${label ? `<span class="bar__label">${label}</span>` : ''}
    </div>
  `;
}

/** Ficha de personagem usada na escalação e na coleção. */
export function rosterCard(
  character,
  { owned = false, level = 1, inSquad = false, isHero = false, stats = null, selected = false } = {},
) {
  const rarity = character.rarity ?? (isHero ? 'lendario' : 'comum');
  const searchText = `${character.name} ${character.title ?? ''}`.toLocaleLowerCase('pt-BR');
  return `
    <button class="roster-card ${owned ? '' : 'roster-card--locked'} ${inSquad ? 'roster-card--active' : ''} ${selected ? 'is-selected' : ''}"
      data-character="${esc(character.id)}" data-owned="${owned ? 'true' : 'false'}" data-rarity="${esc(rarity)}"
      data-element="${esc(character.element)}" data-search="${esc(searchText)}" type="button">
      ${characterPortrait(character, { size: 'card', dim: !owned })}
      <div class="roster-card__body">
        <div class="roster-card__name">${esc(character.name)}${isHero ? '<span class="roster-card__hero">PROTAGONISTA</span>' : ''}</div>
        <div class="roster-card__title">${esc(character.title ?? '')}</div>
        <div class="roster-card__tags">
          ${isHero ? `<span class="tag" style="--tag-color:${(STYLES[character.style] ?? STYLES.ninjutsu).color}">${(STYLES[character.style] ?? STYLES.ninjutsu).label}</span>` : rarityTag(rarity)}
          ${elementTag(character.element)}
        </div>
        ${
          owned
            ? `<div class="roster-card__meta">Nível ${level}${stats ? ` · ${fmt(stats.hp)} vida · ${fmt(stats.atk)} ataque` : ''}</div>`
            : `<div class="roster-card__meta roster-card__meta--locked">Ainda não invocado</div>`
        }
      </div>
      ${inSquad ? '<span class="roster-card__badge">EM CAMPO</span>' : ''}
    </button>
  `;
}

/** Fileira de status ativos de uma unidade. */
export function statusChips(unit) {
  const guard = unit.guard
    ? '<span class="status-chip" style="--chip-color:#e9b949" title="Em guarda: dano reduzido">守</span>'
    : '';
  if (!unit.statuses?.length && !guard) return '';
  return `<div class="status-chips">${guard}${unit.statuses
    .map((status) => {
      const meta = statusMeta(status.type);
      const extra = status.type === 'shield' ? `<b>${fmt(status.value)}</b>` : '';
      return `<span class="status-chip" style="--chip-color:${meta.color}" title="${esc(meta.label)}">${meta.kanji}${extra}</span>`;
    })
    .join('')}</div>`;
}

/** Ficha de combate (usada nas duas fileiras da batalha). */
export function battleCard(unit, { selected = false } = {}) {
  const element = ELEMENTS[unit.element] ?? ELEMENTS.vento;
  const style = STYLES[unit.style] ?? STYLES.ninjutsu;
  const hpPct = Math.max(0, (unit.hp / unit.maxHp) * 100);
  const chakraPct = Math.max(0, Math.min(100, (unit.chakra / unit.maxChakra) * 100));
  return `
    <div class="unit ${unit.alive ? '' : 'unit--dead'} ${selected ? 'unit--selected' : ''}"
      data-uid="${esc(unit.uid)}" data-side="${unit.side}"
      style="--unit-element:${element.color};--unit-style:${style.color}">
      <div class="unit__head">
        <div class="unit__sigil" style="--sigil-color:${element.color}">
          <span>${esc(unit.sigil ?? '忍')}</span>
        </div>
        <div class="unit__ident">
          <span class="unit__name">${esc(unit.name)}</span>
          <span class="unit__level">P${String(unit.slot + 1).padStart(2, '0')} · Nv. ${unit.level} · ${esc(style.label)}</span>
        </div>
        <div class="unit__initiative">${unit.spd}</div>
      </div>
      <div class="unit__bars">
        <div class="meter meter--hp" title="Vida ${Math.round(unit.hp)} / ${unit.maxHp}">
          <span class="meter__fill" style="width:${hpPct}%"></span>
          <span class="meter__text">${Math.round(unit.hp)}</span>
        </div>
        <div class="meter meter--chakra" title="Chakra ${Math.round(unit.chakra)} / ${unit.maxChakra}">
          <span class="meter__fill" style="width:${chakraPct}%"></span>
        </div>
      </div>
      ${statusChips(unit)}
      <div class="unit__fx" aria-hidden="true"></div>
    </div>
  `;
}

/** Linha de recompensa (missões e resultados). */
export function rewardLine(rewards = {}) {
  const parts = [];
  if (rewards.ryo) parts.push(`<span class="reward reward--ryo">${fmt(rewards.ryo)} Ryos</span>`);
  if (rewards.exp) parts.push(`<span class="reward reward--exp">${fmt(rewards.exp)} EXP</span>`);
  if (rewards.gold) parts.push(`<span class="reward reward--gold">${fmt(rewards.gold)} Ouro</span>`);
  for (const [type, amount] of Object.entries(rewards.scrolls ?? {})) {
    const label = type === 'comum' ? 'Comum' : type === 'prata' ? 'Prateado' : 'Dourado';
    parts.push(`<span class="reward reward--scroll">${amount}× Pergaminho ${label}</span>`);
  }
  return parts.join('');
}

/** Detalhes de status para tooltips/legenda. */
export function statusLegend() {
  return Object.entries(STATUS_META)
    .map(
      ([, meta]) =>
        `<span class="legend-item"><b style="color:${meta.color}">${meta.kanji}</b> ${meta.label}<i>${meta.desc}</i></span>`,
    )
    .join('');
}
