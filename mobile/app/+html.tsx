import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

export default function Root({ children }: { children: ReactNode }) {
  return (
    <html lang="it">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Sport IApperò</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: baseCss }} />
      </head>
      <body>
        {/* Visible even before React hydrates (avoids pure white/black blank). */}
        <div id="boot-fallback" style={fallbackStyle}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#0B3D2E', letterSpacing: 1 }}>
            Sport IApperò
          </div>
          <div style={{ marginTop: 8, color: '#5A6B63' }}>Avvio app…</div>
          <div style={{ marginTop: 16, fontSize: 13, color: '#5A6B63' }}>
            Se resta così, apri direttamente{' '}
            <a href="/football" style={{ color: '#0B3D2E' }}>
              /football
            </a>
          </div>
        </div>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Hide boot fallback once React mounts something real.
              const hide = () => {
                const el = document.getElementById('boot-fallback');
                if (el) el.style.display = 'none';
              };
              const obs = new MutationObserver(() => {
                const root = document.getElementById('root');
                if (root && root.innerText && root.innerText.includes('Sport IApper')) hide();
              });
              document.addEventListener('DOMContentLoaded', () => {
                const root = document.getElementById('root');
                if (root) obs.observe(root, { childList: true, subtree: true, characterData: true });
                setTimeout(hide, 8000);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}

const fallbackStyle: Record<string, string | number> = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#F3F6F1',
  fontFamily: 'system-ui, sans-serif',
  padding: 24,
  textAlign: 'center',
};

const baseCss = `
html, body, #root {
  height: 100%;
}
body {
  margin: 0;
  background-color: #F3F6F1;
}
#root:not(:empty) ~ #boot-fallback,
body:has(#root .css-view-g5y9jx) #boot-fallback {
  display: none !important;
}
`;
