# Backup & Restore System in Runtipi

## Overview

The backup and restore system in Runtipi provides a comprehensive solution for creating point-in-time snapshots of applications and their data, as well as restoring them when needed. This system is designed to handle the complete state of an application including persistent data, installed application files, and user configurations.

## Architecture

### Core Components

The backup system consists of several key components that work together to provide reliable backup and restore functionality:

#### 1. BackupManager (`/packages/backend/src/modules/backups/backup.manager.ts`)

The central component responsible for the actual backup and restore operations. It handles:

- Creating compressed tar.gz archives
- Extracting backup archives
- Managing backup files and directories
- Coordinating with other services for file operations

#### 2. BackupsService (`/packages/backend/src/modules/backups/backups.service.ts`)

The service layer that orchestrates backup operations and manages the application lifecycle during backup/restore:

- App status management (backing_up, restoring states)
- Server-Sent Events (SSE) for real-time updates
- Integration with app lifecycle management
- Pagination and metadata for backup listings

#### 3. ArchiveService (`/packages/backend/src/core/archive/archive.service.ts`)

Handles compression and decompression operations with full permission preservation:

- Creates tar.gz archives using system `tar` command with permission preservation flags
- Extracts archives with support for legacy tarballs while maintaining file ownership and permissions
- MIME type detection for proper extraction
- Preserves Access Control Lists (ACLs) and extended attributes (xattrs)

#### 4. AppFilesManager (`/packages/backend/src/modules/apps/app-files-manager.ts`)

Manages application file operations and directory structures:

- Provides standardized paths for app data and installed files
- Handles app environment files and configurations
- Manages user customizations and overrides

### Directory Structure

The backup system operates on three main directory types within the Runtipi data structure:

```
/data/
├── app-data/{app-store-id}/{app-name}/     # Persistent application data
├── apps/{app-store-id}/{app-name}/         # Installed application files
├── user-config/{app-store-id}/{app-name}/  # User customizations
└── backups/{app-store-id}/{app-name}/      # Backup storage
```

#### Directory Purposes

- **app-data**: Contains persistent application data, databases, configuration files, and any data that needs to survive app updates
- **apps**: Contains the installed application files, docker-compose files, and app metadata copied from the app store
- **user-config**: Contains user customizations including custom docker-compose.yml overrides and additional environment variables
- **backups**: Stores the compressed backup archives for each application

## Backup Process

### 1. Backup Initiation

When a backup is requested through the API or UI:

```typescript
// REST API endpoint
POST /api/backups/{urn}/backup

// Service method
public async backupApp(params: { appUrn: AppUrn })
```

### 2. App Status Management

The system updates the app status to `backing_up` and emits SSE events:

```typescript
await this.appsRepository.updateAppById(app.id, { status: "backing_up" });
this.sseService.emit("app", {
  event: "status_change",
  appUrn,
  appStatus: "backing_up",
});
```

### 3. App Lifecycle Command

The backup operation is queued and executed through the app lifecycle system:

```typescript
// BackupAppCommand execution
public async execute(appUrn: AppUrn): Promise<{ success: boolean; message: string }> {
  // Stop the app
  await dockerService.composeApp(appUrn, 'stop');

  // Perform backup
  await backupManager.backupApp(appUrn);

  return { success: true, message: `App ${appUrn} backed up successfully` };
}
```

### 4. File Collection and Archiving

The BackupManager collects files from three sources:

