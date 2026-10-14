import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Sidebar from '../../components/Sidebar/Sidebar';
import Topbar from '../../components/Topbar/Topbar';
import CalendarCardChip from './CalendarCardChip';
import CalendarDayPanel from './CalendarDayPanel';
import { getCalendarCards } from '../../api/calendar';
import { getApiErrorMessage } from '../../utils/apiError';
import { useRealtime } from '../../components/Realtime/useRealtime';
import { currentUserEmail } from '../../utils/currentUser';
import { toISODate, parseISODate, monthGridDays, addMonths, monthTitle, longDayTitle, WEEKDAYS } from '../../utils/calendarDates';
import './CalendarPage.css';

const MAX_CHIPS = 3; // per day cell; the rest are behind "+N more"

// Resolves (never rejects) with the cards or an error message, tagged with the range it's for
const fetchCards = (from, to) =>
  getCalendarCards(from, to)
    .then(response => ({ range: `${from}/${to}`, cards: response.data, error: '' }))
    .catch(err => {
      console.error(err);
      return { range: `${from}/${to}`, cards: [], error: getApiErrorMessage(err, 'Could not load your calendar. Please try again.') };
    });

// Events that can change what's due when (CARDS_REORDERED / LISTS_REORDERED can't)
const affectsCalendar = (type) =>
  type.startsWith('CARD_') || type.startsWith('LIST_') || type.startsWith('BOARD_') || type.startsWith('MEMBER_');

