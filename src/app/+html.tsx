import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

const boot = `
(function () {
  try {
    var mode = localStorage.getItem('kelyra.appearance') || 'system';
    var osDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var scheme = mode === 'dark' || (mode === 'system' && osDark) ? 'dark' : 'light';
    var bg = scheme === 'dark' ? '#141311' : '#F7F3EC';
    var ink = scheme === 'dark' ? '#F4EFE6' : '#1A1612';
    var root = document.documentElement;
    root.style.backgroundColor = bg;
    root.style.color = ink;
    root.style.colorScheme = scheme;
    if (document.body) {
      document.body.style.backgroundColor = bg;
      document.body.style.color = ink;
    }
    var style = document.createElement('style');
    style.textContent = 'html, body, #root { background-color: ' + bg + '; color: ' + ink + '; } input, textarea { color-scheme: ' + scheme + '; }';
    document.head.appendChild(style);
  } catch (e) {}
})();
`;

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <style
          dangerouslySetInnerHTML={{
            __html: '* { -webkit-font-smoothing: antialiased; }',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
