BEGIN;

CREATE TABLE users(
    id UUID NOT NULL,
    telegram_chat_id VARCHAR(255) UNIQUE NOT NULL,

    PRIMARY KEY(id)
);

COMMIT;