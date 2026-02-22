@echo off
REM ensure automated_quality_gates.md contains required guidance
python tests/tools/check_gates_doc.py
pause