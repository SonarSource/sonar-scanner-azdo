#!/bin/bash

set -euo pipefail

# =============================================================================
# DISCLAIMER: This script is for development purposes only.
# It automates version updates across extension files to avoid manual editing
# of task.json and vss-extension.json files.
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the root directory of the Git repository
GIT_ROOT=$(git rev-parse --show-toplevel)

# Change directory to the root of the repository
cd "$GIT_ROOT" || exit

# Function to display usage
usage() {
    echo "Usage: $0 <extension> <version> [<extension> <version> ...]"
    echo ""
    echo "Arguments:"
    echo "  extension    Extension to update: 'sqs' (SonarQube Server) or 'sqc' (SonarQube Cloud)"
    echo "  version      New version in format X.Y.Z (e.g., 4.0.11)"
    echo ""
    echo "Examples:"
    echo "  $0 sqc 4.0.11"
    echo "  $0 sqs 8.0.3"
    echo "  $0 sqs 8.0.3 sqc 4.0.11"
    exit 1
}

# Check arguments (must have at least one extension/version pair)
if [ $# -lt 2 ] || [ $(($# % 2)) -ne 0 ]; then
    echo -e "${RED}Error: Arguments must be provided in extension/version pairs${NC}"
    usage
fi

# Function to map short extension names to full directory names
map_extension_name() {
    case $1 in
        sqc)
            echo "sonarcloud"
            ;;
        sqs)
            echo "sonarqube"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Function to update task.json files
update_task_json() {
    local task_file=$1
    local major=$2
    local minor=$3
    local patch=$4

    echo "  Updating $task_file"

    # Use node to update only the version values without reformatting the file
    node -e "
        const fs = require('fs');
        const file = '$task_file';
        let content = fs.readFileSync(file, 'utf8');

        // Replace the version object values using regex
        content = content.replace(
            /(\"version\":\s*\{[^}]*\"Major\":\s*)(\d+)([^}]*\"Minor\":\s*)(\d+)([^}]*\"Patch\":\s*)(\d+)/,
            '\$1$major\$3$minor\$5$patch'
        );

        fs.writeFileSync(file, content);
    "
}

# Function to update vss-extension.json
update_vss_extension() {
    local vss_file=$1
    local version=$2

    echo "  Updating $vss_file"

    # Use node to update only the version value without reformatting the file
    node -e "
        const fs = require('fs');
        const file = '$vss_file';
        let content = fs.readFileSync(file, 'utf8');

        // Replace the version value using regex
        content = content.replace(
            /(\"version\":\s*)\"[^\"]+\"/,
            '\$1\"$version\"'
        );

        fs.writeFileSync(file, content);
    "
}

# Function to update extension
update_extension() {
    local ext_name=$1
    local version=$2
    local ext_dir="src/extensions/$ext_name"

    # Validate version format
    if ! [[ $version =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        echo -e "${RED}Error: Version must be in format X.Y.Z (e.g., 4.0.11)${NC}"
        return 1
    fi

    # Parse version components
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)
    local patch=$(echo "$version" | cut -d. -f3)

    if [ ! -d "$ext_dir" ]; then
        echo -e "${RED}Error: Extension directory not found: $ext_dir${NC}"
        return 1
    fi

    echo -e "${GREEN}Updating $ext_name extension to version $version${NC}"

    # Update vss-extension.json
    local vss_file="$ext_dir/vss-extension.json"
    if [ -f "$vss_file" ]; then
        update_vss_extension "$vss_file" "$version"
    else
        echo -e "${YELLOW}Warning: vss-extension.json not found at $vss_file${NC}"
    fi

    # Update all task.json files in the matching major version folder (e.g., v4 for version 4.x.x)
    local task_files=$(find "$ext_dir/tasks" -path "*/v${major}/task.json" 2>/dev/null || true)

    if [ -z "$task_files" ]; then
        echo -e "${YELLOW}Warning: No task.json files found in $ext_dir/tasks/*/v${major}/${NC}"
    else
        echo "Found task.json files in v${major} folders:"
        while IFS= read -r task_file; do
            update_task_json "$task_file" "$major" "$minor" "$patch"
        done <<< "$task_files"
    fi

    echo ""
}

# Main execution
echo ""
declare -a updates

# Process extension/version pairs
while [ $# -gt 0 ]; do
    extension_short=$1
    version=$2

    # Validate extension name and map to full name
    extension_full=$(map_extension_name "$extension_short")
    if [ -z "$extension_full" ]; then
        echo -e "${RED}Error: Invalid extension '$extension_short'. Must be 'sqc' (SonarQube Cloud) or 'sqs' (SonarQube Server)${NC}"
        exit 1
    fi

    # Store update info for summary
    updates+=("$extension_short=$version")

    # Update the extension using full directory name
    update_extension "$extension_full" "$version"

    # Move to next pair
    shift 2
done

echo -e "${GREEN}Version update completed successfully!${NC}"
echo ""
echo "Summary:"
for update in "${updates[@]}"; do
    ext=$(echo "$update" | cut -d= -f1)
    ver=$(echo "$update" | cut -d= -f2)
    echo "  - $ext: $ver"
done
echo ""
echo "Next steps:"
echo "  1. Review the changes with: git diff"
echo "  2. Commit the changes"
