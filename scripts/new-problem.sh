#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: scripts/new-problem.sh <slug>"
  echo "Example: scripts/new-problem.sh 0002-valid-parentheses"
  exit 1
fi

slug="$1"
target_dir="problems/$slug"

if [ -e "$target_dir" ]; then
  echo "Problem already exists: $target_dir"
  exit 1
fi

mkdir -p "$target_dir"
cp templates/problem/README.md "$target_dir/README.md"
cp templates/problem/Solution.java "$target_dir/Solution.java"
cp templates/problem/Main.java "$target_dir/Main.java"

echo "Created $target_dir"

