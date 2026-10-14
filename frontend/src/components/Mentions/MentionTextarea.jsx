import { useRef, useState } from 'react';
import { initials } from '../../utils/initials';
import './MentionTextarea.css';

const MAX_SUGGESTIONS = 6;

// The "@query" being typed just before the caret, or null. An @ only starts a mention at
// the start of the text or after a space/newline; names may contain spaces.
const findMention = (text, caret) => {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at === -1 || (at > 0 && !/\s/.test(before[at - 1]))) return null;
  const query = before.slice(at + 1);
  if (query.includes('\n') || query.length > 40 || query.split(' ').length > 4) return null;
  return { start: at, query };
};

const matching = (members, query) => {
  const q = query.trim().toLowerCase();
  return members
    .filter(m => !q || m.fullName.toLowerCase().includes(q))
    // names starting with what's typed first
    .sort((a, b) => Number(!a.fullName.toLowerCase().startsWith(q)) - Number(!b.fullName.toLowerCase().startsWith(q)))
    .slice(0, MAX_SUGGESTIONS);
};

// A textarea where typing @ suggests people (↑/↓ to choose, Enter/Tab to insert, Esc to
// close). Inserts "@Full Name ". Other props go to the textarea.
//   members   [{ userId, fullName }] who can be mentioned
export default function MentionTextarea({ value, onChange, members, onKeyDown, className = '', ...rest }) {
  const ref = useRef(null);
  const [mention, setMention] = useState(null); // { start, query } while suggesting
  const [highlight, setHighlight] = useState(0);

  const suggestions = mention ? matching(members, mention.query) : [];
  const showing = suggestions.length > 0;

  const update = (text, caret) => {
    const found = findMention(text, caret);
    setMention(found);
    if (!found || !mention || found.start !== mention.start) setHighlight(0);
  };

  const insert = (member) => {
    const caret = ref.current ? ref.current.selectionStart : value.length;
    const before = value.slice(0, mention.start);
    const after = value.slice(caret);
    const inserted = `@${member.fullName} `;
    onChange(before + inserted + after);
    setMention(null);
    const position = before.length + inserted.length;
    requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        ref.current.setSelectionRange(position, position);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (showing) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const step = e.key === 'ArrowDown' ? 1 : -1;
        setHighlight(h => (h + step + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insert(suggestions[Math.min(highlight, suggestions.length - 1)]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation(); // close the list, not the popup
        setMention(null);
        return;
      }
    }
    if (onKeyDown) onKeyDown(e);
  };

  return (
    <div className="mention-input">
      <textarea
        {...rest}
        ref={ref}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          update(e.target.value, e.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={(e) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) update(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => update(e.target.value, e.target.selectionStart)}
        onBlur={() => setTimeout(() => setMention(null), 150)}
        aria-autocomplete="list"
        aria-expanded={showing}
      />
      {showing && (
        <ul className="mention-suggestions" role="listbox" aria-label="People to mention">
          {suggestions.map((member, index) => (
            <li key={member.userId} role="option" aria-selected={index === highlight}>
              <button
                type="button"
                className={`mention-suggestion ${index === highlight ? 'active' : ''}`}
                onMouseDown={(e) => e.preventDefault()} // keep the textarea focused
                onClick={() => insert(member)}
                onMouseEnter={() => setHighlight(index)}
              >
                <span className="mention-avatar" aria-hidden="true">{initials(member.fullName)}</span>
                <span className="mention-name">{member.fullName}</span>
                {member.email && <span className="mention-email">{member.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

