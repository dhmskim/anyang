@echo off
title 서울대 안양수목원 주차 챗봇 서버
echo ==========================================
echo   서울대 안양수목원 주차장 예약 챗봇 서버
echo ==========================================
echo.

cd /d "%~dp0"
echo 서버 시작 중...
echo.

start "" http://localhost:3000

node server.js

pause
