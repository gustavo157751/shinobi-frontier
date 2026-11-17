/**
 * team.js — formação de combate, coleção de ninjas e ficha detalhada.
 */

import { ROSTER, getCharacter, statsFor, STYLES, ELEMENTS, RARITIES, BASIC_ATTACKS } from '../../data/characters.js';
import { jutsusOf } from '../../data/jutsus.js';
import { statusMeta } from '../../data/statuses.js';
import { game } from '../../core/state.js';
import { simulateCombo } from '../../core/combo-simulator.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, fmt } from '../../core/utils.js';
import { characterPortrait, rosterCard, elementTag, styleTag, rarityTag } from '../components.js';
import { FORMATION_ROLES, formationBonuses, formationLane, roleFor } from '../../core/formation.js';

export function renderTeam(container, { characterId = null } = {}) {
  let selectedId = characterId && game.isOwned(characterId) ? characterId : 'hero';
  let moveModeId = null;
  let selectedJutsuId = null;
  let collectionSearch = '';
  let ownedFilter = 'all';
  let rarityFilter = 'all';
  let elementFilter = 'all';

  function draw() {
    const squad = game.state.squad.filter((id) => game.isOwned(id));
    const selected = characterFor(selectedId);
    const members = squad.map((id) => ({
      id,
      character: characterFor(id),
      position: game.formationSlot(id) ?? 4,
      level: game.level,
    }));
    const formationBonus = formationBonuses(members);
    const basic = BASIC_ATTACKS[selected.style] ?? BASIC_ATTACKS.ninjutsu;
    const basicCombo = simulateCombo(members, selectedId, { name: basic.name, hits: 1, effect: basic.effect });
    const availableJutsus = jutsusOf(selected);
    const activeJutsu = availableJutsus.find((jutsu) => jutsu.id === selectedJutsuId) ?? availableJutsus[0];
    selectedJutsuId = activeJutsu?.id ?? null;
    const jutsuCombo = simulateCombo(members, selectedId, {
      name: activeJutsu?.name ?? 'Sem técnica',
      hits: activeJutsu?.hits ?? 1,
      effect: activeJutsu?.effect,
    });
    const bonusRows = [
      ['Vida máxima', formationBonus.hpPct, '%'],
      ['Chakra máximo', formationBonus.chakraPct, '%'],
      ['Ataques e combos', formationBonus.basicDamagePct, '%'],
      ['Técnicas', formationBonus.techniqueDamagePct, '%'],
      ['Redução de dano', formationBonus.damageReduction, '%'],
    ].filter(([, value]) => value > 0).map(([label, value]) =>
      `<span class="formation-bonus__chip">+${Math.round(value * 100)}% ${label}</span>`,
    );
    if (formationBonus.guardChakra > 0) {
      bonusRows.push(`<span class="formation-bonus__chip">+${formationBonus.guardChakra} chakra ao Guardar</span>`);
    }

    container.innerHTML = `
      <section class="team-screen team-screen--reference">
        <header class="screen-head team-screen__head">
          <div>
            <span class="eyebrow">Centro de comando · formação ativa</span>
            <h1>Minha equipe</h1>
            <p>Escalone até quatro ninjas ao lado do protagonista, ajuste a grade 3×3 e confira quem pode entrar na formação.</p>
          </div>
          <div class="screen-head__stats">
            <div><b>${squad.length}/5</b><span>Em campo</span></div>
            <div><b>${game.state.ninjas.length}/${ROSTER.length}</b><span>Clássicos</span></div>
            <div><b>${game.level}</b><span>Nível</span></div>
          </div>
        </header>

        <div class="team-layout team-layout--reference">
          <aside class="panel team-sidebar" aria-label="Equipe ativa">
            <header class="panel__head team-sidebar__head">
              <div><span class="eyebrow">Esquadrão atual</span><h2>Minha equipe</h2></div>
              <span class="chip">${squad.length}/5</span>
            </header>
            <p class="team-sidebar__summary">Protagonista + até quatro aliados. Selecione um integrante para abrir sua ficha.</p>
            <ol class="team-party-list">
              ${Array.from({ length: 5 }).map((_, index) => {
                const id = squad[index];
                if (!id) {
                  return `
                    <li class="team-party-list__empty">
                      <span class="team-party-list__number">P${String(index + 1).padStart(2, '0')}</span>
                      <span><strong>Vaga livre</strong><small>Escolha um ninja na coleção</small></span>
                      <i aria-hidden="true">＋</i>
                    </li>
                  `;
                }
                const character = characterFor(id);
                const role = FORMATION_ROLES[roleFor(character)];
                const lane = formationLane(game.formationSlot(id) ?? 4);
                return `
                  <li class="team-party-list__item ${id === selectedId ? 'is-selected' : ''}">
                    <button class="team-party-list__select" data-character="${esc(id)}" type="button" aria-label="Selecionar ${esc(character.name)}">
                      <span class="team-party-list__number">P${String(index + 1).padStart(2, '0')}</span>
                      ${characterPortrait(character, { size: 'small' })}
                      <span class="team-party-list__identity"><strong>${esc(character.name)}</strong><small>${esc(role.label)} · ${lane}</small></span>
                    </button>
                    ${id !== 'hero' ? `<button class="team-party-list__remove" data-remove="${esc(id)}" type="button" title="Remover da formação" aria-label="Remover ${esc(character.name)}">×</button>` : '<span class="team-party-list__leader" title="Protagonista obrigatório">LÍDER</span>'}
                  </li>
                `;
              }).join('')}
            </ol>
            <div class="team-sidebar__foot">
              <span class="team-sidebar__status"><i aria-hidden="true"></i> Formação salva</span>
              <p>As mudanças de integrantes e posições são guardadas no progresso local.</p>
            </div>
          </aside>

          <div class="team-col team-center">
            <section class="panel team-stage">
              <header class="panel__head">
                <div><span class="eyebrow">Posicionamento tático</span><h2>Campo de formação</h2></div>
                <span class="chip">Grade 3×3</span>
              </header>
              <div class="formation-board__caption">
                <span>Retaguarda</span><span>Meio</span><strong>Frente · inimigo →</strong>
              </div>
              <div class="formation-board" role="grid" aria-label="Grade tática 3 por 3">
                ${Array.from({ length: 9 }).map((_, slot) => {
                  const id = squad.find((memberId) => game.formationSlot(memberId) === slot);
                  const lane = formationLane(slot);
                  const isMoving = moveModeId === selectedId && squad.includes(selectedId);
                  const isRecruitTarget = !squad.includes(selectedId) && game.isOwned(selectedId);
                  const isTarget = isMoving || (!id && isRecruitTarget);
                  if (!id) {
                    return `
                      <button class="formation-cell formation-cell--empty ${isTarget ? 'is-target' : ''}" data-formation-slot="${slot}" type="button"
                        aria-label="Posição ${slot + 1}, ${lane}${isTarget ? ', destino disponível' : ', vaga vazia'}">
                        <span class="formation-cell__index">P${String(slot + 1).padStart(2, '0')}</span>
                        <span class="formation-cell__lane">${lane}</span>
                        <b class="formation-cell__plus">+</b>
                        <small>${isMoving ? 'Mover selecionado' : isRecruitTarget ? 'Alocar selecionado' : 'Vaga livre'}</small>
                      </button>
                    `;
                  }
                  const character = characterFor(id);
                  const role = FORMATION_ROLES[roleFor(character)];
                  return `
                    <div class="formation-cell-wrap ${id === selectedId ? 'is-selected' : ''} ${isMoving && id !== selectedId ? 'is-target' : ''}">
                      <button class="formation-cell" data-formation-slot="${slot}" data-member-id="${esc(id)}" type="button"
                        aria-label="${esc(character.name)}, ${role.label}, ${lane}, posição ${slot + 1}">
                        <span class="formation-cell__index">P${String(slot + 1).padStart(2, '0')}</span>
                        ${characterPortrait(character, { size: 'formation' })}
                        <strong>${esc(character.name)}</strong>
                        <small>${role.kanji} ${role.label}</small>
                        <em>${lane}</em>
                        ${id === 'hero' ? '<span class="formation-cell__fixed">Líder</span>' : ''}
                      </button>
                      ${id !== 'hero' ? `<button class="formation-cell__remove" data-remove="${esc(id)}" type="button" title="Remover da formação" aria-label="Remover ${esc(character.name)}">×</button>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
              <p class="formation-board__hint">Escolha um aliado na coleção e depois uma célula livre. Para trocar posições, selecione um integrante e clique no destino.</p>
              <div class="formation-bonus">
                <div class="formation-bonus__head"><strong>Sinergia da formação</strong><span>Bônus por função e coluna</span></div>
                <div class="formation-bonus__chips">${bonusRows.join('') || '<span class="formation-bonus__empty">Nenhum bônus ativo</span>'}</div>
              </div>
              <p class="panel__note">Vanguarda protege a linha de frente; Atacante amplia o dano; Suporte melhora chakra/Guarda; Controle fortalece técnicas. Perseguições dependem de Flutuação e Derrubar.</p>
            </section>

            <aside class="detail-panel" id="detail-panel" aria-label="Ficha do personagem selecionado">${detailMarkup(selected, squad)}</aside>

            <section class="panel combo-lab">
              <header class="panel__head">
                <div><span class="eyebrow">Planejamento tático</span><h2>Laboratório de combos</h2></div>
                <span class="chip">${squad.length}/5 em campo</span>
              </header>
              <p class="panel__note">Simulação das perseguições do ninja selecionado. O encadeamento presume que o gatilho aconteceu.</p>
              <div class="combo-lab__grid">
                ${comboPanelMarkup('Combo por Ataque', basicCombo)}
                <section class="combo-track">
                  <label class="combo-track__select">Combo por Técnica
                    <select data-combo-jutsu ${availableJutsus.length ? '' : 'disabled'}>
                      ${availableJutsus.map((jutsu) => `<option value="${jutsu.id}" ${jutsu.id === activeJutsu?.id ? 'selected' : ''}>${esc(jutsu.name)}</option>`).join('')}
                    </select>
                  </label>
                  ${comboStepsMarkup(jutsuCombo)}
                </section>
              </div>
            </section>
          </div>

          <aside class="panel team-roster" aria-label="Coleção de ninjas">
            <header class="panel__head team-roster__head">
              <div><span class="eyebrow">Recrutamento</span><h2>Ninjas possuídos</h2></div>
              <span class="chip" data-roster-count></span>
            </header>
            <label class="team-roster__search">
              <span class="sr-only">Buscar ninjas</span>
              <input class="input" data-roster-search type="search" value="${esc(collectionSearch)}" placeholder="Nome do ninja" autocomplete="off">
            </label>
            <div class="team-roster__filters">
              <label><span>Disponibilidade</span><select data-roster-owned aria-label="Filtrar por disponibilidade">
                <option value="all" ${ownedFilter === 'all' ? 'selected' : ''}>Todos</option>
                <option value="owned" ${ownedFilter === 'owned' ? 'selected' : ''}>Invocados</option>
                <option value="locked" ${ownedFilter === 'locked' ? 'selected' : ''}>Não invocados</option>
                <option value="active" ${ownedFilter === 'active' ? 'selected' : ''}>Em campo</option>
              </select></label>
              <label><span>Raridade</span><select data-roster-rarity aria-label="Filtrar por raridade">
                <option value="all" ${rarityFilter === 'all' ? 'selected' : ''}>Todas</option>
                ${Object.entries(RARITIES).map(([id, rarity]) => `<option value="${id}" ${rarityFilter === id ? 'selected' : ''}>${rarity.label}</option>`).join('')}
              </select></label>
              <label><span>Elemento</span><select data-roster-element aria-label="Filtrar por elemento">
                <option value="all" ${elementFilter === 'all' ? 'selected' : ''}>Todos</option>
                ${Object.entries(ELEMENTS).map(([id, element]) => `<option value="${id}" ${elementFilter === id ? 'selected' : ''}>${element.label}</option>`).join('')}
              </select></label>
            </div>
            <div class="roster-grid team-roster__grid">
              ${rosterCard(characterFor('hero'), {
                owned: true,
                level: game.level,
                inSquad: squad.includes('hero'),
                isHero: true,
                stats: statsFor(game.hero, game.level),
                selected: selectedId === 'hero',
              })}
              ${ROSTER.map((character) => rosterCard(character, {
                owned: game.isOwned(character.id),
                level: game.level,
                inSquad: squad.includes(character.id),
                stats: statsFor(character, game.level),
                selected: selectedId === character.id,
              })).join('')}
            </div>
            <p class="team-roster__empty" data-roster-empty hidden>Nenhum ninja corresponde aos filtros.</p>
          </aside>
        </div>
      </section>
    `;

    bind();
    applyRosterFilters();
  }

  function bind() {
    container.querySelectorAll('[data-character]').forEach((card) => {
      card.addEventListener('click', () => {
        selectedId = card.dataset.character;
        moveModeId = null;
        sfx.click();
        draw();
      });
    });

    container.querySelectorAll('[data-formation-slot]').forEach((cell) => {
      cell.addEventListener('click', () => {
        const position = Number(cell.dataset.formationSlot);
        const squad = game.state.squad;
        if (moveModeId === selectedId && squad.includes(selectedId)) {
          const result = game.placeSquadMember(selectedId, position);
          if (!result.ok) {
            shell.toast(result.reason, 'warn');
            return;
          }
          moveModeId = null;
          sfx.click();
          shell.toast(result.action === 'swapped' ? 'Posições trocadas.' : 'Integrante reposicionado.');
          draw();
          return;
        }

        const memberId = cell.dataset.memberId;
        if (memberId) {
          selectedId = memberId;
          moveModeId = null;
          draw();
          return;
        }
        if (squad.includes(selectedId)) {
          shell.toast('Abra a ficha do integrante e escolha “Reposicionar” para mover uma unidade.');
          return;
        }
        const result = game.addSquadMemberAt(selectedId, position);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(`${characterFor(selectedId).name} ocupou a posição ${position + 1}.`);
        draw();
      });
    });

    container.querySelectorAll('[data-remove]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const id = button.dataset.remove;
        const result = game.toggleSquadMember(id);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(`${characterFor(id).name} saiu da formação.`);
        draw();
      });
    });

    container.querySelector('[data-combo-jutsu]')?.addEventListener('change', (event) => {
      selectedJutsuId = event.currentTarget.value;
      draw();
    });

    container.querySelector('[data-roster-search]')?.addEventListener('input', (event) => {
      collectionSearch = event.currentTarget.value;
      applyRosterFilters();
    });
    container.querySelector('[data-roster-owned]')?.addEventListener('change', (event) => {
      ownedFilter = event.currentTarget.value;
      applyRosterFilters();
    });
    container.querySelector('[data-roster-rarity]')?.addEventListener('change', (event) => {
      rarityFilter = event.currentTarget.value;
      applyRosterFilters();
    });
    container.querySelector('[data-roster-element]')?.addEventListener('change', (event) => {
      elementFilter = event.currentTarget.value;
      applyRosterFilters();
    });

    bindPortraitFallbacks();
    bindDetail();
  }

  function applyRosterFilters() {
    const query = normalizeRosterText(collectionSearch.trim());
    let visibleCount = 0;
    container.querySelectorAll('.team-roster__grid .roster-card').forEach((card) => {
      const owned = card.dataset.owned === 'true';
      const searchMatches = !query || normalizeRosterText(card.dataset.search ?? '').includes(query);
      const ownedMatches = ownedFilter === 'all'
        || (ownedFilter === 'owned' && owned)
        || (ownedFilter === 'locked' && !owned)
        || (ownedFilter === 'active' && card.classList.contains('roster-card--active'));
      const rarityMatches = rarityFilter === 'all' || card.dataset.rarity === rarityFilter;
      const elementMatches = elementFilter === 'all' || card.dataset.element === elementFilter;
      const matches = searchMatches && ownedMatches && rarityMatches && elementMatches;
      card.hidden = !matches;
      if (matches) visibleCount += 1;
    });
    const total = container.querySelectorAll('.team-roster__grid .roster-card').length;
    const count = container.querySelector('[data-roster-count]');
    if (count) count.textContent = `${visibleCount}/${total}`;
    const empty = container.querySelector('[data-roster-empty]');
    if (empty) empty.hidden = visibleCount > 0;
  }

  function bindPortraitFallbacks() {
    container.querySelectorAll('.character-portrait img').forEach((image) => {
      const showFallback = () => image.closest('.character-portrait')?.classList.add('is-fallback');
      image.addEventListener('error', showFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) showFallback();
    });
  }

  function bindDetail() {
    const action = container.querySelector('[data-squad-action]');
    if (action) {
      action.addEventListener('click', () => {
        const id = action.dataset.squadAction;
        const result = game.toggleSquadMember(id);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.toast(result.action === 'added' ? `${characterFor(id).name} entrou na formação!` : `${characterFor(id).name} saiu da formação.`);
        draw();
      });
    }

    container.querySelector('[data-move-mode]')?.addEventListener('click', () => {
      moveModeId = moveModeId === selectedId ? null : selectedId;
      draw();
    });

    container.querySelector('[data-open-jutsus]')?.addEventListener('click', () => openJutsuModal(selectedId));
  }

  function characterFor(id) {
    if (id === 'hero') {
      return { ...game.hero, name: game.state.player.name, rarity: 'lendario', id: 'hero', isHero: true };
    }
    return getCharacter(id);
  }

  draw();

  function detailMarkup(character, squad) {
    if (!character) return '';
    const isHero = character.id === 'hero' || character.isHero;
    const owned = game.isOwned(character.id);
    const inSquad = squad.includes(character.id);
    const stats = statsFor(isHero ? game.hero : character, game.level);
    const style = STYLES[character.style] ?? STYLES.ninjutsu;
    const element = ELEMENTS[character.element] ?? ELEMENTS.vento;
    const jutsus = jutsusOf(isHero ? game.hero : character);

    return `
      <div class="detail" style="--detail-color:${style.color}">
        <div class="detail__head">
          ${characterPortrait(character, { size: 'hero' })}
          <div>
            <span class="eyebrow">${isHero ? 'Protagonista' : RARITIES[character.rarity]?.label ?? 'Ninja'}</span>
            <h2>${esc(character.name)}</h2>
            <p>${esc(character.title ?? '')}</p>
            <div class="detail__tags">
              ${styleTag(character.style)}
              ${elementTag(character.element)}
              ${isHero ? '' : rarityTag(character.rarity)}
            </div>
          </div>
        </div>

        <div class="detail__stats">
          <div><span>Vida</span><b>${fmt(stats.hp)}</b></div>
          <div><span>Ataque</span><b>${fmt(stats.atk)}</b></div>
          <div><span>Defesa</span><b>${fmt(stats.def)}</b></div>
          <div><span>Velocidade</span><b>${stats.spd}</b></div>
          <div><span>Chakra</span><b>${stats.chakraMax}</b></div>
          <div><span>Crítico</span><b>${Math.round(stats.crit * 100)}%</b></div>
        </div>

        <div class="detail__section">
          <h3>Técnicas</h3>
          <ul class="jutsu-list">
            ${jutsus
              .map(
                (jutsu) => `
                <li class="jutsu-item">
                  <span class="jutsu-item__kanji">${jutsu.kanji}</span>
                  <div>
                    <strong>${esc(jutsu.name)}</strong>
                    <p>${esc(jutsu.desc)}</p>
                    <span class="jutsu-item__meta">
                      ${jutsu.cost} chakra · ${jutsu.target === 'allEnemies' ? 'área' : jutsu.target === 'ally' || jutsu.target === 'allAllies' ? 'suporte' : 'alvo único'}
                      ${jutsu.power ? ` · poder ${jutsu.power}x` : ''}
                    </span>
                  </div>
                </li>`,
              )
              .join('')}
          </ul>
        </div>

        ${
          character.pursuit
            ? `
            <div class="detail__section">
              <h3>Perseguição (combo)</h3>
              <div class="pursuit">
                <span class="pursuit__kanji">追</span>
                <div>
                  <strong>${esc(character.pursuit.name)}</strong>
                  <p>Dispara quando o alvo recebe
                    ${character.pursuit.triggers.map((trigger) => `<b>${trigger === 'float' ? 'Flutuação' : 'Derrubar'}</b>`).join(' ou ')}.
                    Dano de ${character.pursuit.mult}x${character.pursuit.hits ? ` em ${character.pursuit.hits} golpe(s)` : ''}.
                  </p>
                </div>
              </div>
            </div>`
            : ''
        }

        ${
          character.passive
            ? `<div class="detail__section"><h3>Passiva</h3><p class="detail__passive">${esc(character.passive)}</p></div>`
            : ''
        }

        <blockquote class="detail__quote">“${esc(character.quote ?? 'A vila conta comigo.')}”</blockquote>

        <div class="detail__actions">
          ${
            owned
              ? `<button class="btn ${inSquad ? 'btn--ghost' : 'btn--primary'} btn--block" data-squad-action="${character.id}" type="button"
                   ${isHero ? 'disabled title="O protagonista é obrigatório"' : ''}>
                   ${isHero ? 'Sempre em campo' : inSquad ? 'Remover da formação' : 'Escalar na formação'}
                 </button>`
              : `<button class="btn btn--primary btn--block" disabled type="button">Invoque com um pergaminho</button>`
          }
          ${inSquad ? '<button class="btn btn--ghost btn--block" data-move-mode type="button">Reposicionar na grade</button>' : ''}
          <button class="btn btn--ghost btn--block" data-open-jutsus="1" type="button">Ver ficha completa de combate</button>
        </div>
      </div>
    `;
  }

  function openJutsuModal(id) {
    const character = characterFor(id);
    const isHero = character.id === 'hero' || character.isHero;
    const jutsus = jutsusOf(isHero ? game.hero : character);
    const pursuit = character.pursuit;
    shell.openModal({
      title: esc(character.name),
      subtitle: `${STYLES[character.style].label} · ${ELEMENTS[character.element].label}`,
      size: 'md',
      body: `
        <div class="jutsu-sheet">
          <div class="jutsu-sheet__intro">
            ${characterPortrait(character, { size: 'modal' })}
            <p>${esc(character.title ?? '')}. Atributos calculados no nível ${game.level}.</p>
          </div>
          <ul class="jutsu-list">
            ${jutsus
              .map(
                (jutsu) => `
                <li class="jutsu-item">
                  <span class="jutsu-item__kanji">${jutsu.kanji}</span>
                  <div>
                    <strong>${esc(jutsu.name)}</strong>
                    <p>${esc(jutsu.desc)}</p>
                    <span class="jutsu-item__meta">${jutsu.cost} chakra${jutsu.power ? ` · poder ${jutsu.power}x` : ''}${jutsu.hits > 1 ? ` · ${jutsu.hits} golpes` : ''}</span>
                  </div>
                </li>`,
              )
              .join('')}
          </ul>
          ${
            pursuit
              ? `<div class="pursuit pursuit--wide">
                   <span class="pursuit__kanji">追</span>
                   <div>
                     <strong>${esc(pursuit.name)}</strong>
                     <p>Gatilhos: ${pursuit.triggers.map((trigger) => (trigger === 'float' ? 'Flutuação' : 'Derrubar')).join(', ')} · dano ${pursuit.mult}x.</p>
                   </div>
                 </div>`
              : ''
          }
        </div>
      `,
    });
  }
}

