import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as organizations from "aws-cdk-lib/aws-organizations";
import * as sso from "aws-cdk-lib/aws-sso";
import { CfnStackSet } from "aws-cdk-lib/aws-cloudformation";
import { readFileSync } from "fs";
import * as path from 'path';

export interface AccountsStackProps extends cdk.StackProps {
  readonly ssoArn: string;
  readonly permissionSetArn: string;
  readonly principalId: string;
}

export class AccountsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: AccountsStackProps) {
    super(scope, id, props);


    // Build out the Organization

    const orgUnit = new organizations.CfnOrganizationalUnit(
      this,
      "RentYourRideOu",
      {
        name: "RentYourRideOu",
        parentId: "r-2y67",
      }
    );

    // Lets create Dev/Staging/Prod
    const accountConfigs = [
      { env: "Dev", email: "ctharsis999+dev@gmail.com", accountSuffix: "dev" },
      { env: "Staging", email: "ctharsis999+staging@gmail.com", accountSuffix: "staging" },
      { env: "Prod", email: "ctharsis999+prod@gmail.com", accountSuffix: "prod" },
    ];

    const accounts = accountConfigs.map(
      ({ env, email, accountSuffix }) => {
        return {
          account: new organizations.CfnAccount(this, `RentYourRide${env}`, {
            email,
            accountName: `RentYourRide${accountSuffix}`,
            parentIds: [orgUnit.attrId],
          }),
          env,
        };
      }
    );

    const assignments = accounts.map(
      ({account, env}) =>
        new sso.CfnAssignment(this, `RentYourRide${env}AdministratorSSO`, {
          targetId: account.attrAccountId,
          instanceArn: props.ssoArn,
          permissionSetArn: props.permissionSetArn,
          principalType: "USER",
          principalId: props.principalId,
          targetType: "AWS_ACCOUNT",
        })
    );

    const templateBody = readFileSync(
      path.join(__dirname,"/StackSets/cdk-bootstrap.template.yml"),
      "utf16le"
    );

    const githubOidcStackSet = new CfnStackSet(this, "CDKBootstrapStackSet", {
      stackSetName: "CDKBootstrapStackSet",
      templateBody,
      permissionModel: "SERVICE_MANAGED",
      capabilities: [cdk.CfnCapabilities.NAMED_IAM],
      autoDeployment: {
        enabled: true,
        retainStacksOnAccountRemoval: false,
      },
      stackInstancesGroup: [
        {
          deploymentTargets: {
            organizationalUnitIds: [orgUnit.attrId],
          },
          regions: ["us-east-2"],
        },
      ],
    });
  }
}
