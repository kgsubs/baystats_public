-- Create a function to run SQL migrations via REST API
-- This allows automated schema changes without manual SQL execution

CREATE OR REPLACE FUNCTION exec_sql(sql_string TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;

-- Grant execute permission to service_role (used by backend functions)
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO service_role;

-- Also grant to authenticated users for admin operations
GRANT EXECUTE ON FUNCTION exec_sql(TEXT) TO authenticated;

COMMENT ON FUNCTION exec_sql(TEXT) IS 'Execute SQL statements via REST API for migrations';
