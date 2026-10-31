# Runtipi MCP server

The backend exposes Streamable HTTP at `/api/mcp`. Create a credential under **Settings → Security → Agent access**, then configure an MCP client that supports custom HTTP headers:

```json
{
  "url": "https://your-runtipi-instance/api/mcp",
  "headers": {
    "Authorization": "Bearer <your-agent-token>"
  }
}
```

The token alert also provides ready-to-copy tabs for [Claude Code](https://code.claude.com/docs/en/mcp), [Codex](https://developers.openai.com/codex/mcp), [Cursor](https://cursor.com/docs/mcp), and [VS Code](https://code.visualstudio.com/docs/agents/reference/mcp-configuration), with the instance endpoint and issued token already filled in. Each tab shows the destination configuration file.

The surrounding client configuration varies by agent. This endpoint supports the current protocol and the SDK's stateless compatibility mode for older clients. Browser-based OAuth connection flows are not implemented.

Credentials grant the issuing user's full application access. Creation requires a dashboard session and password confirmation. Tokens are shown once, stored as hashes, expire after 1–365 days, and can be revoked from the same panel. Changing the account username/password or enabling/disabling TOTP invalidates previously issued tokens. Preparing a TOTP secret does not invalidate a token before the setup code can be verified.

Agent credentials are accepted only at the MCP endpoint and its transfer routes. They do not authenticate as the CLI or provide password-reset recovery privileges. Credential management itself requires a dashboard session.

## Finding and inspecting apps

`search_apps` accepts `query` (`search` remains an alias), `pageSize`, `cursor`, `category`, and `storeId`. Results contain concise catalog entries with `urn`, `name`, `version`, `tipi_version`, `min_tipi_version`, `short_desc`, and minimum-version `compatibility`. Full READMEs are available through `get_app`. Always use the returned `urn`, including its store suffix, with app tools.

```json
{ "name": "search_apps", "arguments": { "query": "bookstack", "pageSize": 5 } }
```

```json
{ "name": "get_app", "arguments": { "urn": "bookstack:runtipi" } }
```

`get_app` includes `accessUrl` and separate direct, local, and exposed `accessUrls` derived from saved Runtipi routing settings. It also returns minimum-version compatibility, update compatibility, public generated environment values, and actual container state, health, restart count, exit code, and published ports. Containers can be running while the application is broken; `health: null` means no Docker health check is available. Container diagnostics can be unavailable without preventing metadata inspection.

For resolved service environment values such as `APP_URL` and `ASSET_URL`, use:

```json
{ "name": "get_app_environment", "arguments": { "urn": "bookstack:runtipi" } }
```

This reads generated `app.env`, user overrides, and the saved configuration resolved by Docker Compose. Public URL/routing variables are visible; other values are redacted. `emptyVariables` identifies empty service variables without revealing their values. Set `includeSecrets: true` when secret values are needed. These are saved/rendered values; running containers may still use older values if a restart is pending. `get_user_config` reads only user-authored override files, so its `appEnv: null` does not mean the generated environment is empty.

## Installing and configuring apps

Read `get_app.info.form_fields` and `compatibility` before installation. Pass runtime fields inside a `form` object, using each field's `env_variable` as its key. The backend generates omitted random fields, replaces blank stored random values, preserves existing nonblank values, and honors explicit nonblank replacements. Omitting `port` uses the app's default and still generates `APP_DOMAIN`.

```json
{ "name": "install_app", "arguments": { "urn": "bookstack:runtipi", "form": { "port": 8235, "openPort": true } } }
```

Add any required fields described by that app; the example's empty app-specific form is not sufficient for every app. Poll the returned operation, then inspect container diagnostics and logs.

`update_app_settings` replaces the runtime `form`: read `get_app.app.config`, merge changes, and send the full form. `get_app_config` returns `{ "config": "..." }` (or `{ "config": null }` when absent); `update_app_config` writes that dynamic compose definition. `update_app_config.config` must be a serialized YAML or JSON string, as returned by `get_app_config`. `update_user_config` takes literal compose YAML in `dockerCompose` and dotenv text in `appEnv`.

Settings comparisons ignore JSON object key order, so submitting unchanged settings does not create a false pending restart. An existing pending restart is preserved until applied. `pendingRestartInfo` explains how to apply saved runtime changes with `restart_app`. `get_compose_diff` and `get_config_diff` compare installed definitions with catalog templates; they can show no changes while an app restart is pending. Definition and override edits also need a restart to take effect, even if no pending flag has been recorded.

Tool descriptions and discovery schemas document these input shapes. Unknown top-level arguments and conflicting aliases are rejected rather than ignored; application-specific fields remain allowed inside `form`.

## Operations

Use `get_app` to inspect metadata and form fields before installing or configuring an app. Discovery exposes tools for apps, stores, custom apps, editable definitions, compose/env overrides, backups, settings, diagnostics, links, and account security.

Lifecycle tools return an `operationId` and backend `requestId`. Poll `get_operation` for the outcome; acceptance does not mean completion. Bulk actions return individual results so partial failures remain visible. Updates and backups expose existing job progress and cancellation when the phase permits it. Use `get_app_job` / `cancel_app_job` for jobs started through the dashboard or CLI as well. Other actions use the existing lifecycle success/error events. Queue-backed operations report request-correlated results from the lifecycle module after database updates complete. Installing an already registered app tracks its delegated start request; reset/restore of a running app waits for its own follow-up start result. App-wide SSE events cannot finish these operations. A succeeded operation confirms lifecycle command completion, not application health.

Active operations remain queryable until completion. Completed queue operation history is held in memory for one hour, bounded to the latest 1,000 completed requests, and is lost on backend restart. Update/backup results use the canonical job service, which retains the latest job per app. Missing or expired outcomes are never assumed successful. MCP records only ownership and the requested command; execution state belongs to the lifecycle module.

Every tool publishes an output schema. Text content and structured content contain the same object. Collections use named fields (`apps`, `links`, `appStores`, or `data`); nullable reads retain their null values. Mutations explicitly return success or an operation result. Unexpected failures return a diagnostic ID correlated with server-side exception type, safe error code and stack frames; passwords, configuration values, and exception message contents are not logged by the adapter.

## Files and logs

`get_backup_transfer` returns a path and method for archive download or streaming upload. Resolve the path against the instance origin and send the same Authorization header. Upload raw gzip bytes using PUT and Content-Type `application/gzip`. Uploads stream into a private staging file and publish only after completion, without buffering the archive in memory. A compatibility multipart POST route using field `file` allows up to 64 MiB. Downloads stream through the existing backup service. `get_logo_upload` provides an equivalent JPG upload path using field `image`, limited to 5 MiB.

No bearer tokens are embedded in transfer URLs. File paths inside the container are not exposed as transfer locations. `get_logs` accepts `lines` (1–1,000, default 100; `maxLines` remains an alias). It returns a timestamped tail per container, bounded to 256 KiB total, with a ten-second process timeout and a `truncated` flag when the byte cap is reached.

```json
{ "name": "get_logs", "arguments": { "urn": "bookstack:runtipi", "lines": 50 } }
```

## Deployment controls

Set `RUNTIPI_MCP_ENABLED=false` in the backend environment to disable both tools and transfers. Access otherwise requires a valid credential; an instance with no issued credentials has no agent access.

Host/Origin validation permits configured instance domains, the configured internal IP, and loopback hostnames. Development also permits reserved `.localhost` names for Portless. For an additional reverse-proxy hostname, set `RUNTIPI_MCP_ALLOWED_HOSTS` to a comma-separated list of hostnames without schemes or ports. These are backend environment variables; ensure your deployment passes them into the container.

The implementation uses the official v2 SDK packages. Migration `0034_jazzy_agent_zero` adds credential storage and runs through the normal backend migration process.

CLI-only platform administration, such as updating or shutting down Runtipi itself, is outside this interface. Application reset, uninstall, restore, configuration changes, and verified account changes are available to the agent.
