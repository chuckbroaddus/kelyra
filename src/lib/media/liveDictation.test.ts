import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleLiveTranscript,
  composeDictatedField,
  transcriptFromRecognitionResults,
} from './liveDictation.ts';

test('assembleLiveTranscript joins committed finals and the current interim', () => {
  assert.equal(assembleLiveTranscript('hello', 'world'), 'hello world');
  assert.equal(assembleLiveTranscript('', 'world'), 'world');
  assert.equal(assembleLiveTranscript('hello', ''), 'hello');
  assert.equal(assembleLiveTranscript('  hello  ', '  there  now '), 'hello there now');
});

test('composeDictatedField appends live transcript to the typed prefix', () => {
  assert.equal(composeDictatedField('Already typed', 'hello world'), 'Already typed hello world');
  assert.equal(composeDictatedField('', 'hello'), 'hello');
  assert.equal(composeDictatedField('note', ''), 'note');
  assert.equal(composeDictatedField('  Prefix  ', 'one two'), 'Prefix one two');
});

test('transcriptFromRecognitionResults accumulates finals and exposes interim', () => {
  assert.deepEqual(
    transcriptFromRecognitionResults([
      { transcript: 'hello', isFinal: true },
      { transcript: 'there', isFinal: false },
    ]),
    { committed: 'hello', interim: 'there', display: 'hello there' },
  );
  assert.deepEqual(
    transcriptFromRecognitionResults([
      { transcript: 'Maya', isFinal: true },
      { transcript: 'turned this in', isFinal: true },
      { transcript: 'today', isFinal: false },
    ]),
    {
      committed: 'Maya turned this in',
      interim: 'today',
      display: 'Maya turned this in today',
    },
  );
  assert.deepEqual(transcriptFromRecognitionResults([]), {
    committed: '',
    interim: '',
    display: '',
  });
});
