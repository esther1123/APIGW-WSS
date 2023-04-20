#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiGatewayWebSocketStack } from '../lib/apigw-wss-stack';

const app = new cdk.App();
new ApiGatewayWebSocketStack(app, 'SuJie-ApiGatewayWebSocket', {
    env: { 
        account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION
    }
});
