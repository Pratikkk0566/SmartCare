#!/bin/bash

# SmartCare PHR - iOS Setup Script
# This script prepares your iOS environment

echo "🏥 SmartCare PHR - iOS Setup"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Check if CocoaPods is installed
echo "📦 Checking for CocoaPods..."
if ! command -v pod &> /dev/null; then
    echo "⚠️  CocoaPods not found. Installing..."
    sudo gem install cocoapods
fi

echo "✅ CocoaPods found"
echo ""

# Install npm dependencies
echo "📦 Installing npm dependencies..."
npm install

echo ""
echo "🍎 Installing iOS dependencies (CocoaPods)..."
cd ios
pod install
cd ..

echo ""
echo "✅ iOS setup complete!"
echo ""
echo "📱 Next steps:"
echo "   1. Run: npm run ios"
echo "   2. Or open Xcode: open ios/Sus.xcworkspace"
echo ""
echo "📄 See IOS_COMPATIBILITY_REPORT.md for detailed information"
