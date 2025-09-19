#!/bin/bash

# Download trusted CRS for production use
# Multiple sources for pot14 (2^14) CRS

set -e

echo "Downloading trusted CRS for production (pot14)..."

mkdir -p plonk

# Function to download and verify CRS
download_and_verify() {
    local url=$1
    local filename=$2
    local description=$3
    
    echo "Attempting to download from: $description"
    echo "URL: $url"
    
    if wget --quiet --show-progress -O "plonk/$filename" "$url"; then
        echo "Download successful! Verifying..."
        if npx snarkjs powersoftau verify plonk/$filename; then
            echo "✅ CRS verified successfully!"
            echo "✅ Using CRS from: $description"
            return 0
        else
            echo "❌ CRS verification failed for: $description"
            rm -f "plonk/$filename"
            return 1
        fi
    else
        echo "❌ Download failed for: $description"
        return 1
    fi
}

# Try multiple sources in order of preference
echo "Trying multiple trusted sources..."

# Source 1: PSE (Privacy & Scaling Explorations) - Most trusted
if download_and_verify \
    "https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_14.ptau" \
    "pot14_final.ptau" \
    "PSE Perpetual Powers of Tau"; then
    exit 0
fi

echo "❌ All download attempts failed!"
echo ""
echo "Alternative options:"
echo "1. Generate a new local CRS:"
echo "   npm run crs:custom"
echo ""
echo "2. Manual download:"
echo "   Visit: https://github.com/privacy-scaling-explorations/perpetualpowersoftau"
echo "   Download powersOfTau28_hez_final_14.ptau manually"
echo ""
echo "3. Use a larger CRS (pot28) if needed:"
echo "   wget -O plonk/pot28_final.ptau https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_27.ptau"

exit 1
