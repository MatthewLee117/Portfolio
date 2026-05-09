#!/usr/bin/env bash
set -euo pipefail

out="meta/loc.csv"
echo "file,line,type,commit,author,date,time,timezone,datetime,depth,length" > "$out"

files=$(git ls-files)
for file in $files; do
  case "$file" in
    *.html|*.css|*.js|*.json|*.md|*.txt|*.yml|*.yaml|*.toml|*.xml|*.svg) ;;
    *) continue ;;
  esac

  if [ ! -f "$file" ]; then
    continue
  fi

  ext="${file##*.}"

  git blame --line-porcelain -- "$file" | awk -v f="$file" -v t="$ext" '
    BEGIN { line=0 }
    /^[0-9a-f]{40} / { commit=substr($1,1,8); next }
    /^author / { author=substr($0,8); gsub(/,/, " ", author); next }
    /^author-time / { atime=$2; next }
    /^author-tz / { tz=$2; next }
    /^\t/ {
      line++;
      text=substr($0,2);
      depth=0;
      temp=text;
      while (sub(/^  /, "", temp)) depth++;
      len=length(text);
      cmd="date -r " atime " +%Y-%m-%d,%H:%M:%S";
      cmd | getline dt;
      close(cmd);
      split(dt, a, ",");
      date=a[1];
      time=a[2];
      datetime=date "T" time tz;
      print f "," line "," t "," commit "," author "," date "," time "," tz "," datetime "," depth "," len;
    }
  ' >> "$out"
done
