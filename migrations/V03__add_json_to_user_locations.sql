BEGIN;

ALTER TABLE user_locations ADD COLUMN positionstack_response jsonb;

COMMIT;
