import { UserPlus, UserMinus, LogOut, Flag, MessageSquareReply, ClipboardCheck, AtSign } from 'lucide-react';

// Icon + accent colour for each kind of notification
export const NOTIFICATION_META = {
  CARD_ASSIGNED: { icon: ClipboardCheck, tone: 'honey' },
  CARD_FLAGGED: { icon: Flag, tone: 'red' },
  COMMENT_REPLY: { icon: MessageSquareReply, tone: 'blue' },
  COMMENT_MENTION: { icon: AtSign, tone: 'blue' },
  MEMBER_JOINED: { icon: UserPlus, tone: 'green' },
  MEMBER_LEFT: { icon: LogOut, tone: 'gray' },
  MEMBER_REMOVED: { icon: UserMinus, tone: 'red' }
};

export const metaFor = (type) => NOTIFICATION_META[type] || NOTIFICATION_META.CARD_ASSIGNED;

// Where clicking a notification goes: { path, state } or null. You can't open a board you
// were removed from. Card notifications open the card (comments ones open its comments).
export const linkFor = (notification) => {
  if (!notification.boardId || notification.type === 'MEMBER_REMOVED') return null;
  const state = notification.cardId
    ? { openCardId: notification.cardId, openComments: notification.type.startsWith('COMMENT_') }
    : undefined;
  return { path: `/boards/${notification.boardId}`, state };
};
