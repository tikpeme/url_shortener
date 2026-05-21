import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { randomBytes } from 'crypto';

const client = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;
const BASE_URL = process.env.BASE_URL!;

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const MAX_VALID = Math.floor(256 / ALPHABET.length) * ALPHABET.length;

function nanoid(): string {
  const chars: string[] = [];
  while (chars.length < 7) {
    for (const byte of randomBytes(7)) {
      if (byte < MAX_VALID) {
        chars.push(ALPHABET[byte % ALPHABET.length]);
        if (chars.length === 7) break;
      }
    }
  }
  return chars.join('');
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body ?? '{}');
    const { url } = body;

    if (!url || !isValidUrl(url)) {
      return response(400, { error: 'Invalid or missing url' });
    }

    const code = nanoid();
    const ttl = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;

    await client.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: {
        code:        { S: code },
        originalUrl: { S: url },
        createdAt:   { S: new Date().toISOString() },
        clickCount:  { N: '0' },
        ttl:         { N: String(ttl) },
      },
      ConditionExpression: 'attribute_not_exists(code)',
    }));

    return response(201, { shortUrl: `${BASE_URL}/${code}`, code });

  } catch (err: any) {
    if (err.name === 'ConditionalCheckFailedException') {
      return handler(event);
    }
    console.error(err);
    return response(500, { error: 'Internal server error' });
  }
};

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function response(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
