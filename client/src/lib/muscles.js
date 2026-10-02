// Groupes musculaires du catalogue (identiques à server/src/seed.js → MUSCLES)
export const MUSCLES = [
  { value: 'pecs', label: 'Pectoraux', icon: 'bench' },
  { value: 'dos', label: 'Dos', icon: 'pull' },
  { value: 'epaules', label: 'Épaules', icon: 'overhead' },
  { value: 'biceps', label: 'Biceps', icon: 'curl' },
  { value: 'triceps', label: 'Triceps', icon: 'dips' },
  { value: 'jambes', label: 'Jambes', icon: 'squat' },
  { value: 'mollets', label: 'Mollets', icon: 'calf' },
  { value: 'abdos', label: 'Abdos', icon: 'abs' },
  { value: 'autre', label: 'Autre', icon: 'dumbbell' },
]
export const muscleLabel = (v) => MUSCLES.find((m) => m.value === v)?.label ?? 'Autre'
export const muscleIcon = (v) => MUSCLES.find((m) => m.value === v)?.icon ?? 'dumbbell'

/** filtre insensible à la casse et aux accents */
export const normalize = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
