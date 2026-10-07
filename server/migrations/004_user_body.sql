-- Morphologie, pour estimer les calories dépensées (métabolisme de base Mifflin-St Jeor).
-- Tout est facultatif ; on stocke l'année de naissance plutôt que l'âge, qui changerait chaque année.
ALTER TABLE users ADD COLUMN weight_kg  double precision CHECK (weight_kg BETWEEN 20 AND 400);
ALTER TABLE users ADD COLUMN height_cm  integer CHECK (height_cm BETWEEN 100 AND 250);
ALTER TABLE users ADD COLUMN birth_year integer CHECK (birth_year BETWEEN 1900 AND 2100);
ALTER TABLE users ADD COLUMN sex        text CHECK (sex IN ('m', 'f'));
