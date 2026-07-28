@echo off
chcp 65001 >nul
title VoidSunder - Criar atalho
cd /d "%~dp0"
echo Criando atalho VoidSunder com o icone spy...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$root=(Get-Location).Path; $icon=(Get-ChildItem -LiteralPath $root -Filter *.ico | Select-Object -First 1).FullName; if(-not $icon){Write-Host 'ERRO: nenhum .ico na pasta'; exit 1}; $target=Join-Path $root 'iniciar-dashboard.bat'; $w=New-Object -ComObject WScript.Shell; $desk=$w.SpecialFolders('Desktop'); foreach($dest in @((Join-Path $root 'VoidSunder.lnk'),(Join-Path $desk 'VoidSunder.lnk'))){$s=$w.CreateShortcut($dest); $s.TargetPath=$target; $s.WorkingDirectory=$root; $s.IconLocation=$icon; $s.Description='VoidSunder'; $s.Save(); Write-Host ('OK: '+$dest)}"
echo.
echo Concluido. Pressione uma tecla para fechar.
pause >nul
