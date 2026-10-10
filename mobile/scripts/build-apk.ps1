# Build an Android APK on Windows.
# Why a copy in a short path: Windows' 260-char path limit breaks the NDK/CMake build
# when the project lives in a deep folder. Why the low-memory settings: clang and Metro
# crash with "out of memory" on machines with a small page file.
#
# Usage (from the mobile folder):  npm run apk
param(
  [string]$BuildDir = 'C:\sp'
)

$ErrorActionPreference = 'Stop'
$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Write-Host "==> Sync $src -> $BuildDir"
# Exclude only the root-level dirs: a bare /XD dist would also skip node_modules/**/dist.
robocopy $src $BuildDir /E /NFL /NDL /NJH /NJS /NP `
  /XD "$src\dist" "$src\.expo" "$src\android" "$src\build-output" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

Push-Location $BuildDir
try {
  if (-not (Test-Path 'android')) {
    Write-Host '==> expo prebuild (android)'
    npx expo prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'expo prebuild failed' }
  }

  Write-Host '==> Apply low-memory Gradle settings'
  $props = 'android\gradle.properties'
  $text = Get-Content $props -Raw
  $text = $text -replace '(?m)^reactNativeArchitectures=.*$', 'reactNativeArchitectures=arm64-v8a'
  foreach ($line in 'org.gradle.workers.max=2', 'org.gradle.parallel=false') {
    if ($text -notmatch [regex]::Escape($line)) { $text += "`n$line" }
  }
  Set-Content $props $text -NoNewline

  $gradle = 'android\app\build.gradle'
  $g = Get-Content $gradle -Raw
  if ($g -notmatch 'CMAKE_JOB_POOLS') {
    $g = $g -replace '(versionName "[^"]*"\r?\n)', "`$1        externalNativeBuild { cmake { arguments `"-DCMAKE_JOB_POOLS=cc=2`", `"-DCMAKE_JOB_POOL_COMPILE=cc`", `"-DCMAKE_JOB_POOL_LINK=cc`" } }`n"
  }
  $g = $g -replace '// extraPackagerArgs = \[\]', 'extraPackagerArgs = ["--max-workers", "1"]'
  Set-Content $gradle $g -NoNewline

  Write-Host '==> Gradle assembleRelease (first run can take 10-20 min)'
  Push-Location android
  .\gradlew.bat assembleRelease --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) { throw 'gradle build failed' }
  Pop-Location

  $apk = 'android\app\build\outputs\apk\release\app-release.apk'
  $out = Join-Path $src 'build-output'
  New-Item -ItemType Directory -Force $out | Out-Null
  Copy-Item $apk (Join-Path $out 'oracle-sports.apk') -Force
  Write-Host "==> Done: $out\oracle-sports.apk"
}
finally {
  Pop-Location
}
