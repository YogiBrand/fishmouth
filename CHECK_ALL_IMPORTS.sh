#!/bin/bash
echo "=== CHECKING ALL IMPORTS AND SYNTAX ==="
echo ""

# Check frontend
echo "📱 FRONTEND CHECKS:"
cd frontend/src/pages
for file in *.jsx; do
  if [ -f "$file" ]; then
    # Check for export default
    if grep -q "export default" "$file"; then
      echo "✅ $file has valid export"
    else
      echo "❌ $file missing export"
    fi
  fi
done

cd ../../..

# Check backend
echo ""
echo "🔧 BACKEND CHECKS:"
cd backend
for file in main.py models.py auth.py database.py; do
  if [ -f "$file" ]; then
    python3 -m py_compile "$file" 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "✅ $file compiles successfully"
    else
      echo "❌ $file has syntax errors"
    fi
  fi
done

echo ""
echo "=== VERIFICATION COMPLETE ==="
