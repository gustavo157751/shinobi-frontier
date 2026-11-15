import { useEffect, useState } from 'react';
import { Anvil, Coins, Hammer, Lock, Package, Zap } from 'lucide-react';
import type { Character } from './types';

type RecipeInput = { code: string; name: string; quantity: number; owned: number };
type Recipe = {
  code: string;
  name: string;
  description: string;
  requiredLevel: number;
  goldCost: number;
  locked: boolean;
  affordable: boolean;
  inputs: RecipeInput[];
  output: { code: string; name: string; quantity: number };
};

type CraftingOverview = {
  level: number;
  gold: number;
  energy: number;
  maxEnergy: number;
  recipes: Recipe[];
};

type CraftResponse = {
  recipe: { code: string; name: string };
  output: { code: string; name: string; quantity: number };
  character: Character;
};

export function CraftingView({ api, onCharacter }: {
  api: string;
  onCharacter: (character: Character) => void;
}) {
  const [overview, setOverview] = useState<CraftingOverview | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(api + '/crafting', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível carregar a oficina.');
      setOverview(data as CraftingOverview);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao carregar a oficina.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function craft(code: string) {
    setBusy(code);
    setMessage('');
    try {
      const response = await fetch(api + '/crafting/craft', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeCode: code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message[0] : data.message || 'Não foi possível forjar o item.');
      const result = data as CraftResponse;
      setMessage(`${result.output.name} forjado com sucesso.`);
      onCharacter(result.character);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Erro ao forjar o item.');
    } finally {
      setBusy(null);
    }
  }

  if (loading && !overview) {
    return <section className="team-empty"><small>OFICINA · FORJA</small><h1>Preparando a forja</h1><p className="muted">Carregando receitas...</p></section>;
  }

  if (!overview) {
    return <section className="team-empty"><small>OFICINA · FORJA</small><h1>Não foi possível abrir a oficina</h1>{message && <p className="message">{message}</p>}<button onClick={() => void load()}>TENTAR NOVAMENTE</button></section>;
  }

  return <div className="crafting">
    <div className="combat-heading">
      <div>
        <small>OFICINA · FORJA</small>
        <h1>Forja de materiais</h1>
      </div>
      <div className="team-wallet"><Coins/><b>{overview.gold}</b><small>RYŌ</small></div>
    </div>
    {message && <p className="message">{message}</p>}
    <p className="missions-note">Combine materiais coletados em missões para forjar consumíveis mais potentes. O servidor valida nível, saldo e estoque.</p>

    <div className="mission-grid">
      {overview.recipes.map((recipe) => {
        const busyHere = busy === recipe.code;
        const blocked = recipe.locked || !recipe.affordable || busyHere;
        return <article key={recipe.code} className={'card mission-card' + (recipe.locked ? ' status-completed' : '')}>
          <header>
            <small>{recipe.locked ? `NÍVEL ${recipe.requiredLevel}+` : recipe.affordable ? 'DISPONÍVEL' : 'MATERIAIS INSUFICIENTES'}</small>
            <Anvil size={16}/>
          </header>
          <h2>{recipe.name}</h2>
          <p className="muted">{recipe.description}</p>
          <div className="mission-enemy"><Hammer size={14}/><span>Resultado: <b>{recipe.output.name} x{recipe.output.quantity}</b></span></div>
          <div className="mission-rewards">
            {recipe.inputs.map((input) => <span key={input.code}><Package size={13}/> {input.name} {input.owned}/{input.quantity}</span>)}
            {recipe.goldCost > 0 && <span><Coins size={13}/> {recipe.goldCost} ryō</span>}
          </div>
          <button disabled={blocked} onClick={() => void craft(recipe.code)}>
            {busyHere ? 'FORJANDO...' : recipe.locked ? <><Lock size={13}/> NÍVEL {recipe.requiredLevel}</> : !recipe.affordable ? <><Package size={13}/> FALTAM MATERIAIS</> : <><Hammer size={13}/> FORJAR</>}
          </button>
        </article>;
      })}
    </div>
  </div>;
}
