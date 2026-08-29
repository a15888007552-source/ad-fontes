@echo off
chcp 65001 >nul
cd /d "D:\Documents-Offload\website"
start "" "http://127.0.0.1:8023/modules/shangqiu-museum/"
python -m http.server 8023 --bind 127.0.0.1
