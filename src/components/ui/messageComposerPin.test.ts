import assert from 'node:assert/strict';
import test from 'node:test';

import { pinComposerToEnd } from './messageComposerPin.ts';

test('getter-only scrollTop must not throw when pin helper runs', () => {
  const node = {
    scrollHeight: 240,
    get scrollTop() {
      return 0;
    },
  };
  assert.doesNotThrow(() => pinComposerToEnd(node));
});

test('writable textarea scrollTop is pinned to scrollHeight', () => {
  let top = 12;
  const node = {
    nodeName: 'TEXTAREA',
    scrollHeight: 320,
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      top = value;
    },
  };
  pinComposerToEnd(node);
  assert.equal(top, 320);
});

test('RN-web wrapper resolves _inputRef textarea before writing scrollTop', () => {
  let top = 0;
  const inner = {
    nodeName: 'TEXTAREA',
    scrollHeight: 180,
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      top = value;
    },
  };
  const wrapper = {
    // Host itself is getter-only (would throw if assigned)
    scrollHeight: 180,
    get scrollTop() {
      return 0;
    },
    _inputRef: { current: inner },
  };
  assert.doesNotThrow(() => pinComposerToEnd(wrapper));
  assert.equal(top, 180);
});

test('querySelector(textarea) resolves wrapped web node', () => {
  let top = 0;
  const inner = {
    nodeName: 'TEXTAREA',
    scrollHeight: 90,
    get scrollTop() {
      return top;
    },
    set scrollTop(value: number) {
      top = value;
    },
  };
  const wrapper = {
    querySelector(selector: string) {
      assert.equal(selector, 'textarea');
      return inner as unknown as Element;
    },
  };
  pinComposerToEnd(wrapper);
  assert.equal(top, 90);
});

test('native scrollToEnd is used when present (no scrollTop write)', () => {
  let called: unknown = null;
  const node = {
    scrollHeight: 50,
    get scrollTop() {
      return 0;
    },
    scrollToEnd(opts?: { animated?: boolean }) {
      called = opts;
    },
  };
  pinComposerToEnd(node);
  assert.deepEqual(called, { animated: false });
});

test('native setNativeProps used when scrollToEnd is absent', () => {
  let props: unknown = null;
  const node = {
    scrollHeight: 77,
    get scrollTop() {
      return 0;
    },
    setNativeProps(next: { scrollTop?: number }) {
      props = next;
    },
  };
  pinComposerToEnd(node);
  assert.deepEqual(props, { scrollTop: 77 });
});

test('null / non-object nodes are no-ops', () => {
  assert.doesNotThrow(() => pinComposerToEnd(null));
  assert.doesNotThrow(() => pinComposerToEnd(undefined));
  assert.doesNotThrow(() => pinComposerToEnd(42));
});
