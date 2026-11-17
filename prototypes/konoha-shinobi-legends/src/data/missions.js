/**
 * missions.js — MISSÕES PvE DA VILA DA FOLHA
 * =========================================
 *
 * rank      → D, C, B, A ou S (define cor, dificuldade e desbloqueio).
 * minLevel  → nível mínimo do protagonista para entrar.
 * stamina   → stamina gasta ao iniciar (não é devolvida em caso de derrota).
 * enemies   → [{ id, level }] usando ids de ENEMY_ROSTER.
 * rewards   → { ryo, exp, scrolls: { comum, prata, ouro }, gold }
 *
 * Para deixar uma missão mais difícil: aumente o `level` dos inimigos
 * ou troque por inimigos mais fortes em src/data/characters.js.
 */

export const RANKS = {
  D: { label: 'Rank D', color: '#7dd3a7', desc: 'Tarefas simples de genin: escolta curta, limpeza e patrulha.' },
  C: { label: 'Rank C', color: '#4aa8ff', desc: 'Conflito real: renegados e feras nas rotas da fronteira.' },
  B: { label: 'Rank B', color: '#c084fc', desc: 'Missões de chunin: emboscadas, marionetes e caçadores.' },
  A: { label: 'Rank A', color: '#ff8a4c', desc: 'Operações críticas contra jounin e líderes inimigos.' },
  S: { label: 'Rank S', color: '#e9b949', desc: 'Ameaças de nível kage capazes de destruir a vila.' },
};

