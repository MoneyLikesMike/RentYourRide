import { CfnOutput } from "aws-cdk-lib";
import { IVpc, Peer, Port, SecurityGroup, Subnet, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  CfnCacheCluster,
  CfnSubnetGroup,
} from "aws-cdk-lib/aws-elasticache";
import { Construct } from "constructs";
import { Types } from "../../../shared";

export interface RedisConstructProps {
  nodeEnv: Types.NodeEnvironment;
  vpc: IVpc;
}

export class RedisConstruct extends Construct {
  constructor(scope: Construct, id: string, props: RedisConstructProps) {
    super(scope, id);

    const subnetIds = props.vpc.selectSubnets({subnetType: SubnetType.PRIVATE_WITH_EGRESS}).subnetIds;
    //const subnetIds = props.vpc.publicSubnets.map((s) => s.subnetId);

    const cacheSubnetGroupName = `RYRRedisSubnetGroup-${props.nodeEnv}`;

    const subnetGroup = new CfnSubnetGroup(this, "RYRRedisSubnetGroup", {
      cacheSubnetGroupName,
      subnetIds,
      description: "ElastiCache Subnet Group",
    });
    
    const securityGroup = new SecurityGroup(this, "ElastiCacheSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
      description: "RYR ElastiCache Security Group",
      securityGroupName: "RYWRElastiCacheSecurityGroup",
    });
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(6379), "Redis port");
    securityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(6380), "Redis port");

    const redisCluster = new CfnCacheCluster(this, "RYRClusterCache", {
      engine: "redis",
      cacheNodeType: "cache.t4g.micro",
      numCacheNodes: 1,
      vpcSecurityGroupIds: [securityGroup.securityGroupId],
      cacheSubnetGroupName: subnetGroup.ref
    });

    let redisHostExportName = `RYRClusterCacheHost-${props.nodeEnv}`;
    if (props.nodeEnv === 'development') {
      //redisHostExportName = 'RYRClusterCacheHost';
    }
    
    // new CfnOutput(this, "RYRSClusterCacheHost", {
    //   key: "RYRClusterCacheHost",
    //   value: "cor-ry-1xk7jeo2f8dwi.aslf4l.0001.use2.cache.amazonaws.com",
    //   exportName: `RYRClusterCacheHost-${props.nodeEnv}`
    //   ,
    // });
    new CfnOutput(this, "RYRSClusterCacheHostAddress", {
      key: "RYRClusterCacheHostAddress",
      value: redisCluster.attrRedisEndpointAddress,
      exportName: redisHostExportName,
    });

  }
}
