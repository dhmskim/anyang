@echo off
title 서울대 안양수목원 주차 챗봇 서버
echo ==========================================
echo   서울대 안양수목원 주차장 예약 챗봇 서버
echo ==========================================
echo.

cd /d "%~dp0"
echo 서버 시작 중... 잠시만 기다려주세요.
echo.
echo   사용자 페이지: http://localhost:3000
echo   관리자 페이지: http://localhost:3001
echo.
echo 종료하려면 이 창을 닫으세요.
echo.

start "" /B cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000 && start http://localhost:3001"

node js/server.js

pause
