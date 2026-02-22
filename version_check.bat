@echo off
REM check semantic version does not regress; bump patch if equal to previous
python tests/tools/version_gate.py
pause