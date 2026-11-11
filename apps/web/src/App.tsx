import { useState } from 'react';
import { Backpack, Heart, ScrollText, Shield, Swords, Users, Wind, Zap } from 'lucide-react';

const paths = [
  ['SHADOW_BLADE', 'Lâmina das Sombras'],
  ['FLAME_EYE', 'Olho das Chamas'],
  ['WIND_DANCER', 'Dançarina dos Ventos'],
  ['WATER_CLAW', 'Garra das Águas'],
  ['STONE_FIST', 'Punho de Pedra'],
];

type Character = {
  id: string; name: string; level: number; experience: number; energy: number; path: string; gold: number;
  strength: number; vitality: number; agility: number; intelligence: number;
};
type BattleLog = { turn: number; text: string; side: 'player' | 'enemy' | 'system' };
type BattleState = {
  enemy: { code: string; name: string; level: number; hp: number; maxHp: number };
  player: { hp: number; maxHp: number; chakra: number; maxChakra: number };
  turn: number; logs: BattleLog[];
};
type Battle = { id: string; status: 'ACTIVE' | 'VICTORY' | 'DEFEAT'; state: BattleState };
type CombatResponse = { battle: Battle | null; character?: Character; reward?: { experience: number; gold: number } | null; message?: string | string[] };

