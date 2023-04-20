import { APIGatewayEventWebsocketRequestContextV2 } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

type ErrorWithMessage = {
    message: string
};
function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as Record<string, unknown>).message === 'string'
    );
}
function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
    if (isErrorWithMessage(maybeError)) return maybeError
  
    try {
        return new Error(JSON.stringify(maybeError));
    } catch {
        return new Error(String(maybeError));
    }
}
export function getErrorMessage(error: unknown) {
    return toErrorWithMessage(error).message;
}

export function addHours(date: Date, hours: number): Date {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
};

export function getApiGatewayManagementApi(requestContext: APIGatewayEventWebsocketRequestContextV2): ApiGatewayManagementApi {
    const domainName = requestContext.domainName;
    const stage = requestContext.stage;
    const endpoint = `${domainName}/${stage}`;
    console.log(`ApiGatewayManagementApi endpoint: ${endpoint}`);
    const sendToClientApi = new ApiGatewayManagementApi({
        apiVersion: '2018-11-29',
        endpoint: endpoint,
    });

    return sendToClientApi;
}

export function isNotFoundException(err: any): boolean {
    return err?.code == 'NotFoundException';
}

export function isNotAuthorizedException(err: any): boolean {
    return err?.code == 'NotAuthorizedException';
}
