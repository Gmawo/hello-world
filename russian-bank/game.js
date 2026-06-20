'use strict';

const SUITS = ['S', 'H', 'C', 'D'];
const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
const RED_SUITS = new Set(['H', 'D']);
const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(r) { return RANK_LABEL[r] || String(r); }
function isRed(suit) { return RED_SUITS.has(suit); }

function buildDeck(owner) {
  const cards = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      cards.push({ suit, rank, owner, faceUp: false, id: `${owner}-${suit}-${rank}` });
    }
  }
  return cards;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function makePlayerState(owner) {
  const deck = shuffle(buildDeck(owner));
  const stock = deck.splice(0, 13);
  stock[stock.length - 1].faceUp = true; // top of stock visible

  const tableau = [[], [], [], []];
  for (let col = 0; col < 4; col++) {
    const card = deck.shift();
    card.faceUp = true;
    tableau[col].push(card);
  }

  const hand = deck; // remaining cards, face down
  return { owner, stock, tableau, hand, waste: [] };
}

function newGame() {
  return {
    players: { 1: makePlayerState(1), 2: makePlayerState(2) },
    foundations: { S: [], H: [], C: [], D: [] },
    current: 1,
    selected: null, // { owner, type: 'stock'|'waste'|'tcol', col }
    winner: null,
  };
}

let state = newGame();

function topOf(pile) { return pile.length ? pile[pile.length - 1] : null; }

function pileRef(owner, type, col) {
  const p = state.players[owner];
  if (type === 'stock') return p.stock;
  if (type === 'waste') return p.waste;
  if (type === 'tcol') return p.tableau[col];
  return null;
}

function canPlayOnFoundation(card, suit) {
  const f = state.foundations[suit];
  if (card.suit !== suit) return false;
  if (f.length === 0) return card.rank === 1;
  return topOf(f).rank === card.rank - 1;
}

function findFoundationTarget(card) {
  return canPlayOnFoundation(card, card.suit) ? card.suit : null;
}

function canPlayOnTableau(card, destOwner, destCol) {
  const col = state.players[destOwner].tableau[destCol];
  if (col.length === 0) return true;
  const top = col[col.length - 1];
  return top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit);
}

function selectCard(owner, type, col) {
  if (owner !== state.current || state.winner) { state.selected = null; render(); return; }
  const pile = pileRef(owner, type, col);
  const card = topOf(pile);
  if (!card || !card.faceUp) { state.selected = null; render(); return; }

  if (state.selected && state.selected.owner === owner && state.selected.type === type && state.selected.col === col) {
    state.selected = null; // toggle off
  } else {
    state.selected = { owner, type, col };
  }
  render();
}

function flipNewTopIfNeeded(pile) {
  const top = topOf(pile);
  if (top) top.faceUp = true;
}

function attemptMoveTo(destKind, destOwner, destCol) {
  if (!state.selected || state.winner) return;
  const { owner, type, col } = state.selected;
  const sourcePile = pileRef(owner, type, col);
  const card = topOf(sourcePile);
  if (!card) { state.selected = null; render(); return; }

  let success = false;

  if (destKind === 'foundation') {
    if (canPlayOnFoundation(card, destOwner)) {
      sourcePile.pop();
      card.faceUp = true;
      state.foundations[destOwner].push(card);
      success = true;
    }
  } else if (destKind === 'tcol') {
    if (canPlayOnTableau(card, destOwner, destCol)) {
      sourcePile.pop();
      card.faceUp = true;
      state.players[destOwner].tableau[destCol].push(card);
      success = true;
    }
  }

  if (success) {
    flipNewTopIfNeeded(sourcePile);
    state.selected = null;
    checkWin(owner);
  } else {
    state.selected = null;
  }
  render();
}

function checkWin(owner) {
  if (state.players[owner].stock.length === 0) {
    state.winner = owner;
  }
}

function drawCard(owner) {
  if (owner !== state.current || state.winner) return;
  const p = state.players[owner];
  if (p.hand.length === 0) {
    if (p.waste.length === 0) {
      // nothing to draw; just pass turn
      endTurn();
      return;
    }
    // reshuffle waste back into hand, face down, do not end turn
    p.hand = p.waste.reverse();
    p.hand.forEach(c => (c.faceUp = false));
    p.waste = [];
    render();
    return;
  }
  const card = p.hand.pop();
  card.faceUp = true;
  p.waste.push(card);
  endTurn();
}

function endTurn() {
  state.selected = null;
  state.current = state.current === 1 ? 2 : 1;
  render();
}

