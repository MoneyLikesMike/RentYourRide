#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { PipelinesStack } from "../lib/pipelines-stack";
import { Utils } from "../../shared";

const nodeEnv = Utils.loadNodeEnvironment();

const app = new cdk.App();
new PipelinesStack(app, "PipelinesStack", {
  env: Utils.loadCDKEnvironment(nodeEnv),
  nodeEnv,
});
