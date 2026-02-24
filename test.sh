#!/bin/bash
# Ralph Manager - Test Suite
# Run automated tests to verify app functionality

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="/tmp/ralph-test-$$"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TESTS_PASSED=0
TESTS_FAILED=0

log_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    TESTS_PASSED=$((TESTS_PASSED + 1))
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    TESTS_FAILED=$((TESTS_FAILED + 1))
}

cleanup() {
    echo ""
    echo "Cleaning up..."
    rm -rf "$TEST_DIR"
    echo "Test directory removed."
}

trap cleanup EXIT

echo "╔════════════════════════════════════════════════════════╗"
echo "║          Ralph Manager - Test Suite                    ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Test 1: Check required files exist
log_test "Checking required files..."
FILES_TO_CHECK=(
    "public/index.html"
    "src/main/main.js"
    "scripts/generate-ralph-loop.sh"
    "scripts/ralph-manager-daemon.sh"
    "package.json"
)

all_files_exist=true
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$SCRIPT_DIR/$file" ]; then
        log_pass "Found: $file"
    else
        log_fail "Missing: $file"
        all_files_exist=false
    fi
done

if [ "$all_files_exist" = false ]; then
    echo ""
    echo -e "${RED}FATAL: Required files missing. Exiting.${NC}"
    exit 1
fi

# Test 2: Check scripts are executable
log_test "Checking script permissions..."
if [ -x "$SCRIPT_DIR/scripts/generate-ralph-loop.sh" ]; then
    log_pass "generate-ralph-loop.sh is executable"
else
    log_fail "generate-ralph-loop.sh is not executable"
    chmod +x "$SCRIPT_DIR/scripts/generate-ralph-loop.sh"
fi

if [ -x "$SCRIPT_DIR/scripts/ralph-manager-daemon.sh" ]; then
    log_pass "ralph-manager-daemon.sh is executable"
else
    log_fail "ralph-manager-daemon.sh is not executable"
    chmod +x "$SCRIPT_DIR/scripts/ralph-manager-daemon.sh"
fi

# Test 3: Test Ralph Loop Generator
log_test "Testing Ralph Loop Generator..."
mkdir -p "$TEST_DIR/project1"
"$SCRIPT_DIR/scripts/generate-ralph-loop.sh" "$TEST_DIR/project1" > /dev/null 2>&1

GENERATED_FILES=(
    "ralph-loop.sh"
    "prd.json"
    ".ralph-prompt.md"
)

for file in "${GENERATED_FILES[@]}"; do
    if [ -f "$TEST_DIR/project1/$file" ]; then
        log_pass "Generated: $file"
    else
        log_fail "Not generated: $file"
    fi
done

if [ -d "$TEST_DIR/project1/codebase" ]; then
    log_pass "Created: codebase directory"
else
    log_fail "Missing: codebase directory"
fi

# Test 4: Validate PRD JSON structure
log_test "Validating PRD JSON structure..."
if command -v jq &> /dev/null; then
    if jq -e '.tasks' "$TEST_DIR/project1/prd.json" > /dev/null 2>&1; then
        log_pass "PRD has tasks array"
        
        TASK_COUNT=$(jq '.tasks | length' "$TEST_DIR/project1/prd.json")
        if [ "$TASK_COUNT" -gt 0 ]; then
            log_pass "PRD has $TASK_COUNT tasks"
        else
            log_fail "PRD has no tasks"
        fi
    else
        log_fail "Invalid PRD JSON structure"
    fi
else
    log_test "jq not installed, skipping JSON validation"
fi

# Test 5: Test Ralph Loop script syntax
log_test "Checking Ralph Loop script syntax..."
if bash -n "$TEST_DIR/project1/ralph-loop.sh" 2>/dev/null; then
    log_pass "ralph-loop.sh syntax is valid"
else
    log_fail "ralph-loop.sh has syntax errors"
fi

# Test 6: Test Daemon script syntax
log_test "Checking Daemon script syntax..."
if bash -n "$SCRIPT_DIR/scripts/ralph-manager-daemon.sh" 2>/dev/null; then
    log_pass "ralph-manager-daemon.sh syntax is valid"
else
    log_fail "ralph-manager-daemon.sh has syntax errors"
fi

# Test 7: Test HTML file structure
log_test "Checking HTML structure..."
if grep -q "Ralph Manager" "$SCRIPT_DIR/public/index.html"; then
    log_pass "HTML has title"
else
    log_fail "HTML missing title"
fi

if grep -q "Open Project" "$SCRIPT_DIR/public/index.html"; then
    log_pass "HTML has Open Project button"
else
    log_fail "HTML missing Open Project button"
fi

if grep -q "New Project" "$SCRIPT_DIR/public/index.html"; then
    log_pass "HTML has New Project button"
else
    log_fail "HTML missing New Project button"
fi

if grep -q "Start Loop" "$SCRIPT_DIR/public/index.html"; then
    log_pass "HTML has Start Loop button"
else
    log_fail "HTML missing Start Loop button"
fi

# Test 8: Check package.json dependencies
log_test "Checking package.json..."
if grep -q "electron" "$SCRIPT_DIR/package.json"; then
    log_pass "package.json has electron dependency"
else
    log_fail "package.json missing electron dependency"
fi

if grep -q '"start":' "$SCRIPT_DIR/package.json"; then
    log_pass "package.json has start script"
else
    log_fail "package.json missing start script"
fi

# Test 9: Test project initialization with different names
log_test "Testing project initialization with various names..."
for proj_name in "test-project" "TestProject" "test_project" "test.project"; do
    mkdir -p "$TEST_DIR/$proj_name"
    if "$SCRIPT_DIR/scripts/generate-ralph-loop.sh" "$TEST_DIR/$proj_name" > /dev/null 2>&1; then
        if [ -f "$TEST_DIR/$proj_name/ralph-loop.sh" ]; then
            log_pass "Generated project: $proj_name"
        else
            log_fail "Failed to generate: $proj_name"
        fi
    else
        log_fail "Generator failed for: $proj_name"
    fi
done

# Test 10: Check node_modules
log_test "Checking npm dependencies..."
if [ -d "$SCRIPT_DIR/node_modules" ]; then
    log_pass "node_modules directory exists"
    
    if [ -d "$SCRIPT_DIR/node_modules/react" ]; then
        log_pass "react installed"
    else
        log_fail "react not installed"
    fi
    
    if [ -d "$SCRIPT_DIR/node_modules/electron" ]; then
        log_pass "electron installed"
    else
        log_fail "electron not installed"
    fi
else
    log_fail "node_modules directory missing. Run: npm install"
fi

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║                    Test Summary                        ║"
echo "╠════════════════════════════════════════════════════════╣"
echo -e "║  ${GREEN}Passed${NC}: $TESTS_PASSED                                        ║"
echo -e "║  ${RED}Failed${NC}: $TESTS_FAILED                                        ║"
echo "╚════════════════════════════════════════════════════════╝"

if [ $TESTS_FAILED -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "To start the app:"
    echo "  cd $SCRIPT_DIR"
    echo "  npm start"
    echo ""
    echo "Or use the alias:"
    echo "  source ~/.bash_alias"
    echo "  ralph"
    exit 0
else
    echo ""
    echo -e "${RED}✗ Some tests failed. Please fix the issues above.${NC}"
    echo ""
    exit 1
fi
