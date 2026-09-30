The numbered SQL files that built the live database, kept as history.
They do not replay cleanly on a new database (008 is missing, and 012 and 025 fail).
To stand up the schema, apply ../schema.sql, a schema-only dump of the live database.
