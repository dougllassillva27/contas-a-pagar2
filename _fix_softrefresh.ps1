$f = 'D:\Onedrive - Douglas\OneDrive\Pessoal\Dodo\Programacao\Git\contas-a-pagar\public\js\app.js'
$lines = [System.IO.File]::ReadAllLines($f, [System.Text.Encoding]::UTF8)
$newLines = New-Object System.Collections.Generic.List[string]
$skip = $false

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]

    # Detectar inicio do bloco corrompido
    if ($line -match '// __SOFTREFRESH_FETCH_DONE__') {
        $skip = $true
        continue
    }

    # Detectar fim do bloco corrompido (const parser = new DOMParser)
    if ($skip -and $line -match 'const parser = new DOMParser') {
        $skip = $false
        $newLines.Add('    const parser = new DOMParser();')
        continue
    }

    # Adicionar linha se nao estiver no bloco corrompido
    if (-not $skip) {
        $newLines.Add($line)
    }
}

[System.IO.File]::WriteAllLines($f, $newLines.ToArray(), (New-Object System.Text.UTF8Encoding $true))
Write-Output "Done. Lines before: $($lines.Count), after: $($newLines.Count)"
