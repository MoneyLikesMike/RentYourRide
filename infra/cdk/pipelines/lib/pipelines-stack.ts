import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Types, Utils} from '../../shared';
import { WebPipelineConstruct } from './constructs/web-pipeline';
import { BackendPipelineConstruct } from './constructs/backend-pipeline';
import { AdminPipelineConstruct } from './constructs/admin-pipeline';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export interface PipelinesStackProps extends cdk.StackProps {
  nodeEnv: Types.NodeEnvironment
}

export class PipelinesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PipelinesStackProps) {
    super(scope, id, props);

    const vpcId = StringParameter.valueFromLookup(this, `RYRVPCId-${props.nodeEnv}`);
    //const imageName = StringParameter.valueFromLookup(this, `RYRImageName`);

    const vpc = Vpc.fromLookup(this, 'RYRVPC', {
      vpcId

    })

      new BackendPipelineConstruct(this, 'BackendPipelineConstruct', {
        nodeEnv: props.nodeEnv,
        apiSecretsArn: Utils.apiSecretsArn(props.nodeEnv),
        vpc,
        //imageName
      });

      new WebPipelineConstruct(this, 'WebPipelineConstruct', {
        nodeEnv: props.nodeEnv,
        vpc
      });

      new AdminPipelineConstruct(this, 'AdminPipelineConstruct', {
        nodeEnv: props.nodeEnv,
        vpc
      });

  }
}
