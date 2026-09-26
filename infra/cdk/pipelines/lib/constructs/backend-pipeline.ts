import { Fn, SecretValue } from "aws-cdk-lib";
import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { Types, Utils, Constants } from "../../../shared";
import { BuildSpec, ComputeType, LinuxBuildImage, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import {
  CodeBuildAction,
  CodeDeployServerDeployAction,
  CodeStarConnectionsSourceAction,
  GitHubSourceAction,
  GitHubTrigger,
} from "aws-cdk-lib/aws-codepipeline-actions";
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  InstanceTagSet,
  LoadBalancer,
  LoadBalancerGeneration,
  ServerApplication,
  ServerDeploymentGroup,
} from "aws-cdk-lib/aws-codedeploy";
import {
  ApplicationLoadBalancer,
  ApplicationTargetGroup,
} from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import {
  AmazonLinux2023ImageSsmParameter,
  AmazonLinuxCpuType,
  AmazonLinuxGeneration,
  AmazonLinuxImage,
  GenericSSMParameterImage,
  InstanceType,
  IVpc,
  OperatingSystemType,
  Peer,
  Port,
  SecurityGroup,
  SubnetType,
} from "aws-cdk-lib/aws-ec2";
import { StringParameter } from "aws-cdk-lib/aws-ssm";

export interface BackendPipelineConstructProps {
  nodeEnv: Types.NodeEnvironment;
  apiSecretsArn: string;
  //imageName: string;
  vpc: IVpc;
}

export interface SecretsBuildActionProps {
  secretArn: string;
  host: string;
  redisHost: string;
  secretsOutput: Artifact;
  sourceOutput: Artifact;
  apiSecretsArn: string;
  pinpointAppId: string;
  phoneNumber: string;
  nodeEnv: Types.NodeEnvironment;
}

export class BackendPipelineConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: BackendPipelineConstructProps
  ) {
    super(scope, id);

    // const host = Fn.importValue("PostgresqlUrl");
    const host = StringParameter.valueFromLookup(this, `/db/endpoint`);
    const secretArn = Fn.importValue("PostgreSQLSecret");

    
    const redisExportName = 
    //(props.nodeEnv === 'development') ? 'RYRClusterCacheHost' : 
    `RYRClusterCacheHost-${props.nodeEnv}`;
    const redisHost = Fn.importValue(redisExportName);
    const pinpointAppId = Fn.importValue(`RYRPointAppId-${props.nodeEnv}`)
    const pipeline = new Pipeline(this, "Backend-Pipeline");
    pipeline.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [secretArn, props.apiSecretsArn],
      })
    );
    const sourceArtifact = new Artifact("Backend-SourceArtifact");

    const branch = Utils.branchByNodeEnv(props.nodeEnv);

    const githubAction = new CodeStarConnectionsSourceAction({
      actionName: 'GitHub_Source',
      owner: "Rent-Your-Ride-Michael",
      repo: "Backend",
      branch,
      connectionArn: Utils.codestarConnectionByEnvironment(props.nodeEnv),
      output: sourceArtifact,
    });

    // const githubAction = new GitHubSourceAction({
    //   actionName: 'Backend-Source',
    //   owner: 'Rent-Your-Ride-Michael',
    //   repo: 'Backend',
    //   oauthToken: token,
    //   output: sourceArtifact,
    //   branch,
    //   trigger: GitHubTrigger.WEBHOOK
    // });

    pipeline.addToRolePolicy(new PolicyStatement({
      actions: ['codestar-connections:UseConnection'],
      resources: [Utils.codestarConnectionByEnvironment(props.nodeEnv)]
    }));
    
    const sourceStage = pipeline.addStage({ stageName: "Backend-SourceStage" });
    sourceStage.addAction(githubAction);

    const phoneNumber = StringParameter.fromStringParameterAttributes(this, 'DedicatedNumber', {
      parameterName: '/ryr/sms/dedicatedNumber',
    }).stringValue;

    // Download Secrets
    const secretsArtifact = new Artifact("Backend-SecretsArtifact");
    const secretsBuildProps: SecretsBuildActionProps = {
      secretArn,
      host,
      redisHost,
      phoneNumber,
      secretsOutput: secretsArtifact,
      sourceOutput: sourceArtifact,
      apiSecretsArn: props.apiSecretsArn,
      pinpointAppId,
      nodeEnv: props.nodeEnv,
    };

    const secretsbuildAction = new SecretsBuildActionConstruct(
      this,
      "SecretsBuildActionConstruct",
      secretsBuildProps
    ).buildAction;
    const secretsStage = pipeline.addStage({
      stageName: "Backend-SecretsStage",
    });
    secretsStage.addAction(secretsbuildAction);

    // Compile Source
    const compileBuildConstruct = new CompileBuildConstruct(
      this,
      "CompileBuildConstruct",
      {
        nodeEnv: props.nodeEnv,
        sourceOutput: secretsArtifact,
      }
    )

    const buildAction = compileBuildConstruct.buildAction;
    const buildOutputArtifact = compileBuildConstruct.outputArtifact;

    pipeline.addStage({
      stageName: "Backend-BuildStage",
      actions: [buildAction],
    });

    // Deploy Code
    const deployAction = new DeployActionConstruct(
      this,
      "DeployActionConstruct",
      {
        nodeEnv: props.nodeEnv,
        //imageName: props.imageName,
        vpc: props.vpc,
        inputArtifact: buildOutputArtifact
      }
    ).deployAction;

    pipeline.addStage({
      stageName: "Deploy",
      actions: [deployAction],
    });
  }
}

