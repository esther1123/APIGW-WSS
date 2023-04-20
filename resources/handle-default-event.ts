import { APIGatewayProxyResult, 
         APIGatewayProxyWebsocketHandlerV2, 
         APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { getErrorMessage, getApiGatewayManagementApi } from './utility-functions';

export const handler : APIGatewayProxyWebsocketHandlerV2 = async (event: APIGatewayProxyWebsocketEventV2): Promise<APIGatewayProxyResult> => {
    console.log(`Event: ${JSON.stringify(event, null, 2)}`);

    const connectionId = event.requestContext.connectionId;
    console.log(`connectionId: ${connectionId}`);

    const sendToClientApi = getApiGatewayManagementApi(event.requestContext);

    try {
        await sendToClientApi.postToConnection({
            ConnectionId: connectionId,
            Data: 'Use {"action": "send-message", "message": "hello!"} to send a message',
        }).promise();
    } catch(err) {
        console.error(getErrorMessage(err));
    }

    return {
        statusCode: 200,
        body: '',
    };
};
