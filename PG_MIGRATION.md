# PostgreSQL Database Migration Guide

This document outlines the process for migrating a PostgreSQL database using the `pg_dump` and
`pg_restore` utilities.

## Overview

Database migration is a critical process that allows you to:

- Transfer data between environments (development, staging, production)
- Create backups of your database
- Upgrade PostgreSQL versions
- Migrate between different hosting providers

## Prerequisites

- PostgreSQL client utilities (`pg_dump`, `pg_restore`) installed on your machine
- Access credentials for both source and target databases
- Sufficient disk space for the database dump file

## Export Process

Use the `pg_dump` command to create a compressed binary dump of your database:

```bash
pg_dump -Fc -d "postgresql://user:password@host:port/database?sslmode=require" --no-owner --no-acl -f mydb.dump
```

### Parameters Explained:

- `-Fc`: Output in custom format (compressed binary)
- `-d`: Connection string for the source database
- `--no-owner`: Skip restoration of object ownership
- `--no-acl`: Skip restoration of access privileges (GRANT/REVOKE)
- `-f mydb.dump`: Name of the output file

## Import Process

After transferring the dump file to the destination server, use `pg_restore` to import the data:

```bash
pg_restore --no-owner --no-acl -d "postgresql://user:password@host:port/database?sslmode=require" -v mydb.dump
```

### Parameters Explained:

- `--no-owner`: Skip restoration of object ownership
- `--no-acl`: Skip restoration of access privileges (GRANT/REVOKE)
- `-d`: Connection string for the target database
- `-v`: Verbose mode, provides detailed output during restoration
- `mydb.dump`: Path to the dump file

## Common Options

### Selective Backup and Restore

To back up specific schemas or tables:

```bash
pg_dump -Fc -d "postgresql://user:password@host:port/database?sslmode=require" --schema=my_schema --table=my_table -f selective_backup.dump
```

### Handling Large Databases

For very large databases, consider using parallel processing:

```bash
pg_restore --no-owner --no-acl -d "postgresql://user:password@host:port/database?sslmode=require" -j 4 -v mydb.dump
```

### Data-Only or Schema-Only Operations

For data-only backups:

```bash
pg_dump -Fc --data-only -d "postgresql://user:password@host:port/database?sslmode=require" -f data_only.dump
```

For schema-only backups:

```bash
pg_dump -Fc --schema-only -d "postgresql://user:password@host:port/database?sslmode=require" -f schema_only.dump
```

## Troubleshooting

### Common Issues

1. **Permission Errors**: Ensure the user in the connection string has appropriate permissions
2. **Space Issues**: Verify sufficient disk space for the dump file
3. **Version Compatibility**: Ensure compatibility between PostgreSQL versions

### Error Recovery

If `pg_restore` encounters errors, you can use the following options:

- `--exit-on-error`: Stop on first error
- `--no-data-for-failed-tables`: Skip data restoration for tables that couldn't be created

## Security Considerations

- Never store database dumps with credentials in unsecured locations
- Consider encrypting sensitive dump files
- Use SSL connections (`sslmode=require`) for secure transfers

## Best Practices

1. **Schedule Regular Backups**: Implement automated backup schedules
2. **Test Restoration**: Regularly verify that backups can be successfully restored
3. **Document Connection Strings**: Keep secure records of all database connection information
4. **Version Control**: Include database schema migrations in version control
5. **Cleanup**: Remove old dump files after successful restoration

## Additional Resources

- [PostgreSQL Documentation - pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL Documentation - pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
