import { sortCardsForDisplay } from './cardOrder';

// The one place board events become state. Takes { board, members } and an event
// ({ type, payload }) and returns the new { board, members }.
//
// Every event describes "this is now the state of X", and applying it is idempotent:
// cards/lists/labels are upserted by id, so your own actions echoed back by the
// server, or an event that arrives twice, change nothing. A card update is ignored
// if we already hold a newer version of that card.

const withoutCard = (lists, cardId) =>
  lists.map(list => (list.cards.some(c => c.id === cardId)
    ? { ...list, cards: list.cards.filter(c => c.id !== cardId) }
    : list));

const findCard = (lists, cardId) => {
  for (const list of lists) {
    const card = list.cards.find(c => c.id === cardId);
    if (card) return card;
  }
  return null;
};

// Put `card` into `listId` (removing it from wherever it was), unless we already have a newer copy
const upsertCard = (board, listId, card) => {
  const existing = findCard(board.lists, card.id);
  if (existing && existing.version != null && card.version != null && existing.version > card.version) {
    return board;
  }
  const lists = withoutCard(board.lists, card.id).map(list =>
    list.id === listId ? { ...list, cards: sortCardsForDisplay([...list.cards, card]) } : list
  );
  return { ...board, lists };
};

const mapCards = (board, fn) => ({
  ...board,
  lists: board.lists.map(list => ({ ...list, cards: list.cards.map(fn) }))
});

const upsertById = (items, item, idKey = 'id') =>
  items.some(i => i[idKey] === item[idKey])
    ? items.map(i => (i[idKey] === item[idKey] ? item : i))
    : [...items, item];

export function applyBoardEvent(state, event) {
  const { board, members } = state;
  const p = event.payload || {};

  switch (event.type) {
    // ---- cards ----
    case 'CARD_CREATED':
    case 'CARD_UPDATED':
    case 'CARD_MOVED':
      return { members, board: upsertCard(board, p.listId, p.card) };

    case 'CARDS_REORDERED':
      return {
        members,
        board: {
          ...board,
          lists: board.lists.map(list =>
            list.id === p.list.id ? { ...list, cards: sortCardsForDisplay(p.list.cards) } : list)
        }
      };

    case 'CARD_DELETED':
      return { members, board: { ...board, lists: withoutCard(board.lists, p.cardId) } };

    case 'COMMENT_ADDED':
      return {
        members,
        board: mapCards(board, card => (card.id === p.cardId ? { ...card, commentCount: p.commentCount } : card))
      };

    // ---- lists ----
    case 'LIST_CREATED':
      return board.lists.some(l => l.id === p.list.id)
        ? state
        : { members, board: { ...board, lists: [...board.lists, p.list] } };

    case 'LIST_UPDATED':
      return {
        members,
        board: { ...board, lists: board.lists.map(l => (l.id === p.listId ? { ...l, name: p.name } : l)) }
      };

    case 'LISTS_REORDERED': {
      const order = new Map(p.orderedListIds.map((id, index) => [id, index]));
      const lists = [...board.lists].sort((a, b) => (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity));
      return { members, board: { ...board, lists } };
    }

    case 'LIST_DELETED':
      return { members, board: { ...board, lists: board.lists.filter(l => l.id !== p.listId) } };

    // ---- labels ----
    case 'LABEL_CREATED':
    case 'LABEL_UPDATED':
      return { members, board: { ...board, labels: upsertById(board.labels, p.label) } };

    case 'LABEL_DELETED':
      return {
        members,
        board: mapCards(
          { ...board, labels: board.labels.filter(l => l.id !== p.labelId) },
          card => ({ ...card, labels: card.labels.filter(l => l.id !== p.labelId) })
        )
      };

    // ---- board ----
    case 'BOARD_UPDATED':
      return {
        members,
        board: { ...board, name: p.name, description: p.description, labelsTitle: p.labelsTitle }
      };

    // ---- members ----
    case 'MEMBER_ADDED':
    case 'MEMBER_ROLE_CHANGED':
      return { board, members: upsertById(members, p.member, 'userId') };

    case 'MEMBER_REMOVED':
      // Their cards on this board were unassigned by the server; mirror it
      return {
        members: members.filter(m => m.userId !== p.userId),
        board: mapCards(board, card =>
          card.assignee && card.assignee.id === p.userId
            ? { ...card, assignee: null, assignedBy: null, assignedAt: null }
            : card)
      };

    default:
      return state;
  }
}
