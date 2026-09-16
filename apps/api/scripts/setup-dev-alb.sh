#!/bin/bash
# Create ALB target group + listener rule for Nest API on port 8081 (Dev).
# Prerequisite: Nest listening on backend EC2 :8081, SSM agent Online.
# DNS: point nestdev.rentyourride.ca CNAME to ALB DNS (in your DNS host).
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-dev}"
export AWS_REGION="${AWS_REGION:-us-east-2}"

VPC_ID=$(aws ssm get-parameter --name RYRVPCId-development --query Parameter.Value --output text 2>/dev/null || true)
if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  echo "RYRVPCId-development not in SSM; discover VPC from RDS..."
  VPC_ID=$(aws ec2 describe-vpcs --filters Name=tag:Name,Values='*' --query 'Vpcs[0].VpcId' --output text)
fi

LB_ARN=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].LoadBalancerArn' --output text)
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$LB_ARN" --query 'Listeners[?Port==`443`].ListenerArn' --output text)
TG_ARN=$(aws elbv2 create-target-group \
  --name ryr-nest-api-dev-8081 \
  --protocol HTTP \
  --port 8081 \
  --vpc-id "$VPC_ID" \
  --health-check-path /v1/health \
  --health-check-protocol HTTP \
  --target-type instance \
  --query TargetGroups[0].TargetGroupArn --output text 2>/dev/null || \
  aws elbv2 describe-target-groups --names ryr-nest-api-dev-8081 --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 register-targets --target-group-arn "$TG_ARN" \
  --targets Id=i-0107286b48e4e5189

# Allow ALB → EC2:8081 (Nest). Skip if rule already exists.
INSTANCE_SG=$(aws ec2 describe-instances --instance-ids i-0107286b48e4e5189 \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
LB_SG=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].SecurityGroups[0]' --output text)
aws ec2 authorize-security-group-ingress --group-id "$INSTANCE_SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=8081,ToPort=8081,UserIdGroupPairs=[{GroupId=$LB_SG,Description=Nest API from ALB}]" \
  2>/dev/null || true

aws elbv2 create-rule --listener-arn "$LISTENER_ARN" \
  --priority 15 \
  --conditions Field=host-header,Values=nestdev.rentyourride.ca \
  --actions Type=forward,TargetGroupArn="$TG_ARN" 2>/dev/null || echo "Rule may already exist"

OLD_TG=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Priority=='5'].Actions[0].TargetGroupArn" --output text 2>/dev/null || true)
if [ -z "$OLD_TG" ] || [ "$OLD_TG" = "None" ]; then
  OLD_TG=$(aws elbv2 describe-target-groups --names CoreSt-RYRAL-Q8QVTVHMQ8EP --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || \
    aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Priority=='default'].Actions[0].TargetGroupArn" --output text)
  RULE1_ARN=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Priority=='1'].RuleArn" --output text)
  if [ -n "$RULE1_ARN" ] && [ "$RULE1_ARN" != "None" ]; then
    aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 5 \
      --conditions Field=host-header,Values=bedev.rentyourride.ca \
      --actions Type=forward,TargetGroupArn="$OLD_TG" 2>/dev/null || true
    aws elbv2 delete-rule --rule-arn "$RULE1_ARN" 2>/dev/null || true
    aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 1 \
      --conditions Field=host-header,Values=bedev.rentyourride.ca Field=path-pattern,Values='/v1/*' \
      --actions Type=forward,TargetGroupArn="$TG_ARN"
    echo "ALB: bedev.rentyourride.ca/v1/* → Nest (8081); other bedev paths → legacy backend"
  fi
fi

ALB_DNS=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].DNSName' --output text)
echo "Target group: $TG_ARN"
echo "ALB DNS: $ALB_DNS"
echo "DNS (GoDaddy): CNAME nestdev → $ALB_DNS  OR use bedev with /v1 routing (see above)"
echo "App: extra.useDevApi=true, extra.devApiUrl=https://bedev.rentyourride.ca"
echo "Optional nestdev DNS: GODADDY_API_KEY=... GODADDY_API_SECRET=... ./apps/api/scripts/add-nestdev-dns-godaddy.sh"
