# Native MCP access for Runtipi

Investigated on 2026-10-31 against checkout `5c5c691a`. This is a proposal based on backend source inspection and official protocol documentation. The initial investigation preceded implementation. See [the MCP module guide](../packages/backend/src/modules/mcp/README.md) for the implemented connection flow, configuration, and current limits.

## Recommendation

Add a native NestJS `McpModule` at `/api/mcp`, exposing explicit tools backed by the same application services as the dashboard. Give the agent a revocable credential belonging to a real Runtipi user. Full access should permit every application operation that user can perform, retaining ownership checks, validation, demo restrictions, and additional password/TOTP requirements.

The architecture is a good fit: NestJS 11 with Express, exported feature services, ArkType DTOs, and a shared lifecycle layer. Most work is transport adaptation, user-bound credentials, capability coverage, and reliable operation results. The latter two require more work than registering tools.

Interpret “everything the user can do” as authenticated production dashboard/backend parity. Include destructive actions and account management in that target. Host administration that exists only in the CLI is a separate capability boundary.

## Existing backend and permissions

- [Bootstrap](../packages/backend/src/main.ts) creates a Nest Express application, applies the `/api` prefix, cookie parsing, validation, and CORS, and generates OpenAPI only outside production. The frontend is served by the same backend in production.
- [AppModule](../packages/backend/src/app.module.ts) applies authentication middleware to all routes and a global throttling guard. Most application endpoints opt into `AuthGuard`; authentication is not itself a global guard.
- [AuthMiddleware](../packages/backend/src/modules/auth/auth.middleware.ts) resolves sessions to users. Its bearer path verifies an HS256 JWT with `cliSecret`, requires `sub === 'cli'`, and loads the first operator. This does not identify the user who authorized a particular agent.
- [AuthGuard](../packages/backend/src/modules/auth/auth.guard.ts) requires a user, rejects forward-auth credentials, and checks same-origin for unsafe browser-session requests. It does not implement a general operation-by-role policy.
- [Registration](../packages/backend/src/modules/auth/auth.service.ts) creates the first operator and prevents a second operator registration. An `operator` field exists, but the inspected paths do not establish a complete multi-role policy system. Preserve each use case's actual restrictions.
- [LinksController](../packages/backend/src/modules/links/links.controller.ts) passes the caller's user ID to its service, and [LinksRepository](../packages/backend/src/modules/links/links.repository.ts) constrains records by owner. Using the first operator would change behavior here.
- [AuthService](../packages/backend/src/modules/auth/auth.service.ts) verifies passwords for account changes and TOTP secret generation/disable, and a TOTP code for setup. Preserve session invalidation and demo restrictions too.

Service reuse does not automatically preserve HTTP guarantees. Route guards, DTO pipes, interceptors, controller checks, and response handling do not run when a tool invokes a service directly.

## Transport and dependencies

Use Streamable HTTP through the existing backend origin. It requires no separate daemon, port, Docker socket mount, or deployment lifecycle. Keeping the route under `/api` also matches production static-file exclusion.

