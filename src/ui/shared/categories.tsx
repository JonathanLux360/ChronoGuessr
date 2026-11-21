import type { ReactNode } from 'react';
import { CLUE_CATEGORIES } from '../../config';
import type { Category } from '../../game/types';

export { CLUE_CATEGORIES };

export const CATEGORY_LABELS: Record<Category, string> = {
  politics: 'Politics',
  society: 'Society',
  technology: 'Technology',
  arts_culture: 'Arts & Culture',
};

/** The key that reveals each category (1 to 4), in display order. */
export function categoryKey(category: Category): number {
  return CLUE_CATEGORIES.indexOf(category) + 1;
}

const ICON_PATHS: Record<Category, ReactNode> = {
  politics: <path d="M3 21h18M5 21V10M9.5 21V10M14.5 21V10M19 21V10M3 10l9-6 9 6z" />,
  society: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5M15 14.2c.7-.3 1.4-.4 2-.4 2.2 0 3.8 1.6 3.8 4.2" />
    </>
  ),
  technology: (
    <>
      <rect x="7" y="7" width="10" height="10" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  arts_culture: (
    <>
      <path d="M9 18V6l10-2v12" />
      <circle cx="6.5" cy="18" r="2.5" />
      <circle cx="16.5" cy="16" r="2.5" />
    </>
  ),
};

/** Decorative icon. The category name is always shown beside it, so it is hidden from screen readers. */
export function CategoryIcon({ category, size = 22 }: { category: Category; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[category]}
    </svg>
  );
}
