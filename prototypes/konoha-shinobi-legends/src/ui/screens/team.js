/**
 * team.js — formação de combate, coleção de ninjas e ficha detalhada.
 */

import { ROSTER, getCharacter, statsFor, STYLES, ELEMENTS, RARITIES } from '../../data/characters.js';
import { jutsusOf } from '../../data/jutsus.js';
import { game } from '../../core/state.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, fmt } from '../../core/utils.js';
import { sigilAvatar, rosterCard, elementTag, styleTag, rarityTag } from '../components.js';
import { FORMATION_ROLES, formationBonuses, roleFor } from '../../core/formation.js';

export function renderTeam(container, { characterId = null } = {}) {
  let selectedId = characterId && game.isOwned(characterId) ? characterId : 'hero';

  function draw() {
    const squad = game.state.squad.filter((id) => game.isOwned(id));
    const selected = characterFor(selectedId);
    const formationBonus = formationBonuses(squad.map((id, position) => ({
      character: characterFor(id),
      position,
      level: game.level,
    })));
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
      <section class="team-screen">
        <header class="screen-head">
          <div>
            <span class="eyebrow">Escalação · Time 7 e aliados</span>
            <h1>Formação shinobi</h1>
            <p>Monte uma equipe de até 5 combatentes: o protagonista mais 4 ninjas clássicos. A ordem das vagas define a posição na arena.</p>
          </div>
          <div class="screen-head__stats">
            <div><b>${squad.length}/5</b><span>Em campo</span></div>
            <div><b>${game.state.ninjas.length}/${ROSTER.length}</b><span>Coleção</span></div>
            <div><b>${game.level}</b><span>Nível</span></div>
          </div>
        </header>

        <div class="team-layout">
          <div class="team-col">
            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Vagas de combate</span>
                  <h2>Formação ativa</h2>
                </div>
                <span class="chip">${squad.length} de 5</span>
              </header>
              <div class="formation">
                ${Array.from({ length: 5 })
                  .map((_, index) => {
                    const id = squad[index];
                    if (!id) {
                      return `
                        <div class="slot slot--empty">
                          <span class="slot__plus">+</span>
                          <span class="slot__label">Vaga ${index + 1}</span>
                          <small>Escolha um ninja na coleção</small>
                        </div>
                      `;
                    }
                    const character = characterFor(id);
                    const role = FORMATION_ROLES[roleFor(character)];
                    return `
                      <div class="slot ${id === selectedId ? 'is-selected' : ''}" data-select="${id}">
                        <span class="slot__index">${index + 1}</span>
                        ${sigilAvatar(character, { size: 'md' })}
                        <span class="slot__name">${esc(character.name)}</span>
                        <span class="slot__role">${role.kanji} ${role.label} · ${index < 2 ? 'Frente' : 'Retaguarda'}</span>
                        ${
                          id === 'hero'
                            ? '<span class="slot__fixed">obrigatório</span>'
                            : `<button class="slot__remove" data-remove="${id}" type="button" title="Remover da formação">×</button>`
                        }
                        <div class="slot__move">
                          <button data-move="${id}" data-dir="-1" type="button" title="Mover para a esquerda" ${index === 0 ? 'disabled' : ''}>‹</button>
                          <button data-move="${id}" data-dir="1" type="button" title="Mover para a direita" ${index === squad.length - 1 ? 'disabled' : ''}>›</button>
                        </div>
                      </div>
                    `;
                  })
                  .join('')}
              </div>
              <div class="formation-bonus">
                <div class="formation-bonus__head">
                  <strong>Sinergia da formação</strong>
                  <span>As duas primeiras vagas ficam na frente</span>
                </div>
                <div class="formation-bonus__chips">${bonusRows.join('') || '<span class="formation-bonus__empty">Nenhum bônus ativo</span>'}</div>
              </div>
              <p class="panel__note">
                Vanguarda fortalece a vida e a defesa; Atacantes elevam o dano básico; Suporte amplia chakra/Guarda;
                Controle fortalece técnicas. Perseguições continuam dependendo dos gatilhos de combo.
              </p>
            </section>

            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Coleção</span>
                  <h2>Ninjas desbloqueados</h2>
                </div>
                <span class="chip">${game.state.ninjas.length} invocados</span>
              </header>
              <div class="roster-grid">
                ${rosterCard(characterFor('hero'), {
                  owned: true,
                  level: game.level,
                  inSquad: squad.includes('hero'),
                  isHero: true,
                  stats: statsFor(game.hero, game.level),
                  selected: selectedId === 'hero',
                })}
                ${ROSTER.map((character) =>
                  rosterCard(character, {
                    owned: game.isOwned(character.id),
                    level: game.level,
                    inSquad: squad.includes(character.id),
                    stats: statsFor(character, game.level),
                    selected: selectedId === character.id,
                  }),
                ).join('')}
              </div>
            </section>
          </div>

          <aside class="detail-panel" id="detail-panel">${detailMarkup(selected, squad)}</aside>
        </div>
      </section>
    `;

    bind();
  }

  function bind() {
    container.querySelectorAll('[data-character]').forEach((card) => {
      card.addEventListener('click', () => {
        selectedId = card.dataset.character;
        sfx.click();
        const panel = container.querySelector('#detail-panel');
        const squad = game.state.squad;
        panel.innerHTML = detailMarkup(characterFor(selectedId), squad);
        bindDetail();
        container.querySelectorAll('.roster-card,.slot').forEach((el) => {
          const id = el.dataset.character ?? el.dataset.select;
          el.classList.toggle('is-selected', id === selectedId);
        });
      });
    });

    container.querySelectorAll('[data-select]').forEach((slot) => {
      slot.addEventListener('click', () => {
        selectedId = slot.dataset.select;
        const panel = container.querySelector('#detail-panel');
        panel.innerHTML = detailMarkup(characterFor(selectedId), game.state.squad);
        bindDetail();
        container.querySelectorAll('.slot').forEach((el) => el.classList.toggle('is-selected', el.dataset.select === selectedId));
      });
    });

    container.querySelectorAll('[data-move]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.stopPropagation();
        const result = game.moveSquadMember(button.dataset.move, Number(button.dataset.dir));
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
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

    bindDetail();
  }

  function bindDetail() {
    const action = container.querySelector('[data-squad-action]');
    if (!action) return;
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
          ${sigilAvatar(character, { size: 'xl' })}
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
            ${sigilAvatar(character, { size: 'lg' })}
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
