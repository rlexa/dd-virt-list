setlocal
set SKIP_SASS_BINARY_DOWNLOAD_FOR_CI=1
set SASS_BINARY_PATH=%~dp0sass-binaries\v4-5-3\win32-x64-48_binding.node

call npm install
call robocopy %~dp0sass-binaries\v4-5-3\vendor %~dp0node_modules\node-sass\vendor /s /e