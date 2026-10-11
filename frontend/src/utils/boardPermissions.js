// What the current user may do on a board, from their role (board.myRole).
// This only decides what the UI shows — the backend enforces the real rules.
//
//   VIEWER: read everything
//   MEMBER: + cards, lists, labels, comments
//   ADMIN:  + edit/delete the board, invite and manage members

export const ROLE_OPTIONS = [
  { value: 'ADMIN', label: 'Admin', description: 'Can edit the board and manage members' },
  { value: 'MEMBER', label: 'Member', description: 'Can edit lists, cards and comments' },
  { value: 'VIEWER', label: 'Viewer', description: 'Can only view' }
];

export const roleLabel = (role) => {
  const option = ROLE_OPTIONS.find(o => o.value === role);
  return option ? option.label : role;
};

export const getBoardPermissions = (role) => ({
  role,
  canEdit: role === 'ADMIN' || role === 'MEMBER',
  isAdmin: role === 'ADMIN'
});
