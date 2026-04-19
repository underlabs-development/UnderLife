#!/bin/bash

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <category> <content>"
    echo "Categories: strategy, pattern, pitfall"
    exit 1
fi

CATEGORY=$1
CONTENT=$2
DIR=".agents/learnings"

case "$CATEGORY" in
    strategy|pattern|pitfall) ;;
    *)
        echo "Invalid category. Must be one of: strategy, pattern, pitfall"
        exit 1
        ;;
esac

# Derive a slug from the content: lowercase, keep alphanumeric/hyphens, trim to 60 chars
SLUG=$(echo "$CONTENT" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9 ]//g' | tr ' ' '-' | sed 's/--*/-/g; s/^-//; s/-$//' | cut -c1-60 | sed 's/-$//')

if [ -z "$SLUG" ]; then
    SLUG="unnamed"
fi

FILEPATH="${DIR}/${CATEGORY}-${SLUG}.md"

# Avoid collisions by appending a numeric suffix
if [ -e "$FILEPATH" ]; then
    i=2
    while [ -e "${DIR}/${CATEGORY}-${SLUG}-${i}.md" ]; do
        i=$((i + 1))
    done
    FILEPATH="${DIR}/${CATEGORY}-${SLUG}-${i}.md"
fi

mkdir -p "$DIR"

cat > "$FILEPATH" << EOF
---
category: ${CATEGORY}
---

${CONTENT}
EOF

echo "Created learning: ${FILEPATH}"

# Warn when learnings exceed threshold
COUNT=$(ls -1 "${DIR}"/*.md 2>/dev/null | wc -l | tr -d ' ')
if [ "$COUNT" -gt 10 ]; then
    echo ""
    echo "⚠️  There are now ${COUNT} learnings in ${DIR}/."
    echo "   Devs should prune: review, promote useful ones to .agents/rules/, and delete the rest."
fi
