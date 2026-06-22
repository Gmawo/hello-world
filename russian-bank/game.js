'use strict';

const SUITS = ['S', 'H', 'C', 'D'];
const SUIT_SYMBOL = { S: '♠', H: '♥', C: '♣', D: '♦' };
const RED_SUITS = new Set(['H', 'D']);
const RANK_LABEL = { 1: 'A', 11: 'J', 12: 'Q', 13: 'K' };
const FOUNDATION_COUNT = 8; // 2 decks x 4 suits => up to 2 concurrent runs per suit

function rankLabel(r) { return RANK_LABEL[r] || String(r); }
function isRed(suit) { return RED_SUITS.has(suit); }
function other(owner) { return owner === 1 ? 2 : 1; }

// ---------- Card face style ----------
// "classic" draws a pip layout (or face badge) in the middle of the card,
// in addition to the corner indices everyone gets. "simple" just keeps the
// corner indices. More styles can be registered here later — cardEl() only
// needs a case added to buildCenter() and a `style-<name>` CSS hook.
const CARD_STYLES = ['classic', 'simple'];
let cardStyle = CARD_STYLES.includes(localStorage.getItem('cardStyle'))
  ? localStorage.getItem('cardStyle')
  : 'classic';

// [x%, y%, flip] — flip rotates the pip 180deg, used for the bottom half so
// it reads right-side-up when the card itself is read from either end.
const PIP_LAYOUT = {
  2: [[50, 22, 0], [50, 78, 1]],
  3: [[50, 18, 0], [50, 50, 0], [50, 82, 1]],
  4: [[25, 22, 0], [75, 22, 0], [25, 78, 1], [75, 78, 1]],
  5: [[25, 22, 0], [75, 22, 0], [50, 50, 0], [25, 78, 1], [75, 78, 1]],
  6: [[25, 20, 0], [75, 20, 0], [25, 50, 0], [75, 50, 0], [25, 80, 1], [75, 80, 1]],
  7: [[25, 18, 0], [75, 18, 0], [50, 34, 0], [25, 50, 0], [75, 50, 0], [25, 82, 1], [75, 82, 1]],
  8: [[25, 15, 0], [75, 15, 0], [50, 30, 0], [25, 50, 0], [75, 50, 0], [50, 70, 1], [25, 85, 1], [75, 85, 1]],
  9: [[25, 13, 0], [75, 13, 0], [25, 37, 0], [75, 37, 0], [50, 50, 0], [25, 63, 1], [75, 63, 1], [25, 87, 1], [75, 87, 1]],
  10: [[25, 12, 0], [75, 12, 0], [50, 25, 0], [25, 37, 0], [75, 37, 0], [25, 63, 1], [75, 63, 1], [50, 75, 1], [25, 88, 1], [75, 88, 1]],
};

function buildCenter(card) {
  const wrap = document.createElement('div');
  wrap.className = 'center';
  const symbol = SUIT_SYMBOL[card.suit];

  if (card.rank === 1) {
    const pip = document.createElement('span');
    pip.className = 'pip pip-ace';
    pip.style.left = '50%';
    pip.style.top = '50%';
    pip.style.transform = 'translate(-50%, -50%)';
    pip.textContent = symbol;
    wrap.appendChild(pip);
  } else if (card.rank >= 11) {
    const badge = document.createElement('div');
    badge.className = 'face-badge';
    badge.innerHTML = `<span class="face-letter">${rankLabel(card.rank)}</span><span class="face-suit">${symbol}</span>`;
    wrap.appendChild(badge);
  } else {
    for (const [x, y, flip] of PIP_LAYOUT[card.rank] || []) {
      const pip = document.createElement('span');
      pip.className = 'pip';
      pip.style.left = `${x}%`;
      pip.style.top = `${y}%`;
      pip.style.transform = `translate(-50%, -50%)${flip ? ' rotate(180deg)' : ''}`;
      pip.textContent = symbol;
      wrap.appendChild(pip);
    }
  }
  return wrap;
}

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
  div.className = 'card style-' + cardStyle + ' ' + (card.faceUp ? (isRed(card.suit) ? 'red' : 'black') : 'facedown');
  if (!card.faceUp && card.owner) div.classList.add(`back-p${card.owner}`);
  if (extraClass) div.className += ' ' + extraClass;
  if (card.faceUp) {
    div.innerHTML = `<div class="top">${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}</div><div class="bottom">${rankLabel(card.rank)}${SUIT_SYMBOL[card.suit]}</div>`;
    div.appendChild(buildCenter(card));
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
// They expand horizontally, away from the foundations in the middle of the board.
function renderHouse(el, owner, col) {
  el.innerHTML = '';
  const pile = state.players[owner].tableau[col];
  // P2's houses sit on the left edge of the board, so fanning away from the
  // center foundations means growing further left (anchor via "right" so the
  // offset pushes the card leftward). P1's houses sit on the right edge, so
  // fanning away from center means growing further right (anchor via "left").
  const away = owner === 2 ? 'right' : 'left';
  const toward = owner === 2 ? 'left' : 'right';
  pile.forEach((card, idx) => {
    const isTop = idx === pile.length - 1;
    const draggable = isTop && card.faceUp && isPlayable(owner, 'tcol');
    const div = cardEl(card, draggable ? 'draggable' : '');
    div.style[toward] = 'auto';
    div.style[away] = `${idx * 22}px`;
    div.style.zIndex = idx;
    el.appendChild(div);
    if (draggable) attachDragHandlers(div, { owner, type: 'tcol', col });
  });
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
      handEl.appendChild(cardEl({ faceUp: false, owner }));
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

const cardStyleSelect = document.getElementById('cardStyleSelect');
cardStyleSelect.value = cardStyle;
cardStyleSelect.addEventListener('change', () => {
  cardStyle = cardStyleSelect.value;
  localStorage.setItem('cardStyle', cardStyle);
  render();
});

document.getElementById('rulesBtn').addEventListener('click', () => {
  document.getElementById('rulesDialog').showModal();
});
document.getElementById('closeRules').addEventListener('click', () => {
  document.getElementById('rulesDialog').close();
});

render();
