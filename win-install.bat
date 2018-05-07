setlocal
set SKIP_SASS_BINARY_DOWNLOAD_FOR_CI=1
set SASS_BINARY_PATH=%~dp0sass-binaries\v4-9-0\win32-x64-57_binding.node

rem ng update @angular/cli
call npm install
call robocopy %~dp0sass-binaries\v4-9-0\vendor %~dp0node_modules\node-sass\vendor /s /e