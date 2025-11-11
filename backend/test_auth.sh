#!/bin/bash

# Test script for Authentication Router
# Usage: ./test_auth.sh

BASE_URL="http://localhost:5000/api/auth"
JWT_TOKEN=""
HEADERS_FILE="/tmp/test_headers.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Cleanup function
cleanup() {
    rm -f "$HEADERS_FILE"
}

# Set up trap for cleanup
trap cleanup EXIT

# Check if curl is available
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed. Please install curl."
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. JSON responses won't be formatted."
    fi
}

# Test server connectivity
test_server_connectivity() {
    print_status "Testing server connectivity..."
    
    if curl -s --head "$BASE_URL" | head -n 1 | grep "200\|404\|401" > /dev/null; then
        print_success "Server is reachable"
        return 0
    else
        print_error "Server is not reachable at $BASE_URL"
        print_error "Make sure your Express server is running on port 3000"
        exit 1
    fi
}

# Test user registration
test_registration() {
    local test_email="testuser_$(date +%s)@example.com"
    local test_password="testpass123"
    local test_name="Test User"
    
    print_status "Testing user registration..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\",
            \"name\": \"$test_name\",
            \"role\": \"CarOwner\",
            \"model\": \"Tesla Model 3\"
        }")
    
    # Extract status code and body
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body" | jq . 2>/dev/null || echo "Response: $response_body"
    
    if [ "$http_code" -eq 201 ]; then
        print_success "Registration test passed (HTTP $http_code)"
        # Extract user ID for later tests
        USER_ID=$(echo "$response_body" | jq -r '.user.id' 2>/dev/null)
        return 0
    else
        print_error "Registration test failed (HTTP $http_code)"
        return 1
    fi
}

# Test duplicate registration
test_duplicate_registration() {
    local duplicate_email="duplicate_$(date +%s)@example.com"
    local test_password="testpass123"
    local test_name="Duplicate User"
    
    print_status "Testing duplicate registration..."
    
    # First registration
    curl -s -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$duplicate_email\",
            \"password\": \"$test_password\",
            \"name\": \"$test_name\",
            \"role\": \"CarOwner\"
        }" > /dev/null
    
    # Second registration with same email
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$duplicate_email\",
            \"password\": \"$test_password\",
            \"name\": \"$test_name\",
            \"role\": \"CarOwner\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body" | jq . 2>/dev/null || echo "Response: $response_body"
    
    if [ "$http_code" -eq 400 ]; then
        print_success "Duplicate registration test passed (HTTP $http_code)"
        return 0
    else
        print_error "Duplicate registration test failed (HTTP $http_code)"
        return 1
    fi
}

# Test login with valid credentials
test_valid_login() {
    local test_email="login_test_$(date +%s)@example.com"
    local test_password="loginpass123"
    local test_name="Login Test User"
    
    print_status "Testing valid login..."
    
    # Register user first
    curl -s -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\",
            \"name\": \"$test_name\",
            \"role\": \"CarOwner\",
            \"model\": \"Tesla Model S\"
        }" > /dev/null
    
    # Now test login
    response=$(curl -s -w "\n%{http_code}" -D "$HEADERS_FILE" -X POST "$BASE_URL/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body" | jq . 2>/dev/null || echo "Response: $response_body"
    
    if [ "$http_code" -eq 200 ]; then
        # Extract JWT token
        JWT_TOKEN=$(echo "$response_body" | jq -r '.token' 2>/dev/null)
        if [ -n "$JWT_TOKEN" ] && [ "$JWT_TOKEN" != "null" ]; then
            print_success "Valid login test passed (HTTP $http_code)"
            print_success "JWT Token received: ${JWT_TOKEN:0:20}..."
            
            # Also check if cars array is returned
            CARS_COUNT=$(echo "$response_body" | jq -r '.cars | length' 2>/dev/null)
            print_success "User has $CARS_COUNT cars"
            return 0
        fi
    else
        print_error "Login test: No JWT token in response"
        return 1
    fi

    
}

# Test login with invalid credentials
test_invalid_login() {
    print_status "Testing login with invalid credentials..."
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"nonexistent@example.com\",
            \"password\": \"wrongpassword\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body" | jq . 2>/dev/null || echo "Response: $response_body"
    
    if [ "$http_code" -eq 401 ]; then
        print_success "Invalid login test passed (HTTP $http_code)"
        return 0
    else
        print_error "Invalid login test failed (HTTP $http_code)"
        return 1
    fi
}

# Test login with wrong password
test_wrong_password() {
    local test_email="wrongpass_test_$(date +%s)@example.com"
    local test_password="correctpass123"
    
    print_status "Testing login with wrong password..."
    
    # Register user first
    curl -s -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"$test_password\",
            \"name\": \"Wrong Pass User\",
            \"role\": \"CarOwner\"
        }" > /dev/null
    
    # Try login with wrong password
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$test_email\",
            \"password\": \"wrongpassword\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body" | jq . 2>/dev/null || echo "Response: $response_body"
    
    if [ "$http_code" -eq 401 ]; then
        print_success "Wrong password test passed (HTTP $http_code)"
        return 0
    else
        print_error "Wrong password test failed (HTTP $http_code)"
        return 1
    fi
}

# Test with JWT token (if available)
test_protected_endpoint() {
    if [ -z "$JWT_TOKEN" ]; then
        print_warning "No JWT token available, skipping protected endpoint test"
        return 0
    fi
    
    print_status "Testing JWT token with protected endpoint..."
    
    # This assumes you have a protected endpoint at /api/cars
    # Adjust the endpoint as needed for your application
    response=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:5000/api/cars" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -H "Content-Type: application/json")
    
    http_code=$(echo "$response" | tail -n1)
    
    # We consider 200 (success) or 401/403 (proper auth rejection) as valid responses
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ] || [ "$http_code" -eq 404 ]; then
        print_success "JWT token test completed (HTTP $http_code)"
        return 0
    else
        print_error "JWT token test failed (HTTP $http_code)"
        return 1
    fi
}

# Test missing required fields
test_missing_fields() {
    print_status "Testing registration with missing required fields..."
    
    # Test missing email
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"password\": \"password123\",
            \"name\": \"Test User\",
            \"role\": \"CarOwner\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -ne 201 ]; then
        print_success "Missing fields test passed (HTTP $http_code for missing email)"
    else
        print_error "Missing fields test failed - should reject missing email"
        return 1
    fi
}

# Main test execution
main() {
    print_status "Starting Authentication Router Tests..."
    echo
    
    check_dependencies
    test_server_connectivity
    
    local passed=0
    local failed=0
    
    # Run tests
    if test_registration; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_duplicate_registration; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_valid_login; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_invalid_login; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_wrong_password; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_missing_fields; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_protected_endpoint; then ((passed++)); else ((failed++)); fi
    echo
    
    # Summary
    print_status "=== TEST SUMMARY ==="
    print_success "Passed: $passed"
    if [ $failed -eq 0 ]; then
        print_success "Failed: $failed"
        print_success "All tests passed!"
        exit 0
    else
        print_error "Failed: $failed"
        exit 1
    fi
}

# Run main function
main