The official SDK identifies v2 as its stable line. Use `@modelcontextprotocol/server` and the `@modelcontextprotocol/node` adapter. Source manifests inspected declare versions `2.4.0` and `2.1.2` respectively and Node >=20. Those are source-manifest observations, not verification of npm dist-tags: resolve and pin compatible published versions at implementation time. Avoid copying old v1 `@modelcontextprotocol/sdk/server/...` imports into a v2 integration. [SDK README](https://github.com/modelcontextprotocol/typescript-sdk), [server manifest](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/server/package.json), [Node adapter manifest](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/middleware/node/package.json).

Prefer `createMcpHandler` with a fresh `McpServer` factory and `toNodeHandler` for Express. The factory receives request context, including verified authentication; bind tools to that caller while sharing injected Nest services. Forward the already parsed `req.body`. Mount through a Nest controller so intended guards and global throttling run; a raw Express route would require composing those protections explicitly. Integrate handler cleanup with Nest shutdown. [HTTP handler guide](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/http.md), [Express integration](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/express.md).

The current protocol revision is `2026-07-28`, using per-request metadata rather than the older connection-scoped handshake model. The SDK handler can also serve 2025-era clients statelessly by default. Test actual target clients' initialization and transport behavior; add legacy session support only if needed. A transport session ID must never substitute for authorization. [Transport overview](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports), [legacy compatibility](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/serving/legacy-clients.md).

Apply explicit Host and Origin validation at the MCP boundary. Reject a present disallowed Origin, while allowing an absent Origin for authenticated non-browser clients. Existing session CSRF checks do not cover the bearer-authenticated MCP boundary, and `enableCors()` is not an authorization policy. Use configured instance hosts and deployment settings instead of trusting arbitrary forwarded headers. Keep browser-session protections intact. [Streamable HTTP requirements](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http), [Node adapter guards](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/packages/middleware/node/README.md).

## User-bound agent credentials

For an agent that supports custom Authorization headers, personal access credentials are a practical first connection method:

1. The user creates a named credential in the authenticated dashboard, selecting full access or an optional narrower scope.
2. Generate a high-entropy random secret, show it once, and store only a digest plus credential ID, user ID, scope, creation/expiry/revocation dates, and last-use metadata.
3. Verify the credential on every MCP HTTP request and reload its user and current permissions. Resolve MCP `authInfo` and application identity from this result. Reject revoked, expired, invalid, or orphaned credentials before dispatch.
4. Effective authority is the intersection of user permissions and credential scope. Full access grants no additional privileges.
5. Attribute each action to user and credential ID. Redact bearer secrets and secret-bearing arguments from audit logs.
6. Make credential creation/revocation session-authenticated management operations. Decide explicitly whether agents may mint additional credentials; generic endpoint export should not accidentally enable that. Define invalidation behavior for account security changes.

Use an MCP-specific verifier. Do not label personal tokens as `authMethod: 'cli'`, share `cliSecret`, or fall back to the first operator. Require bearer identity on `/api/mcp` even if a browser cookie accompanies it: the existing middleware prioritizes the session cookie, which otherwise creates ambiguous identity. Isolate that policy to the MCP route.

Personal tokens do not provide universal MCP authorization interoperability. Clients expecting browser-based connection need the OAuth resource-server profile: protected-resource metadata, authorization-server discovery, Authorization Code with PKCE, instance-specific audience/resource validation, token lifecycle, and browser login/TOTP plus client consent. The inspected Runtipi authentication module has no OAuth server; SDK helpers do not supply the entire product flow. A co-hosted authorization server or an external provider linked to local users are possible approaches. Use a maintained OAuth implementation. Send credentials in Authorization headers on every request, never query strings. [MCP authorization specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization).

For unattended full application control, personal tokens are the smaller first slice if the target client supports them. OAuth is a separate interoperability milestone.

## Capability coverage

Maintain an inventory mapping every production user action to a tool or an equivalent workflow. Seed it from controllers/OpenAPI, with deliberate treatment of public endpoints, auth plumbing, development-only routes, multipart transfers, and CLI-only recovery.

| Capability                | Existing implementation                                                                                                                                                   | Proposed coverage                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Instance context/settings | [AppController](../packages/backend/src/app.controller.ts), [ConfigurationService](../packages/backend/src/core/config/configuration.service.ts)                          | Context/version, read/update settings, acknowledge welcome                                                                   |
| App discovery/inspection  | [AppsController](../packages/backend/src/modules/apps/apps.controller.ts), [MarketplaceController](../packages/backend/src/modules/marketplace/marketplace.controller.ts) | Search catalog, list installed apps, inspect metadata/forms/status, free port, compose/config diffs, ignore/unignore updates |
| App lifecycle             | [AppLifecycleController](../packages/backend/src/modules/app-lifecycle/app-lifecycle.controller.ts)                                                                       | Install/start/stop/restart/update/reset/uninstall, runtime settings, bulk actions, supported job inspection/cancellation     |
| App stores                | [MarketplaceController](../packages/backend/src/modules/marketplace/marketplace.controller.ts)                                                                            | List all/enabled, create/edit/delete, pull and reinitialize marketplace                                                      |
| Custom apps               | [CustomAppController](../packages/backend/src/modules/custom-apps/custom-apps.controller.ts)                                                                              | Create, edit configuration/metadata, JPG logo upload                                                                         |
| Editable definitions      | [AppConfigController](../packages/backend/src/modules/app-config/app-config.controller.ts)                                                                                | Read/write definition, template diff/sync                                                                                    |
| Compose/env overrides     | [UserConfigController](../packages/backend/src/modules/user-config/user-config.controller.ts)                                                                             | Read/write content, enable/disable overrides                                                                                 |
| Backups                   | [BackupsController](../packages/backend/src/modules/backups/backups.controller.ts)                                                                                        | Create/list/restore/delete, upload/download archives                                                                         |
| Diagnostics               | [SystemController](../packages/backend/src/modules/system/system.controller.ts), [SSEController](../packages/backend/src/core/sse/sse.controller.ts)                      | System load, local certificate, bounded app/instance logs, progress                                                          |
| Dashboard links           | [LinksController](../packages/backend/src/modules/links/links.controller.ts)                                                                                              | List/create/edit/delete as credential owner                                                                                  |
| Account/security          | [AuthController](../packages/backend/src/modules/auth/auth.controller.ts), [AuthService](../packages/backend/src/modules/auth/auth.service.ts)                            | Username/password changes and TOTP management with existing proof requirements                                               |

Do not exclude account operations while claiming complete parity. A token alone cannot bypass required passwords or TOTP. An eventual browser reauthentication workflow could issue a short-lived grant bound to the user and exact action, keeping password material out of agent context; that is additional implementation work. Initial tools can retain existing required inputs for clients capable of providing them securely.

Login, registration, Traefik forward-auth exchanges, and logout are connection/session machinery rather than application management tools. The password-reset endpoint explicitly requires CLI authentication; ordinary agent credentials must not acquire that recovery privilege. Runtipi self-update and stopping the platform also exist in CLI commands ([update](../cli/internal/commands/update.go), [stop](../cli/internal/commands/stop.go)); exposing those requires a separately authorized host-management interface.

## Tool contracts and shared behavior

Expose explicit actions such as `list_apps`, `get_app`, `install_app`, `update_app`, `restore_backup`, and `update_user_config`. Explicit schemas make discovery useful and let each tool enforce a known contract. A generic shell/Docker executor or arbitrary HTTP-request tool does not provide that boundary.

Reuse exported ArkType schemas or DTO `.schema` values. The v2 SDK supports ArkType through Standard Schema with JSON Schema generation. Verify installed-version compatibility and conversion of defaults, transforms, refinements, records, and dynamic forms in an integration spike. Existing settings schemas include parsing transforms, so support needs testing against these actual schemas. [SDK schema documentation](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/advanced/schema-libraries.md).

Let the agent inspect app metadata and form definitions before installation/configuration. Reuse `castAppUrn` and lifecycle validation; app identifiers should not become raw filesystem paths. Keep editable definitions, runtime form settings, and compose/env overrides distinct because they have different behavior.

Move controller-only business checks and orchestration into shared use cases where needed. Examples include backup filename validation, image MIME restrictions, and marketplace initialization after store changes. Preserve account session invalidation. Existing feature modules already export most required services.

Return compact structured data and actionable failures: invalid fields, missing apps, busy apps, unsupported cancellation, or minimum version. Distinguish accepted work from completed work. Tool execution failures use `isError: true`; malformed or unknown protocol requests use protocol errors. Describe actual read-only, destructive, and idempotent behavior in annotations; annotations do not enforce permissions. JSON-RPC request IDs do not make mutations idempotent. [MCP tools specification](https://modelcontextprotocol.io/specification/2026-07-28/server/tools).

Keep list results bounded and concise. Return secrets the user is authorized to manage through deliberate detail/configuration tools, without repeatedly including them in inventories or audit logs. Full access still needs a path to read/edit values the dashboard exposes. Audit actor, operation, target, outcome, and correlation ID. Treat app-store descriptions and logs as application data when returning them to the agent.

## Operation completion: the main backend gap

[AppJobService](../packages/backend/src/modules/app-lifecycle/services/app-job.service.ts) supplies request IDs, progress, cancellation, and concurrency control. Only [update](../packages/backend/src/modules/app-lifecycle/handlers/update-app.handler.ts) and [backup](../packages/backend/src/modules/app-lifecycle/handlers/backup-app.handler.ts) currently submit to it.

Other handlers, including [install](../packages/backend/src/modules/app-lifecycle/handlers/install-app.handler.ts), [start](../packages/backend/src/modules/app-lifecycle/handlers/start-app.handler.ts), and [restore](../packages/backend/src/modules/app-lifecycle/handlers/restore-app.handler.ts), return generated request IDs while queue callbacks publish events and update app state. A universal `get_operation(requestId)` cannot just wrap `AppJobService`. A null job means neither success nor failure. Bulk actions also lack aggregate operation records.

Recommended progression:

1. Expose existing update/backup job status with accurate cancellability and phases.
2. Add shared operation tracking for remaining lifecycle and bulk actions, associating request IDs and actors with retained terminal outcomes. Reuse existing job infrastructure where appropriate; avoid a separate MCP execution engine.
3. Return `{ operationId, status: 'accepted', ... }` promptly. Provide `get_operation` and cancellation where supported. Preserve non-cancellable replacement/recovery phases.
4. Define retention/restart behavior. Current jobs are in memory, one record per app, overwritten by later submissions. Report expired/unknown outcomes honestly unless durable history is added.

App-status polling can support a minimal workflow, but cannot reliably distinguish this request from concurrent actions or recover missed error events. Do not describe it as complete operation observability. Protocol-specific long-running features can be layered on later; typed status tools keep the first integration independent of client extensions.

## Logs and files

Current logs are unbounded SSE streams through [SSEService](../packages/backend/src/core/sse/sse.service.ts); [DockerService](../packages/backend/src/modules/docker/docker.service.ts) invokes compose logs with `--follow`. Add bounded plain-text snapshots with line/byte/time limits and process cleanup. HTML-colored dashboard streams are unsuitable as tool responses. Subscriptions can follow the initial snapshot tools.

Backups and logos use multipart uploads and binary responses. Full parity needs usable transfers, not just archive-name tools. Provide user-authorized upload/download tickets with short expiry and object binding, or protected HTTP endpoints usable with the credential. Return transfer descriptors and expiry rather than container-local filesystem paths. Keep bearer credentials out of URLs, preserve validation, enforce limits, and verify that the chosen client can actually perform transfers. Avoid large gzip archives embedded in JSON arguments/results.

## Implementation sequence

1. **Authenticated vertical slice:** add `modules/mcp/{mcp.module,mcp.controller,mcp.service}.ts`, a request-specific server factory, user-bound credentials, Host/Origin validation, and enable/disable settings. Demonstrate search/list/inspect and one lifecycle action through a real client, including production bundling.
2. **Application coverage:** grouped tool registrations for apps, lifecycle, stores, custom apps, configuration, backups, diagnostics, links, settings, and account operations. Extract shared controller checks and maintain the route-to-tool inventory.
3. **Completion and transfers:** extend queue/bulk operation reporting; add bounded logs and authenticated binary workflows. Required before claiming complete parity.
4. **Connection UX:** dashboard credential management and copyable endpoint/client configuration. OAuth when required by the selected client's connection flow.

Suggested components: `agent-credentials` for persistence/management, `modules/mcp/tools/*.ts` for grouped registrations, and shared operation tracking within the lifecycle layer. Keep policy and validation in application boundaries rather than embedding a separate policy system in callbacks.

## Verification required for implementation

All new or modified tests belong in dedicated `__tests__` directories.

- Exercise discovery and real calls over HTTP with the SDK client: parsed body handling, request identity, protocol compatibility, shutdown, and the actual target agent client.
- Verify missing/expired/revoked credentials, user changes, scopes, invalid Host/Origin, absent non-browser Origin, and mixed cookie/bearer requests.
- Compare REST/MCP behavior for link ownership, app identifiers, demo restrictions, filenames, MIME/size limits, account proof requirements, and service side effects.
- Verify accepted/running/completed/failed work, partial bulk failure, unsupported cancellation, non-cancellable phases, retries, and expired operation records.
- Verify binary round trips, bounded log cleanup, and redaction of credentials from outputs/audit records.

The endpoint is a small architectural addition. Dependable full parity is a broader feature: credentials, operation outcomes, files, and account verification need explicit work beyond tool registration.
