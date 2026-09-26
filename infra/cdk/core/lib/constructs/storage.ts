import { Construct } from "constructs";
import { Types, Utils } from "../../../shared";
import { BlockPublicAccess, Bucket, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { AnyPrincipal, Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";

export interface StorageConstructProps {
    nodeEnv: Types.NodeEnvironment
}

export class StorageConstruct extends Construct {

    readonly bucket: Bucket;

    constructor(scope: Construct, id: string, props: StorageConstructProps) {
        super(scope, id);

    // Create an S3 bucket with encryption, versioning, and blocking public access
    this.bucket = new Bucket(this, 'RYRBucket', {
        bucketName: Utils.backendNameByEnvironment(props.nodeEnv),
        encryption: BucketEncryption.S3_MANAGED, // Default encryption (SSE-S3)
        versioned: true, // Enable versioning
        blockPublicAccess: BlockPublicAccess.BLOCK_ACLS, // Block all public access
      });
  
      // Grant read-only access using a bucket policy
      const readOnlyPolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'], // Read-only access to objects
        resources: [`${this.bucket.bucketArn}/*`], // Apply to all objects in the bucket
        principals: [new AnyPrincipal()], // Use a specific principal (e.g., a Role) for stricter control
      });
  
      this.bucket.addToResourcePolicy(readOnlyPolicy);
    }
}