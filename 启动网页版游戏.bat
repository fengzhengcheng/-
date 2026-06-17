@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

echo ========================================
echo   街头霸王 - 横版清版格斗闯关
echo   网页 Canvas 版启动器
echo ========================================
echo.

REM 检查 Python 是否存在
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python
    echo 下载地址: https://www.python.org/downloads/
    pause
    exit /b 1
)

REM 尝试端口 8080-8085
set PORT=8080
:try_port
echo 正在启动服务器，端口: %PORT%
python -m http.server %PORT% >nul 2>&1 & set SERVER_PID=!errorlevel!

REM 检查端口是否被占用（尝试 1 秒后判断）
timeout /t 1 /nobreak >nul
netstat -ano | findstr :%PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo 端口 %PORT% 已被占用，尝试下一个端口...
    set /a PORT+=1
    if %PORT% gtr 8085 (
        echo.
        echo [错误] 8080-8085 端口均被占用，请关闭相关程序后重试
        pause
        exit /b 1
    )
    goto try_port
)

echo.
echo [成功] 服务器已启动: http://localhost:%PORT%
echo.
echo 正在打开浏览器...
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================

start http://localhost:%PORT%/index.html

echo.
pause
