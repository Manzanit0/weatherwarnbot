BEGIN;

CREATE EXTENSION "uuid-ossp";

CREATE TABLE users(
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    telegram_chat_id VARCHAR(255) UNIQUE NOT NULL,

    PRIMARY KEY(id)
);

COMMIT;