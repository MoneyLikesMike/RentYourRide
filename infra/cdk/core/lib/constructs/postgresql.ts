import {
  AmazonLinuxCpuType,
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  Instance,
  InstanceClass,
  InstanceSize,
  InstanceType,
  IVpc,
  MachineImage,
  Peer,
  Port,
  SecurityGroup,
  Subnet,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

import * as rds from "aws-cdk-lib/aws-rds";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { CfnOutput } from "aws-cdk-lib";
import { Types } from "../../../shared";
import { ManagedPolicy, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export interface PostgreSQLProps {
  vpc: IVpc;
  totalStorage: number;
  dbInstanceType: InstanceType;
  multiAz: boolean;
  dbSubnetType: SubnetType;
  nodeEnv: Types.NodeEnvironment;
  snapshotId: string;
}

export class PostgreSQL extends Construct {
  constructor(scope: Construct, id: string, props: PostgreSQLProps) {
    super(scope, id);

    // Templated secret with username and password fields
    const templatedSecret = new secretsmanager.Secret(this, "RDSSecret", {
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: "postgres" }),
        generateStringKey: "password",
        excludeCharacters: "/@\"'(){}[]`",
      },
    });

    // Create EC2 Security Group..

    const ec2SecurityGroup = new SecurityGroup(this, "EC2SecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "Security group for EC2 instances",
    });
    // Allow access from the
    ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(8080));

    ec2SecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80));

    const dbSecurityGroup = new SecurityGroup(this, "RDSSecurityGroup", {
      vpc: props.vpc,
      description: "Allow access to DB",
      allowAllOutbound: true,
    });

    dbSecurityGroup.addIngressRule(
      ec2SecurityGroup,
      Port.tcp(5432), 
      "Allow access to db"
    );

    // Using the templated secret as credentials

    // const dbProps: rds.DatabaseInstanceProps = {
    //   engine: rds.DatabaseInstanceEngine.POSTGRES,
    //   instanceType: props.dbInstanceType,
    //   credentials: {
    //     username: templatedSecret
    //       .secretValueFromJson("username")
    //       .unsafeUnwrap(),
    //     password: templatedSecret.secretValueFromJson("password"),
    //   },
    //   allocatedStorage: props.totalStorage,
    //   databaseName: `rentyourride${props.nodeEnv.toUpperCase()}`,
    //   vpc: props.vpc,
    //   securityGroups: [dbSecurityGroup],
    //   multiAz: props.multiAz,
    //   vpcSubnets: {
    //     subnetType: props.dbSubnetType,
    //   },
    // };

    // const instance = new rds.DatabaseInstance(
    //   this,
    //   "PostgresInstance",
    //   dbProps
    // );


    const dbProps: rds.DatabaseInstanceFromSnapshotProps = {
      snapshotIdentifier: props.snapshotId,
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceType: props.dbInstanceType,
      credentials: rds.SnapshotCredentials.fromSecret(templatedSecret),
    
      allocatedStorage: props.totalStorage,
      //databaseName: `rentyourride${props.nodeEnv.toUpperCase()}`,
      vpc: props.vpc,
      securityGroups: [dbSecurityGroup],
      multiAz: props.multiAz,
      vpcSubnets: {
        subnetType: props.dbSubnetType,
      },
    };

    const instance = new rds.DatabaseInstanceFromSnapshot(this, 'PostgresInstance', dbProps);

    // JUMPBOX SETUP
    //if (props.nodeEnv !== "development") {
      const ssmRole = new Role(this, "SSMRole", {
        assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
        managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
            "AmazonSSMManagedInstanceCore"
          ), // Allow SSM access
        ],
      });

      const jumpboxSecurityGroup = new SecurityGroup(
        this,
        "JumpboxSecurityGroup",
        {
          vpc: props.vpc,
          description: "Security group for the Jumpbox (Bastion Host)",
          allowAllOutbound: true, // Allow outbound traffic by default (optional)
        }
      );

      const jumpbox = new Instance(this, "JumpBox", {
        instanceType: InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO),
        machineImage: new AmazonLinuxImage({
          generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
          cpuType: AmazonLinuxCpuType.ARM_64,
        }),
        vpc: props.vpc,
        vpcSubnets: { subnetType: SubnetType.PUBLIC },
        securityGroup: jumpboxSecurityGroup,
        role: ssmRole, // This role should have SSM permissions
      });

      jumpbox.role.addManagedPolicy(
        ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore")
      );

      dbSecurityGroup.addIngressRule(
        jumpboxSecurityGroup, // Allow traffic from the jumpbox security group
        Port.tcp(5432),
        "Allow jumpbox to access PostgreSQL"
      );
    //}



    new StringParameter(this, 'DbEndpointParam', {
      parameterName: '/db/endpoint',
      stringValue: instance.dbInstanceEndpointAddress,
    });

    // new CfnOutput(this, "PostgreSQLURL", {
    //   key: "PostgresqlUrl",
    //   value: instance.dbInstanceEndpointAddress,
    //   exportName: "PostgresqlUrl",

    // });

    new CfnOutput(this, "PostgreSQLSecret", {
      key: "PostgreSQLSecret",
      value: templatedSecret.secretArn,
      exportName: "PostgreSQLSecret",
    });

    new CfnOutput(this, "EC2SecurityGroupAccess", {
      exportName: "EC2SecurityGroupId",
      value: ec2SecurityGroup.securityGroupId,
      description: "EC2 Security Group with RDS Access",
    });
  }
}
