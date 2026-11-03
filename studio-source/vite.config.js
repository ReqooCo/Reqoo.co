import {defineConfig} from 'vite';
export default defineConfig({publicDir:'public-core',worker:{format:'es'},build:{commonjsOptions:{include:[/node_modules/,/project-validation\.cjs$/]}}});
