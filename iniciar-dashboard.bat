@echo off
chcp 65001 >nul
title VoidSunder - Dashboard
cd /d "%~dp0"

echo ============================================================
echo   VoidSunder - Security Validation Orchestrator
echo ============================================================
echo.

REM --- 1. Node.js instalado? ---
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale a versao LTS em https://nodejs.org
  pause
  exit /b 1
)

REM --- 2. Dependencias (so na primeira vez) ---
if not exist "node_modules" (
  echo Instalando dependencias ^(pode levar alguns minutos^)...
  call npm install || (echo [ERRO] Falha no npm install & pause & exit /b 1)
)

REM --- 3. Limpa cache antigo ---
if exist ".next" rmdir /s /q ".next" 2>nul

REM --- 4. Compila a versao de producao (estavel) ---
echo.
echo Preparando a plataforma ^(compilando, ~1 min na primeira vez^)...
echo Aguarde ate ver "Ready".
echo.
call npm run build
if errorlevel 1 (
  echo.
  echo [ERRO] A compilacao falhou. Veja a mensagem acima.
  echo Tire um print desta janela e envie para o suporte.
  pause
  exit /b 1
)

REM --- 5. Abre o navegador quando o servidor responder ---
echo.
echo Subindo o servidor... o navegador abre sozinho.
echo   Endereco: http://localhost:3000
echo   Para DESLIGAR, feche esta janela.
echo.
start "" /b powershell -NoProfile -WindowStyle Hidden -Command "do { Start-Sleep -Seconds 2 } until (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet); Start-Process 'http://localhost:3000/dashboard'"

REM --- 6. Serve a versao compilada ---
call npm run start

echo.
echo Servidor encerrado.
pause
