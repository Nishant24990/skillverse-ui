# Rename any .js file that contains JSX to .jsx (recursive under src/)
Set-StrictMode -Version Latest
$root = "$PSScriptRoot\src"
if (-not (Test-Path $root)) { Write-Error "Run this script from your project root (it must have a src folder)."; exit 1 }

$files = Get-ChildItem -Path $root -Recurse -Filter *.js
foreach ($f in $files) {
  $hasJsx = Select-String -Path $f.FullName -Pattern '<[A-Za-z]' -Quiet
  if ($hasJsx) {
    $new = ($f.FullName -replace '\.js$', '.jsx')
    if (-not (Test-Path $new)) {
      Rename-Item $f.FullName $new -Force
      Write-Host "Renamed to $([System.IO.Path]::GetFileName($new))"
    } else {
      Write-Host "Skipped (target exists): $($f.FullName)"
    }
  }
}

Write-Host "Done. Now ensure your entry imports are extensionless:"
Write-Host "  import App from './App'"
