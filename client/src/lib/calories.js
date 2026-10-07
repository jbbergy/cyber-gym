/**
 * Estimation des calories dépensées en musculation.
 *
 *   kcal = métabolisme de base par minute × Σ (MET × minutes)
 *
 * - Métabolisme de base (BMR) : Mifflin-St Jeor, à partir du poids, de la taille, de l'âge et du sexe.
 *   On l'utilise à la place du « 1 kcal/kg/h » de la formule MET classique, ce qui adapte
 *   l'estimation à la morphologie (à poids égal, une personne plus âgée ou plus petite dépense moins).
 * - MET (Compendium des activités physiques) : ~6 pendant l'effort d'une série lourde,
 *   ~2,5 pendant la récupération debout entre deux séries (fréquence cardiaque encore élevée).
 * - Chaque série compte son temps d'effort (répétitions × tempo moyen) et le repos pris
 *   juste avant elle : la somme des séries couvre ainsi toute la séance.
 *
 * C'est une estimation (±20–30 %) : la charge soulevée n'intervient pas directement,
 * seule la durée d'effort et de récupération compte.
 */
export const MET_EFFORT = 6
export const MET_REST = 2.5
/** durée moyenne d'une répétition (≈ 2 s de descente, 2 s de montée) */
export const SECONDS_PER_REP = 4
/** au-delà, une pause n'est plus de la récupération entre séries */
export const MAX_REST_SECONDS = 300

/** Profil complet ? (poids, taille et année de naissance obligatoires ; sexe facultatif) */
export const hasBodyProfile = (user) => Boolean(user?.weightKg && user?.heightCm && user?.birthYear)

export const ageOf = (user, at = new Date()) => (user?.birthYear ? new Date(at).getFullYear() - user.birthYear : null)

/**
 * Mifflin-St Jeor (kcal / jour) :
 * 10 × poids + 6,25 × taille − 5 × âge + 5 (homme) ou − 161 (femme).
 * Sexe non précisé : moyenne des deux constantes (− 78).
 */
export function basalMetabolicRate(user, at) {
  if (!hasBodyProfile(user)) return null
  const constant = user.sex === 'm' ? 5 : user.sex === 'f' ? -161 : -78
  return 10 * user.weightKg + 6.25 * user.heightCm - 5 * ageOf(user, at) + constant
}

/** repos pris avant une série : écart avec la série validée juste avant sur le même exercice */
export function restBefore(set, sets) {
  if (!set?.doneAt) return null
  const at = new Date(set.doneAt)
  const before = sets
    .filter((s) => s.doneAt && s.id !== set.id && new Date(s.doneAt) < at)
    .map((s) => new Date(s.doneAt))
    .sort((a, b) => b - a)[0]
  return before ? Math.round((at - before) / 1000) : null
}

/**
 * Calories d'une série. `restSeconds` : repos réellement pris avant elle
 * (null pour la première série de l'exercice, sans repos compté).
 */
export function setCalories(user, { reps, doneAt }, restSeconds) {
  const bmr = basalMetabolicRate(user, doneAt ?? undefined)
  if (bmr === null || !reps) return null
  const effortMin = (reps * SECONDS_PER_REP) / 60
  const restMin = Math.min(Math.max(restSeconds ?? 0, 0), MAX_REST_SECONDS) / 60
  return (bmr / 1440) * (MET_EFFORT * effortMin + MET_REST * restMin)
}

/** Calories des séries validées d'un exercice de séance ({ sets }) */
export function exerciseCalories(user, exercise) {
  if (!hasBodyProfile(user)) return null
  const sets = exercise?.sets ?? []
  return sets.filter((s) => s.doneAt).reduce((sum, s) => sum + (setCalories(user, s, restBefore(s, sets)) ?? 0), 0)
}

export function sessionCalories(user, session) {
  if (!hasBodyProfile(user)) return null
  return (session?.exercises ?? []).reduce((sum, e) => sum + exerciseCalories(user, e), 0)
}
