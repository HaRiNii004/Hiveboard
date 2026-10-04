import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import LabelChip from './LabelChip';
import { LABEL_COLORS, pickNewLabelColor } from './labelColors';
import './LabelSelect.css';

const NAME_MAX = 50; // matches @Size(max = 50) on the backend

const errorMessage = (err) => {
  const data = err && err.response && err.response.data;
  const status = err && err.response && err.response.status;
  if (status === 401 || status === 403) {
    return 'Your session has expired. Please log in again.';
  }
  if (data && typeof data === 'object' && Object.keys(data).length > 0) {
    return data.error || Object.values(data)[0];
  }
  return 'Something went wrong. Please try again.';
};

// Notion-style multi-select for a card's labels.
//
// Options belong to the board, so creating / renaming / recolouring / deleting an
// option is saved straight away through the callbacks below (each returns a promise).
// Which options are selected is plain form state owned by the parent.
//
// Props:
//   title, onRenameTitle(title)            name of the field ("Labels", "Tags", ...)
//   options: [{ id, name, color }]         all options on the board
//   selectedIds, onChange(updater)         updater: (prevIds) => nextIds
//   onCreateOption(name, color) -> option
//   onUpdateOption(id, { name, color }) -> option
//   onDeleteOption(id)
//   disabled
export default function LabelSelect({
  title,
  onRenameTitle,
  options,
  selectedIds,
  onChange,
  onCreateOption,
  onUpdateOption,
  onDeleteOption,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingId, setEditingId] = useState(null); // option whose ⋯ menu is open
  const [editName, setEditName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [error, setError] = useState('');

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  // Board-level saves run one after another so e.g. a rename followed by a
  // colour change can't arrive at the server out of order
  const queueRef = useRef(Promise.resolve());

  // Close the panel when clicking anywhere outside the component
  useEffect(() => {
    if (!open) return undefined;
    const handleMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setEditingId(null);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  const run = (task) => {
    setError('');
    const next = queueRef.current.then(task).catch(err => {
      console.error(err);
      setError(errorMessage(err));
    });
    queueRef.current = next;
    return next;
  };

  const selected = selectedIds
    .map(id => options.find(option => option.id === id))
    .filter(Boolean);
  const isSelected = (id) => selectedIds.includes(id);

  const trimmedQuery = query.trim();
  const filtered = options.filter(option =>
    option.name.toLowerCase().includes(trimmedQuery.toLowerCase())
  );
  const exactMatch = options.find(option => option.name.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = trimmedQuery.length > 0 && !exactMatch;
  const newColor = pickNewLabelColor(options);

  const items = [
    ...filtered.map(option => ({ type: 'option', option })),
    ...(canCreate ? [{ type: 'create' }] : [])
  ];
  const active = Math.min(activeIndex, items.length - 1);

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const closePanel = () => {
    setOpen(false);
    setEditingId(null);
    setQuery('');
  };

  // --- Selecting ---
  const toggle = (id) => {
    onChange(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
    setQuery('');
    setActiveIndex(0);
  };

  const remove = (id) => {
    onChange(prev => prev.filter(x => x !== id));
  };

  const create = () => {
    const name = trimmedQuery;
    if (!name) return;
    setQuery('');
    setActiveIndex(0);
    run(async () => {
      const created = await onCreateOption(name, newColor);
      onChange(prev => [...prev, created.id]);
    });
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActiveIndex(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault(); // don't submit the surrounding form
      if (!open) {
        setOpen(true);
        return;
      }
      const item = items[active];
      if (!item) return;
      if (item.type === 'option') toggle(item.option.id);
      else create();
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation(); // close the panel, not the whole popup
      closePanel();
    } else if (e.key === 'Backspace' && query === '' && selected.length > 0) {
      remove(selected[selected.length - 1].id);
    }
  };

  // --- Editing an option (⋯ menu) ---
  const openMenu = (option) => {
    setEditingId(option.id);
    setEditName(option.name);
    setConfirmDelete(false);
  };

  const saveName = (option) => {
    const name = editName.trim();
    if (!name || name === option.name) {
      setEditName(option.name);
      return;
    }
    run(() => onUpdateOption(option.id, { name, color: option.color }));
  };

  const setColor = (option, color) => {
    const name = editName.trim() || option.name;
    run(() => onUpdateOption(option.id, { name, color }));
  };

  const deleteOption = (option) => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setEditingId(null);
    run(async () => {
      await onDeleteOption(option.id);
      onChange(prev => prev.filter(x => x !== option.id));
    });
  };

  const handleNameKeyDown = (e, option) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveName(option);
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditName(option.name);
      setEditingId(null);
    }
  };

  // --- Renaming the field itself ---
  const startTitleEdit = () => {
    setTitleDraft(title);
    setEditingTitle(true);
  };

  const saveTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === title) return;
    run(() => onRenameTitle(next));
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveTitle();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setEditingTitle(false);
    }
  };

  return (
    <div className="label-select" ref={containerRef}>
      {/* Field name, renamable */}
      <div className="label-select-header">
        {editingTitle ? (
          <input
            className="label-select-title-input"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKeyDown}
            maxLength={NAME_MAX}
            aria-label="Field name"
            autoFocus
          />
        ) : (
          <>
            <span className="label-select-title">{title}</span>
            <button
              type="button"
              className="label-select-icon-btn"
              onClick={startTitleEdit}
              disabled={disabled}
              aria-label={`Rename ${title} field`}
              title="Rename field"
            >
              <Pencil size={12} />
            </button>
          </>
        )}
        <span className="label-select-optional">(optional)</span>
      </div>

      {/* Selected chips + search / create input */}
      <div
        className={`label-select-control ${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={openPanel}
      >
        {selected.map(option => (
          <LabelChip key={option.id} label={option} onRemove={disabled ? undefined : () => remove(option.id)} />
        ))}
        <input
          ref={inputRef}
          className="label-select-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder={selected.length === 0 ? 'Select or create an option' : ''}
          maxLength={NAME_MAX}
          disabled={disabled}
          role="combobox"
          aria-expanded={open}
          aria-label={`${title}: search or create an option`}
        />
      </div>

      {/* Options panel */}
      {open && !disabled && (
        <div className="label-select-panel" role="listbox" aria-multiselectable="true">
          <p className="label-select-hint">
            {options.length === 0 && !canCreate
              ? 'Type a name to create your first option'
              : 'Select an option or create one'}
          </p>

          {items.map((item, index) => {
            if (item.type === 'create') {
              return (
                <button
                  key="__create"
                  type="button"
                  className={`label-select-row label-select-create ${index === active ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={create}
                >
                  <span className="label-select-create-text">Create</span>
                  <LabelChip label={{ name: trimmedQuery, color: newColor }} />
                </button>
              );
            }

            const { option } = item;
            return (
              <Fragment key={option.id}>
                <div
                  className={`label-select-row ${index === active ? 'active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <button
                    type="button"
                    className="label-select-option"
                    role="option"
                    aria-selected={isSelected(option.id)}
                    onClick={() => toggle(option.id)}
                  >
                    <LabelChip label={option} />
                    {isSelected(option.id) && <Check size={14} className="label-select-check" />}
                  </button>
                  <button
                    type="button"
                    className="label-select-icon-btn"
                    onClick={() => (editingId === option.id ? setEditingId(null) : openMenu(option))}
                    aria-label={`Edit option ${option.name}`}
                    aria-expanded={editingId === option.id}
                    title="Edit option"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {editingId === option.id && (
                  <div className="label-option-menu">
                    <input
                      className="label-option-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => saveName(option)}
                      onKeyDown={(e) => handleNameKeyDown(e, option)}
                      maxLength={NAME_MAX}
                      aria-label="Option name"
                      autoFocus
                    />
                    <button
                      type="button"
                      className={`label-option-delete ${confirmDelete ? 'confirm' : ''}`}
                      onClick={() => deleteOption(option)}
                    >
                      <Trash2 size={14} />
                      {confirmDelete ? 'Click again to delete from every card' : 'Delete'}
                    </button>

                    <p className="label-option-colors-title">Colors</p>
                    <div className="label-option-colors">
                      {LABEL_COLORS.map(color => (
                        <button
                          key={color.key}
                          type="button"
                          className="label-option-color"
                          onClick={() => setColor(option, color.key)}
                          aria-pressed={option.color === color.key}
                        >
                          <span className="label-option-swatch" style={{ backgroundColor: color.bg }} />
                          <span className="label-option-color-name">{color.name}</span>
                          {option.color === color.key && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </Fragment>
            );
          })}
        </div>
      )}

      {error && <p className="label-select-error">{error}</p>}
    </div>
  );
}
