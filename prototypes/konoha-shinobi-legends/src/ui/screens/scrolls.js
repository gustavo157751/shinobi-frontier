/**
 * scrolls.js — inventário de pergaminhos, invocação de ninjas e loja.
 */

import { SCROLLS } from '../../data/scrolls.js';
import { RARITIES, ROSTER, statsFor, STYLES } from '../../data/characters.js';
import { game } from '../../core/state.js';
import { shell } from '../shell.js';
import { sfx } from '../../core/audio.js';
import { esc, fmt } from '../../core/utils.js';
import { sigilAvatar, rarityTag } from '../components.js';

const SCROLL_ORDER = ['comum', 'prata', 'ouro'];

export function renderScrolls(container, { navigate }) {
  function draw() {
    const scrolls = game.state.scrolls;
    const total = SCROLL_ORDER.reduce((sum, key) => sum + (scrolls[key] ?? 0), 0);

    container.innerHTML = `
      <section class="scrolls-screen">
        <header class="screen-head">
          <div>
            <span class="eyebrow">Arquivo de Invocação · Konoha</span>
            <h1>Pergaminhos</h1>
            <p>Cada pergaminho invoca um ninja clássico. Duplicatas viram Ryos e EXP; novos aliados entram direto na formação.</p>
          </div>
          <div class="screen-head__stats">
            <div><b>${total}</b><span>Pergaminhos</span></div>
            <div><b>${game.state.ninjas.length}</b><span>Ninjas</span></div>
            <div><b>${fmt(game.resourceSnapshot().ryos)}</b><span>Ryos</span></div>
          </div>
        </header>

        <div class="scrolls-layout">
          <div class="scrolls-col">
            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Mochila</span>
                  <h2>Seus pergaminhos</h2>
                </div>
              </header>
              <div class="scroll-grid">
                ${SCROLL_ORDER.map((key) => scrollCard(SCROLLS[key], scrolls[key] ?? 0)).join('')}
              </div>
            </section>

            <section class="panel">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Mercado da vila</span>
                  <h2>Comprar pergaminhos</h2>
                </div>
                <span class="chip">Ryos ou Ouro</span>
              </header>
              <div class="shop-list">
                ${SCROLL_ORDER.map((key) => shopRow(SCROLLS[key])).join('')}
              </div>
              <p class="panel__note">
                Missões de Rank A e S são a principal fonte de pergaminhos sem custo. O Ouro aparece nas missões mais difíceis.
              </p>
            </section>
          </div>

          <aside class="scrolls-side">
            <section class="panel panel--compact">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Como funciona</span>
                  <h2>Regras de invocação</h2>
                </div>
              </header>
              <ol class="how-list">
                <li><b>Escolha o pergaminho.</b> Cada tipo sorteia raridades diferentes.</li>
                <li><b>Invoque.</b> O ninja entra na coleção e ocupa uma vaga livre da formação.</li>
                <li><b>Repita sem medo.</b> Duplicatas rendem Ryos e EXP — nunca é perda total.</li>
              </ol>
            </section>

            <section class="panel panel--compact">
              <header class="panel__head">
                <div>
                  <span class="eyebrow">Coleção</span>
                  <h2>Ninjas raros</h2>
                </div>
              </header>
              <ul class="rarity-list">
                ${Object.entries(RARITIES)
                  .map(([key, meta]) => {
                    const owned = game.ownedCharacterIds();
                    const total = ROSTER.filter((character) => character.rarity === key).length;
                    const have = ROSTER.filter(
                      (character) => character.rarity === key && owned.includes(character.id),
                    ).length;
                    return `
                    <li>
                      <span class="rarity-dot" style="--rarity:${meta.color}"></span>
                      <span>${meta.label}</span>
                      <b>${have}/${total}</b>
                    </li>`;
                  })
                  .join('')}
              </ul>
            </section>

            <section class="panel panel--compact panel--quote">
              <blockquote>“Pergaminhos não escolhem os fortes. Escolhem os que continuam tentando.”</blockquote>
              <cite>Jiraiya</cite>
            </section>
          </aside>
        </div>
      </section>
    `;

    container.querySelectorAll('[data-summon]').forEach((button) => {
      button.addEventListener('click', () => doSummon(button.dataset.summon));
    });

    container.querySelectorAll('[data-buy]').forEach((button) => {
      button.addEventListener('click', () => {
        const { result, scroll } = buy(button.dataset.buy, button.dataset.currency);
        if (!result.ok) {
          shell.toast(result.reason, 'warn');
          return;
        }
        sfx.click();
        shell.refreshTopbar();
        shell.toast(`${scroll.name} comprado.`, 'success');
        draw();
      });
    });
  }

  function doSummon(type) {
    const result = game.summon(type);
    if (!result.ok) {
      shell.toast(result.reason, 'warn');
      return;
    }
    sfx.summon();
    shell.refreshTopbar();
    shell.refreshResources();
    showSummonResult(result, () => {
      if ((game.state.scrolls[type] ?? 0) > 0) doSummon(type);
      else draw();
    });
    draw();
  }

  function buy(type, currency) {
    const scroll = SCROLLS[type];
    const result = game.buyScroll(type, currency);
    return { result, scroll };
  }

  function showSummonResult(result, onAgain) {
    const character = result.character;
    const isNew = !result.duplicate;
    const stats = statsFor(character, game.level);
    const rarity = RARITIES[character.rarity] ?? RARITIES.comum;

    const modal = shell.openModal({
      title: isNew ? 'Novo ninja invocado' : 'Ninja repetido',
      subtitle: isNew ? 'O pergaminho revelou um aliado' : 'Convertido em Ryos e EXP',
      size: 'md',
      className: 'modal--summon',
      body: `
        <div class="summon ${isNew ? 'summon--new' : 'summon--dup'}" style="--summon-rarity:${rarity.color}">
          <div class="summon__glow"></div>
          <div class="summon__seal">${character.sigil}</div>
          ${sigilAvatar(character, { size: 'xl' })}
          <div class="summon__info">
            <span class="summon__rarity">${rarity.label}</span>
            <h2>${esc(character.name)}</h2>
            <p>${esc(character.title ?? '')}</p>
            <div class="summon__tags">
              ${rarityTag(character.rarity)}
              <span class="tag" style="--tag-color:${(STYLES[character.style] ?? STYLES.ninjutsu).color}">${STYLES[character.style].label}</span>
            </div>
            <div class="summon__stats">
              <span><b>${fmt(stats.hp)}</b> vida</span>
              <span><b>${fmt(stats.atk)}</b> ataque</span>
              <span><b>${stats.spd}</b> velocidade</span>
              <span><b>${stats.chakraMax}</b> chakra</span>
            </div>
            ${
              isNew
                ? `<p class="summon__msg">${esc(character.quote ?? 'Contem comigo.')}</p>`
                : `<p class="summon__msg">Convertido em <b>${fmt(result.reward.ryo)} Ryos</b> e <b>${fmt(result.reward.exp)} EXP</b>.</p>`
            }
          </div>
        </div>
      `,
      actions: `
        <button class="btn btn--ghost" data-close="1" type="button">Fechar</button>
        <button class="btn btn--primary" data-again type="button">Invocar novamente</button>
      `,
    });

    const again = modal.querySelector('[data-again]');
    if ((game.state.scrolls[result.scroll.id] ?? 0) <= 0) {
      again.disabled = true;
      again.textContent = 'Sem pergaminhos deste tipo';
    }
    again.addEventListener('click', () => {
      shell.closeModal(modal);
      onAgain?.();
    });
  }

  draw();
}

