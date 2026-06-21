'use strict';

const SUITS = ['S', 'H', 'C', 'D'];
const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
const RED_SUITS = new Set(['H', 'D']);
const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const FOUNDATION_COUNT = 8; // 2 decks x 4 suits => up to 2 concurrent runs per suit

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
    foundations: Array.from({ length: FOUNDATION_COUNT }, () => []),
    current: 1,
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

function canPlayOnFoundation(card, index) {
  const f = state.foundations[index];
  if (f.length === 0) return card.rank === 1;
  const top = topOf(f);
  return top.suit === card.suit && top.rank === card.rank - 1;
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

// Whose available cards: your own reserve top, your own drawn card, or
// the outermost card of ANY house (houses are shared by both players).
function isPlayable(owner, type) {
  if (type === 'reserve' || type === 'drawn') return owner === state.current;
  if (type === 'tcol') return true;
  return false;
}

function flipNewTopIfNeeded(pile) {
  const top = topOf(pile);
  if (top) top.faceUp = true;
}

function checkWin(owner) {
  const p = state.players[owner];
  if (p.reserve.length === 0 && p.hand.length === 0 && p.waste.length === 0 && p.drawn.length === 0) {
    state.winner = owner;
  }
}

function attemptMove(source, dest) {
  if (state.winner) return false;
  if (!isPlayable(source.owner, source.type)) return false;
  const sourcePile = pileRef(source.owner, source.type, source.col);
  const card = topOf(sourcePile);
  if (!card || !card.faceUp) return false;

  let success = false;

  if (dest.zone === 'foundation') {
    if (canPlayOnFoundation(card, dest.found)) {
      sourcePile.pop();
      state.foundations[dest.found].push(card);
      success = true;
    }
  } else if (dest.zone === 'tcol') {
    if (canPlayOnTableau(card, dest.owner, dest.col)) {
      sourcePile.pop();
      state.players[dest.owner].tableau[dest.col].push(card);
      success = true;
    }
  } else if (dest.zone === 'reserve') {
    if (dest.owner !== state.current && canLoadPile(card, state.players[dest.owner].reserve)) {
      sourcePile.pop();
      state.players[dest.owner].reserve.push(card);
      success = true;
    }
  } else if (dest.zone === 'waste') {
    if (dest.owner === state.current) {
      // discarding your own drawn card onto your own waste ends your turn
      if (source.type === 'drawn' && source.owner === state.current) {
        sourcePile.pop();
        state.players[dest.owner].waste.push(card);
        endTurn();
        return true;
      }
      return false;
    }
    if (canLoadPile(card, state.players[dest.owner].waste)) {
      sourcePile.pop();
      state.players[dest.owner].waste.push(card);
      success = true;
    }
  }

  if (success) {
    flipNewTopIfNeeded(sourcePile);
    checkWin(source.owner);
  }
  return success;
}

// Draw the next hand card face-up; it stays available to play until the
// player discards it onto their own waste (which ends the turn).
function drawCard(owner) {
  if (owner !== state.current || state.winner) return;
  const p = state.players[owner];
  if (p.drawn.length > 0) return; // must resolve the current drawn card first

  if (p.hand.length === 0) {
    if (p.waste.length === 0) return; // nothing left to draw
    p.hand = p.waste.reverse();
    p.hand.forEach(c => (c.faceUp = false));
    p.waste = [];
    render();
    return;
  }
  const card = p.hand.pop();
  card.faceUp = true;
  p.drawn.push(card);
  render();
}

function endTurn() {
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

// ---------- Drag and drop (pointer events: works for mouse + touch) ----------

let drag = null; // { source, ghost, offsetX, offsetY, originEl }

function attachDragHandlers(el, source) {
  el.addEventListener('pointerdown', (e) => {
    if (state.winner || !isPlayable(source.owner, source.type)) return;
    const pile = pileRef(source.owner, source.type, source.col);
    const card = topOf(pile);
    if (!card || !card.faceUp) return;
    e.preventDefault();

    const rect = el.getBoundingClientRect();
    const ghost = el.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.top = rect.top + 'px';
    document.body.appendChild(ghost);
    el.classList.add('drag-source-hidden');

    drag = {
      source,
      ghost,
      originEl: el,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  });
}

function onPointerMove(e) {
  if (!drag) return;
  drag.ghost.style.left = (e.clientX - drag.offsetX) + 'px';
  drag.ghost.style.top = (e.clientY - drag.offsetY) + 'px';
  document.querySelectorAll('.drop-target-hint').forEach(n => n.classList.remove('drop-target-hint'));
  const zoneEl = elementUnderGhost(e.clientX, e.clientY);
  if (zoneEl) zoneEl.classList.add('drop-target-hint');
}

function elementUnderGhost(x, y) {
  drag.ghost.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  drag.ghost.style.display = '';
  return el ? el.closest('[data-zone]') : null;
}

function onPointerUp(e) {
  if (!drag) return;
  const { source, ghost, originEl } = drag;
  const zoneEl = elementUnderGhost(e.clientX, e.clientY);

  window.removeEventListener('pointermove', onPointerMove);
  window.removeEventListener('pointerup', onPointerUp);
  document.querySelectorAll('.drop-target-hint').forEach(n => n.classList.remove('drop-target-hint'));
  ghost.remove();
  originEl.classList.remove('drag-source-hidden');
  drag = null;

  if (zoneEl) {
    const dest = {
      zone: zoneEl.dataset.zone,
      owner: zoneEl.dataset.owner ? Number(zoneEl.dataset.owner) : undefined,
      col: zoneEl.dataset.col !== undefined ? Number(zoneEl.dataset.col) : undefined,
      found: zoneEl.dataset.found !== undefined ? Number(zoneEl.dataset.found) : undefined,
    };
    attemptMove(source, dest);
  }
  render();
}

// ---------- Rendering ----------

function renderPile(el, owner, type, col) {
  el.innerHTML = '';
  const pile = pileRef(owner, type, col);
  const card = topOf(pile);
  if (card) {
    const draggable = card.faceUp && isPlayable(owner, type);
    const div = cardEl(card, draggable ? 'draggable' : '');
    el.appendChild(div);
    if (draggable) attachDragHandlers(div, { owner, type, col });
    if (pile.length > 1) {
      const count = document.createElement('div');
      count.className = 'pile-count';
      count.textContent = pile.length;
      el.appendChild(count);
    }
  }
}

// Houses show the full cascading sequence (only the outermost card is draggable).
function renderHouse(el, owner, col) {
  el.innerHTML = '';
  const pile = state.players[owner].tableau[col];
  pile.forEach((card, idx) => {
    const isTop = idx === pile.length - 1;
    const draggable = isTop && card.faceUp && isPlayable(owner, 'tcol');
    const div = cardEl(card, draggable ? 'draggable' : '');
    div.style.top = `${idx * 18}px`;
    div.style.zIndex = idx;
    el.appendChild(div);
    if (draggable) attachDragHandlers(div, { owner, type: 'tcol', col });
  });
  el.style.minHeight = `${100 + Math.max(0, pile.length - 1) * 18}px`;
}

function render() {
  for (const owner of [1, 2]) {
    renderPile(document.getElementById(`p${owner}-reserve`), owner, 'reserve', null);
    renderPile(document.getElementById(`p${owner}-drawn`), owner, 'drawn', null);
    renderPile(document.getElementById(`p${owner}-waste`), owner, 'waste', null);

    for (let col = 0; col < 4; col++) {
      renderHouse(document.getElementById(`p${owner}-house-${col}`), owner, col);
    }

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

  for (let i = 0; i < FOUNDATION_COUNT; i++) {
    const el = document.getElementById(`found-${i}`);
    el.innerHTML = '';
    const card = topOf(state.foundations[i]);
    if (card) el.appendChild(cardEl(card));
  }

  document.querySelectorAll('.cell').forEach(cell => {
    const pile = cell.querySelector('[data-owner]');
    if (pile && pile.dataset.zone !== 'tcol') {
      cell.classList.toggle('active-turn', Number(pile.dataset.owner) === state.current && !state.winner);
    }
  });

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
