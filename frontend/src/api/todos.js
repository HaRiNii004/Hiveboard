import api from './axiosClient';

// "My Tasks": the logged-in user's own to-do list (nobody else can see it)

// boardId: only the tasks linked to that board
export const getTodos = (boardId = null) => {
  return api.get('/todos', { params: boardId ? { boardId } : {} });
};

// boardId: optionally link the new task to a board you're a member of
export const addTodo = (text, boardId = null) => {
  return api.post('/todos', { text, boardId });
};

// changes: { text }, { done }, { boardId } to link, or { unlinkBoard: true }
export const updateTodo = (id, changes) => {
  return api.patch(`/todos/${id}`, changes);
};

export const deleteTodo = (id) => {
  return api.delete(`/todos/${id}`);
};

export const clearCompletedTodos = () => {
  return api.delete('/todos/completed');
};

// Every one of your item ids, in the new order
export const reorderTodos = (orderedIds) => {
  return api.patch('/todos/reorder', { orderedIds });
};
