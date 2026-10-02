-- Groupe musculaire pour filtrer le catalogue d'exercices
ALTER TABLE exercises ADD COLUMN muscle text NOT NULL DEFAULT 'autre';
CREATE INDEX exercises_muscle_idx ON exercises (muscle, name);
