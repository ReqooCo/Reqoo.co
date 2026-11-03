import {defineConfig} from "vite";
// This app is published under /cad/ on the shared reqoo.co Pages site.
// Vite must emit /cad/assets/* URLs, not root /assets/* URLs.
export default defineConfig({
  base:"/cad/",
  worker:{format:"es"},
  build:{target:"es2022",assetsInlineLimit:0}
});
