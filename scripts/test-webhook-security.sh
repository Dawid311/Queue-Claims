#!/bin/bash

# Webhook Security Test Script
# Testet die verschiedenen Webhook-Authentifizierungsmethoden

API_URL="https://queue-claims-production.up.railway.app"
WEBHOOK_SECRET="your-webhook-secret-here"  # Ersetze mit deinem echten Secret

echo "🔐 Webhook Security Test"
echo "======================="
echo "Server: $API_URL"
echo ""

# Funktion für farbige Ausgabe
print_status() {
    if [ $1 -eq 0 ]; then
        echo "✅ $2"
    else
        echo "❌ $2"
    fi
}

# Funktion für API Calls mit verschiedenen Auth-Methoden
test_webhook_auth() {
    local method=$1
    local header=$2
    local description=$3
    local expected_status=$4
    
    echo "🔄 $description"
    
    response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/claims" \
        -H "Content-Type: application/json" \
        $header \
        -d '{"amount": 10, "wallet": "0x1111111111111111111111111111111111111111"}')
    
    http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        print_status 0 "$description (Status: $http_code) ✓"
    else
        print_status 1 "$description (Status: $http_code, erwartet: $expected_status)"
    fi
    
    echo "   Response: $body"
    echo ""
}

# 1. Security Status prüfen
echo "1️⃣ SECURITY STATUS"
echo "=================="
curl -s "$API_URL/api/claims/security" | jq . 2>/dev/null || echo "$(curl -s "$API_URL/api/claims/security")"
echo ""

# 2. Test ohne Webhook Secret (sollte 401 geben wenn Security aktiviert)
echo "2️⃣ TESTS OHNE SECRET"
echo "==================="
test_webhook_auth "POST" "" "Request ohne Secret" 401

# 3. Test mit verschiedenen Header-Methoden
echo "3️⃣ TESTS MIT GÜLTIGEM SECRET"
echo "=========================="

test_webhook_auth "POST" "-H \"X-Webhook-Secret: $WEBHOOK_SECRET\"" "X-Webhook-Secret Header" 201
test_webhook_auth "POST" "-H \"Authorization: Bearer $WEBHOOK_SECRET\"" "Authorization Bearer Header" 201
test_webhook_auth "POST" "-H \"X-API-Key: $WEBHOOK_SECRET\"" "X-API-Key Header" 201

# 4. Test mit ungültigem Secret
echo "4️⃣ TESTS MIT UNGÜLTIGEM SECRET"
echo "============================"

test_webhook_auth "POST" "-H \"X-Webhook-Secret: wrong-secret\"" "Ungültiges Secret" 401
test_webhook_auth "POST" "-H \"Authorization: Bearer wrong-secret\"" "Ungültiges Bearer Token" 401

# 5. Test mit Query Parameter (falls kein Header möglich)
echo "5️⃣ ALTERNATIVE METHODEN"
echo "====================="

echo "🔄 Query Parameter Test"
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$API_URL/api/claims?webhook_secret=$WEBHOOK_SECRET" \
    -H "Content-Type: application/json" \
    -d '{"amount": 15, "wallet": "0x2222222222222222222222222222222222222222"}')

http_code=$(echo "$response" | tail -n1 | cut -d: -f2)
body=$(echo "$response" | head -n -1)

if [ "$http_code" -eq 201 ]; then
    print_status 0 "Query Parameter Test (Status: $http_code) ✓"
else
    print_status 1 "Query Parameter Test (Status: $http_code)"
fi
echo "   Response: $body"
echo ""

echo "6️⃣ FINALE STATISTIKEN"
echo "===================="
curl -s "$API_URL/api/claims/stats" | jq . 2>/dev/null || echo "$(curl -s "$API_URL/api/claims/stats")"
echo ""

echo "🎉 Webhook Security Test abgeschlossen!"
echo ""
echo "💡 Verwendung in der Praxis:"
echo "   curl -X POST $API_URL/api/claims \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -H \"X-Webhook-Secret: $WEBHOOK_SECRET\" \\"
echo "     -d '{\"amount\": 100, \"wallet\": \"0x...\"}'"
echo ""
echo "🔐 Unterstützte Auth-Methoden:"
echo "   - X-Webhook-Secret: your-secret"
echo "   - Authorization: Bearer your-secret"
echo "   - X-API-Key: your-secret"
echo "   - Query: ?webhook_secret=your-secret"