interface CompileBuildConstructProps {
  nodeEnv: Types.NodeEnvironment;
  sourceOutput: Artifact;
}

class CompileBuildConstruct extends Construct {

  buildAction: CodeBuildAction;
  outputArtifact: Artifact;

  constructor(scope: Construct, id: string, props: CompileBuildConstructProps) {
    super(scope, id);
    const buildSpecFile = "buildspec.yml";
    const buildProject = new PipelineProject(this, "Backend-BuildSource", {
      //buildSpec: BuildSpec.fromSourceFilename
      projectName: `Backend-${props.nodeEnv}-codebuild`,
      buildSpec: BuildSpec.fromSourceFilename(buildSpecFile),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0, // or STANDARD_6_0, etc.
        computeType: ComputeType.SMALL, // or MEDIUM, LARGE
        environmentVariables: {
          NODE_ENV: { value: props.nodeEnv },
        },
      },
      
    });
    this.outputArtifact = new Artifact("Backend-BuildArtifact");

    this.buildAction = new CodeBuildAction({
      actionName: "Backend-BuildCode",
      input: props.sourceOutput,
      outputs: [this.outputArtifact],
      project: buildProject,
      
    });
  }
}

class SecretsBuildActionConstruct extends Construct {
  buildAction: CodeBuildAction;
  constructor(scope: Construct, id: string, props: SecretsBuildActionProps) {
    super(scope, id);
    const {
      secretArn,
      host,
      phoneNumber,
      sourceOutput,
      secretsOutput,
      nodeEnv,
      apiSecretsArn,
      redisHost,
      pinpointAppId
    } = props;
    const commands = [
      `SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id ${secretArn} --query SecretString --output text)`,
      `API_SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id ${apiSecretsArn} --query SecretString --output text)`,
      `PHONENUMBER=${phoneNumber}`,
      "USERNAME=$(echo $SECRET_VALUE | jq -r .username)",
      "PASSWORD=$(echo $SECRET_VALUE | jq -r .password)",
      "ENCRYPTION_SALT=$(echo $API_SECRET_VALUE | jq -r .encryptionSalt)",
      "JWT_SECRET=$(echo $API_SECRET_VALUE | jq -r .jwtSecret)",
      "CARMD_AUTH_TOKEN=$(echo $API_SECRET_VALUE | jq -r .carmdAuthToken)",
      "CARMD_PARTNER_TOKEN=$(echo $API_SECRET_VALUE | jq -r .carmdPartnerToken)",
      "MATI_CLIENT_SECRET=$(echo $API_SECRET_VALUE | jq -r .matiClientSecret)",
      "MATI_WEBHOOK_SECRET=$(echo $API_SECRET_VALUE | jq -r .matiWebhookSecret)",
      "STRIPE_SECRET_KEY=$(echo $API_SECRET_VALUE | jq -r .stripeSecretKey)",
      "STRIPE_WEBHOOK_SECRET=$(echo $API_SECRET_VALUE | jq -r .stripeWebhookSecret)",
      "STRIPE_VERIFICATION_FLOW_ID=$(echo $API_SECRET_VALUE | jq -r .stripeVerificationFlowId)",
      "HUBSPOT_API_KEY=$(echo $API_SECRET_VALUE | jq -r .hubspotApiKey)",
      `echo "PHONENUMBER=$PHONENUMBER" >> ${nodeEnv}.env`,
      `echo "TYPEORM_USERNAME=$USERNAME" >> ${nodeEnv}.env`,
      `echo "TYPEORM_PASSWORD=$PASSWORD" >> ${nodeEnv}.env`,
      `echo "TYPEORM_HOST=${host}" >> ${nodeEnv}.env`,
      `echo "REDIS_HOST=${redisHost}" >> ${nodeEnv}.env`,
      `echo "ENCRYPTION_SALT=$ENCRYPTION_SALT" >> ${nodeEnv}.env`,
      `echo "JWT_SECRET=$JWT_SECRET" >> ${nodeEnv}.env`,
      `echo "CARMD_AUTH_TOKEN=$CARMD_AUTH_TOKEN" >> ${nodeEnv}.env`,
      `echo "CARMD_PARTNER_TOKEN=$CARMD_PARTNER_TOKEN" >> ${nodeEnv}.env`,
      `echo "MATI_CLIENT_SECRET=$MATI_CLIENT_SECRET" >> ${nodeEnv}.env`,
      `echo "MATI_WEBHOOK_SECRET=$MATI_WEBHOOK_SECRET" >> ${nodeEnv}.env`,
      `echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" >> ${nodeEnv}.env`,
      `echo "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" >> ${nodeEnv}.env`,
      `echo "STRIPE_VERIFICATION_FLOW_ID=$STRIPE_VERIFICATION_FLOW_ID" >> ${nodeEnv}.env`,

      `echo "HUBSPOT_API_KEY=$HUBSPOT_API_KEY" >> ${nodeEnv}.env`,
      `echo "AWS_PINPOINT_APP_ID=${pinpointAppId}" >> ${nodeEnv}.env`,
    ];

    const secretsProject = new PipelineProject(this, "Backend-SecretsSource", {
      projectName: `Backend-${nodeEnv}-secrets`,
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          build: {
            commands,
          },
        },
        artifacts: {
          files: ["**/*"],
        },
      }),
    });

    secretsProject.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["secretsmanager:GetSecretValue"],
        resources: [secretArn, apiSecretsArn],
      })
    );

    this.buildAction = new CodeBuildAction({
      actionName: "PullSecrets",
      input: sourceOutput,
      outputs: [secretsOutput],
      project: secretsProject,
    });
  }
}

