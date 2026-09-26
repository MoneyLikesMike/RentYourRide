import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { Network } from "./constructs/network";
import { PostgreSQL } from "./constructs/postgresql";
import { InstanceType, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Types, Utils } from "../../shared";
import { EmailConstruct } from "./constructs/emails";
import { RedisConstruct } from "./constructs/redis";
import { ApplicationLoadBalancerConstruct } from "./constructs/alb";
import {
  CfnInstanceProfile,
  Effect,
  ManagedPolicy,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { StorageConstruct } from "./constructs/storage";

export interface CoreStackProps extends cdk.StackProps {
  amiId: string;
  dbInstanceType: InstanceType;
  dbStorage: number;
  dbMultiAz: boolean;
  deploymentEnvironment: Types.NodeEnvironment;
  dbSubnetType: SubnetType;
  snapshotId: string;
}

export class CoreStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CoreStackProps) {
    super(scope, id, props);

    const s3 = new StorageConstruct(this, "RYRStorageSetup", {
      nodeEnv: props.deploymentEnvironment,
    });

    const network = new Network(this, "RYRNetworkSetup", {
      maxAzs: 2,
      nodeEnv: props.deploymentEnvironment,
    });

    const cache = new RedisConstruct(this, "RYRRedisSetup", {
      nodeEnv: props.deploymentEnvironment,
      vpc: network.vpc,
    });

    const rds = new PostgreSQL(this, "RYRDBSetup", {
      vpc: network.vpc,
      dbInstanceType: props.dbInstanceType,
      totalStorage: props.dbStorage,
      multiAz: props.dbMultiAz,
      dbSubnetType: props.dbSubnetType,
      nodeEnv: props.deploymentEnvironment,
      snapshotId: props.snapshotId,
    });

    const alb = new ApplicationLoadBalancerConstruct(this, "RYRALBSetup", {
      nodeEnv: props.deploymentEnvironment,
      vpc: network.vpc,
    });

    const pinpoint = new EmailConstruct(this, "RYRPinpointSetup", {
      nodeEnv: props.deploymentEnvironment,
    });

    const codeDeployRole = new Role(this, "CodeDeployRole", {
      roleName: `RYRCodeDeployRole-${props.deploymentEnvironment}`,
      assumedBy: new ServicePrincipal("codedeploy.amazonaws.com"), // CodeDeploy service will assume this role
      description: "Role for CodeDeploy with AWSCodeDeployRole Managed Policy",
    });

    // Attach the AWS managed policy AWSCodeDeployRole to the new role
    codeDeployRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSCodeDeployRole")
    );

    const ec2MainRole = new Role(this, "RYRCodeDeploy-Instance-Profile", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"), // EC2 will assume this role
      description: "IAM Role for EC2 instances",
    });

    // Attach S3 access policy (you can restrict it to specific buckets if needed)
    ec2MainRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonS3ReadOnlyAccess")
    );
    ec2MainRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
    );
    ec2MainRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy")
    );

    ec2MainRole.addToPolicy(
      new PolicyStatement({
        actions: ["s3:PutObject", "s3:GetObject"],
        resources: [`${s3.bucket.bucketArn}/*`], // Allow access to all objects within the bucket
      })
    );

    // const pinpointAppId = ssm.StringParameter.valueForStringParameter(
    //   this,
    //   "/cross-region/pinpoint/app-id"
    // );

    ec2MainRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["mobiletargeting:SendMessages"],
        resources: [
          Utils.pinpointWildcardArnByEnvironment(
            pinpoint.pinpointApp.ref,
            props.deploymentEnvironment
          ),
        ], // Scope down to specific Pinpoint resources if necessary
      })
    );
    // const pinpointRef = ssm.StringParameter.valueForStringParameter(
    //   this,
    //   "/cross-region/pinpoint/app-ed"
    // );
    // const sesIdentityArn = ssm.StringParameter.valueForStringParameter(
    //   this,
    //   "/cross-region/ses/email-identity-arn"
    // );

    // const pinpointAppArn = Utils.pinpointArnByEnvironment(
    //   pinpointRef,
    //   props.deploymentEnvironment
    // );

    // const pinpointPolicy = new PolicyStatement({
    //   actions: [
    //     "mobiletargeting:SendMessages", // Permission to send push notifications
    //     "mobiletargeting:GetCampaigns", // Retrieve campaign details
    //     "mobiletargeting:GetEndpoints", // Retrieve endpoints registered with Pinpoint
    //   ],
    //   resources: [pinpointAppArn], // Apply to the Pinpoint app
    // });

    // const sesPolicy = new PolicyStatement({
    //   effect: Effect.ALLOW,
    //   actions: ["ses:SendEmail", "ses:SendRawEmail"],
    //   resources: [sesIdentityArn], // Change based on same or cross-account
    // });

        ec2MainRole.addToPolicy(pinpoint.pinpointPolicy);
    ec2MainRole.addToPolicy(pinpoint.sesPolicy);
    ec2MainRole.addToPolicy(new PolicyStatement({
      actions: ['sns:Publish'],
      resources:['*']
    }))
    // ec2MainRole.addToPolicy(pinpointPolicy);
    // ec2MainRole.addToPolicy(sesPolicy);

    // Create an Instance Profile and associate it with the EC2 Role
    const instanceProfile = new CfnInstanceProfile(this, "EC2InstanceProfile", {
      roles: [ec2MainRole.roleName],
    });

    // You can reference this `instanceProfile` when launching EC2 instances
    new cdk.CfnOutput(this, "InstanceProfileOutput", {
      value: ec2MainRole.roleName,
      description: "The Instance Profile ARN for EC2 to access S3",
      exportName: `RYRInstanceProfileOutput-${props.deploymentEnvironment}`,
    });
  }
}
