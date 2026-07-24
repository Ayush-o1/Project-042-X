import { memo, useState } from 'react';
import { hashAuthor } from '../../lib/authorColors';

const MAX_VISIBLE = 10;

export interface AuthorFilterStackProps {
  authors: string[];
  selectedAuthor: string;
  onSelectAuthor: (author: string) => void;
}

/** Replaces a plain author <select> with a row of clickable avatars —
 *  faster to scan, and visually consistent with the avatars already shown
 *  on every commit row. Click an avatar to filter to that author, click it
 *  again (or the selected one) to clear. */
export const AuthorFilterStack = memo(({ authors, selectedAuthor, onSelectAuthor }: AuthorFilterStackProps) => {
  const [showAll, setShowAll] = useState(false);
  if (authors.length === 0) return null;

  const visible = showAll ? authors : authors.slice(0, MAX_VISIBLE);
  const overflow = authors.length - visible.length;

  return (
    <div role="group" aria-label="Filter by author" style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {visible.map(author => {
        const isSelected = author === selectedAuthor;
        const isDimmed = Boolean(selectedAuthor) && !isSelected;
        return (
          <button
            key={author}
            type="button"
            className="avatar avatar-md timeline-author-avatar"
            style={{
              background: hashAuthor(author),
              opacity: isDimmed ? 0.35 : 1,
              outline: isSelected ? '2px solid var(--accent)' : 'none',
              outlineOffset: 2,
            }}
            title={author}
            aria-pressed={isSelected}
            aria-label={`Filter by ${author}`}
            onClick={() => onSelectAuthor(isSelected ? '' : author)}
          >
            {author.charAt(0).toUpperCase()}
          </button>
        );
      })}
      {overflow > 0 && !showAll && (
        <button
          type="button"
          className="btn-icon btn-icon-md"
          style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}
          onClick={() => setShowAll(true)}
          aria-label={`Show ${overflow} more authors`}
        >
          +{overflow}
        </button>
      )}
    </div>
  );
});

AuthorFilterStack.displayName = 'AuthorFilterStack';