function normalizeRosterText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

function comboPanelMarkup(title, combo) {
  return `
    <section class="combo-track">
      <h3>${title}</h3>
      ${comboStepsMarkup(combo)}
    </section>
  `;
}

function comboStepsMarkup(combo) {
  const trigger = combo.triggerType ? statusMeta(combo.triggerType) : null;
  const starter = `
    <li class="combo-step combo-step--starter">
      <span class="combo-step__number">1</span>
      <span><strong>${esc(combo.sourceName)}</strong><small>${esc(combo.starterName)} · ${combo.starterHits} ${combo.starterHits === 1 ? 'acerto' : 'acertos'}</small></span>
    </li>
  `;
  const pursuits = combo.sequence.map((step, index) => `
    <li class="combo-step">
      <span class="combo-step__number">${index + 2}</span>
      <span><strong>${esc(step.name)}</strong><small>${esc(step.ability)} · ${step.hits} ${step.hits === 1 ? 'acerto' : 'acertos'} · ${statusMeta(step.triggerType).label}</small></span>
    </li>
  `).join('');
  const emptyMessage = !combo.triggerType
    ? 'Esta ação não aplica um efeito de perseguição.'
    : !trigger?.combo
      ? `${trigger?.label ?? 'O efeito'} não abre perseguição neste protótipo.`
      : 'Nenhum aliado disponível possui perseguição para este gatilho.';
  return `
    <div class="combo-track__meta">
      <span>${trigger ? `Gatilho: ${trigger.label}` : 'Sem gatilho de combo'}</span>
      <span>${combo.sequence.length} ${combo.sequence.length === 1 ? 'perseguição' : 'perseguições'}</span>
    </div>
    <ol class="combo-sequence">${starter}${pursuits || `<li class="combo-track__empty">${emptyMessage}</li>`}</ol>
    <div class="combo-track__total"><b>${combo.totalHits}</b><span>acertos na sequência</span></div>
  `;
}
