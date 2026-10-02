-- Catalogue d'exercices
CREATE TABLE exercises (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL UNIQUE,
  icon        text NOT NULL DEFAULT 'dumbbell',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Séances types (le « programme »)
CREATE TABLE templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  muscles     text NOT NULL DEFAULT '',
  color       text NOT NULL DEFAULT 'violet',
  icon        text NOT NULL DEFAULT 'dumbbell',
  weekday     smallint CHECK (weekday BETWEEN 1 AND 7), -- ISO : 1 = lundi
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE template_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   uuid NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  position      integer NOT NULL,
  sets          integer NOT NULL CHECK (sets > 0),
  reps          integer NOT NULL CHECK (reps > 0),
  rest_seconds  integer NOT NULL DEFAULT 120 CHECK (rest_seconds >= 0)
);
CREATE INDEX template_exercises_template_idx ON template_exercises (template_id, position);

-- Séances réalisées. Nom / couleur / icône sont copiés depuis la séance type
-- pour que l'historique survive à la modification ou suppression du programme.
CREATE TABLE sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  uuid REFERENCES templates(id) ON DELETE SET NULL,
  name         text NOT NULL,
  muscles      text NOT NULL DEFAULT '',
  color        text NOT NULL DEFAULT 'violet',
  icon         text NOT NULL DEFAULT 'dumbbell',
  started_at   timestamptz NOT NULL DEFAULT now(),
  ended_at     timestamptz
);
CREATE INDEX sessions_started_idx ON sessions (started_at DESC);
-- Une seule séance en cours à la fois
CREATE UNIQUE INDEX sessions_single_active ON sessions ((true)) WHERE ended_at IS NULL;

CREATE TABLE session_exercises (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_id   uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  position      integer NOT NULL,
  target_sets   integer NOT NULL,
  target_reps   integer NOT NULL,
  rest_seconds  integer NOT NULL DEFAULT 120
);
CREATE INDEX session_exercises_session_idx ON session_exercises (session_id, position);
CREATE INDEX session_exercises_exercise_idx ON session_exercises (exercise_id);

CREATE TABLE session_sets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- fourni par le client (file hors-ligne)
  session_exercise_id  uuid NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  set_number           integer NOT NULL,
  weight               double precision CHECK (weight >= 0),
  reps                 integer CHECK (reps >= 0),
  done_at              timestamptz
);
CREATE INDEX session_sets_exercise_idx ON session_sets (session_exercise_id, set_number);

-- Meilleure série / 1RM estimé (Epley) / volume par exercice et par séance terminée
CREATE VIEW exercise_tops AS
SELECT
  se.session_id,
  se.exercise_id,
  s.started_at,
  max(ss.weight)                                                         AS top_weight,
  max(CASE WHEN ss.reps <= 1 THEN ss.weight ELSE ss.weight * (1 + ss.reps / 30.0) END) AS e1rm,
  sum(ss.weight * ss.reps)                                               AS volume
FROM session_exercises se
JOIN sessions s       ON s.id = se.session_id AND s.ended_at IS NOT NULL
JOIN session_sets ss  ON ss.session_exercise_id = se.id
WHERE ss.done_at IS NOT NULL AND ss.weight IS NOT NULL AND ss.reps > 0
GROUP BY se.session_id, se.exercise_id, s.started_at;
