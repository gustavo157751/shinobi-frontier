/**
 * characters.js — ATRIBUTOS DOS PERSONAGENS (EDITE AQUI O BALANCEAMENTO)
 * =====================================================================
 *
 * Cada personagem é um objeto com `base` (valores no nível 1) e `growth`
 * (quanto ganha por nível). Todos os números do combate saem daqui.
 *
 *  hp            → Vida máxima. Suba para tanques (Gaara, Tsunade).
 *  atk           → Ataque. Multiplica o dano de ataques básicos e jutsus.
 *  def           → Defesa. Reduz o dano recebido (curva: def / (def + 450)).
 *  spd           → Velocidade. Define a ordem dos turnos na rodada.
 *  chakraMax     → Chakra máximo em combate (a barra azul sobre o HP).
 *  chakraRegen   → Chakra recuperado no início de cada rodada.
 *  crit          → Chance de crítico (0.15 = 15%). Crítico = dano x1.6.
 *
 * Para deixar um personagem mais forte: aumente `atk` e `hp`.
 * Para deixá-lo mais rápido no turno: aumente `spd`.
 * Para usar mais jutsus por rodada: aumente `chakraMax` / `chakraRegen`.
 *
 * O CUSTO DE CHAKRA de cada jutsu fica em src/data/jutsus.js (campo `cost`).
 * A FORÇA de cada jutsu fica em `mult` (multiplicador de ataque) no mesmo arquivo.
 */

/** Cores e nomes dos elementos (usados em fichas, auras e filtros). */
export const ELEMENTS = {
  fogo: { label: 'Fogo', kanji: '火', color: '#ff6b3d' },
  vento: { label: 'Vento', kanji: '風', color: '#5fd3a3' },
  raio: { label: 'Raio', kanji: '雷', color: '#ffd166' },
  terra: { label: 'Terra', kanji: '土', color: '#c98b48' },
  agua: { label: 'Água', kanji: '水', color: '#4aa8ff' },
  gelo: { label: 'Gelo', kanji: '氷', color: '#88dcf0' },
  yin: { label: 'Yin', kanji: '陰', color: '#b48bff' },
};

export const RARITIES = {
  comum: { label: 'Comum', color: '#9aa7b8' },
  raro: { label: 'Raro', color: '#4aa8ff' },
  epico: { label: 'Épico', color: '#b48bff' },
  lendario: { label: 'Lendário', color: '#e9b949' },
};

export const STYLES = {
  taijutsu: {
    label: 'Taijutsu',
    kanji: '体',
    color: '#ff7a3d',
    tagline: 'Corpo e reflexo. Pressão constante e derrubadas.',
    desc: 'Especialista em combate corporal: mais vida, ataques básicos que derrubam o inimigo e perseguições físicas pesadas.',
  },
  ninjutsu: {
    label: 'Ninjutsu',
    kanji: '忍',
    color: '#4aa8ff',
    tagline: 'Chakra moldado. Poder elemental à distância.',
    desc: 'Domina técnicas elementais: jutsus de área, dano alto e flutuação dos alvos para abrir combos aéreos.',
  },
  genjutsu: {
    label: 'Genjutsu',
    kanji: '幻',
    color: '#b48bff',
    tagline: 'Ilusão e controle. Quem cai não reage.',
    desc: 'Controla o campo com atordoamentos, lentidão e quebra de defesa, além do maior chakra do jogo.',
  },
};

/** Multiplicador global de dano — mude para 0.9 (mais lento) ou 1.2 (mais letal). */
export const DAMAGE_TUNING = {
  globalMultiplier: 1.0,
  critMultiplier: 1.6,
  defenseConstant: 450,
  variance: 0.08,
  comboBonusPerHit: 0.05,
};

/** Ataque básico por estilo: gera chakra e pode aplicar efeito que abre combo. */
export const BASIC_ATTACKS = {
  taijutsu: {
    name: 'Combo Marcial',
    kanji: '拳',
    mult: 1.05,
    chakraGain: 20,
    effect: { type: 'knockdown', chance: 0.3, turns: 1 },
  },
  ninjutsu: {
    name: 'Disparo de Chakra',
    kanji: '弾',
    mult: 1.0,
    chakraGain: 22,
    effect: { type: 'float', chance: 0.26, turns: 1 },
  },
  genjutsu: {
    name: 'Golpe Ilusório',
    kanji: '幻',
    mult: 0.95,
    chakraGain: 24,
    effect: { type: 'stun', chance: 0.18, turns: 1 },
  },
};

