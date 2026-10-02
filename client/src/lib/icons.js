// Jeu d'icônes 24×24 au trait (stroke = currentColor). Les pictos d'exercices
// reprennent ceux des maquettes ; ils sont aussi proposés pour les séances types.

const p = (d) => `<path d="${d}"/>`
const c = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}"/>`

export const EXERCISE_ICONS = {
  squat: { label: 'Squat', svg: c(12, 4.5, 2) + p('M3 9h18M4.5 7v4M19.5 7v4M12 9v5M12 14l-5 1.5 1 5.5M12 14l5 1.5-1 5.5') },
  bench: { label: 'Développé', svg: p('M3 7h18M5 4.5v5M19 4.5v5M9 7v5.5M15 7v5.5M7 16.5h10M12 16.5v4M9 20.5h6') + c(12, 12.5, 2) },
  pull: { label: 'Tirage', svg: p('M4 3.5h16M8 3.5l2 5.5h4l2-5.5M12 9v6l-1.5 5.5M12 15l1.5 5.5') + c(12, 6, 1.6) },
  deadlift: { label: 'Soulevé', svg: c(12, 4.5, 2) + p('M12 7v7.5l-2.5 6.5M12 14.5l2.5 6.5M3 14.5h18M4.5 12v5M19.5 12v5M8.5 14.5V10l3.5-2 3.5 2v4.5') },
  'leg-press': { label: 'Presse', svg: c(5, 13, 1.8) + p('M6.5 15.5l4 3.5 2.5-5.5 4-3.5M15.2 7.8l3.8 4.4M4 21.5h8') },
  rdl: { label: 'Roumain', svg: c(7, 7, 1.8) + p('M8.5 9l6.5 2-1.5 5 .5 5M9 10v5') + c(9, 17, 2) },
  'leg-curl': { label: 'Leg curl', svg: c(4.5, 12.5, 1.8) + p('M6.5 14h10.5l2-5M3 17.5h14M5.5 17.5v3M14.5 17.5v3') + c(19.5, 7.5, 1.3) },
  calf: { label: 'Mollets', svg: c(12, 4, 2) + p('M12 6.5v12l3.5 2M13 21.5h8M6 17v-6M4 13l2-2 2 2') },
  overhead: { label: 'Épaules', svg: p('M3 4h18M4.5 2v4M19.5 2v4M7.5 4l2.5 5.5M16.5 4 14 9.5') + c(12, 9.5, 2) + p('M12 11.5v4.5l-2 5.5M12 16l2 5.5') },
  dips: { label: 'Dips', svg: c(12, 4.5, 2) + p('M3.5 11h5M15.5 11h5M6 11v10M18 11v10M8.5 11 12 8l3.5 3M12 8v7l-2 4.5M12 15l2 4.5') },
  row: { label: 'Rowing', svg: c(5.5, 7, 1.8) + p('M7 8.5l7.5 2.5M14.5 11l-1 4.5.8 5M14.5 11l3 4.5v5M10.5 10v5.5M6.5 15.5h8') },
  curl: { label: 'Biceps', svg: p('M7 21v-8.5a2.5 2.5 0 0 1 2.5-2.5h2.5l4-4.5M14 3.5l5.5 5.5M12.5 5l3-3M18 10.5l3-3') },
  abs: { label: 'Abdos', svg: c(5.5, 9, 1.8) + p('M7 10.5 11.5 15H20M11.5 15l-2.5 5M3 20.5h18M14 9.5l3 2') },
  dumbbell: { label: 'Haltère', svg: p('M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11') },
}

export const UI_ICONS = {
  bolt: p('M13 2 4 14h7l-1 8 9-12h-7z'),
  list: p('M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01'),
  clock: c(12, 12, 9) + p('M12 7v5l3 2'),
  trend: p('M3 17l6-6 4 4 8-8M15 7h6v6'),
  'chevron-right': p('M9 5l7 7-7 7'),
  'chevron-left': p('M15 5l-7 7 7 7'),
  'chevron-down': p('M5 9l7 7 7-7'),
  'chevron-up': p('M5 15l7-7 7 7'),
  plus: p('M12 5v14M5 12h14'),
  minus: p('M5 12h14'),
  check: p('M4 12.5l5 5L20 6.5'),
  x: p('M6 6l12 12M18 6 6 18'),
  trash: p('M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3'),
  pencil: p('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4'),
  'arrow-up': p('M12 19V5M6 11l6-6 6 6'),
  'arrow-down': p('M12 5v14M6 13l6 6 6-6'),
  trophy: p('M8 4h8v5a4 4 0 0 1-8 0zM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M10 17h4'),
  'cloud-off': p('M3 3l18 18M7.5 8.5A5 5 0 0 0 7 18h10M11 6.2A5.5 5.5 0 0 1 18 11a3.5 3.5 0 0 1 3 4.6'),
  grid: p('M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'),
  swap: p('M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7'),
  search: c(11, 11, 7) + p('M16.5 16.5 21 21'),
  copy: p('M8 8h12v12H8zM16 8V4H4v12h4'),
  bookmark: p('M6 3h12v18l-6-4-6 4z'),
}

export const FILLED_ICONS = {
  play: p('M7 4.5v15l13-7.5z'),
  dot: c(12, 12, 4),
}

export const iconNames = Object.keys(EXERCISE_ICONS)
