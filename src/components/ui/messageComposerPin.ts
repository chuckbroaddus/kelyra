/**
 * Pin a message-composer field so the caret/typing end stays visible.
 * Safe across web (textarea / contentEditable), RN-web wrappers, and native
 * TextInput hosts that expose getter-only scrollTop.
 *
 * Never throws. Prefer writable DOM scrollTop; else scrollToEnd / setNativeProps.
 */

type ScrollableLike = {
  scrollTop?: number;
  scrollHeight?: number;
  scrollToEnd?: (opts?: { animated?: boolean }) => void;
  setNativeProps?: (props: { scrollTop?: number }) => void;
  _inputRef?: { current?: unknown };
  querySelector?: (selector: string) => Element | null;
  nodeName?: string;
  isContentEditable?: boolean;
  getAttribute?: (name: string) => string | null;
};

function hasWritableScrollTop(target: object): boolean {
  let cur: object | null = target;
  while (cur) {
    const desc = Object.getOwnPropertyDescriptor(cur, 'scrollTop');
    if (desc) {
      if (typeof desc.set === 'function') return true;
      if ('value' in desc && desc.writable !== false) return true;
      return false;
    }
    cur = Object.getPrototypeOf(cur);
  }
  return false;
}

function isDomScrollTarget(target: ScrollableLike): boolean {
  const name = typeof target.nodeName === 'string' ? target.nodeName.toUpperCase() : '';
  if (name === 'TEXTAREA' || name === 'INPUT') return true;
  if (target.isContentEditable === true) return true;
  if (typeof target.getAttribute === 'function' && target.getAttribute('contenteditable') != null) {
    return true;
  }
  return false;
}

function resolveScrollTarget(node: ScrollableLike): ScrollableLike {
  const fromRef = node._inputRef?.current;
  if (fromRef && typeof fromRef === 'object') {
    return fromRef as ScrollableLike;
  }
  if (typeof node.querySelector === 'function') {
    try {
      const ta = node.querySelector('textarea');
      if (ta && typeof ta === 'object') return ta as unknown as ScrollableLike;
    } catch {
      // ignore querySelector failures on non-DOM hosts
    }
  }
  return node;
}

/**
 * Move the composer field's scroll position to the end when possible.
 * @param node TextInput host, HTMLTextAreaElement, contentEditable, or RN-web wrapper
 */
export function pinComposerToEnd(node: unknown): void {
  if (node == null || typeof node !== 'object') return;

  try {
    const host = node as ScrollableLike;
    const target = resolveScrollTarget(host);

    // Only write scrollTop on a real writable DOM node (textarea / contentEditable)
    if (
      typeof target.scrollHeight === 'number' &&
      isDomScrollTarget(target) &&
      hasWritableScrollTop(target)
    ) {
      target.scrollTop = target.scrollHeight;
      return;
    }

    // Native TextInput: scrollToEnd (never assign getter-only scrollTop)
    if (typeof host.scrollToEnd === 'function') {
      host.scrollToEnd({ animated: false });
      return;
    }
    if (typeof target.scrollToEnd === 'function') {
      target.scrollToEnd({ animated: false });
      return;
    }

    // Native: setNativeProps with scroll offset
    const height =
      typeof host.scrollHeight === 'number'
        ? host.scrollHeight
        : typeof target.scrollHeight === 'number'
          ? target.scrollHeight
          : undefined;
    if (typeof height !== 'number') return;

    if (typeof host.setNativeProps === 'function') {
      host.setNativeProps({ scrollTop: height });
      return;
    }
    if (typeof target.setNativeProps === 'function') {
      target.setNativeProps({ scrollTop: height });
    }
  } catch {
    // Last resort: never surface scroll pinning failures to the composer
  }
}
