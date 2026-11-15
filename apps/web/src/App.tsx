import { useEffect, useState } from 'react';
import { Anvil, Backpack, Brain, Heart, ScrollText, Shield, Swords, Users, Wind, Zap } from 'lucide-react';
import { useWorldPresence } from './useWorldPresence';
import { TeamView } from './TeamView';
import { MissionsView } from './MissionsView';
import { InventoryView } from './InventoryView';
import { TalentsView } from './TalentsView';
import { CraftingView } from './CraftingView';
import type { Battle, BattleState, Character, CombatReward } from './types';

const paths = [
  ['SHADOW_BLADE', 'L+ómina das Sombras'],
  ['FLAME_EYE', 'Olho das Chamas'],
  ['WIND_DANCER', 'Dan+ºarina dos Ventos'],
  ['WATER_CLAW', 'Garra das +üguas'],
  ['STONE_FIST', 'Punho de Pedra'],
];

type CombatResponse = { battle: Battle | null; character?: Character; reward?: CombatReward | null; message?: string | string[] };

const api = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [character, setCharacter] = useState<Character | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [path, setPath] = useState('SHADOW_BLADE');
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [view, setView] = useState<'village' | 'combat' | 'team' | 'missions' | 'inventory' | 'crafting' | 'talents'>('village');
  const [battle, setBattle] = useState<Battle | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const presence = useWorldPresence(authenticated && Boolean(character));

  useEffect(() => {
    localStorage.removeItem('sf_token');
    localStorage.removeItem('sf_character');
    let cancelled = false;

    fetch(api + '/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { character: Character | null };
        if (!cancelled) {
          setCharacter(data.character);
          setAuthenticated(Boolean(data.character));
        }
      })
      .catch(() => {
        if (!cancelled) setMessage('N+úo foi poss+¡vel alcan+ºar a API. Confira se o servidor est+í online e se VITE_API_URL est+í correto.');
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage('Conectando...');
    try {
      const response = await fetch(api + '/auth/' + mode, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(mode === 'register' ? { email, password, characterName: name, path } : { email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Falha na autentica+º+úo.');
      saveSession(data.character);
      setPassword('');
      setMessage('');
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'N+úo foi poss+¡vel alcan+ºar a API. Confira se o servidor est+í online e se VITE_API_URL est+í correto.'
        : error instanceof Error ? error.message : 'Erro de conex+úo.');
    }
  }

  function saveSession(nextCharacter: Character) {
    setAuthenticated(true);
    setCharacter(nextCharacter);
  }

  async function logout() {
    try {
      await fetch(api + '/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Clear the local view even if the API is temporarily unreachable.
    } finally {
      setAuthenticated(false);
      setMessage('');
      setPassword('');
      setEmail('');
      setName('');
      setBattle(null);
      setCharacter(null);
      setView('village');
    }
  }

  async function combatRequest(pathname: string, body?: object) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(api + pathname, {
        method: body ? 'POST' : 'GET',
        credentials: 'include',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const data = await response.json() as CombatResponse;
      if (!response.ok) {
        if (response.status === 401) {
          setAuthenticated(false);
          setCharacter(null);
        }
        throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'N+úo foi poss+¡vel atualizar o confronto.');
      }
      setBattle(data.battle);
      if (data.character) saveSession(data.character);
      return data;
    } catch (error) {
      setMessage(error instanceof TypeError
        ? 'N+úo foi poss+¡vel alcan+ºar a API. Confira se o servidor est+í online e se VITE_API_URL est+í correto.'
        : error instanceof Error ? error.message : 'Erro de conex+úo com o servidor.');
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function openCombat() {
    setView('combat');
    await combatRequest('/combat/current');
  }

  /** Rel+¬ o personagem ap+¦s gastar ry+ì ou ganhar recompensa em outra tela. */
  async function refreshCharacter() {
    try {
      const response = await fetch(api + '/auth/me', { credentials: 'include' });
      if (!response.ok) return;
      const data = await response.json() as { character: Character | null };
      if (data.character) setCharacter(data.character);
    } catch {
      // Mant+®m o estado atual se a API estiver momentaneamente indispon+¡vel.
    }
  }

  const className = paths.find((item) => item[0] === character?.path)?.[1] || 'Shinobi';

  if (authChecking) return <main className="auth"><section className="formside"><small>SHINOBI FRONTIER</small><h2>Conectando ao mundo</h2><p className="muted">Verificando a sess+úo e carregando seu personagem...</p></section></main>;

  if (!authenticated || !character) {
    return <main className="auth"><section className="art"><div className="seal">SF</div><small>UM NOVO MUNDO SHINOBI</small><h1>Forje seu<br/><em>destino.</em></h1><p>Re+¦na aliados. Domine t+®cnicas. Escreva sua lenda.</p><b className="kanji">Õ+ì</b></section><section className="formside"><small>SHINOBI FRONTIER -À API DO JOGO</small><h2>{mode === 'register' ? 'Crie sua jornada' : 'Bem-vindo de volta'}</h2><p className="muted">Acesse o mundo e comece sua evolu+º+úo.</p><form onSubmit={submit}><label>E-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email"/></label><label>Senha<input type="password" minLength={10} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="M+¡nimo de 10 caracteres"/></label>{mode === 'register' && <><label>Nome do personagem<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={18} required autoComplete="nickname"/></label><label>Caminho shinobi<select value={path} onChange={(event) => setPath(event.target.value)}>{paths.map((item) => <option value={item[0]} key={item[0]}>{item[1]}</option>)}</select></label></>}<button>{mode === 'register' ? 'CRIAR CONTA' : 'ENTRAR NO MUNDO'}</button></form>{message && <p className="message">{message}</p>}<p className="switch">{mode === 'register' ? 'J+í possui conta?' : 'Novo por aqui?'} <a onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>{mode === 'register' ? 'Entrar' : 'Criar conta'}</a></p><small className="foot">Uma aventura original -À Shinobi Frontier</small></section></main>;
  }

  return <div className="shell"><header><b><i>SF</i> SHINOBI FRONTIER</b><span className={presence.connected ? 'presence connected' : 'presence'}><b>ÔùÅ</b> {presence.connected ? (presence.online === null ? 'SINCRONIZANDO MUNDO' : presence.online + ' SHINOBI ONLINE') : 'MUNDO OFFLINE'} <button onClick={() => void logout()}>SAIR</button></span></header><div className="layout"><nav><small>MUNDO</small><button className={view === 'village' ? 'nav-link active' : 'nav-link'} onClick={() => setView('village')}><Shield/> Vila Central</button><button className="nav-link" onClick={openCombat}><Swords/> Combate</button><button className={view === 'missions' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('missions'); setMessage(''); }}><ScrollText/> Miss+Áes</button><button className={view === 'team' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('team'); setMessage(''); }}><Users/> Equipe</button><button className={view === 'inventory' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('inventory'); setMessage(''); }}><Backpack/> Invent+írio</button><button className={view === 'crafting' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('crafting'); setMessage(''); }}><Anvil/> Oficina</button><button className={view === 'talents' ? 'nav-link active' : 'nav-link'} onClick={() => { setView('talents'); setMessage(''); }}><Brain/> Talentos</button><footer>CAP+ìTULO 01<br/><b>O DESPERTAR</b></footer></nav><main>
    {view === 'village' ? <><small>VILA CENTRAL -À REGI+âO DA SERRA</small><h1>Bem-vindo, {character.name}</h1><p className="muted">Seu caminho come+ºa agora, shinobi.</p><section className="banner"><small>SUA JORNADA</small><h2>Uma trilha desconhecida<br/>se abre diante de voc+¬.</h2><p>Treine, descubra sua afinidade e enfrente os perigos do vale.</p><button onClick={openCombat}>INICIAR TREINO</button><b>Õ+ì</b></section><div className="cards"><section className="card"><small>PERFIL SHINOBI</small><h2>{character.name}</h2><p>{className} -À N+¡vel {character.level}</p><div className="stats"><span><Swords/>{character.strength}<small>FOR+çA</small></span><span><Heart/>{character.vitality}<small>VITALIDADE</small></span><span><Wind/>{character.agility}<small>AGILIDADE</small></span><span><Zap/>{character.intelligence}<small>INTELIG+èNCIA</small></span></div></section><section className="card"><small>RECURSOS</small><p>Energia <b>{character.energy}/100</b></p><p>Ry+ì <b>{character.gold}</b></p><p>Caminho <b>{className}</b></p><aside>Seu personagem e sua progress+úo s+úo salvos no servidor.</aside></section></div></> : view === 'team' ? <TeamView api={api} onProgress={() => void refreshCharacter()}/> : view === 'missions' ? <MissionsView api={api} onBattle={(payload) => { setBattle(payload.battle); saveSession(payload.character); setView('combat'); setMessage(''); }} onProgress={() => void refreshCharacter()}/> : view === 'inventory' ? <InventoryView api={api} onCharacter={saveSession}/> : view === 'crafting' ? <CraftingView api={api} onCharacter={saveSession}/> : view === 'talents' ? <TalentsView api={api} onCharacter={saveSession}/> : <CombatView battle={battle} busy={busy} message={message} onStart={() => void combatRequest('/combat/start', {})} onAction={(action) => void combatRequest('/combat/action', { action })}/ >}
    </main></div></div>;
}

function CombatView({ battle, busy, message, onStart, onAction }: {
  battle: Battle | null; busy: boolean; message: string; onStart: () => void; onAction: (action: 'strike' | 'technique' | 'guard') => void;
}) {
  if (!battle) return <section className="combat-empty"><small>CAMINHO DA SERRA -À TREINO</small><h1>Um desafio +á sua espera</h1><p>Encare um Batedor do V+®u em um confronto por turnos. Suas escolhas e recompensas s+úo validadas e salvas pelo servidor.</p>{message && <p className="message">{message}</p>}<button disabled={busy} onClick={onStart}>{busy ? 'PREPARANDO...' : 'INICIAR CONFRONTO -À 10 ENERGIA'}</button></section>;

  const state = battle.state;
  const playerPercent = Math.max(0, (state.player.hp / state.player.maxHp) * 100);
  const enemyPercent = Math.max(0, (state.enemy.hp / state.enemy.maxHp) * 100);
  const chakraPercent = Math.max(0, (state.player.chakra / state.player.maxChakra) * 100);
  return <><div className="combat-heading"><div><small>{state.mission ? 'MISS+âO -À ' + state.mission.name.toUpperCase() : 'CAMINHO DA SERRA'} -À TURNO {state.turn}</small><h1>{battle.status === 'ACTIVE' ? 'Confronto em andamento' : battle.status === 'VICTORY' ? 'Vit+¦ria shinobi' : 'Recuo estrat+®gico'}</h1></div>{battle.status !== 'ACTIVE' && <button onClick={onStart} disabled={busy}>NOVO CONFRONTO</button>}</div>{message && <p className="message">{message}</p>}<section className="battlefield"><article className="fighter player-fighter"><div className="fighter-mark">Õ+ì</div><small>SHINOBI -À N+ìVEL {state.enemy.level}</small><h2>Sua jornada</h2><Meter label="VITALIDADE" value={state.player.hp} max={state.player.maxHp} percent={playerPercent}/><Meter label="CHAKRA" value={state.player.chakra} max={state.player.maxChakra} percent={chakraPercent}/></article><div className="versus">VS</div><article className="fighter enemy-fighter"><div className="fighter-mark">Õ¢¦</div><small>AMEA+çA -À N+ìVEL {state.enemy.level}</small><h2>{state.enemy.name}</h2><Meter label="VITALIDADE" value={state.enemy.hp} max={state.enemy.maxHp} percent={enemyPercent}/></article></section>{battle.status === 'ACTIVE' && <section className="action-panel"><div><small>SUA VEZ</small><p>Escolha uma a+º+úo para responder ao advers+írio.</p></div><button disabled={busy} onClick={() => onAction('strike')}><Swords/> GOLPE</button><button disabled={busy || state.player.chakra < 25} onClick={() => onAction('technique')}><Zap/> T+ëCNICA -À 25 CHAKRA</button><button disabled={busy} onClick={() => onAction('guard')}><Shield/> DEFENDER</button></section>}<section className="battle-log"><small>RELATO DO CONFRONTO</small>{state.logs.slice().reverse().map((entry, index) => <p key={entry.turn + '-' + index} className={'log-' + entry.side}><span>T{entry.turn}</span>{entry.text}</p>)}</section></>;
}

function Meter({ label, value, max, percent }: { label: string; value: number; max: number; percent: number }) {
  return <div className="meter"><div><small>{label}</small><b>{value} / {max}</b></div><span><i style={{ width: percent + '%' }}/></span></div>;
}
