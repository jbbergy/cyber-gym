-- Comptes utilisateurs
CREATE TABLE users (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email          text NOT NULL,
  name           text NOT NULL,
  password_hash  text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_idx ON users (lower(email));

-- Sessions de connexion : on ne stocke que l'empreinte SHA-256 du jeton du cookie
CREATE TABLE auth_sessions (
  token_hash    text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);
CREATE INDEX auth_sessions_user_idx ON auth_sessions (user_id);

-- Jetons « mot de passe oublié » (usage unique, durée courte)
CREATE TABLE password_resets (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);
CREATE INDEX password_resets_user_idx ON password_resets (user_id);

-- Rattachement des données à un compte. Les lignes existantes restent sans
-- propriétaire (user_id NULL, invisibles) jusqu'à leur adoption par le compte
-- propriétaire (OWNER_EMAIL, ou le compte de test en local) : voir accounts.js.
ALTER TABLE exercises ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE templates ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE sessions  ADD COLUMN user_id uuid REFERENCES users(id) ON DELETE CASCADE;

-- Catalogue d'exercices propre à chaque compte
ALTER TABLE exercises DROP CONSTRAINT exercises_name_key;
ALTER TABLE exercises ADD CONSTRAINT exercises_user_name_key UNIQUE (user_id, name);

CREATE INDEX templates_user_idx ON templates (user_id, weekday, position);
CREATE INDEX sessions_user_started_idx ON sessions (user_id, started_at DESC);

-- Une seule séance en cours à la fois… par compte
DROP INDEX sessions_single_active;
CREATE UNIQUE INDEX sessions_single_active ON sessions (user_id) WHERE ended_at IS NULL;