function cardEl(card, extraClass) {
  const div = document.createElement('div');
  div.className = 'card ' + (card.faceUp ? (isRed(card.suit) ? 'red' : 'black') : 'facedown');
  if (extraClass) div.className += ' ' + extraClass;
  if (card.faceUp) {
    div.innerHTML = `<div class="top">${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}</div><div class="bottom">${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}</div>`;
  }
  return div;
}

function isSelected(owner, type, col) {
  return state.selected && state.selected.owner === owner && state.selected.type === type && state.selected.col === col;
}

function renderPileTop(elId, owner, type, col, clickable) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  const pile = pileRef(owner, type, col);
  const card = topOf(pile);
  if (card) {
    const div = cardEl(card, isSelected(owner, type, col) ? 'selected' : '');
    el.appendChild(div);
    if (pile.length > 1) {
      const count = document.createElement('div');
      count.className = 'pile-count';
      count.textContent = pile.length;
      el.appendChild(count);
    }
  }
  el.onclick = () => {
    if (!clickable) return;
    const isSelectedPile = state.selected && state.selected.owner === owner && state.selected.type === type && state.selected.col === col;
    if (state.selected && !isSelectedPile) {
      // stock/waste piles are never valid move destinations
      return;
    }
    if (card && card.faceUp && owner === state.current) {
      selectCard(owner, type, col);
    }
  };
}

function render() {
  for (const owner of [1, 2]) {
    renderPileTop(`p${owner}-stock`, owner, 'stock', null, true);
    renderPileTop(`p${owner}-waste`, owner, 'waste', null, true);

    // hand pile (always face down, shows count, click = draw)
    const handEl = document.getElementById(`p${owner}-hand`);
    handEl.innerHTML = '';
    if (state.players[owner].hand.length > 0) {
      const fake = { faceUp: false };
      handEl.appendChild(cardEl(fake));
      const count = document.createElement('div');
      count.className = 'pile-count';
      count.textContent = state.players[owner].hand.length;
      handEl.appendChild(count);
    }

    const drawBtn = document.getElementById(`p${owner}-draw`);
    drawBtn.disabled = state.current !== owner || !!state.winner;
    drawBtn.onclick = () => drawCard(owner);
  }

  // proper tableau column rendering (4 distinct elements per player)
  document.querySelectorAll('.tcol').forEach(el => {
    const owner = Number(el.dataset.owner);
    const col = Number(el.dataset.col);
    el.innerHTML = '';
    const pile = state.players[owner].tableau[col];
    pile.forEach((card, idx) => {
      const div = cardEl(card, isSelected(owner, 'tcol', col) && idx === pile.length - 1 ? 'selected' : '');
      div.style.top = `${idx * 18}px`;
      div.style.zIndex = idx;
      el.appendChild(div);
    });
    el.style.minHeight = `${100 + Math.max(0, pile.length - 1) * 18}px`;
    el.onclick = () => {
      const top = topOf(pile);
      const isSelectedPile = state.selected && state.selected.owner === owner && state.selected.type === 'tcol' && state.selected.col === col;
      if (state.selected && !isSelectedPile) {
        attemptMoveTo('tcol', owner, col);
      } else if (top && top.faceUp && owner === state.current) {
        selectCard(owner, 'tcol', col);
      }
    };
  });

  // foundations
  document.querySelectorAll('.foundation').forEach(el => {
    const suit = el.dataset.suit;
    const inner = el.querySelectorAll('.card');
    inner.forEach(c => c.remove());
    const card = topOf(state.foundations[suit]);
    if (card) {
      el.appendChild(cardEl(card));
    }
    el.onclick = () => {
      if (state.selected) attemptMoveTo('foundation', suit, null);
    };
  });

  document.getElementById('area-1').classList.toggle('active-turn', state.current === 1 && !state.winner);
  document.getElementById('area-2').classList.toggle('active-turn', state.current === 2 && !state.winner);

  const banner = document.getElementById('banner');
  if (state.winner) {
    banner.textContent = `Player ${state.winner} wins! Their stock pile is empty.`;
  } else {
    banner.textContent = `Player ${state.current}'s turn`;
  }
}

document.getElementById('newGameBtn').addEventListener('click', () => {
  state = newGame();
  render();
});

document.getElementById('rulesBtn').addEventListener('click', () => {
  document.getElementById('rulesDialog').showModal();
});
document.getElementById('closeRules').addEventListener('click', () => {
  document.getElementById('rulesDialog').close();
});

render();
