'use strict';

const SUITS = ['S', 'H', 'C', 'D'];
const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
const RED_SUITS = new Set(['H', 'D']);
const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };

function rankLabel(r) { return RANK_LABEL[r] || String(r); }
function isRed(suit) { return RED_SUITS.has(suit); }
function other(owner) { return owner === 1 ? 2 : 1; }

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
  const reserve = deck.splice(0, 13); // 12 hidden + 1 revealed on top
  reserve[reserve.length - 1].faceUp = true;

  const tableau = [[], [], [], []]; // this player's 4 houses (shared use)
  for (let col = 0; col < 4; col++) {
    const card = deck.shift();
    card.faceUp = true;
    tableau[col].push(card);
  }

  const hand = deck; // remaining 35 cards, face down
  return { owner, reserve, tableau, hand, waste: [], drawn: [] };
}

function newGame() {
  return {
    players: { 1: makePlayerState(1), 2: makePlayerState(2) },
    foundations: { S: [], H: [], C: [], D: [] },
    current: 1,
    selected: null, // { owner, type: 'reserve'|'drawn'|'tcol', col }
    winner: null,
  };
}

let state = newGame();

function topOf(pile) { return pile.length ? pile[pile.length - 1] : null; }

function pileRef(owner, type, col) {
  const p = state.players[owner];
  if (type === 'reserve') return p.reserve;
  if (type === 'drawn') return p.drawn;
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

function canPlayOnTableau(card, destOwner, destCol) {
  const col = state.players[destOwner].tableau[destCol];
  if (col.length === 0) return true;
  const top = col[col.length - 1];
  return top.rank === card.rank + 1 && isRed(top.suit) !== isRed(card.suit);
}

// Loading an opponent's reserve or waste pile: same suit, adjacent rank (+/-1)
function canLoadPile(card, pile) {
  const top = topOf(pile);
  if (!top) return false;
  return card.suit === top.suit && Math.abs(card.rank - top.rank) === 1;
}

function isPlayable(owner, type, col) {
  // Whose available cards: your own reserve top, your own drawn card, or
  // the outermost card of ANY house (houses are shared by both players).
  if (type === 'reserve' || type === 'drawn') return owner === state.current;
  if (type === 'tcol') return true;
  return false;
}

function selectCard(owner, type, col) {
  if (state.winner || !isPlayable(owner, type, col)) { state.selected = null; render(); return; }
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
  } else if (destKind === 'reserve') {
    // can only load the opponent's reserve, never your own
    if (destOwner !== state.current && canLoadPile(card, state.players[destOwner].reserve)) {
      sourcePile.pop();
      card.faceUp = true;
      state.players[destOwner].reserve.push(card);
      success = true;
    }
  } else if (destKind === 'waste') {
    // can only load the opponent's waste, never your own
    if (destOwner !== state.current && canLoadPile(card, state.players[destOwner].waste)) {
      sourcePile.pop();
      card.faceUp = true;
      state.players[destOwner].waste.push(card);
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
  const p = state.players[owner];
  if (p.reserve.length === 0 && p.hand.length === 0 && p.waste.length === 0 && p.drawn.length === 0) {
    state.winner = owner;
  }
}

// Draw the next hand card face-up; it stays available to play until the
// player discards it onto their own waste (which ends the turn).
function drawCard(owner) {
  if (owner !== state.current || state.winner) return;
  const p = state.players[owner];
  if (p.drawn.length > 0) return; // must resolve the current drawn card first

  if (p.hand.length === 0) {
    if (p.waste.length === 0) return; // nothing left to draw
    // recycle waste back into hand, face down, without ending the turn
    p.hand = p.waste.reverse();
    p.hand.forEach(c => (c.faceUp = false));
    p.waste = [];
    render();
    return;
  }
  const card = p.hand.pop();
  card.faceUp = true;
  p.drawn.push(card);
  state.selected = null;
  render();
}

// Discarding the drawn card onto your own waste ends your turn.
function discardDrawn(owner) {
  if (owner !== state.current || state.winner) return;
  const p = state.players[owner];
  if (p.drawn.length === 0) return;
  const card = p.drawn.pop();
  p.waste.push(card);
  endTurn();
}

function endTurn() {
  state.selected = null;
  state.current = other(state.current);
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

function renderSimplePile(elId, owner, type, onClick) {
  const el = document.getElementById(elId);
  el.innerHTML = '';
  const pile = pileRef(owner, type, null);
  const card = topOf(pile);
  if (card) {
    const div = cardEl(card, isSelected(owner, type, null) ? 'selected' : '');
    el.appendChild(div);
    if (pile.length > 1) {
      const count = document.createElement('div');
      count.className = 'pile-count';
      count.textContent = pile.length;
      el.appendChild(count);
    }
  }
  el.onclick = onClick;
}

function render() {
  for (const owner of [1, 2]) {
    // Reserve: selectable only by its own player; otherwise it's a load target for the opponent.
    renderSimplePile(`p${owner}-stock`, owner, 'reserve', () => {
      const isSelectedPile = state.selected && state.selected.owner === owner && state.selected.type === 'reserve';
      if (state.selected && !isSelectedPile) {
        attemptMoveTo('reserve', owner, null);
      } else {
        selectCard(owner, 'reserve', null);
      }
    });

    // Drawn card (revealed from hand): selectable only by its own player while pending.
    // It's never a valid move destination, so ignore clicks on the opponent's drawn slot.
    renderSimplePile(`p${owner}-drawn`, owner, 'drawn', () => {
      if (owner === state.current) selectCard(owner, 'drawn', null);
    });

    // Waste: clicking your own waste with a pending drawn card discards it (ends turn).
    // Clicking the opponent's waste with a card selected attempts to load it.
    renderSimplePile(`p${owner}-waste`, owner, 'waste', () => {
      if (owner === state.current) {
        if (!state.selected && state.players[owner].drawn.length > 0) {
          discardDrawn(owner);
        }
      } else if (state.selected) {
        attemptMoveTo('waste', owner, null);
      }
    });

    // Hand pile (always face down, shows count, click = draw next card)
    const handEl = document.getElementById(`p${owner}-hand`);
    handEl.innerHTML = '';
    if (state.players[owner].hand.length > 0) {
      handEl.appendChild(cardEl({ faceUp: false }));
      const count = document.createElement('div');
      count.className = 'pile-count';
      count.textContent = state.players[owner].hand.length;
      handEl.appendChild(count);
    }
    handEl.onclick = () => drawCard(owner);

    const drawBtn = document.getElementById(`p${owner}-draw`);
    drawBtn.disabled = state.current !== owner || !!state.winner || state.players[owner].drawn.length > 0;
    drawBtn.onclick = () => drawCard(owner);
  }

  // Tableau houses: any house's top card is available to whoever's turn it is.
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
      } else if (top && top.faceUp) {
        selectCard(owner, 'tcol', col);
      }
    };
  });

  // Foundations
  document.querySelectorAll('.foundation').forEach(el => {
    const suit = el.dataset.suit;
    el.querySelectorAll('.card').forEach(c => c.remove());
    const card = topOf(state.foundations[suit]);
    if (card) el.appendChild(cardEl(card));
    el.onclick = () => {
      if (state.selected) attemptMoveTo('foundation', suit, null);
    };
  });

  document.getElementById('area-1').classList.toggle('active-turn', state.current === 1 && !state.winner);
  document.getElementById('area-2').classList.toggle('active-turn', state.current === 2 && !state.winner);

  const banner = document.getElementById('banner');
  if (state.winner) {
    banner.textContent = `Player ${state.winner} wins! Reserve, hand, and waste are all empty.`;
  } else {
    const p = state.players[state.current];
    const hint = p.drawn.length > 0 ? ' — play or discard your drawn card to end your turn' : '';
    banner.textContent = `Player ${state.current}'s turn${hint}`;
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
