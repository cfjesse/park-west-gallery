const serverless = require('serverless-http');
const app = require('../../src/server');

// Wrap the Express app as a Netlify Function handler.
// All requests to /.netlify/functions/api/* are forwarded here.
module.exports.handler = serverless(app);
