# URL Shortener — AWS Serverless

A fully serverless URL shortener built with AWS CDK, Lambda, API Gateway, and DynamoDB.

## Architecture

- **API Gateway** — public HTTP endpoints
- **Lambda** — `create.ts` shortens URLs, `redirect.ts` resolves them
- **DynamoDB** — stores short codes and original URLs

## Deploy

```bash
npm install
aws configure
npx cdk bootstrap
npx cdk deploy
```

After the first deploy, copy the `ApiUrl` output and update `BASE_URL` in `lib/url-shortener-stack.ts`, then deploy again.

## Test

```bash
# Create a short URL
curl -X POST https://YOUR_API_URL/shorten \
  -H "Content-Type: application/json" \
  -d '{ "url": "https://amazon.com/some-long-url" }'

# Paste the returned shortUrl into your browser
```

## Teardown

```bash
npx cdk destroy
```
