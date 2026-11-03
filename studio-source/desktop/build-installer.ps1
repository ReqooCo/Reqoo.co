param([string]$Compiler = 'ISCC.exe')
$ErrorActionPreference = 'Stop'
& $Compiler (Join-Path $PSScriptRoot 'installer.iss')
if ($LASTEXITCODE -ne 0) { throw 'Installer compilation failed.' }
