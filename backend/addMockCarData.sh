#!/bin/bash

# Base URL of your API
BASE_URL="http://localhost:5000/api/cars"  # Make sure this matches your backend port

# Function to make POST request
make_request() {
    local token=$1
    local data=$2
    local description=$3
    
    echo "Adding $description..."
    response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "$BASE_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $token" \
        -d "$data")
    
    local http_status=$(echo "$response" | grep -o 'HTTP_STATUS:[0-9]*' | cut -d: -f2)
    local body=$(echo "$response" | sed 's/HTTP_STATUS:[0-9]*$//')
    
    if [ "$http_status" = "201" ] || [ "$http_status" = "200" ]; then
        echo "✅ Success (HTTP $http_status): $body"
    else
        echo "❌ Failed to add $description (HTTP $http_status)"
        echo "Response: $body"
    fi
    echo
}

# Get token
echo "Enter your JWT token:"
read -r TOKEN

if [ -z "$TOKEN" ]; then
    echo "Error: No token provided"
    exit 1
fi

# Mock data for CarOwner
echo "=== Adding cars as CarOwner ==="

# Car 1 - Sedan
make_request "$TOKEN" '{
    "make": "Toyota",
    "model": "Camry",
    "year": 2023,
    "color": "Silver",
    "license_plate": "ABC123",
    "vin": "1HGCM82633A123456"
}' "Toyota Camry"

# Car 2 - SUV
make_request "$TOKEN" '{
    "make": "Honda", 
    "model": "CR-V",
    "year": 2022,
    "color": "Blue",
    "license_plate": "XYZ789",
    "vin": "5J6RW1H58LA123457"
}' "Honda CR-V"

# Car 3 - Electric
make_request "$TOKEN" '{
    "make": "Tesla",
    "model": "Model 3", 
    "year": 2024,
    "color": "Red",
    "license_plate": "EV2024",
    "vin": "5YJ3E1EA0PF123458"
}' "Tesla Model 3"

echo "=== Mock data insertion complete ==="