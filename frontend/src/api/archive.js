import api from './axiosClient';

// A board's archive: { cards: [{ card, listId, listName, listArchived, archivedAt, archivedByName }],
//                      lists: [{ id, name, cardCount, archivedAt, archivedByName }] }
export const getArchive = (boardId) => {
  return api.get(`/boards/${boardId}/archive`);
};
