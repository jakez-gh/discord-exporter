@echo off
REM install developer dependencies and prepare hooks
npm ci
npm run prepare
pause