/** Crescimento padrão por nível (nível 2 em diante). */
const DEFAULT_GROWTH = { hp: 48, atk: 6.9, def: 3.6, spd: 0.55, chakraMax: 1.8 };

/* ------------------------------------------------------------------ *
 *  PROTAGONISTAS — o jogador escolhe um estilo na criação de personagem
 * ------------------------------------------------------------------ */
export const HERO_TEMPLATES = {
  taijutsu: {
    id: 'hero',
    name: 'Você',
    title: 'Punho da Folha',
    element: 'vento',
    style: 'taijutsu',
    sigil: '拳',
    base: { hp: 1280, atk: 176, def: 118, spd: 118, chakraMax: 105, chakraRegen: 22, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, hp: 54, atk: 7.2 },
    jutsu: ['hero_taijutsu_1', 'hero_taijutsu_2'],
    pursuit: { name: 'Investida do Punho', triggers: ['float', 'knockdown'], mult: 0.6, hits: 1 },
    passive: 'Cada ataque básico seu acelera o próximo turno da equipe.',
  },
  ninjutsu: {
    id: 'hero',
    name: 'Você',
    title: 'Herdeiro do Pergaminho',
    element: 'agua',
    style: 'ninjutsu',
    sigil: '忍',
    base: { hp: 1200, atk: 184, def: 110, spd: 120, chakraMax: 122, chakraRegen: 25, crit: 0.11 },
    growth: { ...DEFAULT_GROWTH, atk: 7.4 },
    jutsu: ['hero_ninjutsu_1', 'hero_ninjutsu_2'],
    pursuit: { name: 'Lâmina de Chakra', triggers: ['float'], mult: 0.65, hits: 1 },
    passive: 'Jutsus de área restauram 10% do chakra gasto.',
  },
  genjutsu: {
    id: 'hero',
    name: 'Você',
    title: 'Olhar do Crepúsculo',
    element: 'yin',
    style: 'genjutsu',
    sigil: '幻',
    base: { hp: 1160, atk: 170, def: 106, spd: 124, chakraMax: 134, chakraRegen: 28, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, chakraMax: 2.4, atk: 7.0 },
    jutsu: ['hero_genjutsu_1', 'hero_genjutsu_2'],
    pursuit: { name: 'Eco Ilusório', triggers: ['float', 'knockdown'], mult: 0.55, hits: 1, effect: { type: 'slow', chance: 0.35, turns: 2 } },
    passive: 'Inimigos atordoados recebem +15% de dano da sua equipe.',
  },
};

/* ------------------------------------------------------------------ *
 *  NINJAS CLÁSSICOS — desbloqueados por pergaminhos
 * ------------------------------------------------------------------ */
