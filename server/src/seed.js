// Données initiales de chaque compte : catalogue d'exercices + programme Push / Pull / Legs des maquettes.

export const MUSCLES = ['pecs', 'dos', 'epaules', 'biceps', 'triceps', 'jambes', 'mollets', 'abdos', 'autre']

// [nom, icône, groupe musculaire]
export const EXERCISES = [
  ['Développé couché', 'bench', 'pecs'],
  ['Développé incliné haltères', 'bench', 'pecs'],
  ['Développé décliné', 'bench', 'pecs'],
  ['Écarté couché haltères', 'bench', 'pecs'],
  ['Pec deck', 'bench', 'pecs'],
  ['Pompes', 'bench', 'pecs'],
  ['Dips', 'dips', 'pecs'],
  ['Tractions', 'pull', 'dos'],
  ['Tirage vertical', 'pull', 'dos'],
  ['Rowing barre', 'row', 'dos'],
  ['Rowing haltère', 'row', 'dos'],
  ['Tirage horizontal', 'row', 'dos'],
  ['Pull-over poulie', 'pull', 'dos'],
  ['Soulevé de terre', 'deadlift', 'dos'],
  ['Shrugs', 'deadlift', 'dos'],
  ['Développé militaire', 'overhead', 'epaules'],
  ['Développé haltères assis', 'overhead', 'epaules'],
  ['Élévations latérales', 'overhead', 'epaules'],
  ['Oiseau', 'row', 'epaules'],
  ['Face pull', 'pull', 'epaules'],
  ['Curl barre', 'curl', 'biceps'],
  ['Curl marteau', 'curl', 'biceps'],
  ['Curl incliné', 'curl', 'biceps'],
  ['Curl pupitre', 'curl', 'biceps'],
  ['Extensions triceps poulie', 'dumbbell', 'triceps'],
  ['Barre au front', 'bench', 'triceps'],
  ['Extension nuque haltère', 'overhead', 'triceps'],
  ['Dips banc', 'dips', 'triceps'],
  ['Squat barre', 'squat', 'jambes'],
  ['Front squat', 'squat', 'jambes'],
  ['Goblet squat', 'squat', 'jambes'],
  ['Presse à cuisses', 'leg-press', 'jambes'],
  ['Fentes haltères', 'squat', 'jambes'],
  ['Squat bulgare', 'squat', 'jambes'],
  ['Soulevé de terre roumain', 'rdl', 'jambes'],
  ['Hip thrust', 'rdl', 'jambes'],
  ['Flexion des jambes allongé', 'leg-curl', 'jambes'],
  ['Leg extension', 'leg-curl', 'jambes'],
  ['Extensions mollets debout', 'calf', 'mollets'],
  ['Mollets assis', 'calf', 'mollets'],
  ['Crunch', 'abs', 'abdos'],
  ['Relevé de jambes suspendu', 'pull', 'abdos'],
  ['Gainage', 'abs', 'abdos'],
]

export const PROGRAM = [
  {
    name: 'Poussée', muscles: 'Pectoraux, épaules, triceps', color: 'pink', icon: 'bench', weekday: 1,
    exercises: [
      ['Développé couché', 4, 8, 150],
      ['Développé incliné haltères', 3, 10, 120],
      ['Développé militaire', 4, 8, 120],
      ['Élévations latérales', 3, 15, 60],
      ['Dips', 3, 10, 90],
      ['Extensions triceps poulie', 3, 12, 60],
    ],
  },
  {
    name: 'Tirage', muscles: "Dos, biceps, arrière d'épaules", color: 'cyan', icon: 'pull', weekday: 3,
    exercises: [
      ['Tractions', 4, 8, 150],
      ['Rowing barre', 4, 8, 120],
      ['Tirage horizontal', 3, 10, 90],
      ['Face pull', 3, 15, 60],
      ['Curl barre', 3, 10, 60],
      ['Curl marteau', 3, 12, 60],
    ],
  },
  {
    name: 'Jambes', muscles: 'Quadriceps, ischios, mollets', color: 'violet', icon: 'squat', weekday: 5,
    exercises: [
      ['Squat barre', 4, 8, 120],
      ['Presse à cuisses', 4, 10, 120],
      ['Soulevé de terre roumain', 3, 10, 120],
      ['Flexion des jambes allongé', 3, 12, 90],
      ['Extensions mollets debout', 4, 15, 60],
    ],
  },
]

/** Catalogue d'exercices + programme de départ d'un nouveau compte (dans la transaction de création). */
export async function seedUser(tx, userId) {
  const ids = new Map()
  for (const [name, icon, muscle] of EXERCISES) {
    const r = await tx.query(
      'INSERT INTO exercises (user_id, name, icon, muscle) VALUES ($1, $2, $3, $4) RETURNING id',
      [userId, name, icon, muscle],
    )
    ids.set(name, r.rows[0].id)
  }
  for (const [i, t] of PROGRAM.entries()) {
    const r = await tx.query(
      `INSERT INTO templates (user_id, name, muscles, color, icon, weekday, position)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [userId, t.name, t.muscles, t.color, t.icon, t.weekday, i],
    )
    for (const [pos, [name, sets, reps, rest]] of t.exercises.entries()) {
      await tx.query(
        `INSERT INTO template_exercises (template_id, exercise_id, position, sets, reps, rest_seconds)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [r.rows[0].id, ids.get(name), pos, sets, reps, rest],
      )
    }
  }
}
