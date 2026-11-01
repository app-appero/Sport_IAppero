# Build an Android APK on Windows.
# Why a copy in a short path: Windows' 260-char path limit breaks the NDK/CMake build
# when the project lives in a deep folder. Why the low-memory settings: clang and Metro
# crash with "out of memory" on machines with a small page file.
#
# Usage (from the mobile folder):  npm run apk
#
# Always re-runs `expo prebuild --clean` so launcher icon / app label from app.config.ts
# are not stuck on a stale android/ folder (old Oracle Sports assets).
param(
  [string]$BuildDir = 'C:\sp'
)

$ErrorActionPreference = 'Stop'
$src = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$BuildDir = [IO.Path]::GetFullPath($BuildDir).TrimEnd('\')
if ($BuildDir -eq [IO.Path]::GetPathRoot($BuildDir).TrimEnd('\') -or
    $BuildDir -eq $src -or $BuildDir.StartsWith($src + '\', [StringComparison]::OrdinalIgnoreCase) -or
    $src.StartsWith($BuildDir + '\', [StringComparison]::OrdinalIgnoreCase)) {
  throw 'BuildDir must be a separate staging directory, not the source or its parent.'
}
$dependencyTarget = Join-Path $BuildDir 'node_modules'
foreach ($path in @($BuildDir, $dependencyTarget)) {
  if ((Test-Path -LiteralPath $path) -and
      ((Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw "Refusing to mirror dependencies through a linked directory: $path"
  }
}

# Keep node_modules in sync with package.json: after a pull that adds a dependency,
# Metro would otherwise fail with "Unable to resolve module ...".
Write-Host '==> npm install'
Push-Location $src
try {
  npm install --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm install failed' }
}
finally {
  Pop-Location
}

Write-Host "==> Sync $src -> $BuildDir"
# Exclude only the root-level dirs: a bare /XD dist would also skip node_modules/**/dist.
robocopy $src $BuildDir /E /NFL /NDL /NJH /NJS /NP `
  /XD "$src\dist" "$src\.expo" "$src\android" "$src\build-output" "$src\node_modules" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE)" }

# Mirror dependencies separately: /E retains removed files from older package versions.
# Those stale C++ sources are picked up by CMake and break native compilation.
Write-Host '==> Mirror node_modules (remove obsolete dependency files)'
robocopy "$src\node_modules" $dependencyTarget /MIR /XJ /R:1 /W:1 /NFL /NDL /NJH /NJS /NP
if ($LASTEXITCODE -lt 0 -or $LASTEXITCODE -ge 8) { throw "dependency sync failed ($LASTEXITCODE)" }

Push-Location $BuildDir
try {
  # Drop stale native project so icon/name/version always match app.config.ts.
  if (Test-Path 'android') {
    Write-Host '==> Remove stale android/ (forces fresh icon + label)'
    Remove-Item -Recurse -Force 'android'
  }

  Write-Host '==> expo prebuild --clean (android)'
  npx expo prebuild --platform android --clean --no-install
  if ($LASTEXITCODE -ne 0) { throw 'expo prebuild failed' }

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
  # Hash long object paths before Ninja hits Windows' path limit, even in C:\sp.
  $g = $g -replace '"-DCMAKE_JOB_POOLS=cc=2"', '"-DCMAKE_OBJECT_PATH_MAX=240", "-DCMAKE_JOB_POOLS=cc=2"'
  $g = $g -replace '// extraPackagerArgs = \[\]', 'extraPackagerArgs = ["--max-workers", "1"]'
  Set-Content $gradle $g -NoNewline

  Write-Host '==> Gradle assembleRelease (first run can take 10-20 min)'
  Push-Location android
  .\gradlew.bat assembleRelease --no-daemon --console=plain
  if ($LASTEXITCODE -ne 0) {
    # Out-of-memory failures are often transient; the retry reuses the Gradle cache.
    Write-Host '==> Gradle failed, retrying once (close Chrome/heavy apps if it fails again)'
    .\gradlew.bat assembleRelease --no-daemon --console=plain
    if ($LASTEXITCODE -ne 0) { throw 'gradle build failed' }
  }
  Pop-Location

  $apk = 'android\app\build\outputs\apk\release\app-release.apk'
  $out = Join-Path $src 'build-output'
  New-Item -ItemType Directory -Force $out | Out-Null
  # 0xF2 = o grave. Built from the char code so the script stays ASCII-safe on PowerShell 5.1.
  $name = "Sport IApper$([char]0xF2).apk"
  Copy-Item $apk (Join-Path $out $name) -Force
  Write-Host "==> Done: $out\$name"
}
finally {
  Pop-Location
}
