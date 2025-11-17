#!/bin/bash

# Test Connection to Railway Backend
# Usage: bash test-connection.sh https://your-app.railway.app

if [ -z "$1" ]; then
  echo "❌ Please provide your Railway URL"
  echo "Usage: bash test-connection.sh https://your-app.railway.app"
  exit 1
fi

API_URL=$1

echo "🔍 Testing connection to: $API_URL"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "-------------------"
response=$(curl -s -w "\n%{http_code}" "$API_URL/health")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Health check passed"
  echo "Response: $body"
else
  echo "❌ Health check failed (HTTP $http_code)"
  echo "Response: $body"
fi
echo ""

# Test 2: Root endpoint
echo "Test 2: Root Endpoint"
echo "-------------------"
response=$(curl -s -w "\n%{http_code}" "$API_URL/")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Root endpoint passed"
  echo "Response: $body"
else
  echo "❌ Root endpoint failed (HTTP $http_code)"
  echo "Response: $body"
fi
echo ""

# Test 3: CORS preflight (OPTIONS request)
echo "Test 3: CORS Preflight"
echo "-------------------"
http_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X OPTIONS "$API_URL/api/auth/register" \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type")

if [ "$http_code" = "200" ] || [ "$http_code" = "204" ]; then
  echo "✅ CORS preflight passed (HTTP $http_code)"
else
  echo "⚠️  CORS preflight returned HTTP $http_code"
fi
echo ""

# Test 4: Try to register (should fail with validation, but proves connection works)
echo "Test 4: Registration Endpoint"
echo "-------------------"
response=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"","email":"","password":""}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo "✅ Registration endpoint accessible"
  echo "Response: $body"
else
  echo "❌ Registration endpoint failed (HTTP $http_code)"
  echo "Response: $body"
fi
echo ""

# Summary
echo "📋 Summary"
echo "=========="
echo "API URL: $API_URL"
echo ""
echo "Next steps:"
echo "1. Update your .env file with: VITE_API_URL=$API_URL"
echo "2. Rebuild your frontend: npm run build"
echo "3. Test registration from your app"