export const ROSTER = [
  {
    id: 'naruto',
    name: 'Naruto Uzumaki',
    title: 'Redemoinho de Konoha',
    element: 'vento',
    style: 'ninjutsu',
    rarity: 'epico',
    sigil: '涡',
    base: { hp: 1260, atk: 172, def: 112, spd: 114, chakraMax: 112, chakraRegen: 24, crit: 0.09 },
    growth: { ...DEFAULT_GROWTH, hp: 54 },
    jutsu: ['rasengan', 'kage_bunshin'],
    pursuit: { name: 'Clone Sombra', triggers: ['float', 'knockdown'], mult: 0.55, hits: 2 },
    passive: 'Sempre volta com mais chakra quando está com pouca vida.',
    quote: 'Eu não volto atrás na minha palavra. Esse é o meu jeito ninja!',
  },
  {
    id: 'sasuke',
    name: 'Sasuke Uchiha',
    title: 'Chama do Clã Perdido',
    element: 'raio',
    style: 'ninjutsu',
    rarity: 'epico',
    sigil: '火',
    base: { hp: 1150, atk: 190, def: 100, spd: 126, chakraMax: 120, chakraRegen: 26, crit: 0.15 },
    growth: { ...DEFAULT_GROWTH, atk: 7.6, hp: 44 },
    jutsu: ['chidori', 'bola_de_fogo'],
    pursuit: { name: 'Chidori Ascendente', triggers: ['float'], mult: 0.7, hits: 1 },
    passive: 'Críticos aplicam Queimadura.',
    quote: 'Eu tenho um objetivo. E nada vai ficar no caminho.',
  },
  {
    id: 'sakura',
    name: 'Sakura Haruno',
    title: 'Mão que Cura, Punho que Quebra',
    element: 'terra',
    style: 'taijutsu',
    rarity: 'raro',
    sigil: '桜',
    base: { hp: 1200, atk: 156, def: 120, spd: 108, chakraMax: 118, chakraRegen: 27, crit: 0.08 },
    growth: { ...DEFAULT_GROWTH, chakraRegen: 0.6 },
    jutsu: ['punho_demolidor', 'cura_medica'],
    pursuit: { name: 'Contra-ataque Médico', triggers: ['knockdown'], mult: 0.5, hits: 1 },
    passive: 'Suas técnicas de cura removem Queimadura.',
    quote: 'Não subestime o que eu treinei para proteger.',
  },
  {
    id: 'kakashi',
    name: 'Kakashi Hatake',
    title: 'O Ninja Copiador',
    element: 'raio',
    style: 'ninjutsu',
    rarity: 'epico',
    sigil: '雷',
    base: { hp: 1210, atk: 180, def: 116, spd: 122, chakraMax: 130, chakraRegen: 28, crit: 0.12 },
    growth: { ...DEFAULT_GROWTH },
    jutsu: ['raikiri', 'muralha_de_terra'],
    pursuit: { name: 'Raikiri', triggers: ['float', 'knockdown'], mult: 0.65, hits: 1 },
    passive: 'Copia o último jutsu elemental usado pelo inimigo (bônus de ataque).',
    quote: 'Na minha idade, já aprendi que trabalhar em equipe não é opcional.',
  },
  {
    id: 'tenten',
    name: 'Tenten',
    title: 'Arsenal de Kunais',
    element: 'vento',
    style: 'taijutsu',
    rarity: 'comum',
    sigil: '武',
    base: { hp: 1080, atk: 158, def: 98, spd: 116, chakraMax: 104, chakraRegen: 23, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, hp: 44, atk: 6.6 },
    jutsu: ['chuva_de_kunai', 'espada_gigante'],
    pursuit: { name: 'Barragem de Kunais', triggers: ['knockdown'], mult: 0.5, hits: 2 },
    passive: 'Ataques básicos atingem a linha inimiga com 25% do dano.',
    quote: 'Cada arma aqui tem um nome. E todas sabem onde acertar.',
  },
  {
    id: 'kiba',
    name: 'Kiba Inuzuka',
    title: 'Fera de Duas Presas',
    element: 'terra',
    style: 'taijutsu',
    rarity: 'comum',
    sigil: '牙',
    base: { hp: 1140, atk: 166, def: 96, spd: 128, chakraMax: 96, chakraRegen: 21, crit: 0.12 },
    growth: { ...DEFAULT_GROWTH, atk: 7.1, spd: 0.65 },
    jutsu: ['garra_dupla', 'presa_giratoria'],
    pursuit: { name: 'Mordida Selvagem', triggers: ['knockdown'], mult: 0.55, hits: 1 },
    passive: 'Começa a batalha com +10 de velocidade.',
    quote: 'Eu e o Akamaru somos um só. Não tem como separar.',
  },
  {
    id: 'shino',
    name: 'Shino Aburame',
    title: 'Enxame Silencioso',
    element: 'terra',
    style: 'genjutsu',
    rarity: 'comum',
    sigil: '虫',
    base: { hp: 1100, atk: 146, def: 108, spd: 112, chakraMax: 120, chakraRegen: 27, crit: 0.07 },
    growth: { ...DEFAULT_GROWTH, chakraRegen: 0.7 },
    jutsu: ['enxame_insetos', 'insetos_devoradores'],
    pursuit: { name: 'Nuvem de Insetos', triggers: ['float'], mult: 0.45, hits: 1, effect: { type: 'defDown', chance: 0.4, turns: 2 } },
    passive: 'Inimigos com defesa quebrada perdem 4 de chakra por rodada.',
    quote: 'O silêncio é só o barulho que vocês ainda não sabem ouvir.',
  },
  {
    id: 'ino',
    name: 'Ino Yamanaka',
    title: 'Mente em Flor',
    element: 'yin',
    style: 'genjutsu',
    rarity: 'comum',
    sigil: '花',
    base: { hp: 1040, atk: 150, def: 100, spd: 118, chakraMax: 124, chakraRegen: 29, crit: 0.08 },
    growth: { ...DEFAULT_GROWTH, chakraMax: 2.2 },
    jutsu: ['flor_mental', 'transferencia_mental'],
    pursuit: { name: 'Golpe Distraído', triggers: ['float'], mult: 0.45, hits: 1, effect: { type: 'slow', chance: 0.4, turns: 2 } },
    passive: 'Técnicas de controle duram um turno extra.',
    quote: 'Não subestime uma flor só porque ela é bonita.',
  },
  {
    id: 'hinata',
    name: 'Hinata Hyuga',
    title: 'Olhos que Tudo Veem',
    element: 'yin',
    style: 'taijutsu',
    rarity: 'raro',
    sigil: '白',
    base: { hp: 1130, atk: 164, def: 104, spd: 120, chakraMax: 108, chakraRegen: 24, crit: 0.11 },
    growth: { ...DEFAULT_GROWTH, spd: 0.7 },
    jutsu: ['palma_gemea', 'palma_rotativa'],
    pursuit: { name: 'Palma Suave', triggers: ['knockdown'], mult: 0.55, hits: 1, effect: { type: 'slow', chance: 0.4, turns: 2 } },
    passive: 'Enxerga pontos de chakra: +10% de dano em alvos com defesa reduzida.',
    quote: 'Eu não vou mais fugir. Esse é o meu caminho ninja.',
  },
  {
    id: 'lee',
    name: 'Rock Lee',
    title: 'O Poder da Juventude',
    element: 'vento',
    style: 'taijutsu',
    rarity: 'raro',
    sigil: '拳',
    base: { hp: 1250, atk: 192, def: 108, spd: 138, chakraMax: 92, chakraRegen: 19, crit: 0.13 },
    growth: { ...DEFAULT_GROWTH, atk: 7.8, hp: 50 },
    jutsu: ['lotus_frontal', 'portao_interior'],
    pursuit: { name: 'Lótus Rodopiante', triggers: ['float'], mult: 0.75, hits: 1 },
    passive: 'Quanto menor a vida, maior o dano (até +25%).',
    quote: 'O trabalho duro vence o talento quando o talento não trabalha duro!',
  },
  {
    id: 'shikamaru',
    name: 'Shikamaru Nara',
    title: 'Sombra Estratégica',
    element: 'yin',
    style: 'genjutsu',
    rarity: 'raro',
    sigil: '影',
    base: { hp: 1100, atk: 148, def: 110, spd: 116, chakraMax: 128, chakraRegen: 31, crit: 0.08 },
    growth: { ...DEFAULT_GROWTH, chakraRegen: 0.8 },
    jutsu: ['posse_de_sombra', 'estrategia_nara'],
    pursuit: { name: 'Costura de Sombra', triggers: ['float', 'knockdown'], mult: 0.45, hits: 1, effect: { type: 'slow', chance: 0.5, turns: 2 } },
    passive: 'No início da rodada, ganha +8 de chakra extra.',
    quote: 'Que preguiça… mas o plano já está pronto.',
  },
  {
    id: 'gaara',
    name: 'Gaara',
    title: 'Escudo de Areia',
    element: 'terra',
    style: 'ninjutsu',
    rarity: 'lendario',
    sigil: '砂',
    base: { hp: 1360, atk: 166, def: 142, spd: 100, chakraMax: 122, chakraRegen: 24, crit: 0.07 },
    growth: { ...DEFAULT_GROWTH, hp: 62, def: 4.4 },
    jutsu: ['tumba_de_areia', 'escudo_de_areia'],
    pursuit: { name: 'Prisão de Areia', triggers: ['knockdown'], mult: 0.6, hits: 1, effect: { type: 'defDown', chance: 0.5, turns: 2 } },
    passive: 'Barreira inicial absorve 12% da vida máxima.',
    quote: 'A areia me protege. Sempre protegeu.',
  },
  {
    id: 'jiraiya',
    name: 'Jiraiya',
    title: 'Sábio dos Sapos',
    element: 'fogo',
    style: 'ninjutsu',
    rarity: 'lendario',
    sigil: '蛙',
    base: { hp: 1300, atk: 186, def: 120, spd: 112, chakraMax: 136, chakraRegen: 27, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, chakraMax: 2.2 },
    jutsu: ['chama_do_sapo', 'barreira_senpou'],
    pursuit: { name: 'Cabelo de Leão', triggers: ['float'], mult: 0.65, hits: 1 },
    passive: 'Modo Sábio: jutsus custam 5 de chakra a menos.',
    quote: 'Um ninja de verdade não desiste do próximo capítulo.',
  },
  {
    id: 'tsunade',
    name: 'Tsunade Senju',
    title: 'Selo da Criação',
    element: 'terra',
    style: 'taijutsu',
    rarity: 'lendario',
    sigil: '癒',
    base: { hp: 1420, atk: 178, def: 128, spd: 106, chakraMax: 128, chakraRegen: 26, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, hp: 64 },
    jutsu: ['ruptura_celestial', 'regeneracao_total'],
    pursuit: { name: 'Punho Demolidor', triggers: ['float', 'knockdown'], mult: 0.7, hits: 1 },
    passive: 'Cura recebida aumentada em 30%.',
    quote: 'A vida de um ninja não se mede em cicatrizes.',
  },
  {
    id: 'itachi',
    name: 'Itachi Uchiha',
    title: 'Ilusão Absoluta',
    element: 'fogo',
    style: 'genjutsu',
    rarity: 'lendario',
    sigil: '幻',
    base: { hp: 1180, atk: 196, def: 106, spd: 130, chakraMax: 132, chakraRegen: 27, crit: 0.15 },
    growth: { ...DEFAULT_GROWTH, atk: 8 },
    jutsu: ['tsukuyomi', 'amaterasu'],
    pursuit: { name: 'Corvo Ilusório', triggers: ['float'], mult: 0.6, hits: 1, effect: { type: 'burn', chance: 0.6, turns: 2 } },
    passive: 'Imune a Atordoamento. Atordoa mais fácil.',
    quote: 'Aqueles que não entendem a dor nunca entenderão a paz.',
  },
  {
    id: 'minato',
    name: 'Minato Namikaze',
    title: 'Relâmpago Amarelo',
    element: 'vento',
    style: 'ninjutsu',
    rarity: 'lendario',
    sigil: '瞬',
    base: { hp: 1170, atk: 202, def: 104, spd: 148, chakraMax: 122, chakraRegen: 26, crit: 0.16 },
    growth: { ...DEFAULT_GROWTH, spd: 0.9, atk: 8 },
    jutsu: ['hiraishin', 'rasengan_minato'],
    pursuit: { name: 'Hiraishin', triggers: ['float', 'knockdown'], mult: 0.8, hits: 1 },
    passive: 'Sempre age primeiro entre velocidades iguais.',
    quote: 'Cheguei antes. Só isso já decide a luta.',
  },
  // Novos ninjas clássicos. Ajuste base/growth para atributos e pursuit para os gatilhos da cadeia.
  {
    id: 'neji',
    name: 'Neji Hyuga',
    title: 'Gênio do Punho Gentil',
    element: 'yin',
    style: 'taijutsu',
    rarity: 'raro',
    sigil: '白',
    base: { hp: 1170, atk: 178, def: 116, spd: 123, chakraMax: 108, chakraRegen: 25, crit: 0.12 },
    growth: { ...DEFAULT_GROWTH, spd: 0.7, atk: 7.4 },
    jutsu: ['oito_trigramas_64_palmas', 'palma_de_vacuo'],
    pursuit: { name: 'Oito Trigramas: 64 Palmas', triggers: ['float', 'knockdown'], mult: 0.44, hits: 3, effect: { type: 'defDown', chance: 0.3, turns: 2 } },
    passive: 'Byakugan e Jūken: leitura do chakra e golpes precisos nos tenketsu.',
    quote: 'Um ponto de chakra pode mudar o rumo de uma batalha.',
  },
  {
    id: 'choji',
    name: 'Choji Akimichi',
    title: 'Força em Expansão',
    element: 'terra',
    style: 'taijutsu',
    rarity: 'comum',
    sigil: '蝶',
    base: { hp: 1320, atk: 166, def: 126, spd: 96, chakraMax: 100, chakraRegen: 22, crit: 0.08 },
    growth: { ...DEFAULT_GROWTH, hp: 58, def: 4.1, spd: 0.45 },
    jutsu: ['baika_no_jutsu', 'nikudan_sensha'],
    pursuit: { name: 'Tanque de Bala Humana', triggers: ['knockdown'], mult: 0.58, hits: 2, effect: { type: 'slow', chance: 0.3, turns: 1 } },
    passive: 'Técnicas Akimichi: expansão corporal para ganhar força em investidas.',
    quote: 'Eu avanço com tudo quando meus amigos precisam de mim.',
  },
  {
    id: 'temari',
    name: 'Temari',
    title: 'Leque da Areia',
    element: 'vento',
    style: 'ninjutsu',
    rarity: 'raro',
    sigil: '扇',
    base: { hp: 1100, atk: 176, def: 102, spd: 119, chakraMax: 122, chakraRegen: 26, crit: 0.1 },
    growth: { ...DEFAULT_GROWTH, spd: 0.65, atk: 7.2, chakraMax: 2 },
    jutsu: ['foice_da_doninha', 'danca_das_laminas_kamatari'],
    pursuit: { name: 'Rajada da Foice Doninha', triggers: ['float'], mult: 0.55, hits: 2, effect: { type: 'slow', chance: 0.4, turns: 2 } },
    passive: 'Leque de ferro: rajadas de vento mantêm adversários sob pressão à distância.',
    quote: 'O vento sempre encontra uma abertura.',
  },
  {
    id: 'kankuro',
    name: 'Kankuro',
    title: 'Mestre das Marionetes',
    element: 'terra',
    style: 'ninjutsu',
    rarity: 'raro',
    sigil: '傀',
    base: { hp: 1150, atk: 158, def: 115, spd: 110, chakraMax: 128, chakraRegen: 28, crit: 0.08 },
    growth: { ...DEFAULT_GROWTH, def: 3.9, chakraRegen: 0.7, chakraMax: 2.1 },
    jutsu: ['armadilha_da_marionete', 'maquina_um_disparo'],
    pursuit: { name: 'Máquina de Um Disparo', triggers: ['knockdown'], mult: 0.48, hits: 2, effect: { type: 'defDown', chance: 0.35, turns: 2 } },
    passive: 'Marionetes armadas: armadilhas e ataques coordenados por fios de chakra.',
    quote: 'Você só percebe o fio depois que a marionete se move.',
  },
  {
    id: 'zabuza',
    name: 'Zabuza Momochi',
    title: 'Demônio da Névoa',
    element: 'agua',
    style: 'ninjutsu',
    rarity: 'epico',
    sigil: '霧',
    base: { hp: 1270, atk: 188, def: 114, spd: 112, chakraMax: 110, chakraRegen: 24, crit: 0.11 },
    growth: { ...DEFAULT_GROWTH, hp: 54, atk: 7.7, def: 3.8 },
    jutsu: ['nevoa_oculta', 'dragao_de_agua_zabuza'],
    pursuit: { name: 'Projétil do Dragão de Água', triggers: ['float', 'knockdown'], mult: 0.62, hits: 1, effect: { type: 'slow', chance: 0.35, turns: 2 } },
    passive: 'Ninja da Névoa: combina ocultação, Suiton e espada em ataques surpresa.',
    quote: 'A névoa cobre o passo antes da lâmina.',
  },
  {
    id: 'haku',
    name: 'Haku',
    title: 'Espelhos de Cristal de Gelo',
    element: 'gelo',
    style: 'ninjutsu',
    rarity: 'epico',
    sigil: '氷',
    base: { hp: 1080, atk: 185, def: 92, spd: 130, chakraMax: 132, chakraRegen: 29, crit: 0.13 },
    growth: { ...DEFAULT_GROWTH, spd: 0.8, atk: 7.5, chakraMax: 2.2 },
    jutsu: ['espelhos_demonicos_de_gelo', 'agulhas_voadoras_da_agua'],
    pursuit: { name: 'Rajada de Senbon', triggers: ['float'], mult: 0.5, hits: 3, effect: { type: 'slow', chance: 0.25, turns: 1 } },
    passive: 'Liberação de Gelo: mobilidade entre espelhos e golpes precisos com senbon.',
    quote: 'A precisão pode vencer sem ferir além do necessário.',
  },
];

