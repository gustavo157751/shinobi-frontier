import { ELEMENTS, RARITIES, ROSTER, STYLES } from '../../data/characters.js';
import { EQUIPMENT_SLOTS, INVENTORY_CATEGORIES, ITEM_CATALOG } from '../../data/items.js';
import { SCROLLS } from '../../data/scrolls.js';
import { game } from '../../core/state.js';
import { esc, fmt } from '../../core/utils.js';
import { characterPortrait, elementTag, rarityTag, styleTag } from '../components.js';
import { shell } from '../shell.js';

const SCROLL_ORDER = ['comum', 'prata', 'ouro'];
const STAT_LABELS = {
  hp: 'Vida',
  atk: 'Ataque',
  def: 'Defesa',
  chakraMax: 'Chakra',
  crit: 'Crítico',
};

export function renderCharacters(container, { navigate }) {
  let selectedCharacterId = 'hero';
  let selectedItemId = null;
  let activeView = 'characters';
  let activeCategory = 'all';
  let inventorySearch = '';

  function characterFor(id) {
    if (id === 'hero') {
      return { ...game.hero, id: 'hero', rarity: 'lendario', name: game.state.player.name, isHero: true };
    }
    return ROSTER.find((character) => character.id === id) ?? null;
  }

  function ownedCharacters() {
    return [characterFor('hero'), ...game.ownedCharacterIds().map(characterFor)].filter(Boolean);
  }

  function inventoryEntries() {
    const items = Object.values(ITEM_CATALOG).map((item) => ({
      ...item,
      count: game.state.inventory[item.id] ?? 0,
    }));
    for (const id of SCROLL_ORDER) {
      const scroll = SCROLLS[id];
      items.push({
        id: `scroll:${id}`,
        name: scroll.name,
        category: 'scrolls',
        symbol: scroll.kanji,
        rarity: id === 'ouro' ? 'lendario' : id === 'prata' ? 'raro' : 'comum',
        color: scroll.color,
        description: scroll.desc,
        count: game.state.scrolls[id] ?? 0,
        scrollId: id,
      });
    }
    return items.filter((item) => item.count > 0);
  }

  function filteredItems(items) {
    const query = normalize(inventorySearch.trim());
    return items.filter((item) => {
      const inCategory = activeCategory === 'all' || item.category === activeCategory;
      const inSearch = !query || normalize(`${item.name} ${item.description}`).includes(query);
      return inCategory && inSearch;
    });
  }

  function draw({ restoreSearch = false, caret = null } = {}) {
    const characters = ownedCharacters();
    if (!characters.some((character) => character.id === selectedCharacterId)) selectedCharacterId = 'hero';
    const selected = characterFor(selectedCharacterId);
    const stats = game.characterStats(selectedCharacterId);
    const equipment = game.equipmentFor(selectedCharacterId);
    const items = inventoryEntries();
    const visibleItems = filteredItems(items);
    const selectedItem = visibleItems.find((item) => item.id === selectedItemId) ?? visibleItems[0] ?? null;
    if (selectedItem && selectedItem.id !== selectedItemId) selectedItemId = selectedItem.id;
    if (!selectedItem) selectedItemId = null;

    const totalItemCount = items.reduce((sum, item) => sum + item.count, 0);
    const categoryCounts = Object.fromEntries(INVENTORY_CATEGORIES.map((category) => [
      category.id,
      category.id === 'all'
        ? totalItemCount
        : items.filter((item) => item.category === category.id).reduce((sum, item) => sum + item.count, 0),
    ]));

    container.innerHTML = `
      <section class="character-screen">
        <header class="screen-head character-screen__head">
          <div>
            <span class="eyebrow">Arquivo shinobi · Konoha</span>
            <h1>Personagens</h1>
            <p>Consulte o status da equipe, organize equipamentos e use os recursos da mochila.</p>
          </div>
          <div class="screen-head__stats character-screen__summary">
            <div><b>${characters.length}</b><span>Recrutados</span></div>
            <div><b>${game.state.squad.length}/5</b><span>Na equipe</span></div>
            <div><b>${totalItemCount}</b><span>Itens</span></div>
          </div>
        </header>

        <div class="character-tabs" role="tablist" aria-label="Seções de personagens">
          <button class="character-tabs__item ${activeView === 'characters' ? 'is-active' : ''}" data-view="characters" type="button" role="tab" aria-selected="${activeView === 'characters'}">
            <span>忍</span> Personagens
          </button>
          <button class="character-tabs__item ${activeView === 'tools' ? 'is-active' : ''}" data-view="tools" type="button" role="tab" aria-selected="${activeView === 'tools'}">
            <span>具</span> Ferramentas <b>${totalItemCount}</b>
          </button>
        </div>

        ${activeView === 'characters'
          ? charactersView({ characters, selected, stats, equipment, items, visibleItems, selectedItem, categoryCounts, activeCategory, inventorySearch, selectedItemId, navigate })
          : toolsView({ selected, stats, items, visibleItems, selectedItem, categoryCounts, activeCategory, inventorySearch, selectedItemId })}
      </section>
    `;

    bindActions();
    bindPortraitFallbacks();
    if (restoreSearch) {
      const input = container.querySelector('[data-inventory-search]');
      input?.focus();
      if (input && caret !== null) input.setSelectionRange(caret, caret);
    }
  }

  function bindActions() {
    container.querySelectorAll('[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        activeView = button.dataset.view;
        draw();
      });
    });

    container.querySelectorAll('[data-select-character]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedCharacterId = button.dataset.selectCharacter;
        draw();
      });
    });

    container.querySelectorAll('[data-category]').forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.category;
        draw();
      });
    });

    container.querySelectorAll('[data-select-item]').forEach((button) => {
      button.addEventListener('click', () => {
        selectedItemId = button.dataset.selectItem;
        draw();
      });
    });

    container.querySelectorAll('[data-inventory-search]').forEach((input) => {
      input.addEventListener('input', (event) => {
        inventorySearch = event.currentTarget.value;
        draw({ restoreSearch: true, caret: event.currentTarget.selectionStart });
      });
    });

    container.querySelectorAll('[data-equip-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = game.equipItem(button.dataset.equipItem, selectedCharacterId);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        shell.toast(result.action === 'unchanged' ? 'Esse item já está equipado.' : `${result.item.name} equipado.`, 'success');
        draw();
      });
    });

    container.querySelectorAll('[data-unequip-slot]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = game.unequipItem(selectedCharacterId, button.dataset.unequipSlot);
        if (!result.ok) return;
        shell.toast(`${result.item.name} voltou para a mochila.`, 'info');
        draw();
      });
    });

    container.querySelectorAll('[data-use-item]').forEach((button) => {
      button.addEventListener('click', () => {
        const result = game.useItem(button.dataset.useItem);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        const label = result.resource === 'chakra' ? 'Chakra' : 'Stamina';
        shell.toast(`+${result.restored} ${label}.`, 'success');
        draw();
      });
    });

    container.querySelectorAll('[data-open-scrolls]').forEach((button) => {
      button.addEventListener('click', () => navigate('pergaminhos'));
    });
  }

  function bindPortraitFallbacks() {
    container.querySelectorAll('.character-portrait img').forEach((image) => {
      const showFallback = () => image.closest('.character-portrait')?.classList.add('is-fallback');
      image.addEventListener('error', showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }

  draw();
}

function charactersView({ characters, selected, stats, equipment, items, visibleItems, selectedItem, categoryCounts, activeCategory, inventorySearch, selectedItemId, navigate }) {
  return `
    <div class="character-workspace">
      <aside class="panel character-roster" aria-label="Personagens recrutados">
        <header class="panel__head character-panel__head">
          <div><span class="eyebrow">Esquadrão</span><h2>Minha equipe</h2></div>
          <span class="chip">${characters.filter((character) => game.state.squad.includes(character.id)).length}/5</span>
        </header>
        <div class="character-roster__list">
          ${characters.map((character) => {
            const inSquad = game.state.squad.includes(character.id);
            return `
              <button class="character-roster__item ${character.id === selected.id ? 'is-selected' : ''}" data-select-character="${esc(character.id)}" type="button" aria-pressed="${character.id === selected.id}">
                ${characterPortrait(character, { size: 'small' })}
                <span class="character-roster__identity"><strong>${esc(character.name)}</strong><small>${inSquad ? 'Na formação' : 'Recrutado'} · Nv. ${game.level}</small></span>
                <span class="character-roster__element" style="--element-color:${(ELEMENTS[character.element] ?? ELEMENTS.vento).color}" title="${esc((ELEMENTS[character.element] ?? ELEMENTS.vento).label)}">${(ELEMENTS[character.element] ?? ELEMENTS.vento).kanji}</span>
              </button>`;
          }).join('')}
        </div>
        <p class="character-roster__note">A formação 3×3 é ajustada na tela Equipe.</p>
      </aside>

      <section class="panel character-record" aria-label="Status de ${esc(selected.name)}">
        ${characterRecordMarkup(selected, stats, equipment)}
      </section>

      ${inventoryPanelMarkup({ items, visibleItems, selectedItem, categoryCounts, compact: true, activeCategory, inventorySearch, selectedItemId, targetCharacter: selected, navigate })}
    </div>
  `;
}

function toolsView({ selected, stats, items, visibleItems, selectedItem, categoryCounts, activeCategory, inventorySearch, selectedItemId }) {
  return `
    <div class="tools-workspace">
      <aside class="panel tools-character" aria-label="Personagem selecionado">
        <span class="eyebrow">Personagem em foco</span>
        ${characterPortrait(selected, { size: 'hero' })}
        <h2>${esc(selected.name)}</h2>
        <p>Nível ${game.level} · ${(ELEMENTS[selected.element] ?? ELEMENTS.vento).label}</p>
        <div class="tools-character__stats">
          <span><b>${fmt(stats.atk)}</b><small>Ataque</small></span>
          <span><b>${fmt(stats.defense)}</b><small>Defesa</small></span>
          <span><b>${fmt(stats.maxHp)}</b><small>Vida</small></span>
        </div>
        <p class="panel__note">Selecione outro personagem na aba Personagens para direcionar novos equipamentos.</p>
      </aside>
      ${inventoryPanelMarkup({ items, visibleItems, selectedItem, categoryCounts, compact: false, activeCategory, inventorySearch, selectedItemId, targetCharacter: selected })}
    </div>
  `;
}

function characterRecordMarkup(character, stats, equipment) {
  const equippedCount = Object.values(equipment).filter(Boolean).length;
  const inSquad = game.state.squad.includes(character.id);
  const element = ELEMENTS[character.element] ?? ELEMENTS.vento;
  const style = STYLES[character.style] ?? STYLES.ninjutsu;
  return `
    <header class="panel__head character-record__head">
      <div><span class="eyebrow">${inSquad ? 'Em campo · status tático' : 'Ficha de personagem'}</span><h2>${esc(character.name)}</h2></div>
      <span class="character-level">Nv. ${game.level}</span>
    </header>
    <div class="character-record__hero" style="--character-color:${element.color}">
      <div class="character-record__portrait">${characterPortrait(character, { size: 'hero' })}</div>
      <div class="character-record__identity">
        <span class="character-record__title">${esc(character.title ?? 'Shinobi de Konoha')}</span>
        <div class="character-record__tags">${character.isHero ? '<span class="tag tag--rarity" style="--tag-color:#e9b949">Protagonista</span>' : rarityTag(character.rarity)}${elementTag(character.element)}${styleTag(character.style)}</div>
        <span class="character-record__role">${inSquad ? 'Sinergias da formação incluídas' : 'Fora da formação ativa'}</span>
      </div>
    </div>

    <div class="character-stats" aria-label="Atributos de combate">
      ${[
        ['Vida', fmt(stats.maxHp), 'HP'],
        ['Ataque', fmt(stats.atk), 'ATK'],
        ['Defesa', fmt(stats.defense), 'DEF'],
        ['Velocidade', fmt(stats.spd), 'SPD'],
        ['Chakra', fmt(stats.maxChakra), 'CH'],
        ['Crítico', `${Math.round(stats.crit * 100)}%`, 'CRIT'],
      ].map(([label, value, code]) => `<div class="character-stat"><span>${label}</span><b>${value}</b><small>${code}</small></div>`).join('')}
    </div>

    <div class="character-equipment">
      <div class="character-section-heading"><div><span class="eyebrow">Equipamento ativo</span><h3>Slots de item</h3></div><span class="chip">${equippedCount}/${EQUIPMENT_SLOTS.length}</span></div>
      <div class="character-equipment__slots">
        ${EQUIPMENT_SLOTS.map((slot) => {
          const item = ITEM_CATALOG[equipment[slot.id]];
          return `
            <button class="gear-slot ${item ? 'gear-slot--filled' : ''}" data-unequip-slot="${slot.id}" type="button" ${item ? `aria-label="Remover ${esc(item.name)} do slot ${esc(slot.label)}"` : 'disabled'}>
              <span class="gear-slot__symbol" style="--item-color:${item?.color ?? '#7f93a8'}">${item?.symbol ?? slot.symbol}</span>
              <span class="gear-slot__label">${esc(slot.label)}</span>
              <strong>${esc(item?.name ?? 'Vazio')}</strong>
              ${item ? `<small>${bonusSummary(item.bonus)}</small>` : '<small>Escolha um equipamento na mochila</small>'}
            </button>`;
        }).join('')}
      </div>
    </div>

    <div class="character-technique">
      <span class="eyebrow">Técnica de perseguição</span>
      <strong>${esc(character.pursuit?.name ?? 'Sem perseguição')}</strong>
      <small>${esc((character.pursuit?.triggers ?? []).map((trigger) => trigger === 'float' ? 'Flutuação' : 'Derrubar').join(' · ') || 'Escolha técnicas na tela de Equipe')}</small>
    </div>
  `;
}

function inventoryPanelMarkup({ items, visibleItems, selectedItem, categoryCounts, compact, activeCategory, inventorySearch, selectedItemId, targetCharacter }) {
  const detail = selectedItem ? inventoryDetailMarkup(selectedItem, targetCharacter) : '<p class="inventory-empty">Nenhum item corresponde ao filtro. Ajuste a categoria ou a busca.</p>';
  return `
    <aside class="panel inventory-panel ${compact ? 'inventory-panel--compact' : 'inventory-panel--expanded'}" aria-label="Inventário de ferramentas e itens">
      <header class="panel__head inventory-panel__head">
        <div><span class="eyebrow">Mochila do shinobi</span><h2>${compact ? 'Ferramentas' : 'Inventário'}</h2></div>
        <span class="chip">${items.reduce((sum, item) => sum + item.count, 0)} itens</span>
      </header>
      <div class="inventory-categories" role="group" aria-label="Filtrar inventário">
        ${INVENTORY_CATEGORIES.map((category) => `
          <button class="inventory-category ${category.id === activeCategory ? 'is-active' : ''}" data-category="${category.id}" type="button" aria-pressed="${category.id === activeCategory}">
            ${esc(category.label)} <span>${categoryCounts[category.id] ?? 0}</span>
          </button>`).join('')}
      </div>
      <label class="inventory-search"><span class="sr-only">Buscar itens</span><span aria-hidden="true">⌕</span><input class="input" data-inventory-search type="search" value="${esc(inventorySearch)}" placeholder="Buscar item" autocomplete="off"></label>
      <div class="inventory-grid ${compact ? 'inventory-grid--compact' : ''}" aria-live="polite">
        ${visibleItems.length ? visibleItems.map((item) => inventoryItemMarkup(item, selectedItemId)).join('') : '<p class="inventory-empty">Nenhum item nesta categoria.</p>'}
      </div>
      <div class="inventory-detail" aria-live="polite">${detail}</div>
    </aside>
  `;
}

function inventoryItemMarkup(item, selectedItemId) {
  const color = item.color ?? '#8ba1b7';
  const selected = item.id === selectedItemId;
  return `
    <button class="inventory-item ${selected ? 'is-selected' : ''}" data-select-item="${esc(item.id)}" type="button" aria-pressed="${selected}" style="--item-color:${color}">
      <span class="inventory-item__icon">${esc(item.symbol)}</span>
      <strong>${esc(item.name)}</strong>
      <span class="inventory-item__count">×${item.count}</span>
      <small>${esc((RARITIES[item.rarity] ?? RARITIES.comum).label)}</small>
    </button>
  `;
}

function inventoryDetailMarkup(item, targetCharacter) {
  const categoryLabel = INVENTORY_CATEGORIES.find((category) => category.id === item.category)?.label ?? 'Item';
  let action = '';
  if (item.category === 'equipment') {
    action = `<button class="btn btn--primary btn--sm" data-equip-item="${esc(item.id)}" type="button">Equipar em ${esc(targetCharacter.name)}</button>`;
  } else if (item.category === 'consumable') {
    const snap = game.resourceSnapshot();
    const cap = item.effect.resource === 'chakra' ? snap.chakraMax : snap.staminaMax;
    const value = item.effect.resource === 'chakra' ? snap.chakra : snap.stamina;
    action = `<button class="btn btn--primary btn--sm" data-use-item="${esc(item.id)}" type="button" ${value >= cap ? 'disabled' : ''}>Usar item</button>`;
  } else if (item.category === 'scrolls') {
    action = `<button class="btn btn--ghost btn--sm" data-open-scrolls type="button">Abrir invocação</button>`;
  }
  return `
    <div class="inventory-detail__top"><span class="inventory-detail__icon" style="--item-color:${item.color ?? '#8ba1b7'}">${esc(item.symbol)}</span><div><span class="eyebrow">${esc(categoryLabel)} · ×${item.count}</span><h3>${esc(item.name)}</h3></div></div>
    <p>${esc(item.description ?? '')}</p>
    ${item.bonus ? `<div class="inventory-detail__bonus"><strong>Bônus ao equipar</strong><span>${bonusSummary(item.bonus)}</span></div>` : ''}
    ${item.effect ? `<div class="inventory-detail__bonus"><strong>Uso</strong><span>Recupera até ${item.effect.amount} ${item.effect.resource === 'chakra' ? 'Chakra' : 'Stamina'}.</span></div>` : ''}
    ${action ? `<div class="inventory-detail__actions">${action}</div>` : item.category === 'material' ? '<small class="inventory-detail__note">Material guardado; não há uso ativo atribuído ainda.</small>' : ''}
  `;
}

function bonusSummary(bonus = {}) {
  return Object.entries(bonus).map(([key, value]) => {
    if (!value) return null;
    const label = STAT_LABELS[key] ?? key;
    const amount = key === 'crit' ? `+${Math.round(value * 100)}%` : `+${fmt(value)}`;
    return `${amount} ${label}`;
  }).filter(Boolean).join(' · ');
}

function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}
