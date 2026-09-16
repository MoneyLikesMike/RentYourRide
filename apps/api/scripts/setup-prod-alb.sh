#!/bin/bash
# Route backend.rentyourride.ca/v1/* to Nest API on port 8081 (Production).
# Prerequisite: Nest listening on prod EC2 :8081, SSM agent Online.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-ryr-prod}"
export AWS_REGION="${AWS_REGION:-us-east-2}"
BACKEND_INSTANCE_ID="${BACKEND_INSTANCE_ID:-i-09d2607ccc3bafef5}"
HOST_HEADER="${HOST_HEADER:-backend.rentyourride.ca}"
TG_NAME="${TG_NAME:-ryr-nest-api-prod-8081}"

VPC_ID=$(aws ssm get-parameter --name RYRVPCId-production --query Parameter.Value --output text 2>/dev/null || true)
if [ -z "$VPC_ID" ] || [ "$VPC_ID" = "None" ]; then
  echo "Discovering VPC from prod backend instance..."
  VPC_ID=$(aws ec2 describe-instances --instance-ids "$BACKEND_INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].VpcId' --output text)
fi

LB_ARN=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].LoadBalancerArn' --output text)
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn "$LB_ARN" --query 'Listeners[?Port==`443`].ListenerArn' --output text)

TG_ARN=$(aws elbv2 create-target-group \
  --name "$TG_NAME" \
  --protocol HTTP \
  --port 8081 \
  --vpc-id "$VPC_ID" \
  --health-check-path /v1/health \
  --health-check-protocol HTTP \
  --target-type instance \
  --query TargetGroups[0].TargetGroupArn --output text 2>/dev/null || \
  aws elbv2 describe-target-groups --names "$TG_NAME" --query 'TargetGroups[0].TargetGroupArn' --output text)

aws elbv2 register-targets --target-group-arn "$TG_ARN" \
  --targets Id="$BACKEND_INSTANCE_ID"

INSTANCE_SG=$(aws ec2 describe-instances --instance-ids "$BACKEND_INSTANCE_ID" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
LB_SG=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].SecurityGroups[0]' --output text)
aws ec2 authorize-security-group-ingress --group-id "$INSTANCE_SG" \
  --ip-permissions "IpProtocol=tcp,FromPort=8081,ToPort=8081,UserIdGroupPairs=[{GroupId=$LB_SG,Description=Nest API from ALB}]" \
  2>/dev/null || true

# Legacy backend target group (default for non-/v1 paths)
OLD_TG=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Priority=='5'].Actions[0].TargetGroupArn" --output text 2>/dev/null || true)
if [ -z "$OLD_TG" ] || [ "$OLD_TG" = "None" ]; then
  OLD_TG=$(aws elbv2 describe-rules --listener-arn "$LISTENER_ARN" --query "Rules[?Priority=='default'].Actions[0].TargetGroupArn" --output text)
fi

aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 5 \
  --conditions Field=host-header,Values="$HOST_HEADER" \
  --actions Type=forward,TargetGroupArn="$OLD_TG" 2>/dev/null || echo "Host catch-all rule may already exist"

aws elbv2 create-rule --listener-arn "$LISTENER_ARN" --priority 1 \
  --conditions Field=host-header,Values="$HOST_HEADER" Field=path-pattern,Values='/v1/*' \
  --actions Type=forward,TargetGroupArn="$TG_ARN" 2>/dev/null || echo "Nest /v1 rule may already exist"

ALB_DNS=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[0].DNSName' --output text)
echo "Target group: $TG_ARN"
echo "ALB DNS: $ALB_DNS"
echo "ALB: ${HOST_HEADER}/v1/* → Nest (8081); other ${HOST_HEADER} paths → legacy backend"
echo "Verify: curl -s https://${HOST_HEADER}/v1/health"
