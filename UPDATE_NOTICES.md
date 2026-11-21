# Update notices (`update_notices`)

App maintainers can declare warnings in an app's `config.json` that Runtipi displays as the **first step of the update wizard**, before the configuration and backup steps. They are typically used to flag breaking changes, required preparations and post-update steps.

Invalid notices invalidate the whole `config.json`, exactly like any other schema error: the app is hidden from the store.

## Example (English reference + French translation)

```json
{
  "id": "my-app",
  "name": "My App",
  "version": "5.2.0",
  "tipi_version": 25,
  "update_notices": [
    {
      "id": "database-migration-22",
      "tipi_version": 22,
      "severity": "warning",
      "title": "Database migration",
      "message": "The database format changes with this update. The first startup may take several minutes.",
      "before_update": ["Make sure you have enough free disk space.", "Plan a backup before starting the update."],
      "after_update": ["Do not restart the app while the migration is running.", "Check the logs and sign in to verify the data."],
      "require_confirmation": true,
      "translations": {
        "fr": {
          "title": "Migration de la base de données",
          "message": "Le format de la base change avec cette mise à jour. Le premier démarrage peut prendre plusieurs minutes.",
          "before_update": ["Vérifiez l'espace disque disponible.", "Prévoyez une sauvegarde avant de lancer la mise à jour."],
          "after_update": [
            "Ne redémarrez pas l'application pendant la migration.",
            "Vérifiez les journaux puis connectez-vous pour contrôler les données."
          ]
        }
      }
    }
  ]
}
```

## Fields

| Field                  | Required | Default     | Description                                                                                       |
| ---------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `id`                   | yes      | —           | Unique notice id within the app.                                                                  |
| `tipi_version`         | yes      | —           | Package revision that introduces the change.                                                      |
| `severity`             | no       | `"warning"` | `"info"` or `"warning"` (visual only).                                                            |
| `title`                | yes      | —           | Short title shown in the wizard.                                                                  |
| `message`              | yes      | —           | Explanation of the change.                                                                        |
| `before_update`        | no       | `[]`        | Steps to take before updating.                                                                    |
| `after_update`         | no       | `[]`        | Steps to take after updating.                                                                     |
| `require_confirmation` | no       | `true`      | Requires the user to acknowledge the notice before continuing.                                    |
| `translations`         | no       | —           | Per-locale overrides (e.g. `fr`, `fr-FR`); any omitted field falls back to the English reference. |

## Rules

- A notice applies when: `installed tipi_version < notice tipi_version <= target tipi_version`. Notices for already-installed revisions are never shown again, and they reappear on every retry of a failed update (acknowledgements are never persisted).
- Keep older notices in the list so users jumping several revisions see them. A notice revision cannot exceed the package `tipi_version`, and ids must be unique — otherwise the config is invalid.
- Apps with confirmation-required notices are excluded from "update all" and must be updated individually.
- The notices are informational: they never execute commands or modify files.
