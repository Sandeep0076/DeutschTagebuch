import assert from 'node:assert/strict';
import test from 'node:test';

import { translateToEnglish, translateWithMyMemory } from './translation.js';

test('translateToEnglish retries one transient Gemini failure', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts++;

    if (attempts === 1) {
      return {
        ok: false,
        json: async () => ({ error: { message: 'temporarily overloaded' } })
      };
    }

    return {
      ok: true,
      json: async () => ({
        candidates: [{
          content: { parts: [{ text: 'To feel like it' }] }
        }]
      })
    };
  };

  try {
    const translation = await translateToEnglish('Bock haben', { GEMINI_API_KEY: 'test-key' });

    assert.equal(translation, 'To feel like it');
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('translateWithMyMemory retries one transient failure', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts++;

    if (attempts === 1) {
      throw new Error('temporary network failure');
    }

    return {
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'To feel like it' }
      })
    };
  };

  try {
    const translation = await translateWithMyMemory('Bock haben', 'de|en');

    assert.equal(translation, 'To feel like it');
    assert.equal(attempts, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('translateWithMyMemory does not retry a successful request', async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;

  globalThis.fetch = async () => {
    attempts++;
    return {
      ok: true,
      json: async () => ({
        responseData: { translatedText: 'How are you?' }
      })
    };
  };

  try {
    const translation = await translateWithMyMemory('Wie geht es dir?', 'de|en');

    assert.equal(translation, 'How are you?');
    assert.equal(attempts, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
