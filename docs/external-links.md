# External Links Technical Documentation

This document provides a detailed technical overview of the External Links feature in Runtipi, intended for core contributors to the project.

## Overview

The External Links feature allows users to create and manage custom links to external resources directly from their Runtipi dashboard. These links are displayed alongside installed apps in the "My Apps" section, providing a unified interface for accessing both Runtipi-hosted applications and external websites or services.

## Architecture

The external links feature follows Runtipi's frontend/backend separation:

1. **Backend**: Provides API endpoints to manage links and stores them in the database
2. **Frontend**: Renders links alongside apps and provides UI for managing them

### Backend Implementation

#### Database Schema

External links are stored in the database using the `link` table with the following schema:

```typescript
export const link = pgTable("link", {
  id: serial().primaryKey().notNull(),
  title: varchar({ length: 20 }).notNull(),
  url: varchar().notNull(),
  iconUrl: varchar("icon_url"),
  createdAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp({ mode: "string" }).defaultNow().notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => user.id),
  description: varchar({ length: 50 }),
});
```

This schema enforces:

- A maximum length of 20 characters for link titles
- A maximum length of 50 characters for descriptions
- Required URL field
- Optional icon URL field
- User association via foreign key

#### Module Organization

The links feature is implemented as a dedicated module in the backend with:

- `LinksModule`: Registers controllers and services
- `LinksController`: Handles HTTP requests
- `LinksService`: Contains business logic
- `LinksRepository`: Interacts with the database
- `LinksDto`: Defines data transfer objects

#### API Endpoints

The backend exposes the following REST endpoints in the `LinksController`:

1. **Get Links** (`GET /api/links`):

   - Returns all links belonging to the authenticated user
   - Requires authentication
   - Response includes all link properties

2. **Create Link** (`POST /api/links`):

   - Creates a new link
   - Requires authentication
   - Request body must include title and URL
   - Optionally includes description and icon URL

3. **Edit Link** (`PATCH /api/links/{id}`):

   - Updates an existing link
   - Requires authentication
   - Only allows editing of the user's own links
   - Accepts partial updates

4. **Delete Link** (`DELETE /api/links/{id}`):
   - Removes a link
   - Requires authentication
   - Only allows deletion of the user's own links

#### Security Considerations

Links are protected with the following security measures:

1. **User Scoping**: Links are associated with specific users and cannot be accessed or modified by other users
2. **Authentication**: All API endpoints require user authentication via `AuthGuard`
3. **Input Validation**: Request bodies are validated using Zod schemas

### Frontend Implementation

#### UI Components

The frontend implements several components to manage links:

1. **LinkTile**: Displays a single link in a card format similar to app tiles
2. **AddLinkButton**: Renders a button to create a new link
3. **AddLinkDialog**: Provides a form for creating or editing links
4. **DeleteLinkDialog**: Confirms link deletion

#### State Management

Links are fetched and managed using TanStack Query:

1. **Query Hook**: The `getLinksOptions` hook fetches links from the API
2. **Mutations**: Operations like create, edit, and delete use mutation hooks
3. **Cache Invalidation**: After mutations, the links query is invalidated to refresh data

#### Integration with Dashboard

Links are integrated into the dashboard alongside apps:

1. **My Apps Page**: Lists both installed apps and custom links
2. **Unified Interface**: Links have a similar appearance to apps but open in a new tab
3. **Context Menu**: Right-clicking on links provides edit and delete options

## User Experience Flow

The user experience for managing external links follows this flow:

1. **Viewing Links**: Links appear on the "My Apps" page alongside installed applications
2. **Adding Links**: Users can click the "Add Link" button (+ icon with "Add Link" text)
3. **Link Form**: Users enter a title, URL, and optionally a description and icon URL
4. **Managing Links**: Users can edit or delete links via the context menu (right-click)
5. **Using Links**: Clicking a link opens the target URL in a new browser tab

## Implementation Details

### Link Creation Flow

1. User clicks the "Add Link" button
2. `AddLinkDialog` component is rendered
3. User fills out the form and submits
4. Frontend calls `POST /api/links` with the link data
5. Backend validates the input and creates a record in the database
6. Frontend receives a success response and updates the UI

### Link Customization

Links can be customized with:

1. **Title**: Displayed as the main heading of the link tile (max 20 chars)
2. **Description**: Secondary text below the title (max 50 chars)
3. **URL**: The target destination when clicking the link
4. **Icon URL**: An optional image URL for a custom icon

The icon URL allows users to provide a visual representation for the link. If no icon URL is provided, a default icon is shown.

### Data Validation

Both frontend and backend validate link data:

1. **Frontend Validation**:

   - Uses Zod schema validation through React Hook Form
   - Validates URLs, length limits, and required fields
   - Provides immediate feedback to users

2. **Backend Validation**:
   - Uses Zod DTOs to validate incoming requests
   - Enforces database constraints and business rules
   - Returns translatable error messages

## Technical Limitations

The current implementation has some limitations:

1. No automatic favicon fetching from target websites
2. Limited customization options compared to installed apps
3. No support for organizing links into categories or folders
4. No ability to schedule or temporarily disable links

## Related Components

The external links feature interacts with:

1. **Authentication System**: For user identification and permissions
2. **Database Module**: For storing and retrieving link data
3. **My Apps Page**: For displaying links alongside apps
4. **User Interface Components**: For consistent styling and behavior

## Usage Examples

### For Users

1. **Work Resources**: Add links to company resources like HR portals or documentation
2. **Personal Services**: Link to frequently used web services not installed in Runtipi
3. **Application Companions**: Add links to external resources related to installed apps

### For Developers

1. **Testing Links Module**: Examples of creating and manipulating links through the API
2. **Extending Functionality**: Adding new features like link categories or automatic icon fetching
3. **Customizing Appearance**: Modifying the link tile appearance
