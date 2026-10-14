import { highlightParts } from '../../utils/boardSearch';
import './HighlightText.css';

// Shows `text` with the search words marked
export default function HighlightText({ text, words }) {
  return highlightParts(text, words).map((part, index) =>
    part.match
      ? <mark key={index} className="search-highlight">{part.text}</mark>
      : <span key={index}>{part.text}</span>
  );
}
