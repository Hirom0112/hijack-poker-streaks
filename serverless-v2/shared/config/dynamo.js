'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const clientConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
};

// Use local DynamoDB endpoint in local/dev environments
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  };
}

const ddbClient = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

/**
 * Destroy the underlying AWS SDK client (and its keep-alive HTTP sockets).
 *
 * The v3 client holds an http(s) Agent whose open sockets keep the Node event
 * loop alive after the work is done — which is what forced jest's `--forceExit`
 * (S7-8). Tests call this in a global `afterAll` so the process exits cleanly
 * with no open-handle warning and no `--forceExit`. Idempotent / safe to call
 * once per test file. In Lambda the container is reused, so production code
 * never calls this.
 */
function closeDb() {
  // `DynamoDBDocumentClient.from` shares the inner client, so destroying the
  // base `ddbClient` tears down the sockets for both handles.
  ddbClient.destroy();
}

module.exports = { docClient, ddbClient, closeDb };
