# Hook: sync agentní konfigurace po editaci zdroje ve vrstvě
#
# Spouští se z rootu projektu po editaci souboru. Pokud byla editace provedena
# ve zdrojové agentní konfiguraci vrstvy (src/<vrstva>/.cursor/**), znovu vygeneruje
# root .cursor konfiguraci.
#
# Hook je záměrně fail-open: jakákoli chyba vrátí exit 0, aby nikdy neblokovala práci.
# Editace generovaných souborů (.cursor/**) nejsou zdrojem, takže nevzniká smyčka.

$ErrorActionPreference = 'Stop'

function Get-EditedPath {
  param($Payload)

  foreach ($name in @('file_path', 'filePath', 'path', 'file')) {
    if ($Payload.PSObject.Properties.Name -contains $name) {
      $value = $Payload.$name
      if ($value -is [string] -and -not [string]::IsNullOrWhiteSpace($value)) { return $value }
    }
  }

  if ($Payload.PSObject.Properties.Name -contains 'tool_input') {
    foreach ($name in @('file_path', 'filePath', 'path')) {
      if ($Payload.tool_input.PSObject.Properties.Name -contains $name) {
        $value = $Payload.tool_input.$name
        if ($value -is [string] -and -not [string]::IsNullOrWhiteSpace($value)) { return $value }
      }
    }
  }

  return $null
}

try {
  $raw = [Console]::In.ReadToEnd()
  if ([string]::IsNullOrWhiteSpace($raw)) { exit 0 }

  $payload = $raw | ConvertFrom-Json
  $edited = Get-EditedPath -Payload $payload
  if ([string]::IsNullOrWhiteSpace($edited)) { exit 0 }

  $normalized = ($edited -replace '\\', '/').TrimStart('./')

  # Pouze zdroj pravdy ve vrstvách; generované .cursor/** je vyloučeno.
  if ($normalized -notmatch '^src/[^/]+/\.cursor/') { exit 0 }

  $root = (Get-Location).Path
  $sync = Join-Path $root 'scripts/sync-agent-config.ps1'
  if (-not (Test-Path -LiteralPath $sync)) { exit 0 }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $sync 2>&1 | Out-Null
} catch {
  # fail-open
}

exit 0
