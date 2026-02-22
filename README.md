# Discord Exporter Tampermonkey Script

This repository contains a Tampermonkey user script that can download Discord chats and will eventually expand to encompass various Discord automations.

## Features

- Export Discord chat histories to local files.
- Designed as a Tampermonkey script running in the browser.

## Getting Started

1. Install Tampermonkey in your browser.
2. Add the script from `discord-exporter.js` as a new user script.
3. Run it on Discord to capture conversations.

## Development

No build system is currently required; scripts are plain JavaScript. A `build.js` helper is provided for any future automation.

## CI/CD

A GitHub Actions workflow runs a Node.js CI pipeline, performing linting and basic checks on push and pull requests.
