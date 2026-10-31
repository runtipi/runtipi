# App-store migrations

Keep the current deployment in the app's `docker-compose.yml`. Put upgrade steps in `migrations/*.yml` beside it:

```text
calcom/
├── config.json
├── docker-compose.yml
└── migrations/
    └── 001-dedicated-db-password.yml
```

Each migration is a standalone Compose file defining exactly one service named `migration`, with an explicit image. It receives the app's generated environment and enabled user environment, and runs in a separate Compose project. The app's Compose services and user Compose overrides are not loaded into that project.

Runtipi uses the filename without `.yml` as the migration ID and executes pending files in filename order. Use zero-padded prefixes and lowercase filenames containing letters, digits, dots, dashes, or underscores, up to 64 characters before the extension. Keep published IDs and migration contents stable. Add later changes in new files, and retain earlier migrations so users can skip app versions when upgrading.

Fresh installations record the existing migration IDs without executing them. Updates discover new IDs, validate the app and migration storage, and pull the pending images before stopping the app. Only pending files are resolved, so completed migrations can refer to historical environment variables or images that are no longer available.

Before running a batch, Runtipi takes a backup even when the user disables optional update backups. Writable persistent mounts must be bind mounts inside `APP_DATA_DIR`; named volumes and `volumes_from` cannot be restored by this backup mechanism. Readonly mounts and temporary filesystems are allowed. Migration files run sequentially while the app is stopped. The service must exit successfully when its work is complete; `depends_on` services are not supported.

After successful deployment, Runtipi saves the deployed app settings, completed IDs, and recovery decision together. On failure or an interrupted update, it removes the isolated migration containers before restoring the backup. Cleanup does not require the migration YAML or environment to remain available. The migration process must finish all writes before exiting.

## Cal.com: dedicated database password

The example keeps Cal.com's existing `tipi` database role and PostgreSQL 16.1 image. Its current Compose file uses a dedicated password for Cal.com and its database. The migration opens the existing database through a private socket with networking disabled and changes the role password without needing the old password. Its temporary authentication file does not replace the database's permanent authentication settings.

Add this field to Cal.com's existing `config.json`:

```json
{
  "type": "random",
  "env_variable": "CALCOM_POSTGRES_PASSWORD",
  "label": "Cal.com database password",
  "min": 32,
  "max": 32,
  "encoding": "hex"
}
```

Bump the app's `tipi_version` and require the Runtipi release that introduces folder-based migrations through `min_tipi_version`. Preserve the other existing configuration fields.
