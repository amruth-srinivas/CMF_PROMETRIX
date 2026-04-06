import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Plus, Trash } from 'lucide-react';
import './NotesTable.css';

const NotesTable = ({ notes, onDeleteNote, onUpdateNote, onDeleteAllNotes, onAddNote, notesLoading }) => {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Function to split note text into individual items based on bullet points
  const splitNoteText = (text) => {
    if (!text) return [];

    // Remove the initial "NOTE:" if present, case-insensitive
    let cleanedText = text.replace(/^NOTE:\s*/i, '').trim();

    // Check if there's a main heading like "A. BEARING AREA:" and separate it
    let heading = '';
    const headingMatch = cleanedText.match(/^([A-Z]\.\s*[^\n:]+:\s*)/);
    if (headingMatch) {
      heading = headingMatch[1].trim();
      cleanedText = cleanedText.substring(headingMatch[0].length).trim();
    }

    // Split by numbered patterns (e.g., "1.", "2.", "3.", etc.)
    let items = cleanedText.split(/\n\s*\d+\.\s*/)
                           .filter(item => item.trim().length > 0)
                           .map(item => item.trim());

    // If a heading was found, prepend it to the first item or make it a separate item
    if (heading) {
      if (items.length > 0) {
        items[0] = heading + ' ' + items[0];
      } else {
        items.push(heading);
      }
    }

    // Fallback for cases where numbered list is not found but newlines exist
    if (items.length === 1 && cleanedText.includes('\n')) {
      items = cleanedText.split(/\n/)
                         .filter(item => item.trim().length > 0)
                         .map(item => item.trim());
    }

    return items;
  };

  // Flatten all notes into individual numbered items
  const getFlattenedNotes = () => {
    const flattened = [];
    
    notes.forEach((note, noteIndex) => {
      const items = splitNoteText(note.note_text);
      
      items.forEach((item, itemIndex) => {
        flattened.push({
          ...note,
          originalNoteId: note.id,
          itemText: item,
          itemIndex: itemIndex,
          totalItems: items.length,
          noteIndex: noteIndex
        });
      });
    });
    
    return flattened;
  };

  const handleEdit = (e, note, index) => {
    e.stopPropagation();
    setEditingNoteId(note.originalNoteId);
    setEditValue(note.note_text || '');
  };

  const handleSave = async (e, noteId) => {
    e.stopPropagation();
    if (onUpdateNote) {
      await onUpdateNote(noteId, editValue);
    }
    setEditingNoteId(null);
    setEditValue('');
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    setEditingNoteId(null);
    setEditValue('');
  };

  const handleDelete = async (e, noteId, index) => {
    e.stopPropagation(); // Prevent row selection when clicking delete
    if (window.confirm(`Are you sure you want to delete note ${index + 1}?`)) {
      if (onDeleteNote) {
        await onDeleteNote(noteId);
      }
    }
  };

  const handleDeleteAll = async (e) => {
    e.stopPropagation();
    const count = notes?.length ?? 0;
    if (count === 0) return;
    if (window.confirm(`Are you sure you want to delete all ${count} note(s)? This cannot be undone.`)) {
      if (onDeleteAllNotes) await onDeleteAllNotes();
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault?.();
    const text = (newNoteText || '').trim();
    if (!text) return;
    if (onAddNote) {
      setAddingNote(true);
      try {
        await onAddNote(text);
        setNewNoteText('');
      } finally {
        setAddingNote(false);
      }
    }
  };

  const flattenedNotes = getFlattenedNotes();
  const hasNotes = notes && notes.length > 0;

  return (
    <div className="notes-table-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
      <div className="notes-toolbar">
        <form className="notes-add-form" onSubmit={handleAddNote}>
          <input
            type="text"
            className="notes-add-input"
            placeholder="Add custom note..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            disabled={notesLoading || addingNote}
          />
          <button
            type="submit"
            className="notes-add-button"
            disabled={!newNoteText.trim() || notesLoading || addingNote}
            title="Add note"
          >
            <Plus size={16} />
            Add
          </button>
        </form>
        {hasNotes && (
          <button
            type="button"
            className="notes-delete-all-button"
            onClick={handleDeleteAll}
            disabled={notesLoading}
            title="Delete all notes"
          >
            <Trash size={16} />
            Delete all
          </button>
        )}
      </div>
      <div className="notes-table-wrapper" style={{ flex: 1, overflow: 'auto' }}>
        <table className="notes-table">
          <thead>
            <tr>
              <th>Note</th>
              <th style={{ width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flattenedNotes && flattenedNotes.length > 0 ? (
              flattenedNotes.map((note, index) => (
                <tr
                  key={`${note.originalNoteId}-${note.itemIndex}`}
                >
                  <td style={{ textAlign: 'left' }}>
                    {editingNoteId === note.originalNoteId ? (
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="note-edit-textarea"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSave(e, note.originalNoteId);
                          }
                          if (e.key === 'Escape') {
                            handleCancel(e);
                          }
                        }}
                        autoFocus
                      />
                    ) : (
                      <div className="note-value-cell">{note.itemText || '-'}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingNoteId === note.originalNoteId ? (
                      <div className="edit-actions">
                        <button
                          onClick={(e) => handleSave(e, note.originalNoteId)}
                          className="save-note-button"
                          title="Save"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={handleCancel}
                          className="cancel-note-button"
                          title="Cancel"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="note-actions">
                        <button
                          onClick={(e) => handleEdit(e, note, index)}
                          className="edit-note-button"
                          title="Edit note"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, note.originalNoteId, index)}
                          className="delete-note-button"
                          title="Delete note"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No notes yet. Add a custom note above or draw on PDF in Notes mode to add notes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NotesTable;

