#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AccountsStack } from '../lib/accounts-stack';



const app = new cdk.App();
new AccountsStack(app, 'AccountsStack', {
  ssoArn : "arn:aws:sso:::instance/ssoins-6684e41c5390328a",
  permissionSetArn:"arn:aws:sso:::permissionSet/ssoins-6684e41c5390328a/ps-2245713f85f01422",
  principalId: "e17ba580-60a1-7060-b459-c6d59bb25c81"
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});