```typescript
public backupApp = async (appUrn: AppUrn) => {
  const tempDir = await this.filesystem.createTempDirectory(appUrn);
  const { appDataDir, appInstalledDir } = this.appFilesManager.getAppPaths(appUrn);
  const userConfigDir = path.join(dataDir, 'user-config', appStoreId, appName);

  // Copy persistent data (excluding nested backups)
  await this.filesystem.copyDirectory(appDataDir, path.join(tempDir, 'app-data'), {
    recursive: true,
    filter: (src) => !src.includes('backups'),
  });

  // Copy installed app files
  await this.filesystem.copyDirectory(appInstalledDir, path.join(tempDir, 'app'));

  // Copy user configurations if they exist
  if (await this.filesystem.pathExists(userConfigDir)) {
    await this.filesystem.copyDirectory(userConfigDir, path.join(tempDir, 'user-config'));
  }

  // Create compressed archive
  const backupName = `${appUrn}-${new Date().getTime()}`;
  await this.archiveManager.createTarGz(tempDir, `${path.join(tempDir, backupName)}.tar.gz`);
};
```

### 5. Archive Storage

The completed archive is moved to the permanent backup location:

```typescript
const backupDir = path.join(dataDir, "backups", appStoreId, appName);
await this.filesystem.createDirectory(backupDir);
await this.filesystem.copyFile(
  `${path.join(tempDir, backupName)}.tar.gz`,
  path.join(backupDir, `${backupName}.tar.gz`)
);
```

### 6. Cleanup and Status Restoration

- Temporary directories are cleaned up
- App status is restored to its previous state
- If the app was running, it's restarted automatically

## Restore Process

### 1. Restore Initiation

Restore is initiated with a specific backup filename:

```typescript
// REST API endpoint
POST /api/backups/{urn}/restore
Body: { filename: "backup-filename.tar.gz" }

// Service method
public async restoreApp(params: { appUrn: AppUrn; filename: string })
```

### 2. App Status Management

Similar to backup, the app status is set to `restoring`:

```typescript
await this.appsRepository.updateAppById(app.id, { status: "restoring" });
this.sseService.emit("app", {
  event: "status_change",
  appUrn,
  appStatus: "restoring",
});
```

### 3. Archive Extraction

The backup archive is extracted to a temporary directory:

```typescript
public restoreApp = async (appUrn: AppUrn, filename: string) => {
  const restoreDir = await this.filesystem.createTempDirectory(appUrn);
  const archive = path.join(dataDir, 'backups', appStoreId, appName, filename);

  // Verify backup exists
  if (!(await this.filesystem.pathExists(archive))) {
    throw new Error('The backup file does not exist');
  }

  // Extract archive
  await this.archiveManager.extractTarGz(archive, restoreDir);
};
```

### 4. Directory Replacement

The current app directories are completely replaced with backup content:

```typescript
// Remove existing directories
await this.filesystem.removeDirectory(appDataDir);
await this.filesystem.removeDirectory(appInstalledDir);
await this.filesystem.removeDirectory(userConfigDir);

// Recreate directories
await this.filesystem.createDirectory(appDataDir);
await this.filesystem.createDirectory(appInstalledDir);
await this.filesystem.createDirectory(userConfigDir);

// Restore from backup
await this.filesystem.copyDirectory(
  path.join(restoreDir, "app-data"),
  appDataDir
);
await this.filesystem.copyDirectory(
  path.join(restoreDir, "app"),
  appInstalledDir
);

if (await this.filesystem.pathExists(path.join(restoreDir, "user-config"))) {
  await this.filesystem.copyDirectory(
    path.join(restoreDir, "user-config"),
    userConfigDir
  );
}
```

### 5. Version and Configuration Updates

After restore, the app version is updated based on the restored configuration:

```typescript
const restoredAppConfig = await this.appFilesManager.getInstalledAppInfo(
  appUrn
);
if (typeof restoredAppConfig?.tipi_version === "number") {
  await this.appsRepository.updateAppById(app.id, {
    version: restoredAppConfig?.tipi_version,
  });
}
```

## File Handling Details

### App Data Directory (`app-data`)

Contains persistent application data that must survive app updates and restarts:

- Database files
- Configuration files
- User-uploaded content
- Application state files
- Environment files (`app.env`)

**Backup filtering**: The system excludes nested backup directories to prevent recursive backup storage.

### Installed App Directory (`apps`)

Contains files copied from the app store during installation:

