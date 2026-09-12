import { readFileSync, writeFileSync } from 'node:fs';
const path = 'dist/index.html';
let html = readFileSync(path, 'utf8');
html = html
  .replace('<html lang="en">', '<html lang="sv">')
  .replace(/<title>.*?<\/title>/, '<title>Companio – Hitta ditt sällskap</title>');
html = html.replace(
  '</head>',
  '<meta name="description" content="Träffa par och familjer nära dig. Hitta sällskap för fika, promenader, middagar och små äventyr." /><meta name="theme-color" content="#F8F7F2" /></head>',
);
writeFileSync(path, html);
