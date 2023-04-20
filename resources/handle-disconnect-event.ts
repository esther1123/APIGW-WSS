import { APIGatewayProxyResult, 
         APIGatewayProxyWebsocketHandlerV2, 
         APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { getErrorMessage } from './utility-functions';

const dynamoDb = new DynamoDB.DocumentClient();

export const handler : APIGatewayProxyWebsocketHandlerV2 = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);

    const connectionId = event.requestContext.connectionId;
    console.log(`connectionId: ${connectionId}`);

    const connectionTable = process.env.DDB_CONNECTION_TABLE as string;
    console.log(`connectionTableName: ${connectionTable}`);

    try {
        const param = {
            TableName: connectionTable,
            Key: {
                Id: connectionId,
            }
        };
        const putOutput = await dynamoDb.delete(param).promise();
        console.log('Remove connection data: ', putOutput);

        return {
            statusCode: 200,
            body: '',
        };

    } catch(err) {
        console.error(getErrorMessage(err));
        return {
            statusCode: 500,
            body: 'Internal error, please try again later'
        };
    }
};
