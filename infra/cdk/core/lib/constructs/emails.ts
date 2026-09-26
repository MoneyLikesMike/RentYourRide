import { Construct } from "constructs";
import { CfnApp, CfnEmailChannel, CfnSMSChannel } from "aws-cdk-lib/aws-pinpoint";
import { Types, Utils } from "../../../shared";
import {
  Effect,
  PolicyStatement,
} from "aws-cdk-lib/aws-iam";
import { CfnOutput } from "aws-cdk-lib";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as ses from "aws-cdk-lib/aws-ses";
import { EmailTemplates } from "./email-templates/email-templates";

export interface EmailConstructProps {
  nodeEnv: Types.NodeEnvironment;
}

export class EmailConstruct extends Construct {
  pinpointApp: CfnApp;
  sesIdentity: ses.EmailIdentity;
  pinpointPolicy: PolicyStatement;
  sesPolicy: PolicyStatement;


  constructor(scope: Construct, id: string, props: EmailConstructProps) {
    super(scope, id);

    this.pinpointApp = new CfnApp(this, "PinpointApp", {
      name: `RentYourRidePinpoint-${props.nodeEnv}`, // Set the application name
    });


    this.sesIdentity = new ses.EmailIdentity(this, 'RYRDomainIdentity', {
      identity: ses.Identity.domain('rentyourride.ca'),
      dkimSigning: true
    })
    


    const emailChannel = new CfnEmailChannel(this, "RYREmailChannel", {
      applicationId: this.pinpointApp.ref,
      fromAddress: Utils.emailByEnvironment(props.nodeEnv), // This must match the SES verified domain in the management account
      identity: this.sesIdentity.emailIdentityArn,
      // roleArn: pinpointRole.roleArn,
      enabled: true,
    });


    
    // new CfnSMSChannel(this, 'RYRSMSChannel', {
    //   applicationId: this.pinpointApp.ref,
    //   enabled: true
    // });
    
    const pinpointAppArn = Utils.pinpointArnByEnvironment(
      this.pinpointApp.ref,
      props.nodeEnv
    );

    // Attach policies to the EC2 instance role for interacting with Pinpoint
    this.pinpointPolicy = 
      new PolicyStatement({
        actions: [
          "mobiletargeting:SendMessages", // Permission to send push notifications
          "mobiletargeting:GetCampaigns", // Retrieve campaign details
          "mobiletargeting:GetEndpoints", // Retrieve endpoints registered with Pinpoint
        ],
        resources: [pinpointAppArn], // Apply to the Pinpoint app
      });

    this.sesPolicy = 
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["ses:SendEmail", "ses:SendRawEmail"],
        resources: [this.sesIdentity.emailIdentityArn], // Change based on same or cross-account
      });
      
    const pinpointAppRef = this.pinpointApp.ref;

    new ssm.StringParameter(this, "PinpointAppRefParam", {
      parameterName: "/cross-region/pinpoint/app-id",
      stringValue: pinpointAppRef,
    });

    new CfnOutput(this, 'RYRSESIdentityArn', {
      value: this.sesIdentity.emailIdentityArn,
      exportName: `RYRSESIdentityArn-${props.nodeEnv}`
    })


    new CfnOutput(this, 'RYRPinpointArn', {
      value: pinpointAppArn,
      exportName: `RYRPinpointArn-${props.nodeEnv}`
    })

    new CfnOutput(this, "RYRPinpointAppId", {
      key: "RYRPinpointAppId",
      value: this.pinpointApp.ref,
      exportName: `RYRPointAppId-${props.nodeEnv}`,
    });

    new CfnOutput(this, "DkimRecordOutputs", {
      value: JSON.stringify(this.sesIdentity.dkimRecords),
    });
  }
}
