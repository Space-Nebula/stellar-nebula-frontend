import { test as base, expect } from '@playwright/test'

/**
 * Albedo is a web wallet: `@albedo-link/intent` opens `https://albedo.link/confirm`
 * in a popup and talks to it over `postMessage`. These fixtures serve a stand-in
 * popup that speaks the same protocol (protocol version 3), so E2E tests can
 * exercise the real intent library end-to-end without depending on the live
 * Albedo service.
 */

export const ALBEDO_MOCK_PUBLIC_KEY = `G${'A'.repeat(55)}`

export interface AlbedoPopupOptions {
  /** Reject the intent as if the user dismissed the confirmation. */
  reject?: boolean
  /** Public key returned by the public_key intent. */
  publicKey?: string
}

function buildPopupHtml({
  reject = false,
  publicKey = ALBEDO_MOCK_PUBLIC_KEY,
}: AlbedoPopupOptions) {
  return `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>Albedo</title></head>
  <body>
    <p>Albedo mock popup</p>
    <script>
      (function () {
        var PUBLIC_KEY = ${JSON.stringify(publicKey)};
        var REJECT = ${reject ? 'true' : 'false'};
        var target = window.opener;

        if (!target) {
          document.body.textContent = 'Albedo mock: no opener window';
          return;
        }

        // The intent library marks the transport as loaded on handshake.
        var handshake = setInterval(function () {
          target.postMessage({ albedo: { protocol: 3 } }, '*');
        }, 50);

        window.addEventListener('message', function (event) {
          var request = event.data;
          if (!request || !request.__reqid || !request.intent) return;

          clearInterval(handshake);

          if (REJECT) {
            target.postMessage(
              {
                albedoIntentResult: {
                  __reqid: request.__reqid,
                  error: { code: -4, message: 'User rejected the request' }
                }
              },
              '*'
            );
            return;
          }

          if (request.intent === 'public_key') {
            target.postMessage(
              {
                albedoIntentResult: {
                  __reqid: request.__reqid,
                  intent: 'public_key',
                  pubkey: PUBLIC_KEY
                }
              },
              '*'
            );
            return;
          }

          if (request.intent === 'tx') {
            target.postMessage(
              {
                albedoIntentResult: {
                  __reqid: request.__reqid,
                  intent: 'tx',
                  pubkey: PUBLIC_KEY,
                  signed_envelope_xdr: request.xdr
                }
              },
              '*'
            );
          }
        });

        setTimeout(function () {
          clearInterval(handshake);
        }, 30000);
      })();
    </script>
  </body>
</html>`
}

export type AlbedoFixtures = {
  /** Install the Albedo popup mock for the current page/context. */
  mockAlbedoPopup: (options?: AlbedoPopupOptions) => Promise<void>
}

export const test = base.extend<AlbedoFixtures>({
  mockAlbedoPopup: async ({ page }, use) => {
    // `use` here is Playwright's fixture hook, not React's.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(async (options: AlbedoPopupOptions = {}) => {
      await page.context().route('https://albedo.link/**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: buildPopupHtml(options),
        })
      )
    })
  },
})

export { expect }
