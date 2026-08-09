-- Local-only Oracle Database Free bootstrap. This script runs on every container start,
-- so user and schema creation must remain idempotent.
ALTER SESSION SET CONTAINER = FREEPDB1;

DECLARE
    tablespace_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO tablespace_count
      FROM dba_tablespaces
     WHERE tablespace_name = 'SELF_INTRO_VECTOR_DATA';

    IF tablespace_count = 0 THEN
        EXECUTE IMMEDIATE
            'CREATE TABLESPACE self_intro_vector_data '
            || 'DATAFILE ''/opt/oracle/oradata/FREE/FREEPDB1/self_intro_vector_data01.dbf'' '
            || 'SIZE 256M AUTOEXTEND ON NEXT 64M MAXSIZE 2G '
            || 'EXTENT MANAGEMENT LOCAL SEGMENT SPACE MANAGEMENT AUTO';
    END IF;
END;
/

DECLARE
    user_count PLS_INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO user_count
      FROM dba_users
     WHERE username = 'SELF_INTRO_VECTOR';

    IF user_count = 0 THEN
        EXECUTE IMMEDIATE
            'CREATE USER self_intro_vector IDENTIFIED BY self_intro_vector_local '
            || 'DEFAULT TABLESPACE self_intro_vector_data';
    END IF;
END;
/

ALTER USER self_intro_vector IDENTIFIED BY self_intro_vector_local;
ALTER USER self_intro_vector DEFAULT TABLESPACE self_intro_vector_data;
ALTER USER self_intro_vector QUOTA UNLIMITED ON self_intro_vector_data;
GRANT CREATE SESSION, CREATE TABLE, CREATE SEQUENCE, CREATE PROCEDURE, CREATE TRIGGER, CREATE TYPE
    TO self_intro_vector;

ALTER SESSION SET CURRENT_SCHEMA = SELF_INTRO_VECTOR;
@@/opt/oracle/vector-schema/oracle-schema-local.sql
