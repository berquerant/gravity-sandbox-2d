import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { eventBus } from '../../src/core/event-bus.js';

describe('EventBus', () => {
  test('emit and on communication', () => {
    let received = null;
    const unsub = eventBus.on('test:ping', (data) => {
      received = data;
    });

    eventBus.emit('test:ping', { message: 'hello' });
    assert.deepEqual(received, { message: 'hello' });

    unsub();
  });

  test('unsubscribe via returned function or off', () => {
    let callCount = 0;
    const handler = () => { callCount++; };

    const unsubscribe = eventBus.on('test:event', handler);
    eventBus.emit('test:event');
    assert.equal(callCount, 1);

    unsubscribe();
    eventBus.emit('test:event');
    assert.equal(callCount, 1); // should not increase
  });

  test('error in one listener does not crash EventBus', () => {
    let secondCalled = false;

    eventBus.on('test:err', () => {
      throw new Error('Listener error');
    });
    eventBus.on('test:err', () => {
      secondCalled = true;
    });

    assert.doesNotThrow(() => {
      eventBus.emit('test:err');
    });
    assert.equal(secondCalled, true);
  });
});
