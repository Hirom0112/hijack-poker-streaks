/**
 * Jest setupFiles hook — runs once per test file BEFORE any module (including
 * the shared DynamoDB config, which reads these at import time) is loaded.
 *
 * It points the AWS SDK at DynamoDB Local for the integration tests, using the
 * literal `local`/`local` creds (CLAUDE.md Inv 12). Unit tests mock the
 * DocumentClient, so these values are harmless there. Real values from the
 * environment (e.g. CI) take precedence via the `??=` fallbacks.
 */
process.env.DYNAMODB_ENDPOINT ??= 'http://localhost:8000';
process.env.AWS_ACCESS_KEY_ID ??= 'local';
process.env.AWS_SECRET_ACCESS_KEY ??= 'local';
process.env.AWS_REGION ??= 'us-east-1';
process.env.STAGE ??= 'test';
