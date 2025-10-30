#!/bin/bash

# Script to install Git hooks for the Sakinah project
# Run this after cloning the repository to set up security hooks

HOOK_DIR=".git/hooks"
HOOK_FILE="$HOOK_DIR/pre-commit"

echo "🔧 Installing Git security hooks..."
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository root"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$HOOK_DIR"

# Create the pre-commit hook
echo "Creating pre-commit hook..."
cat > "$HOOK_FILE" << 'HOOK_EOF'
#!/bin/bash

# Pre-commit hook to prevent committing sensitive files
# This hook checks for files that contain sensitive information

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of sensitive file patterns (one per line)
SENSITIVE_FILES=(
    # Setup and configuration files with credentials
    "SSH_KEY_SETUP.md"
    "SUPABASE_SETUP.md"
    "REPLIT_DEPLOYMENT.md"
    "MIGRATION_COMPLETE.md"
    "GITHUB_CACHE_NOTICE.md"
    "SECURITY_CLEANUP_COMPLETE.md"
    "CREDENTIAL_ROTATION_COMMANDS.md"

    # Scripts that may contain sensitive data
    "setup-github-auth.sh"
    "setup-ssh-key.sh"
    "verify-supabase.sh"
    "build-replit.sh"
    "start-production.sh"
    "ROTATE_CREDENTIALS.sh"

    # Change logs that may contain sensitive info
    "CHANGES_SUMMARY.txt"

    # Old configuration files
    ".vercelignore"
    "vercel.json"
    "tsconfig.build.json"
)

# Patterns to search for in file content (regex patterns)
SENSITIVE_PATTERNS=(
    # API Keys and tokens
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\."  # JWT tokens
    "ghp_[a-zA-Z0-9]{36}"                        # GitHub personal access tokens
    "github_pat_[a-zA-Z0-9_]{82}"                # GitHub fine-grained PAT

    # SSH Keys
    "ssh-rsa AAAA"
    "ssh-ed25519 AAAA"
    "ssh-dss AAAA"
    "ecdsa-sha2-nistp256 AAAA"

    # Private keys
    "BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY"
    "BEGIN PRIVATE KEY"

    # Supabase specific
    "supabase\.co/dashboard/project/[a-zA-Z0-9]+"
    "[a-zA-Z0-9]{20}\.supabase\.co"

    # Common secrets
    "password[\"']?\s*[:=]\s*[\"'][^\"']{8,}"
    "api[_-]?key[\"']?\s*[:=]\s*[\"'][^\"']{20,}"
    "secret[_-]?key[\"']?\s*[:=]\s*[\"'][^\"']{20,}"
    "access[_-]?token[\"']?\s*[:=]\s*[\"'][^\"']{20,}"
)

echo "🔍 Checking for sensitive files and content..."

# Get list of staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
    echo "✅ No files staged for commit"
    exit 0
fi

FOUND_SENSITIVE=0

# Check for sensitive filenames
echo ""
echo "📋 Checking for sensitive filenames..."
for pattern in "${SENSITIVE_FILES[@]}"; do
    # Check if any staged file matches the pattern
    MATCHING_FILES=$(echo "$STAGED_FILES" | grep -E "^${pattern}$|/${pattern}$")

    if [ ! -z "$MATCHING_FILES" ]; then
        FOUND_SENSITIVE=1
        echo -e "${RED}❌ BLOCKED: Attempting to commit sensitive file:${NC}"
        echo "   $MATCHING_FILES"
        echo "   Pattern: $pattern"
        echo ""
    fi
done

# Check file contents for sensitive patterns
echo "🔎 Scanning file contents for sensitive data..."
for file in $STAGED_FILES; do
    # Skip binary files and deleted files
    if [ ! -f "$file" ]; then
        continue
    fi

    # Check if file is binary
    if file "$file" | grep -q "text"; then
        # Scan for sensitive patterns
        for pattern in "${SENSITIVE_PATTERNS[@]}"; do
            if grep -qE "$pattern" "$file"; then
                FOUND_SENSITIVE=1
                echo -e "${RED}❌ BLOCKED: Found sensitive content in: ${NC}$file"
                echo "   Pattern matched: $pattern"
                echo ""
            fi
        done
    fi
done

# If sensitive content found, block the commit
if [ $FOUND_SENSITIVE -eq 1 ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 COMMIT BLOCKED - SENSITIVE DATA DETECTED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your commit has been blocked because it contains sensitive information."
    echo ""
    echo "Actions you can take:"
    echo "  1. Remove the sensitive files from staging:"
    echo "     git reset HEAD <filename>"
    echo ""
    echo "  2. Remove sensitive content from files"
    echo ""
    echo "  3. If you're ABSOLUTELY sure this is safe, you can bypass this hook:"
    echo "     git commit --no-verify"
    echo "     ${YELLOW}(NOT RECOMMENDED - only for non-sensitive documentation)${NC}"
    echo ""
    exit 1
fi

echo ""
echo "✅ No sensitive data detected - commit allowed"
echo ""
exit 0
HOOK_EOF

# Make the hook executable
chmod +x "$HOOK_FILE"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Git Security Hooks Installed Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "What this hook does:"
echo "  🔍 Scans staged files for sensitive filenames"
echo "  🔎 Scans file contents for API keys, tokens, and secrets"
echo "  🛑 Blocks commits containing sensitive data"
echo ""
echo "Protected patterns include:"
echo "  • Setup/configuration files (SSH_KEY_SETUP.md, SUPABASE_SETUP.md, etc.)"
echo "  • JWT tokens and API keys"
echo "  • SSH keys (public and private)"
echo "  • GitHub tokens"
echo "  • Supabase credentials"
echo ""
echo "To test the hook:"
echo "  1. Create a test file: echo 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test' > test-secret.txt"
echo "  2. Try to commit it: git add test-secret.txt && git commit -m 'test'"
echo "  3. Should be blocked with error message"
echo "  4. Clean up: rm test-secret.txt"
echo ""

