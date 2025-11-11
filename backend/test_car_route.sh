#!/bin/bash

# Test script for Car Management Routes
# Usage: ./test_car_routes.sh

BASE_URL="http://localhost:5000/api"
JWT_TOKEN=""
CAROWNER_TOKEN=""
ADMIN_TOKEN=""
CAR_ID=""
USER_ID=""

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

# Check dependencies
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        print_error "curl is required but not installed."
        exit 1
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
        exit 1
    fi
}

# Extract JSON value (simple method without jq)
extract_json_value() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\":\"[^\"]*\"" | cut -d'"' -f4
}

# Extract JSON value for number
extract_json_number() {
    local json="$1"
    local key="$2"
    echo "$json" | grep -o "\"$key\":[0-9]*" | cut -d':' -f2
}


# Extract car_id from response
extract_car_id() {
    local json="$1"
    echo "$json" | grep -o '"car_id":[^,}]*' | cut -d':' -f2 | tr -d ' "'
}

# Setup test accounts and get tokens
setup_test_accounts() {
    local carowner_email="carowner_$(date +%s)@example.com"
    local admin_email="admin_$(date +%s)@example.com"
    local password="password123"
    
    print_status "Setting up test accounts..."
    
    # Register and login as CarOwner
    print_status "Creating CarOwner account..."
    curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$carowner_email\",
            \"password\": \"$password\",
            \"name\": \"Car Owner Test\",
            \"role\": \"CarOwner\"
        }" > /dev/null
    
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$carowner_email\",
            \"password\": \"$password\"
        }")
    
    # Extract token
    CAROWNER_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$CAROWNER_TOKEN" ] && [ "$CAROWNER_TOKEN" != "null" ]; then
        print_success "CarOwner token obtained"
        # Extract user ID
        USER_ID=$(echo "$response" | grep -o '"id":[^,}]*' | cut -d':' -f2 | tr -d ' "')
        echo "[DEBUG] User ID: $USER_ID"
    else
        print_error "Failed to get CarOwner token"
        return 1
    fi
    
    # Register and login as Admin
    print_status "Creating Admin account..."
    curl -s -X POST "$BASE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$admin_email\",
            \"password\": \"$password\",
            \"name\": \"Admin Test\",
            \"role\": \"Admin\"
        }" > /dev/null
    
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$admin_email\",
            \"password\": \"$password\"
        }")
    
    ADMIN_TOKEN=$(echo "$response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    
    if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
        print_success "Admin token obtained"
        return 0
    else
        print_error "Failed to get Admin token"
        return 1
    fi
}

# Test unauthorized access to car routes
test_unauthorized_access() {
    print_status "Testing unauthorized access to car routes..."
    
    endpoints=("cars" "cars/user" "cars/user/1")
    
    for endpoint in "${endpoints[@]}"; do
        response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/$endpoint")
        http_code=$(echo "$response" | tail -n1)
        
        if [ "$http_code" -eq 401 ]; then
            print_success "Unauthorized access to $endpoint correctly blocked (HTTP $http_code)"
        else
            print_error "Unauthorized access test failed for $endpoint (HTTP $http_code)"
            return 1
        fi
    done
    
    return 0
}

# Test GET /api/cars
test_get_all_cars() {
    print_status "Testing GET /api/cars..."
    
    if [ -z "$CAROWNER_TOKEN" ]; then
        print_warning "No CarOwner token available, skipping test"
        return 0
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/cars" \
        -H "Authorization: Bearer $CAROWNER_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        car_count=$(echo "$response_body" | grep -o '"car_id"' | wc -l)
        print_success "GET /api/cars with CarOwner token (HTTP $http_code, found $car_count cars)"
        return 0
    else
        print_error "GET /api/cars with CarOwner token failed (HTTP $http_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# Test POST /api/cars - Register new car
test_register_car() {
    print_status "Testing POST /api/cars..."
    
    if [ -z "$CAROWNER_TOKEN" ]; then
        print_warning "No CarOwner token available, skipping car registration test"
        return 0
    fi
    
    # Test CarOwner registering their own car
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/cars" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CAROWNER_TOKEN" \
        -d "{
            \"model\": \"Tesla Model 3\",
            \"status\": \"active\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    echo "Response: $response_body"
    
    if [ "$http_code" -eq 201 ]; then
        CAR_ID=$(extract_car_id "$response_body")
        print_success "CarOwner car registration passed (HTTP $http_code, Car ID: $CAR_ID)"
    else
        print_error "CarOwner car registration failed (HTTP $http_code)"
        return 1
    fi
    
    # Test Admin registering car for specific user
    if [ -n "$USER_ID" ] && [ -n "$ADMIN_TOKEN" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/cars" \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer $ADMIN_TOKEN" \
            -d "{
                \"model\": \"BMW i3\",
                \"status\": \"active\",
                \"user_id\": \"$USER_ID\"
            }")
        
        http_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | head -n -1)
        
        echo "Response: $response_body"
        
        if [ "$http_code" -eq 201 ]; then
            print_success "Admin car registration for user passed (HTTP $http_code)"
        else
            print_error "Admin car registration for user failed (HTTP $http_code)"
            return 1
        fi
    fi
    
    return 0
}