export interface DeployActionConstructProps {
  //imageName: string;
  vpc: IVpc;
  nodeEnv: Types.NodeEnvironment;
  inputArtifact: Artifact
}

class DeployActionConstruct extends Construct {
  deployAction: CodeDeployServerDeployAction;
  private autoScalingGroup: AutoScalingGroup;

  constructor(scope: Construct, id: string, props: DeployActionConstructProps) {
    super(scope, id);
    
    const roleName = Fn.importValue(`RYRInstanceProfileOutput-${props.nodeEnv}`);

    const instanceProfileRole = Role.fromRoleName(this, 'RYRCodeDeployInstanceProfile', roleName);

    const publicSubnets = props.vpc.selectSubnets({
      subnetType: SubnetType.PUBLIC,
    });

    const ami = new AmazonLinux2023ImageSsmParameter({
      cpuType: AmazonLinuxCpuType.ARM_64,
    });

    const secId = Fn.importValue('EC2SecurityGroupId');
    const ec2SecurityGroup = SecurityGroup.fromSecurityGroupId(this, "RYREC2SecurityGroup", secId);
    
    const param = StringParameter.valueFromLookup(this, `ApplicationLoadBalancerSecurityGroupId-${props.nodeEnv}`);
    const elbSecurityGroup = SecurityGroup.fromLookupById(this, 'ELBSG', param);

    // Allow traffic from the ELB security group to the EC2 instance on port 8080

    this.autoScalingGroup = new AutoScalingGroup(this, "BackendASG", {
      vpc: props.vpc,
      vpcSubnets: {
        subnets: publicSubnets.subnets
      },
      role: instanceProfileRole, 
      maxCapacity: Utils.maxAutoScalingCapacityByEnvironment(props.nodeEnv),
      instanceType: new InstanceType(
        Utils.instanceTypeByEnvironment(props.nodeEnv)
      ),
      //machineImage: this.customAmi,
      machineImage: ami,
      securityGroup: ec2SecurityGroup,
      associatePublicIpAddress: true
    });

    this.autoScalingGroup.addUserData(
       Constants.CODE_DEPLOY_COMMAND, ...Constants.CLOUD_WATCH_COMMANDS(Utils.cloudWatchFromEnvironment(props.nodeEnv)),
    )

    this.albDeploy(props);

    //this.ec2Deploy(props);
  }


