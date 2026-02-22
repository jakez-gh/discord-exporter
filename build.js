// build.js
// Concatenate modular source files into a single Tampermonkey userscript.

const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, 'dist', 'discord-exporter.user.js');

// Ensure dist folder exists
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });

// Order matters: core → crosscut → slice → upgrade → main
const MODULE_ORDER = [
    'core',
    'crosscut',
    'slice',
    'upgrade'
];

function readFilesInFolder(folderPath) {
    if (!fs.existsSync(folderPath)) return [];

    return fs.readdirSync(folderPath)
        .filter(f => f.endsWith('.js'))
        .map(f => ({
            name: f,
            content: fs.readFileSync(path.join(folderPath, f), 'utf8')
        }));
}

function wrapModule(filename, content) {
    return `\n\n/************************************************************
 * MODULE: ${filename}
 ************************************************************/
${content}
`;
}

// Tampermonkey metadata block
// version is pulled from package.json so each build reflects semantic version
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const METADATA = `
// ==UserScript==
// @name         Discord DM Exporter v${pkg.version} Modular Build
// @namespace    http://tampermonkey.net/
// @version      ${pkg.version}
// @description  Built from modular source files
// @match        https://discord.com/channels/@me/*
// @run-at       document-idle
// @grant        GM_download
// ==/UserScript==

(function() {
'use strict';

// ------------------------------------------------------------
// BEGIN CONCATENATED MODULES
// ------------------------------------------------------------
`;

let output = METADATA;

// Add modules in order
MODULE_ORDER.forEach(folder => {
    const folderPath = path.join(__dirname, folder);
    const files = readFilesInFolder(folderPath);

    files.forEach(file => {
        output += wrapModule(`${folder}/${file.name}`, file.content);
    });
});

// Add main script last
const MAIN = fs.readFileSync(path.join(__dirname, 'discord-exporter.js'), 'utf8');
output += wrapModule('discord-exporter.js', MAIN);

// Close wrapper
output += `

// ------------------------------------------------------------
// END CONCATENATED MODULES
// ------------------------------------------------------------

})(); // end userscript wrapper
`;

fs.writeFileSync(OUTPUT, output, 'utf8');

console.log('Build complete (version ' + pkg.version + ') →', OUTPUT);
