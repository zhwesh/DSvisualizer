@echo off
chcp 65001 >nul
title DSvisualizer 测试

rem 切到项目根目录（本脚本位于 src\test\ 下）
cd /d "%~dp0..\.."

if not exist "node_modules\typescript\bin\tsc" (
    echo [错误] 未找到 node_modules，请先在项目根目录执行 npm install
    echo.
    pause
    exit /b 1
)

echo 正在编译测试代码...
if exist "node_modules\.tmp\dstest" rmdir /s /q "node_modules\.tmp\dstest"
node "node_modules\typescript\bin\tsc" src\test\RunTests.ts --outDir node_modules\.tmp\dstest --module commonjs --target es2022 --skipLibCheck --ignoreConfig
if errorlevel 1 (
    echo.
    echo [失败] 测试代码编译出错，请检查上方信息
    echo.
    pause
    exit /b 1
)

echo.
node "node_modules\.tmp\dstest\test\RunTests.js"
set "result=%errorlevel%"

echo.
if "%result%"=="0" (
    echo [成功] 全部测试通过
) else (
    echo [失败] 存在未通过的测试，退出码 %result%
)
echo.
pause
exit /b %result%
