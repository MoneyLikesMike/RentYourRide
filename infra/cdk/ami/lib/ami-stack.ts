import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ami from 'cdk-create-ami';
import {VPC} from './constructs/vpc';
import { BaseInstance } from './constructs/base-instance';
import {Types} from '../../shared/types'
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

export interface AmiStackProps extends cdk.StackProps {
  nodeEnv: Types.NodeEnvironment
}

export class AmiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AmiStackProps) {
    super(scope, id, props);
    const vpc = new VPC(this, 'VPC');
    const baseInstance = new BaseInstance(this, 'Instance', {
      vpc: vpc.vpc,
      securityGroup: vpc.securityGroup,
      ec2Role: vpc.ec2Role,
    });

    const amiImage = new ami.CreateAMI(this, 'amiImage', {
      instanceId: baseInstance.instanceId,
      deleteAmi: false,
      deleteInstance: true,
      blockDeviceMappings: [
        {
          deviceName: '/dev/sdh',
          ebs: {
            volumeSize: 20,
            volumeType: ami.VolumeType.GP3,
            deleteOnTermination: true,
          },
        },
      ],
      tagSpecifications: [
        {
          resourceType: ami.ResourceType.IMAGE,
          tags: [{ key: 'project', value: 'RentYourRide' }],
        },
      ],
    });

    new StringParameter(this, 'RYRImageName', {
      stringValue: amiImage.imageName,
      parameterName: 'RYRImageName'
    })

    new cdk.CfnOutput(this, 'baseInstanceId', {
      value: baseInstance.instanceId,
    });
    new cdk.CfnOutput(this, 'imageId', { value: amiImage.imageId, exportName: `imageId-${props.nodeEnv}` });
    new cdk.CfnOutput(this, 'imageName', {
      value: amiImage.imageName,
      exportName: 'imageName',
    });
    new cdk.CfnOutput(this, 'vpcId', {
      value: vpc.vpc.vpcId,
    });
  }

}
