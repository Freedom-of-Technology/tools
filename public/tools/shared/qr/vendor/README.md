# Libraries the QR code tools use

Copied here as published, one exact version each, with their licenses beside them. The pages may
load scripts only from this site, so the libraries live in the repository rather than on a CDN.
To update one, replace its file with the new version's, rename it, and update this list and
`../qr.js`.

| File | Library | Version | From | License |
|---|---|---|---|---|
| `qrcode-generator-2.0.4.mjs` | [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), by Kazuhiko Arase: makes the code | 2.0.4 | npm, `dist/qrcode.mjs` | MIT, `qrcode-generator-LICENSE.txt` |
| `jsQR-1.4.0.js` | [jsQR](https://github.com/cozmo/jsQR): reads a code back, for the test-scan | 1.4.0 | npm, `dist/jsQR.js` | Apache 2.0, `jsQR-LICENSE.txt` |

SHA-256 of each file as published:

    ea91d7118a5395289170da848b7c6758b996163bfbccf312591ab65a4911b7c0  qrcode-generator-2.0.4.mjs
    bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859  jsQR-1.4.0.js

The qrcode-generator package on npm has no license file of its own; `qrcode-generator-LICENSE.txt`
is the `LICENSE` file from its GitHub repository, the license its files' headers name.
