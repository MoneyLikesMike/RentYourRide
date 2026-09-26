# RentYourRide infrastructure (CDK)

Imported from the local-only `RentYourRideLegacy/Infrastructure-old` tree so CoreStack
definitions are versioned in git (follow-up to RYRA-425).

## Layout

| Path | Purpose |
|------|---------|
| `core/` | **CoreStack** — VPC, RDS, Redis, ALB, SES/Pinpoint wiring |
| `shared/` | Account IDs, domain helpers (imported by `core` / `pipelines`) |
| `pipelines/` | CodePipeline stacks |
| `accounts/` | Org / account bootstrap |
| `ami/` | Custom AMI builds |
| `../runbooks/` | Operational CLI runbooks (e.g. ALB HTTP redirect) |

## Secrets scrub

- No `.env` files or private keys are committed.
- `package-lock.json` was regenerated against **public** `registry.npmjs.org` (the legacy lockfile pointed at a private Azure Artifacts feed).
- ARNs for Secrets Manager / CodeConnections / snapshot IDs remain — those are resource references, not secret values. Actual credentials live in AWS Secrets Manager.
- Do not commit `node_modules/` or `cdk.out/`.

## CoreStack — HTTP → HTTPS (RYRA-425)

`core/lib/constructs/alb.ts` opens TCP **80** on the ALB security group and calls
`lb.addRedirect(...)` so plain `http://` 301s to HTTPS. Deploying that construct makes
the live CLI fix durable across stack updates.

### Diff / deploy (production)

```bash
cd infra/cdk/core
npm ci   # or npm install --registry https://registry.npmjs.org/
NODE_ENV=production npx cdk diff CoreStack --profile ryr-prod
# Expect only: SG ingress :80 + Listener Redirect80To443 — no ALB/TG replacement

# If a CLI-created :80 listener already exists, delete it first or create-listener fails:
# aws elbv2 delete-listener --listener-arn <arn> --profile ryr-prod --region us-east-2

NODE_ENV=production npx cdk deploy CoreStack --profile ryr-prod
curl -I http://rentyourride.ca   # expect 301 → https://…
```

Profiles: `ryr-prod` → account `148761673904`, `ryr-dev` → `050752619507`, region `us-east-2`.

## Outage / drift notes (do not “fix” via blind redeploy)

Manual or out-of-band changes that **CoreStack template does not own** (a stack update will not recreate them, and should not delete them):

- **DNS:** Public NS for `rentyourride.ca` are GoDaddy (`ns69`/`ns70.domaincontrol.com`). A Route53 hosted zone still exists in-account but is **not** authoritative — do not point the domain back at Route53 without intent.
- **ALB HTTPS extras:** Additional listener certificates (apex `.ca` / `.com`) and host rules (`www`, apex, `.com`, Nest `/v1/*` → `:8081`) were added outside the original CDK host rules (`admin` / `app` / `backend` only).
- **Backend listener rule drift:** Live rule was changed to path `/v1/*` → Nest TG; CDK still describes the old host-only → legacy `:8080` TG. A future CDK change to that rule could fight Nest routing — update the construct before touching it.
- **SES DKIM / GoDaddy records:** Restored in GoDaddy DNS, not via this stack’s Route53.

See also `infra/runbooks/alb-http-redirect.md`.
