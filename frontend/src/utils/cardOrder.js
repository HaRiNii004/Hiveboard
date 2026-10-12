// Same order the backend uses for a list's cards: high-priority cards first
// (most recently flagged on top), then the rest by their normal position.
// Used to re-sort locally after flagging, creating or editing a card.
export const sortCardsForDisplay = (cards) => {
  return [...cards].sort((a, b) => {
    if (a.highPriority !== b.highPriority) {
      return a.highPriority ? -1 : 1;
    }
    if (a.highPriority && a.flaggedAt !== b.flaggedAt) {
      return new Date(b.flaggedAt) - new Date(a.flaggedAt);
    }
    return a.position - b.position;
  });
};

// Drag-and-drop within one list. High-priority cards stay pinned at the top (their
// order comes from when they were flagged), so only the other cards move. Returns the
// list's cards in their new order with positions renumbered 0..n-1 (exactly what the
// backend stores for a reorder), or null if either card isn't a movable card here.
export const moveCardInList = (cards, activeId, overId) => {
  const pinned = cards.filter(card => card.highPriority);
  const movable = cards.filter(card => !card.highPriority);
  const from = movable.findIndex(card => card.id === activeId);
  const to = movable.findIndex(card => card.id === overId);
  if (from === -1 || to === -1) return null;

  const next = [...movable];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return [...pinned, ...next].map((card, index) => ({ ...card, position: index }));
};

export const findListOfCard = (lists, cardId) =>
  lists.find(list => list.cards.some(card => card.id === cardId)) || null;

// Drag-and-drop between lists: takes the card out of its list and puts it into
// `toListId` just before `beforeCardId` (or at the end of the movable cards when null).
// High-priority cards stay pinned at the top of the target. Positions in the target
// list are renumbered 0..n-1, the same way the backend stores them.
export const moveCardBetweenLists = (lists, cardId, toListId, beforeCardId = null) => {
  const fromList = findListOfCard(lists, cardId);
  if (!fromList) return lists;
  const card = fromList.cards.find(c => c.id === cardId);

  return lists.map(list => {
    if (list.id === fromList.id && list.id !== toListId) {
      return { ...list, cards: list.cards.filter(c => c.id !== cardId) };
    }
    if (list.id !== toListId) return list;

    const others = list.cards.filter(c => c.id !== cardId);
    const pinned = others.filter(c => c.highPriority);
    const movable = others.filter(c => !c.highPriority);
    const index = beforeCardId ? movable.findIndex(c => c.id === beforeCardId) : -1;
    movable.splice(index === -1 ? movable.length : index, 0, card);
    return { ...list, cards: [...pinned, ...movable].map((c, i) => ({ ...c, position: i })) };
  });
};