  albDeploy(props: DeployActionConstructProps) {
    const application = new ServerApplication(this, "BackendApp", {
      applicationName: Utils.backendNameByEnvironment(props.nodeEnv),
    });
    const codeDeployRole = Role.fromRoleName(this, 'RYRCodeDeployRole', `RYRCodeDeployRole-${props.nodeEnv}`);

    const deploymentGroup = new ServerDeploymentGroup(
      this,
      "BackendDeploymentGroup",
      {
        role: codeDeployRole,
        application,

        autoScalingGroups: [this.autoScalingGroup],
        loadBalancers: [
          LoadBalancer.application(
            ApplicationTargetGroup.fromTargetGroupAttributes(
              this,
              "ApplicationTG",
              {
                targetGroupArn: Fn.importValue(
                  `BackendTargetGroupARN-${props.nodeEnv}`
                ),
                loadBalancerArns: Fn.importValue(
                  `ApplicationLoadBalancerARN-${props.nodeEnv}`
                ),
              }
            )
          ),
        ],
      }
    );

    this.deployAction = new CodeDeployServerDeployAction({
      actionName: "CodeDeploy",
      input: props.inputArtifact,
      deploymentGroup,
    });
  }

  ec2Deploy(props: DeployActionConstructProps) {
    // Define CodeDeploy application
    const codeDeployApp = new ServerApplication(this, "BackendApp", {
      applicationName: "BackendApp",
    });

    // Define CodeDeploy deployment group
    const deploymentGroup = new ServerDeploymentGroup(
      this,
      "BackendDeployment",
      {
        application: codeDeployApp,
        deploymentGroupName: "MyDeploymentGroup",
        autoScalingGroups: [this.autoScalingGroup],
        ec2InstanceTags: new InstanceTagSet({
          Name: ["RYR-Backend-Instance-01"], // Replace with actual tag used to identify your instance
        }),
        // Optionally, specify other configurations like alarms, auto-rollback, etc.
      }
    );

    // Define the deployment action
    this.deployAction = new CodeDeployServerDeployAction({
      actionName: "CodeDeploy",
      input: props.inputArtifact,
      deploymentGroup,
    });
  }
}