/* ------------------------------------------------------------------ *
 *  INIMIGOS — aparecem nas missões (stats brutos, sem pergaminho)
 * ------------------------------------------------------------------ */
export const ENEMY_ROSTER = [
  {
    id: 'ronin',
    name: 'Rounin',
    title: 'Mercenário Errante',
    element: 'terra',
    style: 'taijutsu',
    sigil: '侍',
    base: { hp: 760, atk: 118, def: 70, spd: 96, chakraMax: 80, chakraRegen: 18, crit: 0.05 },
    growth: { hp: 40, atk: 6, def: 3, spd: 0.5, chakraMax: 1.4 },
    jutsu: ['golpe_sabre'],
    pursuit: null,
  },
  {
    id: 'nukenin',
    name: 'Ninja Renegado',
    title: 'Desertor de Rank C',
    element: 'agua',
    style: 'ninjutsu',
    sigil: '抜',
    base: { hp: 960, atk: 146, def: 86, spd: 108, chakraMax: 96, chakraRegen: 22, crit: 0.08 },
    growth: { hp: 44, atk: 6.6, def: 3.2, spd: 0.6, chakraMax: 1.6 },
    jutsu: ['aguas_cortantes', 'kunai_explosiva'],
    pursuit: { name: 'Contra-Golpe', triggers: ['knockdown'], mult: 0.45, hits: 1 },
  },
  {
    id: 'fera',
    name: 'Fera Selvagem',
    title: 'Predador da Floresta',
    element: 'vento',
    style: 'taijutsu',
    sigil: '獣',
    base: { hp: 1080, atk: 158, def: 82, spd: 118, chakraMax: 70, chakraRegen: 16, crit: 0.1 },
    growth: { hp: 50, atk: 7, def: 2.8, spd: 0.7, chakraMax: 1 },
    jutsu: ['salto_fatal'],
    pursuit: { name: 'Mordida', triggers: ['knockdown'], mult: 0.5, hits: 1 },
  },
  {
    id: 'marionete',
    name: 'Marionete de Guerra',
    title: 'Artefato Amaldiçoado',
    element: 'yin',
    style: 'genjutsu',
    sigil: '傀',
    base: { hp: 1240, atk: 150, def: 122, spd: 90, chakraMax: 100, chakraRegen: 20, crit: 0.06 },
    growth: { hp: 54, atk: 5.8, def: 3.8, spd: 0.4, chakraMax: 1.4 },
    jutsu: ['agulhas_envenenadas'],
    pursuit: null,
  },
  {
    id: 'assassino',
    name: 'Assassino da Névoa',
    title: 'Cortador de Sombras',
    element: 'agua',
    style: 'ninjutsu',
    sigil: '霧',
    base: { hp: 1180, atk: 176, def: 96, spd: 126, chakraMax: 104, chakraRegen: 23, crit: 0.12 },
    growth: { hp: 46, atk: 7.2, def: 3.2, spd: 0.7, chakraMax: 1.6 },
    jutsu: ['nevoa_assassina', 'aguas_cortantes'],
    pursuit: { name: 'Corte Silencioso', triggers: ['float'], mult: 0.6, hits: 1 },
  },
  {
    id: 'jounin_sombrio',
    name: 'Jounin Sombrio',
    title: 'Caçador de Konoha',
    element: 'raio',
    style: 'ninjutsu',
    sigil: '狩',
    base: { hp: 1420, atk: 196, def: 118, spd: 128, chakraMax: 118, chakraRegen: 26, crit: 0.12 },
    growth: { hp: 52, atk: 7.6, def: 3.6, spd: 0.7, chakraMax: 1.8 },
    jutsu: ['raio_violeta', 'muralha_de_terra'],
    pursuit: { name: 'Lança de Raio', triggers: ['float', 'knockdown'], mult: 0.6, hits: 1 },
  },
  {
    id: 'kage_sombrio',
    name: 'Kage Sombrio',
    title: 'Tirano da Fronteira',
    element: 'fogo',
    style: 'ninjutsu',
    sigil: '影',
    base: { hp: 2050, atk: 212, def: 140, spd: 118, chakraMax: 150, chakraRegen: 30, crit: 0.14 },
    growth: { hp: 62, atk: 8.4, def: 4, spd: 0.6, chakraMax: 2 },
    jutsu: ['chama_do_sapo', 'raio_violeta'],
    pursuit: { name: 'Julgamento Flamejante', triggers: ['float'], mult: 0.7, hits: 1 },
  },
  {
    id: 'orochimaru',
    name: 'Orochimaru',
    title: 'Serpente Imortal',
    element: 'yin',
    style: 'genjutsu',
    sigil: '蛇',
    base: { hp: 2600, atk: 236, def: 132, spd: 134, chakraMax: 160, chakraRegen: 32, crit: 0.15 },
    growth: { hp: 70, atk: 9, def: 3.8, spd: 0.8, chakraMax: 2.2 },
    jutsu: ['serpentes_gemeas', 'tsukuyomi'],
    pursuit: { name: 'Presa da Serpente', triggers: ['float', 'knockdown'], mult: 0.75, hits: 2 },
  },
];

