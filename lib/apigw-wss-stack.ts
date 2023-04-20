import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdanodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { WebSocketApi, WebSocketStage } from "@aws-cdk/aws-apigatewayv2-alpha/lib/websocket";
import { WebSocketLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { Construct } from 'constructs';
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";

export class ApiGatewayWebSocketStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const connectionTable = new dynamodb.Table(this, 'ClientConnection', {
            tableName: 'SuJie-WSS-ClientConnection',
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, 
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            partitionKey: {
                name: 'Id',
                type: dynamodb.AttributeType.STRING
            },
            pointInTimeRecovery: true,
            timeToLiveAttribute: 'TTL'
        });

        const apigLambdaRole = new iam.Role(this, 'ApigLambdaRole', {
            roleName: `SuJie-WSS-ApigLambdaRole-${cdk.Stack.of(this).region}`,
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
            ],
        });

        const functionSettings : lambdanodejs.NodejsFunctionProps = {
            handler: 'handler',
            runtime: lambda.Runtime.NODEJS_16_X,
            memorySize: 128,
            timeout: cdk.Duration.seconds(60),
            architecture: cdk.aws_lambda.Architecture.X86_64,
            role: apigLambdaRole,
            logRetention: cdk.aws_logs.RetentionDays.ONE_WEEK
        };

        const connectEventFunction = new lambdanodejs.NodejsFunction(this, 'HandleConnectEvent', {
            functionName: 'SuJie-WSS-HandleConnectEvent',
            entry: './resources/handle-connect-event.ts',
            environment: {
                DDB_CONNECTION_TABLE: connectionTable.tableName
            },
            ...functionSettings
        });

        const disconnectEventFunction = new lambdanodejs.NodejsFunction(this, 'HandleDisconnectEvent', {
            functionName: 'SuJie-WSS-HandleDisconnectEvent',
            entry: './resources/handle-disconnect-event.ts',
            environment: {
                DDB_CONNECTION_TABLE: connectionTable.tableName
            },
            ...functionSettings
        });

        const defaultEventFunction = new lambdanodejs.NodejsFunction(this, 'HandleDefaultEvent', {
            functionName: 'SuJie-WSS-HandleDefaultEvent',
            entry: './resources/handle-default-event.ts',
            ...functionSettings
        });

        const sendMessageFunction = new lambdanodejs.NodejsFunction(this, 'SendMessage', {
            functionName: 'SuJie-WSS-SendMessage',
            entry: './resources/send-message.ts',
            environment: {
                DDB_CONNECTION_TABLE: connectionTable.tableName
            },
            ...functionSettings
        });

        const webSocketApi = new WebSocketApi(this, 'WebSocketAPI', {
            apiName: 'SuJie-WSS-WebSocketAPI',
            routeSelectionExpression: '$request.body.action',
            connectRouteOptions: {
                integration: new WebSocketLambdaIntegration('OnConnect', connectEventFunction),
            },
            disconnectRouteOptions: {
                integration: new WebSocketLambdaIntegration('OnDisconnect', disconnectEventFunction),
            },
            defaultRouteOptions: {
                integration: new WebSocketLambdaIntegration('OnDefault', defaultEventFunction),
            },
        });

        webSocketApi.addRoute('send-message', {
            integration: new WebSocketLambdaIntegration('OnSendMessage', sendMessageFunction),
        });
        webSocketApi.grantManageConnections(sendMessageFunction);
        webSocketApi.grantManageConnections(defaultEventFunction);

        const stageName = 'dev';
        const stage = new WebSocketStage(this, 'Stage', {
            webSocketApi,
            stageName: stageName,
            autoDeploy: true,
        });
        new cdk.CfnOutput(this, "WebSocketEndpoint", { value: `${webSocketApi.apiEndpoint}/${stageName}` });

        const wssDomain = `${webSocketApi.apiId}.execute-api.${cdk.Stack.of(this).region}.amazonaws.com`;

        const wssOriginRequestPolicy = new cloudfront.OriginRequestPolicy(this, 'WebSocketPolicy', {
            originRequestPolicyName: 'WebSocketPolicy',
            comment: 'A default WebSocket policy',
            cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
            headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
                'Sec-WebSocket-Key', 'Sec-WebSocket-Version', 'Sec-WebSocket-Protocol', 'Sec-WebSocket-Accept'),
            queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.none(),
        });
        const wssDist = new cloudfront.Distribution(this, 'WebSocketDist', {
            defaultBehavior: {
               origin: new origins.HttpOrigin(wssDomain, { originPath: stageName }),
               cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
               originRequestPolicy: wssOriginRequestPolicy,
            },
        });
        wssDist.node.addDependency(webSocketApi);
        new cdk.CfnOutput(this, "WebSocketCloudFrontEndpoint", { value: wssDist.distributionDomainName });
    }
}
