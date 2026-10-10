import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { handleRequest, MIME_TYPES } from '../../scripts/serve.js';

class MockResponse extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = '';
  }

  writeHead(statusCode, headers = {}) {
    this.statusCode = statusCode;
    Object.assign(this.headers, headers);
    return this;
  }

  _write(chunk, encoding, callback) {
    this.body += chunk.toString();
    callback();
  }
}

function simulateRequest(pathname) {
  return new Promise((resolve) => {
    const req = {
      url: pathname,
      headers: { host: 'localhost:8000' }
    };
    const res = new MockResponse();
    res.on('finish', () => resolve(res));
    handleRequest(req, res);
  });
}

describe('Native Node.js Static Server (scripts/serve.js)', () => {
  test('serves index.html on root path / with text/html', async () => {
    const res = await simulateRequest('/');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], MIME_TYPES['.html']);
    assert.ok(res.body.includes('<!DOCTYPE html>'));
  });

  test('serves JavaScript modules with text/javascript contentType', async () => {
    const res = await simulateRequest('/src/main.js');
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], MIME_TYPES['.js']);
    assert.ok(res.body.length > 0);
  });

  test('returns 404 for non-existent paths', async () => {
    const res = await simulateRequest('/non_existent_file.xyz');
    assert.equal(res.statusCode, 404);
  });

  test('prevents directory traversal outside root', async () => {
    const res = await simulateRequest('/../../../etc/passwd');
    assert.equal(res.statusCode, 403);
  });
});
