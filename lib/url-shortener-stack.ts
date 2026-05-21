import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class UrlShortenerStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ─── Step 1: DynamoDB table ───────────────────────────────────
    const table = new dynamodb.Table(this, 'UrlsTable', {
      tableName: 'urls',
      partitionKey: {
        name: 'code',
        type: dynamodb.AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ─── Step 2: Lambda functions ─────────────────────────────────
    const createFn = new lambda.NodejsFunction(this, 'CreateShortUrl', {
      entry: 'lambda/create.ts',
      environment: {
        TABLE_NAME: table.tableName,
        BASE_URL: 'https://REPLACE_AFTER_FIRST_DEPLOY.execute-api.amazonaws.com/prod',
      },
    });

    const redirectFn = new lambda.NodejsFunction(this, 'RedirectUrl', {
      entry: 'lambda/redirect.ts',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant each Lambda only what it needs
    table.grantWriteData(createFn);
    table.grantReadData(redirectFn);

    // ─── Step 3: API Gateway ──────────────────────────────────────
    const api = new apigateway.RestApi(this, 'UrlShortenerApi', {
      restApiName: 'url-shortener',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST'],
      },
    });

    // POST /shorten → createFn
    const shorten = api.root.addResource('shorten');
    shorten.addMethod('POST', new apigateway.LambdaIntegration(createFn));

    // GET /{code} → redirectFn
    const code = api.root.addResource('{code}');
    code.addMethod('GET', new apigateway.LambdaIntegration(redirectFn));

    // Print the API URL in the terminal after deploy
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
  }
}
