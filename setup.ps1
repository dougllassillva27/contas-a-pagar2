#!/usr/bin/env pwsh
# dodo-starter-pack setup script (Windows PowerShell)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$hooksDir = Join-Path $root ".githooks"

if (-not (Test-Path $hooksDir)) {
    Write-Host "ERRO: Diretorio .githooks nao encontrado em $root" -ForegroundColor Red
    exit 1
}

git config core.hooksPath .githooks
Write-Host "Hooks do Git ativados com sucesso (.githooks)" -ForegroundColor Green
