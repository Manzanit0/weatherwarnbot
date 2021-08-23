
BEGIN;

-- https://www.postgresql.org/docs/9.6/rowtypes.html
-- INSERT INTO on_hand VALUES (ROW('fuzzy dice', 42, 1.99), 1000);
-- SELECT (item).name FROM on_hand WHERE (item).price > 9.99;
CREATE TYPE coordinates AS (
    latitude       double precision,
    longitude       double precision
);

CREATE TABLE user_locations(
    id UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    name VARCHAR(255),
    coordinates coordinates NOT NULL,


    PRIMARY KEY(id),
    CONSTRAINT fk_user FOREIGN KEY(user_id) REFERENCES users(id)
);

COMMIT;