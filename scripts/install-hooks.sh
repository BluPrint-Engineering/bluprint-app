#!/bin/sh
set -e

hooks=$(git rev-parse --git-path hooks)
# A read-only hooks dir is owned by a tool that chains these hooks itself; lefthook install fails renaming inside it.
if [ -d "$hooks" ] && [ ! -w "$hooks" ]; then
	echo "prepare: $hooks is read-only, skipping lefthook install" >&2
	exit 0
fi
exec lefthook install
