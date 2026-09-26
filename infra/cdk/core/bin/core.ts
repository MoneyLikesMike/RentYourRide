#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CoreStack } from "../lib/core-stack";
import { InstanceClass, InstanceSize, InstanceType, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Utils } from "../../shared";
import { EmailTemplateStack } from "../lib/email-template-stack";
import { EmailTemplatePart2Stack } from "../lib/email-template-part2-stack";
import { EmailMessagingStack } from "../lib/email-messaging-stack";

const app = new cdk.App();

const nodeEnv = Utils.loadNodeEnvironment();
let dbInstanceType: InstanceType;
let dbMultiAz = false;
let dbStorage = 20;
let dbSubnetType = SubnetType.PRIVATE_WITH_EGRESS
let snapshotId = '';
switch (nodeEnv) {
  case "staging":
    dbInstanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.SMALL);
    break;
  case "production":
    dbInstanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MEDIUM);
    dbMultiAz = true;
    snapshotId = 'final-corestack-ryrdbsetuppostgresinstancec9b075df-sul2u8gg19do1a56e671-1046-495c-9328-148cf2ed4470';
    break;
  default:
    dbInstanceType = InstanceType.of(InstanceClass.T4G, InstanceSize.MICRO);
    dbSubnetType = SubnetType.PUBLIC
    snapshotId = 'final-corestack-ryrdbsetuppostgresinstancec9b075df-eextdxtcrv3cca5a7738-9894-43e0-acb8-2d4a3c69ac9e';
    break;
}

// new EmailMessagingStack(app, "EmailMessagingStack", {
//   deploymentEnvironment: nodeEnv,
// })

new CoreStack(app, "CoreStack", {
  amiId: "",
  dbInstanceType,
  dbMultiAz,
  dbStorage,
  deploymentEnvironment: nodeEnv,
  dbSubnetType,
  snapshotId
});

new EmailTemplateStack(app, "EmailTemplateStack", {});
new EmailTemplatePart2Stack(app, "EmailTemplatePart2Stack", {});