// Calendar: the due dates of cards on every board I'm on, a month at a time
export default function CalendarPage() {
  const navigate = useNavigate();
  const [today] = useState(() => toISODate(new Date()));
  const [month, setMonth] = useState(() => {
    const date = parseISODate(today);
    return { year: date.getFullYear(), month: date.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(today);
  const [result, setResult] = useState(null);
  const [boardFilter, setBoardFilter] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);

  const days = monthGridDays(month.year, month.month);
  const from = days[0];
  const to = days[days.length - 1];
  const loading = !result || result.range !== `${from}/${to}`;

  const { subscribe, connectionCount } = useRealtime();

  // Load the visible weeks (again after a reconnect, in case changes were missed)
  useEffect(() => {
    let cancelled = false;
    fetchCards(from, to).then(res => {
      if (!cancelled) setResult(res);
    });
    return () => {
      cancelled = true;
    };
  }, [from, to, connectionCount]);

  // Live: when a card changes on any of my boards, reload (batched, so a burst is one request)
  useEffect(() => {
    let timer = null;
    const unsubscribe = subscribe('/user/queue/boards', event => {
      if (!affectsCalendar(event.type)) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        fetchCards(from, to).then(res => {
          if (!res.error) setResult(res);
        });
      }, 300);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [subscribe, from, to]);

  const allCards = loading ? [] : result.cards;
  const error = loading ? '' : result.error;

  // Boards with something due in view, for the filter
  const boards = [];
  allCards.forEach(card => {
    if (!boards.some(b => b.id === card.boardId)) boards.push({ id: card.boardId, name: card.boardName });
  });
  boards.sort((a, b) => a.name.localeCompare(b.name));

  const myEmail = currentUserEmail();
  const cards = allCards.filter(card =>
    (boardFilter === 'all' || card.boardId === boardFilter)
    && (!mineOnly || (card.assignee && card.assignee.email.toLowerCase() === myEmail)));

  const cardsByDay = new Map();
  cards.forEach(card => {
    if (!cardsByDay.has(card.dueDate)) cardsByDay.set(card.dueDate, []);
    cardsByDay.get(card.dueDate).push(card);
  });

  const goToMonth = (next) => {
    setMonth(next);
    // Keep the selected day inside the month being looked at
    const date = parseISODate(selectedDay);
    if (date.getFullYear() !== next.year || date.getMonth() !== next.month) {
      setSelectedDay(toISODate(new Date(next.year, next.month, 1)));
    }
  };

  const goToToday = () => {
    const date = parseISODate(today);
    setMonth({ year: date.getFullYear(), month: date.getMonth() });
    setSelectedDay(today);
  };

  const selectDay = (day) => {
    setSelectedDay(day);
    // Clicking a day of the previous/next month switches to that month
    const date = parseISODate(day);
    if (date.getFullYear() !== month.year || date.getMonth() !== month.month) {
      setMonth({ year: date.getFullYear(), month: date.getMonth() });
    }
  };

  // Opens the card's popup on its board
  const openCard = (card) => navigate(`/boards/${card.boardId}`, { state: { openCardId: card.id } });

  const retry = () => {
    setResult(null);
    fetchCards(from, to).then(setResult);
  };

  return (
    <div className="calendar-page">
      <Sidebar />
      <div className="calendar-main-content">
        <Topbar showSearch={false} />

        <main className="calendar-content">
          <header className="calendar-header">
            <div>
              <h1 className="calendar-title">Calendar</h1>
              <p className="calendar-subtitle">Due dates from the cards on all your boards.</p>
            </div>
            <div className="calendar-filters">
              <label className="calendar-mine">
                <input type="checkbox" checked={mineOnly} onChange={(e) => setMineOnly(e.target.checked)} />
                Assigned to me
              </label>
              <select
                className="calendar-board-filter"
                value={boardFilter}
                onChange={(e) => setBoardFilter(e.target.value)}
                aria-label="Show cards from"
              >
                <option value="all">All boards</option>
                {boards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}
                {boardFilter !== 'all' && !boards.some(b => b.id === boardFilter) && (
                  <option value={boardFilter}>(nothing due in view)</option>
                )}
              </select>
            </div>
          </header>

          <div className="calendar-toolbar">
            <div className="calendar-nav">
              <button type="button" className="calendar-nav-btn" onClick={() => goToMonth(addMonths(month, -1))} aria-label="Previous month">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="calendar-nav-btn" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Next month">
                <ChevronRight size={18} />
              </button>
              <h2 className="calendar-month" aria-live="polite">{monthTitle(month)}</h2>
            </div>
            <button type="button" className="calendar-today-btn" onClick={goToToday}>Today</button>
          </div>

          {error && (
            <div className="calendar-error" role="alert">
              <span>{error}</span>
              <button type="button" onClick={retry}>Retry</button>
            </div>
          )}

          <div className="calendar-layout">
            <div className={`calendar-grid-wrap ${loading ? 'loading' : ''}`} aria-busy={loading}>
              <div className="calendar-weekdays" aria-hidden="true">
                {WEEKDAYS.map(name => <div key={name} className="calendar-weekday">{name}</div>)}
              </div>
              <div className="calendar-grid" role="grid" aria-label={monthTitle(month)}>
                {days.map(day => {
                  const date = parseISODate(day);
                  const dayCards = cardsByDay.get(day) || [];
                  const classes = ['calendar-cell'];
                  if (date.getMonth() !== month.month) classes.push('outside');
                  if (day < today) classes.push('past');
                  if (day === today) classes.push('today');
                  if (day === selectedDay) classes.push('selected');
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      tabIndex={0}
                      className={classes.join(' ')}
                      aria-selected={day === selectedDay}
                      aria-label={`${longDayTitle(day)}, ${dayCards.length} due`}
                      onClick={() => selectDay(day)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          selectDay(day);
                        }
                      }}
                    >
                      <span className="calendar-date">{date.getDate()}</span>
                      <div className="calendar-chips">
                        {dayCards.slice(0, MAX_CHIPS).map(card => (
                          <CalendarCardChip key={card.id} card={card} onOpen={openCard} />
                        ))}
                        {dayCards.length > MAX_CHIPS && (
                          <span className="calendar-more">+{dayCards.length - MAX_CHIPS} more</span>
                        )}
                      </div>
                      {dayCards.length > 0 && <span className="calendar-dot-count" aria-hidden="true">{dayCards.length}</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            <CalendarDayPanel day={selectedDay} cards={cardsByDay.get(selectedDay) || []} onOpen={openCard} />
          </div>
        </main>
      </div>
    </div>
  );
}
