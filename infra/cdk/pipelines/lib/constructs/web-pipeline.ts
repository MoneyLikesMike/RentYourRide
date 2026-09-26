import { Artifact, Pipeline } from "aws-cdk-lib/aws-codepipeline";
import { Construct } from "constructs";
import { Constants, Types, Utils } from "../../../shared";
import { BuildSpec, PipelineProject } from "aws-cdk-lib/aws-codebuild";
import { CodeBuildAction, CodeDeployServerDeployAction, CodeStarConnectionsSourceAction, GitHubSourceAction, GitHubTrigger } from "aws-cdk-lib/aws-codepipeline-actions";
import { AmazonLinuxCpuType, AmazonLinuxGeneration, AmazonLinuxImage, InstanceType, IVpc, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import { AutoScalingGroup } from "aws-cdk-lib/aws-autoscaling";
import { Fn } from "aws-cdk-lib";
import { Role } from "aws-cdk-lib/aws-iam";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { LoadBalancer, ServerApplication, ServerDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";
import { ApplicationTargetGroup } from "aws-cdk-lib/aws-elasticloadbalancingv2";

export interface WebPipelineConstructProps{
    nodeEnv: Types.NodeEnvironment,
    vpc: IVpc;
}

export class WebPipelineConstruct extends Construct {
    constructor(scope: Construct, id: string, props: WebPipelineConstructProps){
        super(scope, id)

        const pipeline = new Pipeline(this, 'Web-Pipeline');

        const sourceOutput = new Artifact('Web-SourceArtifact');
         

        const branch = Utils.branchByNodeEnv(props.nodeEnv);
        const buildProject = new PipelineProject(this, 'Web-BuildSource', {
          //buildSpec: BuildSpec.fromSourceFilename
          projectName: `Web-${props.nodeEnv}-codebuild`,
          buildSpec: BuildSpec.fromSourceFilename(Utils.buildSpecByNodeEnv(props.nodeEnv))
           
        })

        const githubAction = new CodeStarConnectionsSourceAction({
          actionName: 'Web-Source',
          owner: "Rent-Your-Ride-Michael",
          repo: "Web",
          branch,
          connectionArn: Utils.codestarConnectionByEnvironment(props.nodeEnv),
          output: sourceOutput,
        });
    
        const outputArtifact = new Artifact("Web-BuildArtifact");

        const sourceStage = pipeline.addStage({stageName: 'Web-SourceStage'});
        sourceStage.addAction(githubAction );
        const buildStage = pipeline.addStage({stageName: 'Web-BuildStage'});
        buildStage.addAction(new CodeBuildAction({
          actionName: 'Web-BuildCode',
          input: sourceOutput,
          outputs: [outputArtifact],
          project: buildProject
        }));

        const buildOutputArtifact = outputArtifact;

        const deployAction = new DeployWebActionConstruct(
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

interface DeployWebActionConstructProps {
  vpc: IVpc;
  nodeEnv: Types.NodeEnvironment;
  inputArtifact: Artifact
}

class DeployWebActionConstruct extends Construct {

  deployAction: CodeDeployServerDeployAction;
  private autoScalingGroup: AutoScalingGroup;

  constructor(scope: Construct, id: string, props: DeployWebActionConstructProps){
    super(scope, id);
    const roleName = Fn.importValue(`RYRInstanceProfileOutput-${props.nodeEnv}`);

    const instanceProfileRole = Role.fromRoleName(this, 'RYRCodeDeployInstanceProfile', roleName);

    const publicSubnets = props.vpc.selectSubnets({
      subnetType: SubnetType.PUBLIC,
    });

    const ami = new AmazonLinuxImage({
      generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
      cpuType: AmazonLinuxCpuType.ARM_64,
    });

    const secId = Fn.importValue('EC2SecurityGroupId');
    const ec2SecurityGroup = SecurityGroup.fromSecurityGroupId(this, "RYREC2SecurityGroup", secId);
    
    const param = StringParameter.valueFromLookup(this, `ApplicationLoadBalancerSecurityGroupId-${props.nodeEnv}`);
    const elbSecurityGroup = SecurityGroup.fromLookupById(this, 'ELBSG', param);

    // Allow traffic from the ELB security group to the EC2 instance on port 8080

    this.autoScalingGroup = new AutoScalingGroup(this, "WebASG", {
      vpc: props.vpc,
      vpcSubnets: {
        subnets: publicSubnets.subnets
      },
      role: instanceProfileRole, 
      maxCapacity: Utils.maxAutoScalingCapacityByEnvironment(props.nodeEnv),
      instanceType: new InstanceType(
        //Utils.instanceTypeByEnvironment(props.nodeEnv)
        't4g.micro'
      ),
      //machineImage: this.customAmi,
      machineImage: ami,
      securityGroup: ec2SecurityGroup,
      associatePublicIpAddress: true
    });

    const version = "2";
    this.autoScalingGroup.addUserData(
      `# Custom UserData script - Version ${version}`,
       Constants.NGINX_CODE_DEPLOY_COMMAND, ...Constants.CLOUD_WATCH_COMMANDS(Utils.cloudWatchFromEnvironment(props.nodeEnv)),
    )

    this.albDeploy(props);

  }

  albDeploy(props: DeployWebActionConstructProps) {
    const application = new ServerApplication(this, "WebApp", {
      applicationName: Utils.webNameByEnvironment(props.nodeEnv),
    });
    const codeDeployRole = Role.fromRoleName(this, 'RYRCodeDeployRole', `RYRCodeDeployRole-${props.nodeEnv}`);

    const deploymentGroup = new ServerDeploymentGroup(
      this,
      "WebDeploymentGroup",
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
                  `WebTargetGroupARN-${props.nodeEnv}`
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
}