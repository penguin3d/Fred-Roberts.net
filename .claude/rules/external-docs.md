# External library docs — read the version we run, flag upgrades that fix real problems

[docs/reference-links.md](../../docs/reference-links.md) is the registry of external docs,
annotated with the version we actually run. Non-trivial work against an external
library/framework follows this order:

## 1. Resolve OUR version first

Never code from "latest" docs unchecked — an API in latest may not exist in our pin, and
our pin may have APIs latest already deprecated.

| Where | Pins |
|---|---|
| `frontend/package.json` | new-fleet Angular/Ionic/Stripe/… |
| `package.json` | the one place versions are pinned in this workspace |
| `backend/Directory.Build.props` | shared .NET pins (EF Core, Npgsql EF, Microsoft.Extensions) |
| `backend/<Host>/*.csproj` | everything else (Elsa, Stripe.net, Google.Cloud.*, …) |

## 2. Check the registry, keep it current

- Consult reference-links.md before searching the web; prefer version-matched doc URLs.
- Working with a library that is missing, or whose entry names the wrong version/link?
  Fix the entry as part of the task — the registry only stays true if every touch updates it.

## 3. Newer version solves the problem → offer the upgrade, don't silently work around

If the bug, missing API, or limitation you are about to code around is fixed in a newer,
potentially compatible version (patch/minor bump, or a major with a clear migration path),
STOP and present both options explicitly — same A/B pattern as the DateOnly rule:

- **A:** workaround on the pinned version (state the cost being taken on)
- **B:** upgrade + the clean solution (state the compatibility risk checked)

Never upgrade unprompted; never workaround silently when B exists. On upgrade, the cleanup
is part of the job: delete the workarounds the old version forced (grep for them — they are
usually commented with the version constraint) and update the registry entry's version.
