# Security Policy

## Scope

Runtipi is a self-hosted application orchestrator, not a sandbox for untrusted
applications. This policy covers Runtipi's dashboard, API, backend, and CLI.

## Trust model

The machine operator is a trusted administrator. Choosing an app store and
installing or updating its apps is a decision to trust that store, its maintainers,
its app definitions, and the container images and migrations those apps use.
Operators are responsible for evaluating these sources and the privileges they
request. A trusted store can become compromised; that supply-chain risk remains
the operator's responsibility.

App definitions can request root containers, privileged execution, host bind
mounts, and other Docker capabilities. With a rootful Docker daemon, these can
give an app control of the host. Runtipi does not promise isolation between
installed apps, the host, and its own deployment against malicious app code.
Container root alone does not necessarily grant host control; the effective
capabilities, mounts, and Docker configuration determine the authority granted.

Remote clients, unauthenticated visitors, and users of hosted applications are
not trusted Runtipi administrators. Installing an app does not authorize those
clients to manage Runtipi or access its credentials.

## Security properties

- Management operations and private information require the intended
  authentication and authorization.
- Intentionally public features must expose only their intended data and actions.
- Sessions, credentials, and recovery mechanisms must resist attacks from
  untrusted clients.
- Untrusted requests must not acquire administrative or host authority through
  Runtipi.

## Reportable findings and severity

Reports should identify the attacker, the input they control, the required
operator actions, and the security boundary crossed. Severity must reflect
authority gained beyond what the operator already granted.

Authentication bypasses, unauthorized management actions, disclosure of private
information, and code execution reachable by untrusted clients are in scope.

## Out of scope and accepted risks

- Malicious or compromised operator-selected app stores, app definitions,
  container images, and app migrations.
- Host access, data access, or damage caused by those trusted sources, including
  their use of root containers, privileged mode, host mounts, or Docker access.
- Actions requiring an already-compromised machine administrator or Docker daemon.

An alternative way for an operator-selected malicious store or app to affect the
host does not, by itself, establish an additional security boundary violation.
Whether that effect occurs before or after a container starts does not, by
itself, change this trust assumption.

We may still fix unsafe file handling and other robustness issues in these paths
as defense in depth. Such fixes do not establish a supported sandbox for
untrusted stores or apps. An independent attack crossing an in-scope boundary
should be assessed on its own prerequisites and impact.

## Deployment assumptions and reporting

Operators are responsible for securing their host, Docker daemon, network
exposure, and chosen software sources. External container-hardening controls do
not create a Runtipi sandbox guarantee.

Report in-scope vulnerabilities privately through
[GitHub security advisories](https://github.com/runtipi/runtipi/security/advisories/new).
