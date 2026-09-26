# ALB HTTP → HTTPS redirect (CoreSt RYRAL)

## Context

The prod and dev Application Load Balancers (`CoreSt-RYRAL-*`) are created by the **CoreStack** CloudFormation stack (`RYRALB` / `RYRALBSetup`), which is **not** defined in this repo. Today each ALB has only an HTTPS listener on **443**. Security groups allow **443** from `0.0.0.0/0` but not **80**, so plain `http://` requests time out instead of redirecting.

This runbook adds:

1. Ingress TCP **80** from `0.0.0.0/0` and `::/0` on the ALB security group
2. An HTTP listener on **port 80** whose default action is **HTTP_301** to HTTPS **443**, preserving host, path, and query

Do **not** change the existing 443 listener, certificates, or target groups.

Related tickets: RYRA-425.

## Current resources (us-east-2)

| Env | Account | ALB name | Load balancer ARN | ALB security group |
|-----|---------|----------|-------------------|--------------------|
| Prod | `148761673904` | `CoreSt-RYRAL-1TRubpG73hIi` | `arn:aws:elasticloadbalancing:us-east-2:148761673904:loadbalancer/app/CoreSt-RYRAL-1TRubpG73hIi/7adbb58a360d6c5e` | `sg-06216ead7984b3f98` |
| Dev | `050752619507` | `CoreSt-RYRAL-7NTx2EEMpj3q` | `arn:aws:elasticloadbalancing:us-east-2:050752619507:loadbalancer/app/CoreSt-RYRAL-7NTx2EEMpj3q/63958bdd47146cf0` | `sg-0990c6489c4e216d9` |

Profiles: `ryr-prod` / `ryr-dev` (SSO). Region: `us-east-2`.

## Production

```bash
export AWS_PROFILE=ryr-prod
export AWS_REGION=us-east-2

PROD_LB_ARN="arn:aws:elasticloadbalancing:us-east-2:148761673904:loadbalancer/app/CoreSt-RYRAL-1TRubpG73hIi/7adbb58a360d6c5e"
PROD_SG="sg-06216ead7984b3f98"

# 1) Allow HTTP on the ALB security group (idempotent: ignore Duplicate already exists)
aws ec2 authorize-security-group-ingress \
  --group-id "$PROD_SG" \
  --ip-permissions \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description="HTTP redirect to HTTPS"}],Ipv6Ranges=[{CidrIpv6=::/0,Description="HTTP redirect to HTTPS"}]' \
  || true

# 2) Create port-80 listener → 301 to HTTPS (skip if listener already exists)
aws elbv2 create-listener \
  --load-balancer-arn "$PROD_LB_ARN" \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "Host": "#{host}",
      "Path": "/#{path}",
      "Query": "#{query}",
      "StatusCode": "HTTP_301"
    }
  }]'
```

## Dev

```bash
export AWS_PROFILE=ryr-dev
export AWS_REGION=us-east-2

DEV_LB_ARN="arn:aws:elasticloadbalancing:us-east-2:050752619507:loadbalancer/app/CoreSt-RYRAL-7NTx2EEMpj3q/63958bdd47146cf0"
DEV_SG="sg-0990c6489c4e216d9"

aws ec2 authorize-security-group-ingress \
  --group-id "$DEV_SG" \
  --ip-permissions \
    'IpProtocol=tcp,FromPort=80,ToPort=80,IpRanges=[{CidrIp=0.0.0.0/0,Description="HTTP redirect to HTTPS"}],Ipv6Ranges=[{CidrIpv6=::/0,Description="HTTP redirect to HTTPS"}]' \
  || true

aws elbv2 create-listener \
  --load-balancer-arn "$DEV_LB_ARN" \
  --protocol HTTP \
  --port 80 \
  --default-actions '[{
    "Type": "redirect",
    "RedirectConfig": {
      "Protocol": "HTTPS",
      "Port": "443",
      "Host": "#{host}",
      "Path": "/#{path}",
      "Query": "#{query}",
      "StatusCode": "HTTP_301"
    }
  }]'
```

## Verify (do not skip)

```bash
# Expect: HTTP/1.1 301 … Location: https://rentyourride.ca/…
curl -sSI --max-time 10 http://rentyourride.ca/ | head -n 15

# Expect: Location: https://backend.rentyourride.ca/v1/health
curl -sSI --max-time 10 http://backend.rentyourride.ca/v1/health | head -n 15

# HTTPS unchanged
curl -sS -o /dev/null -w "%{http_code}\n" https://rentyourride.ca/
curl -sS https://backend.rentyourride.ca/v1/health

# Dev (optional)
curl -sSI --max-time 10 http://fedev.rentyourride.ca/ | head -n 15
curl -sS https://bedev.rentyourride.ca/v1/health
```

Acceptance:

- `curl -I http://rentyourride.ca` → **301** with `Location: https://…`
- `curl -I http://backend.rentyourride.ca/v1/health` → **301** with `Location: https://…`
- Existing HTTPS behaviour unchanged

## Rollback

```bash
# Prod example — delete the HTTP listener only
export AWS_PROFILE=ryr-prod AWS_REGION=us-east-2
PROD_LB_ARN="arn:aws:elasticloadbalancing:us-east-2:148761673904:loadbalancer/app/CoreSt-RYRAL-1TRubpG73hIi/7adbb58a360d6c5e"
HTTP_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn "$PROD_LB_ARN" \
  --query 'Listeners[?Port==`80`].ListenerArn' --output text)
aws elbv2 delete-listener --listener-arn "$HTTP_LISTENER"

# Optional: remove SG rules for port 80 (use revoke-security-group-ingress with the same IpPermissions)
```

## Status (2026-09-26)

Applied live on prod + dev ALBs (CLI above). Grok / RYRA-425 confirmed redirects work.

## Persist in CoreStack CDK (required before next stack deploy)

Live ALBs come from CDK path `CoreStack/RYRALBSetup` (legacy tree:
`RentYourRideLegacy/Infrastructure-old/core/lib/constructs/alb.ts`).

The template historically only opened **443** (the comment said “HTTP port 80” but the
rule was `Port.tcp(443)`), and there was **no** port-80 listener — so a CoreStack
redeploy that recreates the listener/SG from the old CDK would wipe this fix.

Patch that construct before the next `cdk deploy` of CoreStack:

```ts
elbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
elbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
elbSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80));

lb.addRedirect({
  sourceProtocol: ApplicationProtocol.HTTP,
  sourcePort: 80,
  targetProtocol: ApplicationProtocol.HTTPS,
  targetPort: 443,
});
```

That file is **not** in `MoneyLikesMike/RentYourRide` (Infrastructure-old lives alongside
the app monorepo). Update and redeploy CoreStack from the infra CDK package when ready;
until then the live CLI change + this runbook are the operational source of truth.

## Notes

- Repo scripts `apps/api/scripts/setup-{prod,dev}-alb.sh` only wire Nest `:8081` rules on the **443** listener; they do not own the CoreSt ALB resource.