export const MISSIONS = [
  /* ----------------------------- RANK D ----------------------------- */
  {
    id: 'd-1',
    rank: 'D',
    name: 'Gatos Perdidos de Konoha',
    place: 'Distrito Comercial',
    objective: 'Recuperar os gatos da Senhora Nobori antes do pôr do sol.',
    minLevel: 1,
    stamina: 3,
    enemies: [
      { id: 'ronin', level: 1 },
      { id: 'ronin', level: 1 },
    ],
    rewards: { ryo: 160, exp: 90, scrolls: { comum: 1 } },
    brief: [
      { who: 'Kakashi', text: 'Primeira missão de vocês. Nada de heróis: os gatos mordem mais que os rounin.' },
      { who: 'Você', text: 'Tem certeza de que dois mercenários estão atrás de gatos?' },
      { who: 'Kakashi', text: 'Nesta vila, sempre tem alguém querendo ganhar um ryo fácil. Vão.' },
    ],
  },
  {
    id: 'd-2',
    rank: 'D',
    name: 'Entrega de Pergaminhos',
    place: 'Estrada Leste',
    objective: 'Levar o pergaminho do Hokage até o posto avançado.',
    minLevel: 1,
    stamina: 3,
    enemies: [
      { id: 'ronin', level: 2 },
      { id: 'ronin', level: 2 },
      { id: 'ronin', level: 1 },
    ],
    rewards: { ryo: 200, exp: 120, scrolls: { comum: 1 } },
    brief: [
      { who: 'Kakashi', text: 'Vocês levam o pergaminho, eu leio o livro. Parece justo.' },
      { who: 'Sakura', text: 'Sensei, tem três pessoas bloqueando a estrada…' },
      { who: 'Kakashi', text: 'Então a leitura fica para depois.' },
    ],
  },
  {
    id: 'd-3',
    rank: 'D',
    name: 'Patrulha nos Telhados',
    place: 'Muralha Norte',
    objective: 'Expulsar os intrusos que escalaram a muralha durante a noite.',
    minLevel: 2,
    stamina: 3,
    enemies: [
      { id: 'nukenin', level: 2 },
      { id: 'ronin', level: 2 },
    ],
    rewards: { ryo: 230, exp: 150, scrolls: { comum: 1 } },
    brief: [
      { who: 'Naruto', text: 'Deixa comigo! Eu conheço cada telhado desta vila.' },
      { who: 'Sasuke', text: 'Conhecer o telhado não te faz mais rápido, idiota.' },
      { who: 'Kakashi', text: 'Foco. Um deles já foi visto usando chakra de água.' },
    ],
  },
  {
    id: 'd-4',
    rank: 'D',
    name: 'Treino de Formação',
    place: 'Campo de Treino 3',
    objective: 'Vencer o exercício de combate em equipe contra clones renegados.',
    minLevel: 2,
    stamina: 4,
    enemies: [
      { id: 'nukenin', level: 3 },
      { id: 'nukenin', level: 2 },
    ],
    rewards: { ryo: 260, exp: 190, scrolls: { comum: 1 } },
    brief: [
      { who: 'Kakashi', text: 'Regra do exercício: um ataca, outro cobre, outro persegue. Quem quebrar a formação perde.' },
      { who: 'Sakura', text: 'Perseguição… é quando alguém acerta e o próximo já está no ar?' },
      { who: 'Kakashi', text: 'Exatamente. Derrubem um e deixem o resto da equipe trabalhar.' },
    ],
  },
  {
    id: 'd-5',
    rank: 'D',
    name: 'Ladrões de Colheita',
    place: 'Campos ao Sul',
    objective: 'Proteger a colheita da vila contra uma fera atraída pelo cheiro de comida.',
    minLevel: 3,
    stamina: 4,
    enemies: [
      { id: 'ronin', level: 3 },
      { id: 'fera', level: 3 },
    ],
    rewards: { ryo: 300, exp: 230, scrolls: { comum: 1 } },
    brief: [
      { who: 'Tsunade', text: 'A vila come do que esses campos produzem. Se a colheita cair, o inverno será duro.' },
      { who: 'Você', text: 'E a fera?' },
      { who: 'Tsunade', text: 'Se der para não matar, não mate. Mas não morra por causa dela.' },
    ],
  },

  /* ----------------------------- RANK C ----------------------------- */
  {
    id: 'c-1',
    rank: 'C',
    name: 'Ponte da Fronteira',
    place: 'Rio Bifurcado',
    objective: 'Impedir que renegados destruam a única ponte de acesso ao posto.',
    minLevel: 4,
    stamina: 4,
    enemies: [
      { id: 'nukenin', level: 5 },
      { id: 'nukenin', level: 5 },
      { id: 'assassino', level: 4 },
    ],
    rewards: { ryo: 420, exp: 320, scrolls: { comum: 1, prata: 1 } },
    brief: [
      { who: 'Kakashi', text: 'A ponte é a rota de suprimentos. Se cair, a vila fica sem remédio em três dias.' },
      { who: 'Naruto', text: 'Então a gente derruba eles antes de derrubarem a ponte!' },
      { who: 'Sasuke', text: 'Tem um ninja silencioso no meio deles. Esse é o perigoso.' },
    ],
  },
  {
    id: 'c-2',
    rank: 'C',
    name: 'Resgate na Floresta',
    place: 'Floresta Densa',
    objective: 'Resgatar uma equipe de genin perdida entre as feras.',
    minLevel: 4,
    stamina: 4,
    enemies: [
      { id: 'fera', level: 6 },
      { id: 'fera', level: 5 },
      { id: 'nukenin', level: 5 },
    ],
    rewards: { ryo: 470, exp: 360, scrolls: { comum: 1, prata: 1 } },
    brief: [
      { who: 'Sakura', text: 'Eles estão com pouca água. Não temos muito tempo.' },
      { who: 'Kakashi', text: 'Vocês vão na frente. Eu cubro a retaguarda — e trago os genins.' },
      { who: 'Você', text: 'Contem comigo. Vamos abrir caminho.' },
    ],
  },
  {
    id: 'c-3',
    rank: 'C',
    name: 'Contrabando de Chakra',
    place: 'Mercado Subterrâneo',
    objective: 'Interceptar o carregamento de selos de chakra proibidos.',
    minLevel: 5,
    stamina: 4,
    enemies: [
      { id: 'nukenin', level: 6 },
      { id: 'nukenin', level: 6 },
      { id: 'marionete', level: 6 },
    ],
    rewards: { ryo: 520, exp: 420, scrolls: { comum: 1, prata: 1 } },
    brief: [
      { who: 'Shikamaru', text: 'Três guardas, um corredor estreito. Eu preferiria resolver isso com um plano.' },
      { who: 'Você', text: 'O plano é: você prende, eu bato.' },
      { who: 'Shikamaru', text: '…Que preguiça. Mas funciona.' },
    ],
  },
  {
    id: 'c-4',
    rank: 'C',
    name: 'Marionete Abandonada',
    place: 'Ruínas do Templo',
    objective: 'Neutralizar uma marionete de guerra que desperta sozinha à noite.',
    minLevel: 6,
    stamina: 4,
    enemies: [
      { id: 'marionete', level: 7 },
      { id: 'nukenin', level: 7 },
    ],
    rewards: { ryo: 560, exp: 470, scrolls: { comum: 1, prata: 1 } },
    brief: [
      { who: 'Hinata', text: 'O fluxo de chakra dela está invertido… como se estivesse sofrendo.' },
      { who: 'Kakashi', text: 'Alguém transformou uma pessoa em arma. Isso não se desfaz só com força.' },
    ],
  },
  {
    id: 'c-5',
    rank: 'C',
    name: 'Eco na Caverna',
    place: 'Gruta do Vento',
    objective: 'Silenciar a emboscada que ataca viajantes há duas semanas.',
    minLevel: 7,
    stamina: 5,
    enemies: [
      { id: 'assassino', level: 8 },
      { id: 'assassino', level: 8 },
      { id: 'fera', level: 8 },
    ],
    rewards: { ryo: 620, exp: 540, scrolls: { comum: 1, prata: 1 } },
    brief: [
      { who: 'Rock Lee', text: 'A escuridão não é problema para quem treinou os sentidos!' },
      { who: 'Sakura', text: 'Lee, a caverna desmorona se você usar força demais.' },
      { who: 'Rock Lee', text: 'Então usarei exatamente a força certa. Guiado pela juventude!' },
    ],
  },

  /* ----------------------------- RANK B ----------------------------- */
  {
    id: 'b-1',
    rank: 'B',
    name: 'Convoy Interceptado',
    place: 'Desfiladeiro Seco',
    objective: 'Recuperar o comboio de suprimentos tomado por um jounin renegado.',
    minLevel: 8,
    stamina: 5,
    enemies: [
      { id: 'jounin_sombrio', level: 9 },
      { id: 'nukenin', level: 9 },
      { id: 'nukenin', level: 8 },
    ],
    rewards: { ryo: 820, exp: 700, scrolls: { prata: 1 } },
    brief: [
      { who: 'Tsunade', text: 'Um jounin desertor lidera os saques. Ele conhece os nossos protocolos.' },
      { who: 'Kakashi', text: 'Ele conhece os protocolos antigos. Nós inventamos novos.' },
    ],
  },
  {
    id: 'b-2',
    rank: 'B',
    name: 'Caçador de Konoha',
    place: 'Pântano das Lâminas',
    objective: 'Encerrar a caçada particular contra uma patrulha da vila.',
    minLevel: 9,
    stamina: 5,
    enemies: [
      { id: 'jounin_sombrio', level: 10 },
      { id: 'jounin_sombrio', level: 10 },
    ],
    rewards: { ryo: 900, exp: 780, scrolls: { prata: 1 } },
    brief: [
      { who: 'Sasuke', text: 'Dois jounin. Eles vão tentar nos separar.' },
      { who: 'Você', text: 'Então não vamos nos separar.' },
      { who: 'Kakashi', text: 'Boa resposta. Agora sobreviva a ela.' },
    ],
  },
  {
    id: 'b-3',
    rank: 'B',
    name: 'Fera de Duas Caudas',
    place: 'Vale Nebuloso',
    objective: 'Contter o avanço de uma alcateia de feras de chakra.',
    minLevel: 10,
    stamina: 5,
    enemies: [
      { id: 'fera', level: 11 },
      { id: 'fera', level: 11 },
      { id: 'fera', level: 10 },
    ],
    rewards: { ryo: 960, exp: 850, scrolls: { prata: 1 } },
    brief: [
      { who: 'Naruto', text: 'Eu sinto o chakra delas. Está agitado, como se alguém estivesse comandando.' },
      { who: 'Sakura', text: 'Se alguém comanda, esse alguém vai aparecer. Preparem a formação.' },
    ],
  },
  {
    id: 'b-4',
    rank: 'B',
    name: 'Marionetes de Guerra',
    place: 'Fábrica Abandonada',
    objective: 'Desativar a linha de produção de marionetes.',
    minLevel: 11,
    stamina: 6,
    enemies: [
      { id: 'marionete', level: 12 },
      { id: 'marionete', level: 12 },
      { id: 'assassino', level: 11 },
    ],
    rewards: { ryo: 1050, exp: 950, scrolls: { prata: 1 } },
    brief: [
      { who: 'Gaara', text: 'Areia não sangra. Marionete também não. É uma luta justa.' },
      { who: 'Você', text: 'Vindo de você, isso quase soa como otimismo.' },
    ],
  },
  {
    id: 'b-5',
    rank: 'B',
    name: 'Emboscada na Névoa',
    place: 'Lago Vazio',
    objective: 'Sobreviver ao cerco dos assassinos da névoa.',
    minLevel: 12,
    stamina: 6,
    enemies: [
      { id: 'assassino', level: 13 },
      { id: 'assassino', level: 13 },
      { id: 'assassino', level: 12 },
    ],
    rewards: { ryo: 1180, exp: 1080, scrolls: { prata: 1, ouro: 1 } },
    brief: [
      { who: 'Kakashi', text: 'Se a névoa fechar, fechem os olhos e sintam o chakra.' },
      { who: 'Hinata', text: 'Eu vejo todos eles. Passem por trás de mim.' },
    ],
  },

  /* ----------------------------- RANK A ----------------------------- */
  {
    id: 'a-1',
    rank: 'A',
    name: 'O Kage da Fronteira',
    place: 'Fortaleza de Pedra',
    objective: 'Derrubar o autoproclamado Kage que domina a fronteira oeste.',
    minLevel: 13,
    stamina: 6,
    enemies: [
      { id: 'kage_sombrio', level: 14 },
      { id: 'jounin_sombrio', level: 14 },
    ],
    rewards: { ryo: 1650, exp: 1500, scrolls: { prata: 1, ouro: 1 } },
    brief: [
      { who: 'Tsunade', text: 'Ele se chama Kage, mas é só um tirano com chakra suficiente para fingir.' },
      { who: 'Você', text: 'E se ele não for só fingimento?' },
      { who: 'Tsunade', text: 'Aí você faz o que treinou. E volta viva.' },
    ],
  },
  {
    id: 'a-2',
    rank: 'A',
    name: 'Selo Proibido',
    place: 'Câmara Selada',
    objective: 'Impedir a abertura do selo que mantém os mortos adormecidos.',
    minLevel: 14,
    stamina: 7,
    enemies: [
      { id: 'kage_sombrio', level: 15 },
      { id: 'marionete', level: 15 },
      { id: 'marionete', level: 14 },
    ],
    rewards: { ryo: 1800, exp: 1680, scrolls: { prata: 1, ouro: 1 } },
    brief: [
      { who: 'Jiraiya', text: 'Esse selo tem três camadas. Uma delas é uma armadilha que responde a chakra.' },
      { who: 'Shikamaru', text: 'Então quem abrir primeiro vira isca. Eu voto no Naruto.' },
      { who: 'Naruto', text: 'Ei!' },
    ],
  },
  {
    id: 'a-3',
    rank: 'A',
    name: 'Perseguição ao Jounin',
    place: 'Planície Rachada',
    objective: 'Capturar o esquadrão que roubou os arquivos da Academia.',
    minLevel: 15,
    stamina: 7,
    enemies: [
      { id: 'jounin_sombrio', level: 16 },
      { id: 'jounin_sombrio', level: 16 },
      { id: 'jounin_sombrio', level: 15 },
    ],
    rewards: { ryo: 2000, exp: 1900, scrolls: { ouro: 1 } },
    brief: [
      { who: 'Minato', text: 'Eles estão em linha. Um corte no centro e a formação desmonta.' },
      { who: 'Você', text: 'E se eles esperarem exatamente por isso?' },
      { who: 'Minato', text: 'Então eu chego antes. É o meu único truque.' },
    ],
  },
  {
    id: 'a-4',
    rank: 'A',
    name: 'Guardiões da Areia',
    place: 'Deserto Vermelho',
    objective: 'Romper o cerco das marionetes ancestrais.',
    minLevel: 16,
    stamina: 7,
    enemies: [
      { id: 'marionete', level: 17 },
      { id: 'marionete', level: 17 },
      { id: 'kage_sombrio', level: 16 },
    ],
    rewards: { ryo: 2200, exp: 2100, scrolls: { ouro: 1 } },
    brief: [
      { who: 'Gaara', text: 'Conheço essas marionetes. Elas copiam o movimento de quem as criou.' },
      { who: 'Tsunade', text: 'Então mudem o movimento. Vocês são mais criativos que um boneco.' },
    ],
  },

  /* ----------------------------- RANK S ----------------------------- */
  {
    id: 's-1',
    rank: 'S',
    name: 'A Serpente Imortal',
    place: 'Covil Subterrâneo',
    objective: 'Enfrentar Orochimaru e impedir o ritual de transferência de alma.',
    minLevel: 18,
    stamina: 8,
    enemies: [
      { id: 'orochimaru', level: 19 },
      { id: 'assassino', level: 18 },
      { id: 'assassino', level: 18 },
    ],
    rewards: { ryo: 3400, exp: 3200, scrolls: { ouro: 1, prata: 2 } },
    brief: [
      { who: 'Orochimaru', text: 'Que corpo interessante… venha, mostre o quanto aprendeu.' },
      { who: 'Kakashi', text: 'Ninguém vai sozinho. Formação completa, agora.' },
      { who: 'Você', text: 'Equipe, ataquem em cadeia. Não deixem ele respirar.' },
    ],
  },
  {
    id: 's-2',
    rank: 'S',
    name: 'Cerco à Vila',
    place: 'Portão Principal',
    objective: 'Defender Konoha do exército reunido pelos renegados.',
    minLevel: 20,
    stamina: 8,
    enemies: [
      { id: 'kage_sombrio', level: 21 },
      { id: 'jounin_sombrio', level: 20 },
      { id: 'jounin_sombrio', level: 20 },
      { id: 'marionete', level: 20 },
    ],
    rewards: { ryo: 4000, exp: 3800, scrolls: { ouro: 1 } },
    brief: [
      { who: 'Tsunade', text: 'Hoje a vila inteira luta. Mas a linha de frente é sua.' },
      { who: 'Naruto', text: 'Então a gente abre caminho e não para.' },
      { who: 'Sasuke', text: 'Fiquem atrás de mim. Só até eu terminar o selo.' },
    ],
  },
  {
    id: 's-3',
    rank: 'S',
    name: 'O Último Pergaminho',
    place: 'Vale do Fim',
    objective: 'Selar definitivamente o pergaminho proibido e seus guardiões.',
    minLevel: 22,
    stamina: 9,
    enemies: [
      { id: 'orochimaru', level: 24 },
      { id: 'kage_sombrio', level: 23 },
      { id: 'jounin_sombrio', level: 23 },
    ],
    rewards: { ryo: 6000, exp: 6000, scrolls: { ouro: 2 }, gold: 5 },
    brief: [
      { who: 'Tsunade', text: 'Esse é o último. Depois disso, seu nome entra nos registros como lenda.' },
      { who: 'Kakashi', text: 'E como sempre digo: quem abandona os amigos é pior que lixo.' },
      { who: 'Você', text: 'Ninguém fica para trás. Vamos.' },
    ],
  },
];

export function getMission(id) {
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

/** Missões de um rank, na ordem original. */
export function missionsByRank(rank) {
  return MISSIONS.filter((mission) => mission.rank === rank);
}
