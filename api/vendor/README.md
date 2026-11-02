Web Push implementation: @block65/webcrypto-web-push 2.0.0 (MIT), with uint8array-extras (MIT).
Source: https://github.com/block65/webcrypto-web-push/tree/v2.0.0
Bundled into web-push.js so existing dependency-free Worker CI and deployments remain compatible.
Rebuild after npm ci with esbuild 0.25.12, entry: export {buildPushPayload} from '@block65/webcrypto-web-push';
Flags: --bundle --format=esm --platform=browser --outfile=api/vendor/web-push.js
Do not edit the generated crypto implementation by hand.
