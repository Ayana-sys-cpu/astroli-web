export const PLANET_STATE_THEME = {
  active: {
    core:       '#200a35',
    mid:        '#7b2fbe',
    highlight:  '#f0c0ff',
    glow:       'rgba(205,155,255,0.5)',
    rgb:        '205,155,255',
    dimOpacity: 1,
    saturate:   1,
  },
  completed: {
    core:       '#003a36',
    mid:        '#00a88a',
    highlight:  '#9ffff0',
    glow:       'none',
    rgb:        '0,212,176',
    dimOpacity: 0.55,
    saturate:   0.7,
  },
  locked: {
    core:       '#0c0c12',
    mid:        '#23232e',
    highlight:  '#4a4a5a',
    glow:       'none',
    rgb:        '80,80,100',
    dimOpacity: 0.5,
    saturate:   1,
  },
} as const;
