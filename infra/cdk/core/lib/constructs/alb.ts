import { IVpc, Peer, Port, SecurityGroup } from "aws-cdk-lib/aws-ec2";
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ApplicationTargetGroup,
  ListenerAction,
  ListenerCondition,
  TargetType,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";
import { Types, Utils } from "../../../shared";
import { CfnOutput } from "aws-cdk-lib";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export interface ApplicationLoadBalancerConstructProps {
  vpc: IVpc;
  nodeEnv: Types.NodeEnvironment;
}

export class ApplicationLoadBalancerConstruct extends Construct {
  loadBalancer: ApplicationLoadBalancer;

  constructor(
    scope: Construct,
    id: string,
    props: ApplicationLoadBalancerConstructProps
  ) {
    super(scope, id);

    // Create Security Group for the ELB
    const elbSecurityGroup = new SecurityGroup(this, "ELBSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for ELB",
    });

    // HTTPS + HTTP (80 redirects to 443 — see infra/runbooks/alb-http-redirect.md)
    elbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443));
    elbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));
    elbSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80));

    this.loadBalancer = new ApplicationLoadBalancer(this, "RYRALB", {
      vpc: props.vpc,
      internetFacing: true,
      securityGroup: elbSecurityGroup,
    });

    const lb = this.loadBalancer;

    // Plain http:// must 301 to https:// so old links / typed URLs do not hang.
    lb.addRedirect({
      sourceProtocol: ApplicationProtocol.HTTP,
      sourcePort: 80,
      targetProtocol: ApplicationProtocol.HTTPS,
      targetPort: 443,
    });

    const listener = lb.addListener("Listener", {
      port: 443,
    });

    const webTG = new ApplicationTargetGroup(this, "WebTG", {
      vpc: props.vpc,
      port: 80,
      targetType: TargetType.INSTANCE,
    });

    const adminTG = new ApplicationTargetGroup(this, "AdminTG", {
      vpc: props.vpc,
      port: 80,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.INSTANCE,
      healthCheck: {
        path: "/health",
      },
    });

    const backendTG = new ApplicationTargetGroup(this, "BackendTG", {
      vpc: props.vpc,
      port: 8080,
      protocol: ApplicationProtocol.HTTP,
      targetType: TargetType.INSTANCE,
      healthCheck: {
        path: "/v1/health",
      },
    });

    const webDomain = Utils.domainByTypeAndEnvironment("Web", props.nodeEnv);
    const adminDomain = Utils.domainByTypeAndEnvironment(
      "Admin",
      props.nodeEnv
    );
    const backendDomain = Utils.domainByTypeAndEnvironment(
      "Backend",
      props.nodeEnv
    );

    listener.addTargetGroups("WebApp", {
      targetGroups: [webTG],
      priority: 3,
      conditions: [ListenerCondition.hostHeaders([webDomain])],
    });

    listener.addTargetGroups("AdminApp", {
      targetGroups: [adminTG],
      priority: 2,
      conditions: [ListenerCondition.hostHeaders([adminDomain])],
    });

    listener.addTargetGroups("BackendApp", {
      targetGroups: [backendTG],
      priority: 1,
      conditions: [ListenerCondition.hostHeaders([backendDomain])],
    });

    listener.addAction("DefaultAction", {
      action: ListenerAction.forward([backendTG]),
    });

    // maybe should be doing three certs?
    const certificate = new Certificate(this, "RYRCertificate", {
      domainName: adminDomain,
      subjectAlternativeNames: [webDomain, backendDomain],
      validation: CertificateValidation.fromDns(),
    });

    listener.addCertificates("RYRCertificate", [certificate]);

    new CfnOutput(this, "ALBDNS", {
      key: "ApplicationLoadBalancerDNS",
      value: lb.loadBalancerDnsName,
      exportName: `ApplicationLoadBalancerDNS-${props.nodeEnv}`,
    });

    new CfnOutput(this, "ALBARN", {
      key: "ApplicationLoadBalancerARN",
      value: lb.loadBalancerArn,
      exportName: `ApplicationLoadBalancerARN-${props.nodeEnv}`,
    });

    new StringParameter(this, "ALBSGSSMProp", {
      stringValue: elbSecurityGroup.securityGroupId,
      parameterName: `ApplicationLoadBalancerSecurityGroupId-${props.nodeEnv}`,
    });

    new CfnOutput(this, "ALBSG", {
      key: "ApplicationLoadBalancerSecurityGroupId",
      value: elbSecurityGroup.securityGroupId,
      exportName: `ApplicationLoadBalancerSecurityGroupId-${props.nodeEnv}`,
    });

    new CfnOutput(this, "BackendTGOutput", {
      key: "BackendTG",
      value: backendTG.targetGroupArn,
      exportName: `BackendTargetGroupARN-${props.nodeEnv}`,
    });
    new CfnOutput(this, "AdminTGOutput", {
      key: "AdminTG",
      value: adminTG.targetGroupArn,
      exportName: `AdminTargetGroupARN-${props.nodeEnv}`,
    });

    new CfnOutput(this, "WebTGOutput", {
      key: "WebTG",
      value: webTG.targetGroupArn,
      exportName: `WebTargetGroupARN-${props.nodeEnv}`,
    });
  }
}
