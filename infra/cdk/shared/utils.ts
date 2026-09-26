declare const process: any;

import { Constants } from "./constants";
import { Types } from "./types";
export namespace Utils {
  export function loadCDKEnvironment(nodeEnv: Types.NodeEnvironment): Types.CDKEnvironment {
    switch(nodeEnv) {
      case "development":
        return {region: 'us-east-2', account: '050752619507'}
      case "staging":
        return {region: 'us-east-2', account: '337909764675'}
      case "production":
        return {region: 'us-east-2', account: '148761673904'}
    }
  }
  export function loadNodeEnvironment(): Types.NodeEnvironment {
    const env = process.env.NODE_ENV;
    switch (env) {
      case "production":
        return "production";
      case "staging":
        return "staging";
      case "developlment":
      default:
        return "development";
    }
  }

  export function branchByNodeEnv(
    nodeEnv: Types.NodeEnvironment
  ): Types.Branches {
    switch (nodeEnv) {
      case "development":
        return "development";
      case "staging":
        return "staging";
      case "production":
        return "main";
    }
  }

  export function buildSpecByNodeEnv(nodeEnv: Types.NodeEnvironment): string {
    switch (nodeEnv) {
      case "development":
        return "buildspec-dev.yml";
      case "staging":
      return "buildspec-staging.yml";
      case "production":
        return "buildspec-prod.yml";
    }
  }

  export function apiSecretsArn(nodeEnv: Types.NodeEnvironment): string {
    switch (nodeEnv) {
      case "development":
        return "arn:aws:secretsmanager:us-east-2:050752619507:secret:ryr-dev-secrets-I8Gv9j";

      case "staging":
        return "arn:aws:secretsmanager:us-east-2:337909764675:secret:ryr-staging-secrets-ClHNJj";
      case "production":
        return "arn:aws:secretsmanager:us-east-2:148761673904:secret:ryr-prod-secrets-m1QKOO";
      default:
        throw new Error('Missing API Secrets ARN');
    }
  }

  export function domainByTypeAndEnvironment(
    type: Types.AppType,
    nodeEnv: Types.NodeEnvironment
  ) {
    switch (type) {
      case "Web":
        return webDomainByEnvironment(nodeEnv);
      case "Admin":
        return adminDomainByEnvironment(nodeEnv);
      case "Backend":
        return backendDomainByEnvironment(nodeEnv);
    }
  }

  export function webDomainByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development":
        return "fedev.rentyourride.ca";
      case "staging":
        return "festage.rentyourride.ca";
      case "production":
        return "app.rentyourride.ca";
    }
  }

  export function backendDomainByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development":
        return "bedev.rentyourride.ca";
      case "staging":
        return "bestage.rentyourride.ca";
      case "production":
        return "backend.rentyourride.ca";
    }
  }

  export function adminDomainByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development":
        return "admindev.rentyourride.ca";
      case "staging":
        return "adminstage.rentyourride.ca";
      case "production":
        return "admin.rentyourride.ca";
    }
  }

  export function instanceTypeByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv){
      case "development": return  't4g.micro';
      case "staging": return 'm8g.medium';
      case "production": return 'm8g.medium';
    }
  }

  export function maxAutoScalingCapacityByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development": return 1;
      case "staging": return 1;
      case "production": return 2;
    }
  }
export function cloudWatchFromEnvironment(nodeEnv: Types.NodeEnvironment) {
  switch(nodeEnv) {
    case "development": return 'ryr-dev-backend';
    case "staging": return 'ryr-stage-backend'
    case "production": return 'ryr-prod-backend'
  }
}


  export function backendNameByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development": return 'dev-ryrbs';
      case "staging": return 'stage-ryrbs';
      case "production": return 'prod-ryrbs';
    }
  }


  export function adminNameByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development": return 'dev-ryrbs-admin';
      case "staging": return 'stage-ryrbs-admin';
      case "production": return 'prod-ryrbs-admin';
    }
  }


  export function webNameByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development": return 'dev-ryrbs-web';
      case "staging": return 'stage-ryrbs-web';
      case "production": return 'prod-ryrbs-web';
    }
  }

  export function emailByEnvironment(nodeEnv: Types.NodeEnvironment) {
    const emailFn = (env: string) => `donotreply${env}@rentyourride.ca`
    switch(nodeEnv) {
      case "development": return emailFn('+dev');
      case "staging": return emailFn('+stage');
      case "production": return emailFn('');
    }
  }

  export function pinpointArnByEnvironment(appId: string, nodeEnv: Types.NodeEnvironment) {
    const arnFn = (accountId: string) => `arn:aws:mobiletargeting:${Constants.PROD_REGION_ID}:${accountId}:apps/${appId}`;

    switch(nodeEnv) {
      case "development": return arnFn('050752619507'); 
      case "staging": return arnFn('337909764675');
      case "production": return arnFn('148761673904');
    }
  }

  export function pinpointWildcardArnByEnvironment(appId: string, nodeEnv: Types.NodeEnvironment) {
    const arnFn = (accountId: string) => `arn:aws:mobiletargeting:${Constants.PROD_REGION_ID}:${accountId}:apps/${appId}/messages`;

    switch(nodeEnv) {
      case "development": return arnFn('050752619507'); 
      case "staging": return arnFn('337909764675');
      case "production": return arnFn('148761673904');
    }
  }

  export function sesRoleArnByEnvironment(nodeEnv: Types.NodeEnvironment) {

    const sesProdRoleArn = (roleName: string) => `arn:aws:iam::897729110915:role/${roleName}`;
    switch(nodeEnv) {
      case "development": return sesProdRoleArn('RYR-DEV-SES-Role');
      case "staging": return sesProdRoleArn('');
      case "production": return sesProdRoleArn('')
    }
  }

  export function codestarConnectionByEnvironment(nodeEnv: Types.NodeEnvironment) {
    switch (nodeEnv) {
      case "development": return "arn:aws:codestar-connections:us-east-2:050752619507:connection/117a1216-b2c7-4a63-96f1-c2f3d7af2371";
      case "staging": return 'arn:aws:codeconnections:us-east-2:337909764675:connection/672f3c6a-34ce-4c32-9fe6-d177a656acbb';
      case "production": return "arn:aws:codeconnections:us-east-2:148761673904:connection/7f9f8404-8588-4b7a-90c9-4072421f2415";

    }
  }
}
