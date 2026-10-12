import { UserPlus, UserMinus, LogOut, Flag, MessageSquareReply, ClipboardCheck } from 'lucide-react';

// Icon + accent colour for each kind of notification
export const NOTIFICATION_META = {
  CARD_ASSIGNED: { icon: ClipboardCheck, tone: 'honey' },
  CARD_FLAGGED: { icon: Flag, tone: 'red' },
  COMMENT_REPLY: { icon: MessageSquareReply, tone: 'blue' },
  MEMBER_JOINED: { icon: UserPlus, tone: 'green' },
  MEMBER_LEFT: { icon: LogOut, tone: 'gray' },
  MEMBER_REMOVED: { icon: UserMinus, tone: 'red' }
};

export const metaFor = (type) => NOTIFICATION_META[type] || NOTIFICATION_META.CARD_ASSIGNED;

// Where clicking a notification goes. You can't open a board you were removed from.
export const linkFor = (notification) =>
  notification.boardId && notification.type !== 'MEMBER_REMOVED' ? `/boards/${notification.boardId}` : null;
