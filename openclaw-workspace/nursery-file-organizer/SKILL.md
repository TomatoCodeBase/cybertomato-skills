---
name: nursery-file-organizer
description: This skill should be used when the user needs to organize and rename nursery/daycare photo and video files. It handles batch renaming of files in nursery-related folders (e.g., "2026-xx-xx-幼托") with Chinese filenames on Windows systems. Triggers when user mentions "整理幼托", "幼托文件", or provides a folder path containing "幼托".
---

# Nursery File Organizer

## Overview

This skill enables batch renaming of nursery/daycare photo and video files with proper Chinese filename encoding on Windows systems. It handles the encoding challenges of Chinese paths and filenames (UTF-8 vs GBK) reliably.

## When to Use This Skill

Use this skill when:
- User asks to organize nursery/daycare files (幼托文件)
- User provides a folder path containing "幼托" (nursery)
- User says "整理" in the context of nursery photos/videos
- Files need to be renamed with format: `YYYY-MM-DD--小石榴幼托XX.扩展名`

## Naming Rules

| File Type | Original Pattern | Target Pattern |
|-----------|-----------------|----------------|
| JPG images | `*.jpg` (any pattern) | `YYYY-MM-DD--小石榴幼托01.jpg` ~ `NN.jpg` |
| MP4 videos | `*.mp4` (any pattern) | `YYYY-MM-DD--小石榴幼托01.mp4` ~ `NN.mp4` (separate sequence) |
| TXT files | `*.txt` (any pattern) | `YYYY-MM-DD--小石榴幼托情况.txt` |

- Date is extracted from folder name (e.g., `2026-03-16--幼托` → `2026-03-16`)
- Images are sorted alphabetically by original filename, then numbered sequentially
- Videos have their own numbering sequence, separate from images

## Workflow

1. **Identify the target folder** - Get path from user or infer from context
2. **Extract date from folder name** - Parse `YYYY-MM-DD` from folder name
3. **List and sort files** - Separate jpg, mp4, and txt files
4. **Execute rename** - Use the bundled PowerShell script with proper encoding
5. **Verify results** - Show final file list to user
6. **Cleanup** - Remove temporary script files

## Critical Encoding Notes

Windows Chinese systems have encoding challenges:
- PowerShell scripts with Chinese strings may be read as GBK instead of UTF-8
- **Solution**: Use `$PSScriptRoot` for paths, and Unicode code points for Chinese characters
- Key Chinese characters as Unicode code points:
  - 小 = `0x5C0F`
  - 石 = `0x77F3`
  - 榴 = `0x69B4` (NOT 0x6974 or 0x6995)
  - 幼 = `0x5E7C`
  - 托 = `0x6258`
  - 情 = `0x60C5`
  - 况 = `0x51B5`

## Resources

### scripts/rename.ps1

A PowerShell script that handles the actual renaming with proper encoding. Execute it with:

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File <path_to_script>
```

The script:
- Uses `$PSScriptRoot` to avoid hardcoding Chinese paths
- Constructs Chinese filenames using Unicode code points
- Sorts files alphabetically for consistent ordering
- Provides progress output for each renamed file
- Handles jpg, mp4, and txt files separately

## Example Usage

**User**: 整理 "H:\G谷歌下载\2026-03-16--幼托"

**Agent response**:
1. List files in the folder
2. Run the rename script with extracted date
3. Show renamed files
4. Clean up temporary script
