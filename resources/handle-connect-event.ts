import { APIGatewayProxyResult, 
         APIGatewayProxyWebsocketHandlerV2, 
         APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { getErrorMessage, addHours } from './utility-functions';

const dynamoDb = new DynamoDB.DocumentClient();

export const handler : APIGatewayProxyWebsocketHandlerV2 = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);

    const connectionId = event.requestContext.connectionId;
    console.log(`connectionId: ${connectionId}`);

    const connectionTable = process.env.DDB_CONNECTION_TABLE as string;
    console.log(`connectionTableName: ${connectionTable}`);

    const now = new Date();
    const twoHourLater = addHours(now, 2);
    const twoHourLaterTimestamp = Math.floor(twoHourLater.getTime() / 1000);
    try {
        const param = {
            TableName: connectionTable,
            Item: {
                Id: connectionId,
            },
            TTL: twoHourLaterTimestamp,
        };
        const putOutput = await dynamoDb.put(param).promise();
        console.log('Add connection data: ', putOutput);

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
