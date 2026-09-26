import * as cdk from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { EmailConstruct } from "./constructs/emails";
import { Types } from "../../shared";

export interface EmailMessagingStackProps extends cdk.StackProps {
  deploymentEnvironment: Types.NodeEnvironment;
}

export class EmailMessagingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EmailMessagingStackProps) {
    super(scope, id, props);
    const pinpoint = new EmailConstruct(this, "RYRPinpointSetup", {
      nodeEnv: props.deploymentEnvironment,
    });

    const pinpointAppRef = pinpoint.pinpointApp.ref;

    new ssm.StringParameter(this, "PinpointAppRefParam", {
      parameterName: "/cross-region/pinpoint/app-id",
      stringValue: pinpointAppRef,
    });
    
    new ssm.StringParameter(this, "PinpointSesPolicy", {
      parameterName: "/cross-region/ses/email-identity-arn",
      stringValue: pinpoint.sesIdentity.emailIdentityArn,
    });
  }
}
