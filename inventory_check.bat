@echo off
REM verify docs/INVENTORY.md matches project root
python tests/tools/inventory_quality_gate.py
pause