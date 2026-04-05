@echo off
title 서울대 안양수목원 주차 챗봇 서버
echo ==========================================
echo   서울대 안양수목원 주차장 예약 챗봇 서버
echo ==========================================
echo.

cd /d "%~dp0"
echo 서버 시작 중...
echo.
echo   사용자 페이지: http://localhost:3000/parking-portal/index.html
echo   관리자 페이지: http://localhost:3000/manager.html
echo.
echo 종료하려면 이 창을 닫으세요.
echo.

start "" http://localhost:3000/parking-portal/index.html
start "" http://localhost:3000/manager.html

node js/server.js

pause
