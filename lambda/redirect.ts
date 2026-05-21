import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const code = event.pathParameters?.code;

    if (!code) {
      return { statusCode: 400, body: 'Missing code' };
    }

    const result = await client.send(new GetItemCommand({
      TableName: TABLE_NAME,
      Key: { code: { S: code } },
    }));

    if (!result.Item) {
      return { statusCode: 404, body: 'Short URL not found' };
    }

    const originalUrl = result.Item.originalUrl.S!;

    client.send(new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: { code: { S: code } },
      UpdateExpression: 'ADD clickCount :inc',
      ExpressionAttributeValues: { ':inc': { N: '1' } },
    })).catch(console.error);

    return {
      statusCode: 302,
      headers: { Location: originalUrl },
      body: '',
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
