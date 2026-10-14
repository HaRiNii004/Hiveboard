import { useCallback } from 'react';
import { History } from 'lucide-react';
import ActivityFeed from '../../components/Activity/ActivityFeed';
import { getCardActivity } from '../../api/activity';
import './CardActivitySection.css';

// The card popup's side column: this card's history (edits, moves, comments), newest
// first, updating live while the popup is open.
export default function CardActivitySection({ cardId, subscribeActivity }) {
  const load = useCallback(
    (before) => getCardActivity(cardId, before).then(response => response.data),
    [cardId]
  );
  const accept = useCallback((entry) => entry.cardId === cardId, [cardId]);

  return (
    <section className="card-activity" aria-labelledby="card-activity-title">
      <h3 id="card-activity-title" className="card-activity-title">
        <History size={16} />
        Activity
      </h3>
      <ActivityFeed
        load={load}
        subscribe={subscribeActivity}
        accept={accept}
        cardView
        emptyText="Nothing recorded for this card yet. Edits, moves and comments will show up here."
      />
    </section>
  );
}