- `config.json` - App metadata and configuration schema
- `docker-compose.yml` - Main Docker Compose configuration
- `docker-compose.json` - Parsed compose configuration
- `metadata/` - App description, logo, and other metadata

### User Config Directory (`user-config`)

Contains user customizations and overrides:

- Custom `docker-compose.yml` overrides
- Additional environment variables in `app.env`
- Custom configuration files

**Important**: User configurations are preserved during app updates and are included in backups to maintain customizations.

## API Endpoints

### Backup Operations

```typescript
// Create backup
POST /api/backups/{urn}/backup
Response: 201 Created

// List backups with pagination
GET /api/backups/{urn}?page=1&pageSize=10
Response: {
  data: AppBackup[],
  total: number,
  currentPage: number,
  lastPage: number
}

// Restore from backup
POST /api/backups/{urn}/restore
Body: { filename: string }
Response: 201 Created

// Delete backup
DELETE /api/backups/{urn}
Body: { filename: string }
Response: 200 OK
```

### Data Transfer Objects

```typescript
export class BackupDto {
  id: string; // Backup filename
  size: number; // Archive size in bytes
  date: number; // Creation timestamp
}

export class RestoreAppBackupDto {
  filename: string; // Backup filename to restore
}

export class DeleteAppBackupBodyDto {
  filename: string; // Backup filename to delete
}
```

## Frontend Integration

### React Component Structure

The frontend backup interface is implemented in `/packages/frontend/src/modules/app/containers/app-backups/`:

```typescript
export const AppBackups = ({ info, status }: Props) => {
  // State management for pagination and modals
  const [page, setPage] = React.useState(1);
  const [selectedBackup, setSelectedBackup] = React.useState<AppBackup | null>(
    null
  );

  // API integration using React Query
  const { data } = useSuspenseQuery({
    ...getAppBackupsOptions({
      path: { urn: info.urn },
      query: { page, pageSize: 5 },
    }),
  });

  // Mutation handling for backup operations
  const backupApp = useMutation({ ...backupAppMutation() });
  const restoreAppBackup = useMutation({ ...restoreAppBackupMutation() });
  const deleteAppBackup = useMutation({ ...deleteAppBackupMutation() });
};
```

### User Interface Features

- **Backup List**: Paginated table showing backup ID, size, date, and actions
- **Create Backup**: Button to initiate new backup with confirmation modal
- **Restore**: Action button for each backup with confirmation dialog
- **Delete**: Action button for backup deletion with confirmation
- **Status Indicators**: Real-time status updates during backup/restore operations
- **Action Disabling**: UI elements are disabled during active operations

## Error Handling and Logging

### Backup Process Error Handling

```typescript
try {
  await dockerService.composeApp(appUrn, "stop");
  await backupManager.backupApp(appUrn);
  return { success: true, message: `App ${appUrn} backed up successfully` };
} catch (err) {
  return this.handleAppError(err, appUrn, "backup");
}
```

### Restore Process Error Handling

```typescript
// Validation
if (!(await this.filesystem.pathExists(archive))) {
  throw new Error("The backup file does not exist");
}

// Operation logging
this.logger.info("Extracting archive...");
const { stderr, stdout } = await this.archiveManager.extractTarGz(
  archive,
  restoreDir
);
this.logger.debug("--- archiveManager.extractTarGz ---");
this.logger.debug("stderr:", stderr);
this.logger.debug("stdout:", stdout);
```

### Common Error Scenarios

1. **Missing Backup File**: Backup archive doesn't exist at expected path
2. **Insufficient Disk Space**: Not enough space for temporary directories or archives
3. **Permission Issues**: File system permission problems during copy operations
4. **Corrupted Archives**: Invalid or corrupted backup files
5. **App Not Found**: Attempting to backup/restore non-existent apps

## Security Considerations

### Path Validation

All file operations use validated paths to prevent directory traversal attacks:

```typescript
const { appName, appStoreId } = extractAppUrn(appUrn);
const backupPath = path.join(dataDir, "backups", appStoreId, appName, filename);
```

### Access Control

- Backup operations require authentication through `AuthGuard`
- Demo mode restrictions prevent backup operations
- User can only access backups for apps they have permission to manage

### Archive Security

- Archives are stored within the application data directory
- Backup extraction is performed in isolated temporary directories
- File filters prevent inclusion of sensitive system files

## File Permissions and Ownership Handling

### Overview

The backup and restore system maintains proper file permissions and ownership to ensure applications function correctly after restoration. This is critical for database files, configuration files, and application data that require specific ownership patterns.

### Permission Preservation During Backup

The backup process preserves all file metadata including permissions, ownership, and extended attributes:

```typescript
createTarGz = async (sourceDir: string, destinationFile: string) => {
  const tarCommand = `tar -czf ${destinationFile} -C ${sourceDir} --preserve-permissions --acls --xattrs .`;
  return execAsync(tarCommand);
};
```

#### Backup Flags Explained

- `--preserve-permissions`: Preserves file permissions (read, write, execute)
- `--acls`: Preserves Access Control Lists for fine-grained permissions
- `--xattrs`: Preserves extended attributes and metadata

### Permission Restoration During Restore

During the restore process, the system:

1. **Extracts with preservation**: Uses tar flags to maintain original permissions
2. **Validates restoration**: Ensures permissions are correctly applied
3. **Handles edge cases**: Manages permission restoration for different file types

```typescript
extractTarGz = async (sourceFile: string, destinationDir: string) => {
  let tarCommand = `tar -xzf ${sourceFile} -C ${destinationDir} --preserve-permissions --preserve-order --acls --xattrs`;

  if (mimeType === "application/x-tar") {
    tarCommand = `tar -xf ${sourceFile} -C ${destinationDir} --preserve-permissions --preserve-order --acls --xattrs`;
  }

  return await execAsync(tarCommand);
};
```

#### Extraction Flags Explained

- `--preserve-permissions`: Restores original file permissions
- `--preserve-order`: Processes files in order to maintain consistency
- `--acls`: Restores Access Control Lists
- `--xattrs`: Restores extended attributes

### Common Permission Scenarios

#### Database Files

Database applications (PostgreSQL, MySQL, etc.) require specific ownership:

- Database data files must be owned by the database user
- Configuration files need appropriate read/write permissions
- Lock files and temporary files require specific permissions

#### Application Configuration

Configuration files often have restrictive permissions:

- Secret files may have 600 (owner read/write only) permissions
- Configuration files typically have 644 (owner read/write, group/other read) permissions
- Executable scripts require execute permissions (755)

#### User-Uploaded Content

User data directories maintain original permissions:

- Upload directories may have 755 or 775 permissions
- Individual files preserve their original ownership
- Media files maintain appropriate read permissions

### Error Handling

The system handles permission-related errors gracefully:

```typescript
// Permission restoration with error handling
try {
  await this.archiveManager.extractTarGz(archive, restoreDir);
  this.logger.info("Archive extracted successfully with preserved permissions");
} catch (error) {
  this.logger.error("Failed to extract archive with permissions:", error);
  throw new Error("Permission restoration failed during archive extraction");
}
```

### Troubleshooting Permission Issues

#### Common Issues

1. **Root ownership**: Files extracted as root when they should have different ownership
2. **Missing execute permissions**: Scripts or binaries lose execute permissions
3. **Database access denied**: Database files become inaccessible due to wrong ownership

#### Diagnostic Steps

1. Check extracted file permissions: `ls -la /path/to/restored/files`
2. Verify tar command includes preservation flags
3. Check system capabilities for permission restoration
4. Review application logs for permission-related errors

#### Manual Permission Correction

If automatic permission restoration fails, manual correction may be needed:

```bash
# Example: Restore database file ownership
chown -R postgres:postgres /data/app-data/postgresql/

# Example: Fix configuration file permissions
chmod 644 /data/app-data/app-name/config.yml
chmod 600 /data/app-data/app-name/secrets.env
```

### Backward Compatibility

The permission handling system maintains backward compatibility:

- **Legacy backups**: Older backups without preserved permissions are handled gracefully
- **Graceful degradation**: If permission restoration fails, the system continues with warnings
- **Platform differences**: Handles permission differences across different host systems

## Performance Considerations

### Temporary Directory Management

- Unique temporary directories prevent conflicts during concurrent operations
- Automatic cleanup ensures temporary files don't accumulate
- Operations use streaming where possible to minimize memory usage

### Archive Compression

- Uses gzip compression for space efficiency
- tar format preserves file permissions and metadata
- Excludes unnecessary files (e.g., nested backups, .gitkeep files)

### Concurrent Operations

- Apps are stopped during backup/restore to ensure data consistency
- Multiple backup operations can run simultaneously for different apps
- UI provides real-time feedback during long-running operations

## Monitoring and Observability

### Server-Sent Events (SSE)

Real-time status updates are provided through SSE:

```typescript
// Status change events
this.sseService.emit("app", {
  event: "status_change",
  appUrn,
  appStatus: "backing_up",
});

// Success events
this.sseService.emit("app", {
  event: "backup_success",
  appUrn,
  appStatus: "stopped",
});
this.sseService.emit("app", {
  event: "restore_success",
  appUrn,
  appStatus: "stopped",
});
```

### Logging

Comprehensive logging throughout the backup process:

```typescript
this.logger.info("Copying files to backup location...");
this.logger.info("Including user configuration in backup...");
this.logger.info("Creating archive...");
this.logger.info("Moving archive to backup directory...");
this.logger.info("Backup completed!");
```

### Error Tracking

Integration with Sentry for error monitoring and debugging.

## Testing

### End-to-End Tests

The system includes comprehensive E2E tests in `/e2e/0006-backup-restore.spec.ts`:

1. **Version Preservation**: Tests that app versions are correctly preserved during backup/restore
2. **User Configuration Preservation**: Verifies that user customizations survive the backup/restore cycle
3. **Complete Workflow**: Tests the full backup creation and restoration process

### Test Scenarios

- App backup with version downgrade and restore
- User configuration preservation during backup/restore
- UI interaction testing for backup operations
- Error handling for missing files and invalid operations

## Maintenance and Troubleshooting

### Common Issues

1. **Backup Size**: Large backups may take time to create/restore
2. **Disk Space**: Monitor available disk space for backup storage
3. **File Permissions**: Ensure proper permissions on data directories
4. **Network Issues**: Handle timeouts during backup operations

### Backup Management

- Backups are not automatically cleaned up (manual deletion required)
- No built-in retention policies (consider implementing based on needs)
- Backup metadata includes size and creation date for management decisions

### Recovery Procedures

In case of system issues:

1. **Manual Backup Location**: Backups are stored in `/data/backups/{app-store-id}/{app-name}/`
2. **Archive Format**: Standard tar.gz archives can be extracted manually if needed
3. **Directory Structure**: Each backup contains `app-data/`, `app/`, and optionally `user-config/` directories

## Future Enhancements

### Potential Improvements

1. **Incremental Backups**: Reduce backup size and time for large applications
2. **Backup Retention Policies**: Automatic cleanup of old backups
3. **External Storage**: Support for cloud storage backends (S3, etc.)
4. **Backup Verification**: Checksum verification for backup integrity
5. **Scheduled Backups**: Automatic backup creation on schedules
6. **Backup Encryption**: Encrypt backup archives for enhanced security
7. **Backup Compression Options**: Support for different compression algorithms
8. **Cross-Platform Compatibility**: Enhanced support for different architectures

This documentation provides a comprehensive understanding of the backup and restore system architecture, implementation details, and operational considerations for core contributors working on Runtipi.