function scrollCard(scroll, amount) {
  const canSummon = amount > 0;
  const totalWeight = Object.values(scroll.weights).reduce((sum, value) => sum + value, 0);
  return `
    <article class="scroll-card" style="--scroll-color:${scroll.color}">
      <div class="scroll-card__count">${amount}<small>un.</small></div>
      <div class="scroll-card__icon">${scroll.kanji}</div>
      <h3>${scroll.name}</h3>
      <p>${scroll.desc}</p>
      <div class="drop-rates">
        ${Object.entries(scroll.weights)
          .map(
            ([rarity, weight]) => `
            <div class="drop-rate">
              <span>${RARITIES[rarity].label}</span>
              <i><b style="width:${(weight / totalWeight) * 100}%;background:${RARITIES[rarity].color}"></b></i>
              <em>${Math.round((weight / totalWeight) * 100)}%</em>
            </div>`,
          )
          .join('')}
      </div>
      <button class="btn ${canSummon ? 'btn--primary' : 'btn--ghost'} btn--block" data-summon="${scroll.id}" type="button" ${canSummon ? '' : 'disabled'}>
        ${canSummon ? 'Invocar ninja' : 'Sem pergaminhos'}
      </button>
    </article>
  `;
}

function shopRow(scroll) {
  const ryos = game.resourceSnapshot().ryos;
  const gold = game.resourceSnapshot().gold;
  return `
    <div class="shop-row">
      <span class="shop-row__icon" style="--scroll-color:${scroll.color}">${scroll.kanji}</span>
      <div class="shop-row__info">
        <strong>${scroll.name}</strong>
        <small>${Object.entries(scroll.weights)
          .map(([rarity, weight]) => `${RARITIES[rarity].label} ${weight}%`)
          .join(' · ')}</small>
      </div>
      <button class="btn btn--ghost btn--sm" data-buy="${scroll.id}" data-currency="ryos" type="button" ${ryos < scroll.costRyo ? 'disabled' : ''}>
        ${fmt(scroll.costRyo)} Ryos
      </button>
      <button class="btn btn--gold btn--sm" data-buy="${scroll.id}" data-currency="gold" type="button" ${gold < scroll.costGold ? 'disabled' : ''}>
        ${scroll.costGold} Ouro
      </button>
    </div>
  `;
}
