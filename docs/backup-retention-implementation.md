# Backup Retention Implementation

## Overview

This document describes the implementation of the backup retention feature for Runtipi, which automatically manages backup storage by limiting the number of backups kept per application.

## Problem Statement

Backups size will grow indefinitely without manual cleanups. Users need a way to automatically manage backup storage to prevent disk space issues.

## Solution

Implemented a configurable backup retention policy with two levels:
1. **Global setting**: Default maximum number of backups to keep for all apps
2. **Per-app setting**: Optional override for individual apps

## Implementation Details

### Backend Changes

#### 1. Settings Schema (`packages/backend/src/app.dto.ts`)

Added `maxBackups` field to the settings schema:
```typescript
maxBackups: type('number.integer | string.integer.parse').to('0 <= number <= 100')
```
- Range: 0-100
- 0 = unlimited backups
- Default: 5 backups

#### 2. Configuration Service (`packages/backend/src/core/config/configuration.service.ts`)

- Added `MAX_BACKUPS` environment variable with default value of 5
- Integrated into user settings configuration

#### 3. Database Schema (`packages/backend/src/core/database/drizzle/schema.ts`)

Added `maxBackups` column to the `app` table:
```typescript
maxBackups: integer('max_backups')
```
This allows per-app overrides of the global setting.

**Note**: A database migration will be automatically generated based on this schema change.

#### 4. Backup Manager (`packages/backend/src/modules/backups/backup.manager.ts`)

Implemented `cleanupOldBackups` method:
```typescript
public async cleanupOldBackups(appUrn: AppUrn, maxBackups: number)
```

**Logic**:
- If maxBackups = 0, no cleanup is performed (unlimited)
- Lists all backups for the app
- Sorts by date (newest first)
- Deletes backups beyond the limit (oldest ones)

#### 5. Backup Command (`packages/backend/src/modules/app-lifecycle/commands/backup-app-command.ts`)

Integrated cleanup into the backup workflow:
```typescript
// After successful backup
const app = await appsRepository.getAppByUrn(appUrn);
const maxBackups = app?.maxBackups ?? config.get('userSettings').maxBackups;
await backupManager.cleanupOldBackups(appUrn, maxBackups);
```

**Priority**:
1. Per-app `maxBackups` setting (if set)
2. Global `maxBackups` setting (fallback)

#### 6. App Lifecycle Service (`packages/backend/src/modules/app-lifecycle/app-lifecycle.service.ts`)

Updated `updateAppConfig` to save the `maxBackups` field when updating app configuration.

#### 7. App Lifecycle DTO (`packages/backend/src/modules/app-lifecycle/dto/app-lifecycle.dto.ts`)

Added `maxBackups` to the `appFormSchema`:
```typescript
maxBackups: 'number >= 0 & number <= 100?'
```

### Frontend Changes

#### 1. Settings Form Schema (`packages/frontend/src/modules/settings/components/user-settings-form/user-settings-form.tsx`)

Added `maxBackups` field to:
- Zod validation schema with range 0-100
- TypeScript type definition
- Form component with number input

#### 2. UI Input

Added number input field in Advanced Settings section:
- Label: "Maximum backups to keep"
- Hint: "The maximum number of backups to keep per app. Oldest backups will be automatically deleted. Set to 0 for unlimited."
- Placeholder: "5"
- Min: 0, Max: 100

### Translation Files

Added keys to both `en.json` and `en-US.json`:
- `SETTINGS_GENERAL_MAX_BACKUPS`: "Maximum backups to keep"
- `SETTINGS_GENERAL_MAX_BACKUPS_HINT`: "The maximum number of backups to keep per app. Oldest backups will be automatically deleted. Set to 0 for unlimited."

## Usage

### Global Setting

1. Navigate to Settings → Advanced Settings
2. Set "Maximum backups to keep" (default: 5)
3. Save settings

This applies to all apps unless overridden per-app.

### Per-App Setting (Future Enhancement)

Per-app backup retention can be configured through the app settings dialog:
1. Navigate to the app's details page
2. Click "Settings" or "Edit Configuration"
3. Set the app-specific "Maximum backups to keep"
4. This overrides the global setting for this app only

## Behavior

### Automatic Cleanup

- Cleanup runs **after each successful backup**
- Only affects backups beyond the limit
- Always keeps the newest backups
- Deletes oldest backups first

### Example Scenarios

**Scenario 1**: maxBackups = 5
- App has 3 backups → No cleanup
- App has 5 backups → No cleanup
- App has 7 backups → Deletes 2 oldest backups
- New backup created → Total becomes 6, deletes 1 oldest

**Scenario 2**: maxBackups = 0 (unlimited)
- No automatic cleanup ever performed
- All backups are retained indefinitely

**Scenario 3**: Per-app override
- Global setting: 5 backups
- App A: No override → Uses 5
- App B: Override to 10 → Uses 10
- App C: Override to 0 → Unlimited

## Database Migration

After these changes, you need to generate and run a database migration:

```bash
# Generate migration
cd packages/backend
bun run drizzle-kit generate

# Migration will be created automatically based on schema changes
# The migration will add the maxBackups column to the app table
```

## Testing Recommendations

1. **Test global setting**:
   - Set maxBackups to 3
   - Create 5 backups for an app
   - Verify only 3 newest backups remain

2. **Test unlimited**:
   - Set maxBackups to 0
   - Create 10 backups
   - Verify all backups are retained

3. **Test per-app override**:
   - Set global to 5
   - Set app-specific to 2
   - Create 4 backups for that app
   - Verify only 2 newest backups remain

4. **Test backup ordering**:
   - Verify that the newest backups are always kept
   - Verify that oldest backups are deleted first

## Future Enhancements

### Time-based Retention
- Keep backups for X days/weeks/months
- Example: "Keep backups for 30 days"

### Size-based Retention
- Keep backups up to X GB
- Example: "Keep 200GB of backups, removing oldest"

### Hybrid Retention
- Combine multiple strategies
- Example: "Keep at least 5 backups, but no more than 30 days old"

### Per-App UI
- Add maxBackups field to the app settings/configuration dialog
- Similar to how domain, port, and other per-app settings are managed
- Would appear in the InstallForm component

### Retention Policy Configuration
```typescript
interface RetentionPolicy {
  maxBackups?: number;      // Count-based
  maxAgeDays?: number;       // Time-based
  maxSizeGB?: number;        // Size-based
  minBackups?: number;       // Minimum to always keep
}
```

## API Changes

The following API endpoints will now support the `maxBackups` field:

### Update User Settings
```
PATCH /api/user-settings
{
  "maxBackups": 5
}
```

### Update App Config
```
PATCH /api/app-lifecycle/{urn}/update-config
{
  "maxBackups": 10,
  // ... other app settings
}
```

## Notes

- The maxBackups value of 0 means "unlimited" to maintain backward compatibility
- Cleanup only happens after successful backups to avoid data loss
- The feature respects the priority: per-app setting > global setting
- All logging is implemented for debugging and monitoring

## Conclusion

This implementation provides a simple yet effective solution for managing backup storage automatically. It balances ease of use with flexibility through global and per-app settings, while maintaining safety by never deleting backups during the backup process itself.
