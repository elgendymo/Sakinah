#!/bin/bash

# Security audit script to check for compromised packages
echo "🔍 Checking for compromised package versions..."

# List of compromised packages and versions
declare -A COMPROMISED_PACKAGES=(
    ["ansi-regex"]="6.2.1"
    ["ansi-styles"]="6.2.2"
    ["backslash"]="0.2.1"
    ["chalk"]="5.6.1"
    ["chalk-template"]="1.1.1"
    ["color"]="5.0.1"
    ["color-convert"]="3.1.1"
    ["color-name"]="2.0.1"
    ["color-string"]="2.1.1"
    ["debug"]="4.4.2"
    ["has-ansi"]="6.0.1"
    ["is-arrayish"]="0.3.3"
    ["simple-swizzle"]="0.2.3"
    ["slice-ansi"]="7.1.1"
    ["strip-ansi"]="7.1.1"
    ["supports-color"]="10.2.1"
    ["supports-hyperlinks"]="4.1.1"
    ["wrap-ansi"]="9.0.1"
)

# Check each package
for pkg in "${!COMPROMISED_PACKAGES[@]}"; do
    if [ -d "node_modules/$pkg" ]; then
        version=$(cat "node_modules/$pkg/package.json" | grep '"version"' | head -1 | cut -d'"' -f4)
        compromised_version=${COMPROMISED_PACKAGES[$pkg]}

        if [ "$version" = "$compromised_version" ]; then
            echo "⚠️  ALERT: Found compromised package $pkg@$version"
        else
            echo "✅ $pkg@$version (safe - compromised version is $compromised_version)"
        fi
    fi
done

echo ""
echo "🔒 Running npm audit..."
npm audit --audit-level=moderate

echo ""
echo "📋 Security audit complete!"
