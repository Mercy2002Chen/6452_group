CREATE TABLE IF NOT EXISTS batches (
    batch_id       BIGINT      PRIMARY KEY,
    metadata       TEXT,
    current_owner  TEXT,
    created_at     TIMESTAMP   DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS stages (
    id        SERIAL       PRIMARY KEY,
    batch_id  BIGINT       REFERENCES batches(batch_id),
    stage     INT,
    location  TEXT,
    ts_block  TIMESTAMP,
    actor     TEXT
);


CREATE TABLE IF NOT EXISTS user_roles (
    id         SERIAL PRIMARY KEY,
    address    TEXT NOT NULL,
    role_name  TEXT NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_roles
ADD CONSTRAINT unique_address_role UNIQUE(address, role_name);


CREATE TABLE IF NOT EXISTS logs (
    tx_hash TEXT PRIMARY KEY,
    event_name TEXT
);
