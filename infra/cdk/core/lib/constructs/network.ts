import { Construct } from "constructs";
import {
  ISubnet,
  IVpc,
  PublicSubnet,
  Subnet,
  SubnetType,
  Vpc,
} from "aws-cdk-lib/aws-ec2";
import { CfnOutput } from "aws-cdk-lib";
import { Types } from "../../../shared";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export interface NetworkProps {
  maxAzs: number;
  nodeEnv: Types.NodeEnvironment
}

export class Network extends Construct {
  vpc: IVpc;

  constructor(scope: Construct, id: string, props: NetworkProps) {
    super(scope, id);


    const natGateways = props.nodeEnv === 'production' ? 2 : 1
    // VPC
    // Subnets
    // Security Groups
    this.vpc = new Vpc(this, "RYRVpc", {
      vpcName: `ryr-${props.nodeEnv}-vpc`,
      maxAzs: props.maxAzs,
      natGateways,
      subnetConfiguration: [
        {
          subnetType: SubnetType.PUBLIC,
          name: "RYRPublicSubnet",
          cidrMask: 24,
        },
        {
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
          name: "RYRRDSSubnet",
          cidrMask: 28,
        },
      ],
    });

    new StringParameter(this, 'ryr-ssm-vpcid',{
      stringValue: this.vpc.vpcId,
       parameterName: `RYRVPCId-${props.nodeEnv}`
    });


    // new CfnOutput(this, 'RYRVPCId', {
    //     value: this.vpc.vpcId,
    //     exportName: `RYRVPCId-${props.nodeEnv}`
    // });

    // new CfnOutput(this, 'RYRVPCName', {
    //   value: `ryr-${props.nodeEnv}-vpc`,
    //   exportName: `RYRVPCName-${props.nodeEnv}`
    // })



  }
}