/** Todos os personagens (jogador + inimigos) indexados por id. */
export const ALL_CHARACTERS = [...ROSTER, ...ENEMY_ROSTER];

export function getCharacter(id) {
  return ALL_CHARACTERS.find((character) => character.id === id);
}

/**
 * Calcula os atributos finais de um personagem em determinado nível.
 * Ajuste `growth` acima para mudar o quão rápido o personagem escala.
 */
export function statsFor(character, level = 1) {
  const growth = { ...DEFAULT_GROWTH, ...(character.growth ?? {}) };
  const steps = Math.max(0, level - 1);
  return {
    hp: Math.round(character.base.hp + growth.hp * steps),
    atk: Math.round(character.base.atk + growth.atk * steps),
    def: Math.round(character.base.def + growth.def * steps),
    spd: Math.round((character.base.spd + growth.spd * steps) * 10) / 10,
    chakraMax: Math.round(character.base.chakraMax + growth.chakraMax * steps),
    chakraRegen: Math.round(character.base.chakraRegen + (growth.chakraRegen ?? 0) * steps),
    crit: Math.round((character.base.crit ?? 0.08) * 1000) / 1000,
  };
}

/**
 * Cria a instância de combate de um personagem (vida cheia, chakra inicial).
 * @param {object} character definição em ROSTER/ENEMY_ROSTER
 * @param {object} options { level, side, slot, isHero, displayName }
 */
export function buildUnit(character, { level = 1, side = 'ally', slot = 0, isHero = false, displayName } = {}) {
  const stats = statsFor(character, level);
  return {
    uid: `${side}-${slot}-${character.id}`,
    charId: character.id,
    name: displayName ?? character.name,
    title: character.title,
    side,
    slot,
    level,
    isHero,
    element: character.element,
    style: character.style,
    sigil: character.sigil,
    def: character,
    maxHp: stats.hp,
    hp: stats.hp,
    maxChakra: stats.chakraMax,
    chakra: Math.round(stats.chakraMax * 0.35), // chakra inicial = 35% do máximo
    atk: stats.atk,
    defense: stats.def,
    spd: stats.spd,
    crit: stats.crit,
    statuses: [],
    alive: true,
    pursuitUsed: false,
    guard: false,
  };
}
