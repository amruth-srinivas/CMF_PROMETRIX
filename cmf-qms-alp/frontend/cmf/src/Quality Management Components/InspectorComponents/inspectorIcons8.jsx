import React from 'react';

/**
 * Icons8 PNG (ios-glyphs, 30px) — hex without #.
 * https://icons8.com/icons/set/ios-glyphs
 */
const base = (name, color = '64748b') =>
  `https://img.icons8.com/ios-glyphs/30/${color}/${name}.png`;

export const Icon8 = ({ name, color = '64748b', size = 22, style, title, className }) => (
  <img
    src={base(name, color)}
    width={size}
    height={size}
    alt={title || ''}
    title={title}
    className={className}
    style={{ display: 'block', flexShrink: 0, ...style }}
    loading="lazy"
    decoding="async"
  />
);

/** Sidebar — ios-glyphs (30px). Color = hex without #. */
export const icon8 = {
  select: (c) => base('cursor', c),
  pan: (c) => base('hand-left', c),
  stamp: (c) => base('ruler', c),
  notes: (c) => base('document', c),
  zoomIn: (c) => base('zoom-in', c),
  zoomOut: (c) => base('zoom-out', c),
  rotate: (c) => base('rotate', c),
  reset: (c) => base('expand', c),
  autoBalloon: (c) => base('brain', c),
  clear: (c) => base('trash', c),
  back: (c) => base('left', c),
  save: (c) => base('save', c),
  export: (c) => base('export', c),
  settings: (c) => base('settings', c),
  add: (c) => base('plus', c),
  filter: (c) => base('filter', c),
  characteristics: (c) => base('list', c),
};