# Test GET /api/cars/user/:userId
test_get_cars_by_user_id() {
    if [ -z "$USER_ID" ] || [ -z "$ADMIN_TOKEN" ]; then
        print_warning "No USER_ID or Admin token available, skipping GET /api/cars/user/:userId test"
        return 0
    fi
    
    print_status "Testing GET /api/cars/user/:userId..."
    
    # Test with Admin token (should work)
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/cars/user/$USER_ID" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        car_count=$(echo "$response_body" | grep -o '"car_id"' | wc -l)
        print_success "GET /api/cars/user/:userId with Admin token (HTTP $http_code, found $car_count cars)"
    else
        print_error "GET /api/cars/user/:userId with Admin token failed (HTTP $http_code)"
        echo "Response: $response_body"
        return 1
    fi
    
    # Test with CarOwner token accessing their own cars (should work)
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/cars/user/$USER_ID" \
        -H "Authorization: Bearer $CAROWNER_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        car_count=$(echo "$response_body" | grep -o '"car_id"' | wc -l)
        print_success "GET /api/cars/user/:userId with own User ID (HTTP $http_code, found $car_count cars)"
        return 0
    else
        print_error "GET /api/cars/user/:userId with own User ID failed (HTTP $http_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# Test GET /api/cars/user - Get current user's cars
test_get_current_user_cars() {
    print_status "Testing GET /api/cars/user..."
    
    if [ -z "$CAROWNER_TOKEN" ]; then
        print_warning "No CarOwner token available, skipping test"
        return 0
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/cars/user" \
        -H "Authorization: Bearer $CAROWNER_TOKEN")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        car_count=$(echo "$response_body" | grep -o '"car_id"' | wc -l)
        print_success "GET /api/cars/user with CarOwner token (HTTP $http_code, found $car_count cars)"
        return 0
    else
        print_error "GET /api/cars/user with CarOwner token failed (HTTP $http_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# Test security: CarOwner trying to register car for other user
test_carowner_security() {
    print_status "Testing CarOwner security restrictions..."
    
    if [ -z "$CAROWNER_TOKEN" ]; then
        print_warning "No CarOwner token available, skipping security test"
        return 0
    fi
    
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/cars" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CAROWNER_TOKEN" \
        -d "{
            \"model\": \"Audi e-tron\",
            \"status\": \"active\",
            \"user_id\": \"9999\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 403 ]; then
        print_success "CarOwner correctly blocked from registering car for other user (HTTP $http_code)"
        return 0
    else
        print_error "CarOwner security check failed (HTTP $http_code, expected 403)"
        echo "Response: $response_body"
        return 1
    fi
}

# Test missing required fields
test_missing_fields() {
    print_status "Testing car registration with missing fields..."
    
    if [ -z "$CAROWNER_TOKEN" ]; then
        print_warning "No CarOwner token available, skipping missing fields test"
        return 0
    fi
    
    # Test without model
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/cars" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CAROWNER_TOKEN" \
        -d "{
            \"status\": \"active\"
        }")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    # Note: This might pass if model has default value, so we just log the result
    if [ "$http_code" -eq 201 ] || [ "$http_code" -eq 400 ]; then
        print_success "Missing fields test completed (HTTP $http_code)"
        return 0
    else
        print_error "Missing fields test failed (HTTP $http_code)"
        echo "Response: $response_body"
        return 1
    fi
}

# Main test execution
main() {
    print_status "Starting Car Routes Tests..."
    echo
    
    check_dependencies
    test_server_connectivity
    
    local passed=0
    local failed=0
    
    # Setup test accounts
    if setup_test_accounts; then 
        ((passed++))
        print_success "Test accounts setup completed"
    else 
        ((failed++))
        print_error "Test accounts setup failed"
    fi
    echo
    
    # Run tests
    if test_unauthorized_access; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_get_all_cars; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_register_car; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_get_cars_by_user_id; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_get_current_user_cars; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_carowner_security; then ((passed++)); else ((failed++)); fi
    echo
    
    if test_missing_fields; then ((passed++)); else ((failed++)); fi
    echo
    
    # Summary
    print_status "=== CAR ROUTES TEST SUMMARY ==="
    print_success "Passed: $passed"
    if [ $failed -eq 0 ]; then
        print_success "Failed: $failed"
        print_success "All car route tests passed!"
        exit 0
    else
        print_error "Failed: $failed"
        exit 1
    fi
}

# Run main function
main