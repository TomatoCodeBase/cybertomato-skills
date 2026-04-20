# rename.ps1 - Nursery file renaming script
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File rename.ps1
# This script should be placed in the target folder before execution

$folder = $PSScriptRoot

# Extract date from folder name (format: YYYY-MM-DD--幼托 or similar)
$folderName = Split-Path $folder -Leaf
if ($folderName -match '^(\d{4}-\d{2}-\d{2})') {
    $prefix = $Matches[1]
} else {
    $prefix = Get-Date -Format "yyyy-MM-dd"
}

# Chinese characters as Unicode code points (avoids encoding issues)
# 小石榴幼托 = [char]0x5C0F + [char]0x77F3 + [char]0x69B4 + [char]0x5E7C + [char]0x6258
# 情况 = [char]0x60C5 + [char]0x51B5
$label = [char]0x5C0F + [char]0x77F3 + [char]0x69B4 + [char]0x5E7C + [char]0x6258
$suffix = [char]0x60C5 + [char]0x51B5

Write-Host "=== Nursery File Renamer ==="
Write-Host "Folder: $folder"
Write-Host "Date prefix: $prefix"
Write-Host "Label: $label"
Write-Host ""

# Process JPG files
$jpgFiles = Get-ChildItem -LiteralPath $folder -Filter "*.jpg" | Sort-Object Name
Write-Host ("=== Renaming " + $jpgFiles.Count + " JPG files ===")
$i = 1
foreach ($f in $jpgFiles) {
    $num = "{0:D2}" -f $i
    $newName = $prefix + "--" + $label + $num + ".jpg"
    Rename-Item -LiteralPath $f.FullName -NewName $newName
    Write-Host ("  " + $f.Name + " -> " + $newName)
    $i++
}

# Process MP4 files (separate numbering)
$mp4Files = Get-ChildItem -LiteralPath $folder -Filter "*.mp4" | Sort-Object Name
if ($mp4Files.Count -gt 0) {
    Write-Host ""
    Write-Host ("=== Renaming " + $mp4Files.Count + " MP4 files ===")
    $i = 1
    foreach ($f in $mp4Files) {
        $num = "{0:D2}" -f $i
        $newName = $prefix + "--" + $label + $num + ".mp4"
        Rename-Item -LiteralPath $f.FullName -NewName $newName
        Write-Host ("  " + $f.Name + " -> " + $newName)
        $i++
    }
}

# Process TXT files
$txtFiles = Get-ChildItem -LiteralPath $folder -Filter "*.txt"
if ($txtFiles.Count -gt 0) {
    Write-Host ""
    Write-Host ("=== Renaming " + $txtFiles.Count + " TXT files ===")
    foreach ($f in $txtFiles) {
        $newName = $prefix + "--" + $label + $suffix + ".txt"
        Rename-Item -LiteralPath $f.FullName -NewName $newName
        Write-Host ("  " + $f.Name + " -> " + $newName)
    }
}

Write-Host ""
Write-Host "=== Final file list ==="
Get-ChildItem -LiteralPath $folder | Where-Object { $_.Extension -in ".jpg", ".mp4", ".txt" } | Sort-Object Name | ForEach-Object { Write-Host ("  " + $_.Name) }
Write-Host ""
Write-Host "Done."
