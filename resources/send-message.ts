import { APIGatewayProxyResult, 
         APIGatewayProxyWebsocketHandlerV2, 
         APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { getErrorMessage, getApiGatewayManagementApi } from './utility-functions';

const dynamoDb = new DynamoDB.DocumentClient();

export const handler : APIGatewayProxyWebsocketHandlerV2 = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);

    const connectionId = event.requestContext.connectionId;
    console.log(`connectionId: ${connectionId}`);

    const connectionTable = process.env.DDB_CONNECTION_TABLE as string;
    console.log(`connectionTableName: ${connectionTable}`);

    let allConnectionInfo;
    try {
        const param = {
            TableName: connectionTable,
        };
        const scanOutput = await dynamoDb.scan(param).promise();
        allConnectionInfo = scanOutput.Items as { Id: string }[];

    } catch (err) {
        console.error(getErrorMessage(err));
        return {
            statusCode: 200,
            body: '',
        };
    }

    const sendToClientApi = getApiGatewayManagementApi(event.requestContext);

    const bodyJSON = JSON.parse(event.body || '{}');
    let message = '';
    message = bodyJSON.message as string;
    console.log(`message: ${message}`);
    if (message == undefined || message.length == 0) {
        return {
            statusCode: 200,
            body: '',
        };
    }
    
    let promises : Promise<any>[] = [];

    for (let connectionInfo of allConnectionInfo) {
        console.log(`connectionInfo: ${JSON.stringify(connectionInfo, null, 2)}`);

        let chatMessage = message;
        if (connectionId == connectionInfo.Id) {
            chatMessage = `You: ${message}`;
        }

        const promise = sendToClientApi.postToConnection({ ConnectionId: connectionInfo.Id, Data: chatMessage })
        .promise()
        .catch(e => console.error(e));

        promises.push(promise);
    }

    await Promise.all(promises).then(response => {
        console.log(`Promise.all results of postToConnection: ${JSON.stringify(response, null, 2)}`);
    }, reaseon => {
        console.error(getErrorMessage(reaseon));
        throw new Error('Failed to process all postToConnection requests');
    });

    return {
        statusCode: 200,
        body: '',
    };
};
