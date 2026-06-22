ALTER TABLE elder
    ALTER COLUMN status SET DEFAULT 'NO_DATA';

ALTER TABLE elder
    DROP CONSTRAINT IF EXISTS elder_status_check;

ALTER TABLE elder
    ADD CONSTRAINT elder_status_check
        CHECK (status IN ('DANGER', 'WARNING', 'STABLE', 'NO_DATA'));

ALTER TABLE conversation_session
    DROP COLUMN IF EXISTS source_type;

ALTER TABLE analysis_result
    DROP COLUMN IF EXISTS emotion_sadness;

ALTER TABLE analysis_result
    DROP COLUMN IF EXISTS emotion_anxiety;

ALTER TABLE analysis_result
    DROP COLUMN IF EXISTS emotion_neutral;

ALTER TABLE analysis_result
    DROP COLUMN IF EXISTS emotion_joy;
