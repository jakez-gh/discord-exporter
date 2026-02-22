@echo off
REM verify all supported files have description and semantic version in header
python tests/tools/header_check.py
pause