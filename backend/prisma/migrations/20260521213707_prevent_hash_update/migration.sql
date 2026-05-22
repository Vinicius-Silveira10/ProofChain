CREATE OR REPLACE FUNCTION check_hash_integridade_update()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.hash_integridade IS DISTINCT FROM OLD.hash_integridade THEN
        RAISE EXCEPTION 'Update to hash_integridade is forbidden.' USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_hash_integridade_update
BEFORE UPDATE ON titulos_divida
FOR EACH ROW
EXECUTE FUNCTION check_hash_integridade_update();