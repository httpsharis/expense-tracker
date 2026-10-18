#!/usr/bin/env bash
set -eo pipefail

# Ralph Loop: Autonomous, context-refreshing iteration loop for coding agents
# Usage: ./ralph.sh [MAX_ITERATIONS] [PROMPT_FILE]

MAX_ITERATIONS="${1:-10}"
PROMPT_FILE="${2:-PROMPT.md}"
ITERATION=1

echo "========================================="
echo " 🚀 Starting Ralph Loop"
echo " Max Iterations: $MAX_ITERATIONS"
echo " Prompt File:    $PROMPT_FILE"
echo "========================================="

# Ensure prompt file exists
if [ ! -f "$PROMPT_FILE" ]; then
    echo "Creating default $PROMPT_FILE..."
    cat << 'EOF' > "$PROMPT_FILE"
# Ralph Loop Task Instructions

1. Inspect current codebase state and progress (check git status and .planning/ or ROADMAP.md if present).
2. Identify the next single, highest-priority task or bug to address.
3. Make atomic, high-quality code changes.
4. Run verification tests / linter to ensure nothing is broken.
5. Commit your changes with a clear conventional commit message.
6. When all tasks are fully accomplished, write "RALPH_COMPLETE" to a file named .ralph_done.
EOF
    echo "Created default $PROMPT_FILE."
fi

# Ensure agy / node is discoverable
export PATH="/home/harry/.nvm/versions/node/v22.23.2/bin:/home/harry/.gemini/bin:$PATH"

while [ "$ITERATION" -le "$MAX_ITERATIONS" ]; do
    echo ""
    echo "-----------------------------------------"
    echo " 🔄 [Ralph] Iteration $ITERATION of $MAX_ITERATIONS"
    echo "-----------------------------------------"

    if [ -f ".ralph_done" ]; then
        echo "✅ .ralph_done detected! Ralph loop finished successfully."
        rm -f .ralph_done
        exit 0
    fi

    if command -v agy &>/dev/null; then
        cat "$PROMPT_FILE" | agy || true
    elif [ -x "$HOME/.gemini/bin/agy" ]; then
        cat "$PROMPT_FILE" | "$HOME/.gemini/bin/agy" || true
    elif command -v claude &>/dev/null; then
        cat "$PROMPT_FILE" | claude -p --dangerously-skip-permissions || true
    else
        echo "Error: Neither agy nor claude CLI was found in PATH."
        exit 1
    fi

    ITERATION=$((ITERATION + 1))
    sleep 2
done

echo ""
echo "========================================="
echo " 🏁 Ralph Loop completed $MAX_ITERATIONS iterations."
echo "========================================="

