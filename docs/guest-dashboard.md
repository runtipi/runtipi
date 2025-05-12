# Guest Dashboard Technical Documentation

This document provides a detailed technical overview of the Guest Dashboard feature in Runtipi, intended for core contributors to the project.

## Overview

The Guest Dashboard is a feature that allows non-authenticated users to access and launch selected applications in a Runtipi instance. It provides a simplified view of apps that administrators have explicitly configured to be visible to non-authenticated users, enabling public access to specific services without requiring authentication.

## Architecture

The guest dashboard feature follows Runtipi's frontend/backend separation:

1. **Backend**: Provides API endpoints and handles configuration storage
2. **Frontend**: Renders the guest view and handles app launching

### Backend Implementation

#### Configuration Storage

The guest dashboard is controlled by a boolean setting in the user settings configuration:

- The `guestDashboard` flag in the user settings determines if the feature is enabled
- Settings are persisted in the `settings.json` file in the state directory
- Configuration is loaded via the `ConfigurationService` and exposed through the `/user-context` endpoint

#### API Endpoints

1. **User Context Endpoint** (`GET /user-context`):

   - Returns `isGuestDashboardEnabled` flag in the response
   - Available without authentication
   - Used by the frontend to determine whether to show the guest dashboard or login page

2. **Guest Apps Endpoint** (`GET /apps/guest`):
   - Defined in `AppsController`
   - Returns apps specifically marked as visible on the guest dashboard
   - Does not require authentication
   - Returns both app information and the configured `localDomain` for local access

#### Apps Repository

The `AppsRepository` provides the `getGuestDashboardApps()` method that:

- Queries the database for apps where `isVisibleOnGuestDashboard` is set to `true`
- Returns only apps that are explicitly marked for guest access
- Filters out apps that should not be publicly accessible

### Frontend Implementation

#### Routing Logic

The main application routing in `App.tsx` uses the `isGuestDashboardEnabled` flag from the user context to determine:

- Whether to show the login page (if the flag is `false` and user is not logged in)
- Whether to show the guest dashboard (if the flag is `true` and user is not logged in)

The `AuthenticatedRoute` component implements this logic:

```typescript
if (!isLoggedIn && !isGuestDashboardEnabled) {
  return <Navigate to="/login" replace />;
}

if (isGuestDashboardEnabled && !isLoggedIn) {
  return <GuestDashboard />;
}
```

#### Guest Dashboard Component

The `GuestDashboard` component in `guest-dashboard.tsx`:

- Uses a different header component (`GuestHeader`) than the authenticated dashboard
- Fetches app data using the guest apps endpoint via `getGuestAppsOptions()`
- Displays available apps as tiles
- Shows an empty state when no apps are configured for guest access

#### App Access Methods

The dashboard displays apps with multiple access methods:

1. **Domain access**: For apps configured with a custom domain
2. **Local domain access**: Using the pattern `{appName}-{appStoreId}.{localDomain}`
3. **Port access**: Direct access using `{hostname}:{port}`

These access methods are presented in a dropdown menu when clicking on an app tile.

## User Settings

Administrators configure the guest dashboard through settings:

1. **Enabling the guest dashboard**:

   - In settings, the `guestDashboard` toggle controls whether the guest dashboard is accessible
   - This setting is stored in user settings and persists across restarts

2. **App visibility**:
   - During app installation or configuration, administrators can set the `isVisibleOnGuestDashboard` flag
   - Only apps with this flag set to `true` appear in the guest dashboard

## Security Considerations

The guest dashboard introduces specific security considerations:

1. **No authentication required**: Anyone with access to the Runtipi instance URL can access the guest dashboard
2. **Limited app exposure**: Only explicitly marked apps are shown
3. **App isolation**: Each app maintains its own security context
4. **Access control**: Access methods respect the app's configured security (exposed/not exposed)

## Implementation Details

### Guest Dashboard Toggle Workflow

1. Admin enables the `guestDashboard` setting in the UI
2. Setting is persisted via `PATCH /user-settings` endpoint
3. The `ConfigurationService.setUserSettings()` method writes to `settings.json`
4. The setting is also added to the environment variables map with `envMap.set('GUEST_DASHBOARD', 'true')`
5. When users access the Runtipi instance without logging in, they see the guest dashboard instead of being redirected to login

### App Visibility Workflow

1. During app installation, an admin can check the "Visible on Guest Dashboard" option
2. This sets the `isVisibleOnGuestDashboard` flag on the app entity in the database
3. The `getGuestDashboardApps()` method filters apps based on this flag
4. Only matching apps are returned by the guest apps endpoint and displayed on the dashboard

## Testing

The guest dashboard feature has E2E tests in the `0005-guest-dashboard.spec.ts` file that verify:

1. Enabling/disabling the guest dashboard
2. Visibility of apps based on their configuration
3. App access methods functionality
4. Redirection to login when the feature is disabled

## Usage Examples

### For Administrators

1. Enable the guest dashboard in Settings > General > "Guest Dashboard"
2. When installing apps, check "Visible on Guest Dashboard" for apps you want publicly accessible
3. Test access by logging out and verifying the correct apps are shown

### For Users

1. Access the Runtipi instance URL without logging in
2. View available apps on the dashboard
3. Click on an app to see available access methods
4. Select the preferred access method to launch the app

## Known Limitations

1. The guest dashboard does not support user-specific configurations for apps
2. All users share the same view and access methods
3. No usage tracking or analytics for guest access
4. No rate limiting specific to guest dashboard access