const api = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('sf_token') || '');
  const [character, setCharacter] = useState<Character | null>(() => {
    const saved = localStorage.getItem('sf_character');
    return saved ? JSON.parse(saved) as Character : null;
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [path, setPath] = useState('SHADOW_BLADE');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [view, setView] = useState<'village' | 'combat'>('village');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('Conectando...');
    try {
      const response = await fetch(api + '/auth/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email, password, characterName: name, path } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Falha na autenticação.');
      saveSession(data.accessToken, data.character);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão.');
    }
  }

  function saveSession(accessToken: string, nextCharacter: Character) {
    localStorage.setItem('sf_token', accessToken);
    localStorage.setItem('sf_character', JSON.stringify(nextCharacter));
    setToken(accessToken);
    setCharacter(nextCharacter);
  }

  function logout() {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_character');
    setToken('');
    setCharacter(null);
    setBattle(null);
    setView('village');
  }

  async function combatRequest(pathname: string, body?: object) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(api + pathname, {
        method: body ? 'POST' : 'GET',
        headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json() as CombatResponse;
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível atualizar o confronto.');
      setBattle(data.battle);
      if (data.character && character) saveSession(token, data.character);
      return data;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro de conexão com o servidor.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openCombat() {
    setView('combat');
    await combatRequest('/combat/current');
  }

  const className = paths.find((item) => item[0] === character?.path)?.[1] || 'Shinobi';

  if (!token || !character) {
    return <main className="auth"><section className="art"><div className="seal">SF</div><small>UM NOVO MUNDO SHINOBI</small><h1>Forje seu<br/><em>destino.</em></h1><p>Reúna aliados. Domine técnicas. Escreva sua lenda.</p><b className="kanji">忍</b></section><section className="formside"><small>SHINOBI FRONTIER · SERVIDOR LOCAL</small><h2>{mode === 'register' ? 'Crie sua jornada' : 'Bem-vindo de volta'}</h2><p className="muted">Acesse o mundo e comece sua evolução.</p><form onSubmit={submit}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required/></label><label>Senha<input type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required placeholder="Mínimo de 10 caracteres"/></label>{mode === 'register' && <><label>Nome do personagem<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={18} required/></label><label>Caminho shinobi<select value={path} onChange={(event) => setPath(event.target.value)}>{paths.map((item) => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select></label></>}<button>{mode === 'register' ? 'CRIAR CONTA' : 'ENTRAR NO MUNDO'}</button></form>{message && <p className="message">{message}</p>}<p className="switch">{mode === 'register' ? 'Já possui conta?' : 'Novo por aqui?'} <a onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</a></p><small className="foot">Uma aventura original · Shinobi Frontier</small></section></main>;
  }

  return <div className="shell"><header><b><i>SF</i> SHINOBI FRONTIER</b><span>● SERVIDOR LOCAL <button onClick={logout}>SAIR</button></span></header><div className="layout"><nav><small>MUNDO</small><button className={view === 'village' ? 'nav-link active' : 'nav-link'} onClick={() => setView('village')}><Shield/> Vila Central</button><button className="nav-link" onClick={openCombat}><Swords/> Combate</button><button className="nav-link" onClick={() => setMessage('As missões entram na próxima etapa da jornada.')}><ScrollText/> Missões</button><button className="nav-link" onClick={() => setMessage('A equipe poderá ser formada após o primeiro capítulo.')}><Users/> Equipe</button><button className="nav-link" onClick={() => setMessage('O inventário será conectado à progressão em uma próxima etapa.')}><Backpack/> Inventário</button><footer>CAPÍTULO 01<br/><b>O DESPERTAR</b></footer></nav><main>
    {view === 'village' ? <><small>VILA CENTRAL · REGIÃO DA SERRA</small><h1>Bem-vindo, {character.name}</h1><p className="muted">Seu caminho começa agora, shinobi.</p><section className="banner"><small>SUA JORNADA</small><h2>Uma trilha desconhecida<br/>se abre diante de você.</h2><p>Treine, descubra sua afinidade e enfrente os perigos do vale.</p><button onClick={openCombat}>INICIAR TREINO</button><b>忍</b></section><div className="cards"><section className="card"><small>PERFIL SHINOBI</small><h2>{character.name}</h2><p>{className} · Nível {character.level}</p><div className="stats"><span><Swords/>{character.strength}<small>FORÇA</small></span><span><Heart/>{character.vitality}<small>VITALIDADE</small></span><span><Wind/>{character.agility}<small>AGILIDADE</small></span><span><Zap/>{character.intelligence}<small>INTELIGÊNCIA</small></span></div></section><section className="card"><small>RECURSOS</small><p>Energia <b>{character.energy}/100</b></p><p>Ryō <b>{character.gold}</b></p><p>Caminho <b>{className}</b></p><aside>Seu personagem e sua progressão são salvos no servidor.</aside></section></div></> : <CombatView battle={battle} busy={busy} message={message} onStart={() => void combatRequest('/combat/start', {})} onAction={(action) => void combatRequest('/combat/action', { action })}/ >}
    </main></div></div>;
}

function CombatView({ battle, busy, message, onStart, onAction }: {
  battle: Battle | null; busy: boolean; message: string; onStart: () => void; onAction: (action: 'strike' | 'technique' | 'guard') => void;
}) {
  if (!battle) return <section className="combat-empty"><small>CAMINHO DA SERRA · TREINO</small><h1>Um desafio à sua espera</h1><p>Encare um Batedor do Véu em um confronto por turnos. Suas escolhas e recompensas são validadas e salvas pelo servidor.</p>{message && <p className="message">{message}</p>}<button disabled={busy} onClick={onStart}>{busy ? 'PREPARANDO...' : 'INICIAR CONFRONTO · 10 ENERGIA'}</button></section>;

  const state = battle.state;
  const playerPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const enemyPercent = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);
  const chakraPercent = Math.max(0, (state.player.chakra / state.player.maxChakra) * 100);
  return <><div className="combat-heading"><div><small>CAMINHO DA SERRA · TURNO {state.turn}</small><h1>{battle.status === 'ACTIVE' ? 'Confronto em andamento' : battle.status === 'VICTORY' ? 'Vitória shinobi' : 'Recuo estratégico'}</h1></div>{battle.status !== 'ACTIVE' && <button onClick={onStart} disabled={busy}>NOVO CONFRONTO</button>}</div>{message && <p className="message">{message}</p>}<section className="battlefield"><article className="fighter player-fighter"><div className="fighter-mark">忍</div><small>SHINOBI · NÍVEL {state.enemy.level}</small><h2>Sua jornada</h2><Meter label="VITALIDADE" value={state.player.hp} max={state.player.maxHp} percent={playerPercent}/><Meter label="CHAKRA" value={state.player.chakra} max={state.player.maxChakra} percent={chakraPercent}/></article><div className="versus">VS</div><article className="fighter enemy-fighter"><div className="fighter-mark">影</div><small>AMEAÇA · NÍVEL {state.enemy.level}</small><h2>{state.enemy.name}</h2><Meter label="VITALIDADE" value={state.enemy.hp} max={state.enemy.maxHp} percent={enemyPercent}/></article></section>{battle.status === 'ACTIVE' && <section className="action-panel"><div><small>SUA VEZ</small><p>Escolha uma ação para responder ao adversário.</p></div><button disabled={busy} onClick={() => onAction('strike')}><Swords/> GOLPE</button><button disabled={busy || state.player.chakra < 25} onClick={() => onAction('technique')}><Zap/> TÉCNICA · 25 CHAKRA</button><button disabled={busy} onClick={() => onAction('guard')}><Shield/> DEFENDER</button></section>}<section className="battle-log"><small>RELATO DO CONFRONTO</small>{state.logs.slice().reverse().map((entry, index) => <p key={entry.turn + '-' + index} className={'log-' + entry.side}><span>T{entry.turn}</span>{entry.text}</p>)}</section></>;
}

function Meter({ label, value, max, percent }: { label: string; value: number; max: number; percent: number }) {
  return <div className="meter"><div><small>{label}</small><b>{value} / {max}</b></div><span><i style={{ width: percent + '%' }}/></span></div>;
}
