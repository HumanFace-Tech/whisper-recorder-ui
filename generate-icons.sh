#!/bin/bash

# Enhanced icon generation script with proper variables and transparency
# Generates all icons from SVG template with consistent quality

cd "$(dirname "$0")"

# Configuration
ASSETS_DIR="assets"
TEMPLATE_SVG="$ASSETS_DIR/icon-template.svg"
GREEN_COLOR="#28a745"  # Professional green color

# Create assets directory if it doesn't exist
mkdir -p "$ASSETS_DIR"

# Check if icon template exists
if [ ! -f "$TEMPLATE_SVG" ]; then
    echo "❌ Error: $TEMPLATE_SVG not found!"
    echo "Please ensure you have the icon template in the assets directory."
    exit 1
fi

echo "🎨 Generating icons from $TEMPLATE_SVG..."

# Function to generate PNG with proper scaling (not cropping!)
generate_png() {
    local size=$1
    local filename=$2
    local output="$ASSETS_DIR/$filename"
    local success=false
    
    echo "  → Generating $filename (${size}x${size})..."
    
    # Try ImageMagick first - FORCE RGBA with transparency
    if command -v convert >/dev/null 2>&1; then
        # Force RGBA format, transparent background, and proper centering
        if convert -density 300 -background "rgba(0,0,0,0)" "$TEMPLATE_SVG" -resize ${size}x${size} -gravity center -extent ${size}x${size} -define png:color-type=6 "$output" 2>/dev/null; then
            success=true
            echo "    ✅ Generated using ImageMagick"
        fi
    fi
    
    # Try Inkscape if ImageMagick failed
    if [ "$success" = false ] && command -v inkscape >/dev/null 2>&1; then
        if inkscape --export-type=png --export-filename="$output" --export-width=$size --export-height=$size --export-background-opacity=0 "$TEMPLATE_SVG" >/dev/null 2>&1; then
            success=true
            echo "    ✅ Generated using Inkscape"
        fi
    fi
    
    # Verify the file was actually created
    if [ "$success" = true ] && [ -f "$output" ]; then
        local info=$(file "$output" 2>/dev/null | grep -o '[0-9]* x [0-9]*')
        echo "    📏 Dimensions: $info"
        return 0
    else
        echo "    ❌ Failed to generate $filename"
        return 1
    fi
}

echo ""
echo "📱 Generating favicon sizes..."
generate_png 16 "favicon-16x16.png"
generate_png 32 "favicon-32x32.png"

echo ""
echo "🍎 Generating Apple touch icon..."
generate_png 180 "apple-touch-icon.png"

echo ""
echo "📱 Generating Android/PWA icons..."
generate_png 72 "android-chrome-72x72.png"
generate_png 96 "android-chrome-96x96.png"
generate_png 128 "android-chrome-128x128.png"
generate_png 144 "android-chrome-144x144.png"
generate_png 152 "android-chrome-152x152.png"
generate_png 192 "android-chrome-192x192.png"
generate_png 384 "android-chrome-384x384.png"
generate_png 512 "android-chrome-512x512.png"

# Generate ICO file if possible
echo ""
echo "🖼️  Generating favicon.ico..."
if command -v convert >/dev/null 2>&1; then
    # Create temp files with proper naming
    temp_16="$ASSETS_DIR/temp-ico-16.png"
    temp_32="$ASSETS_DIR/temp-ico-32.png"
    temp_48="$ASSETS_DIR/temp-ico-48.png"
    ico_output="$ASSETS_DIR/favicon.ico"
    
    # Generate temp PNGs for ICO with RGBA
    convert -density 300 -background "rgba(0,0,0,0)" "$TEMPLATE_SVG" -resize 16x16 -gravity center -extent 16x16 -define png:color-type=6 "$temp_16" 2>/dev/null
    convert -density 300 -background "rgba(0,0,0,0)" "$TEMPLATE_SVG" -resize 32x32 -gravity center -extent 32x32 -define png:color-type=6 "$temp_32" 2>/dev/null
    convert -density 300 -background "rgba(0,0,0,0)" "$TEMPLATE_SVG" -resize 48x48 -gravity center -extent 48x48 -define png:color-type=6 "$temp_48" 2>/dev/null
    
    # Combine into ICO file
    if convert "$temp_16" "$temp_32" "$temp_48" "$ico_output" 2>/dev/null; then
        echo "  ✅ Generated favicon.ico with sizes: 16x16, 32x32, 48x48"
        # Verify ICO file
        ico_info=$(file "$ico_output" 2>/dev/null)
        echo "  📏 ICO info: $ico_info"
    else
        echo "  ❌ Could not generate favicon.ico"
    fi
    
    # Clean up temp files
    rm -f "$temp_16" "$temp_32" "$temp_48"
fi

# Update preview file to show actual transparency
echo ""
echo "🔍 Creating transparency test preview..."
cat > "$ASSETS_DIR/preview-icon.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Icon Preview - Transparency Test</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            padding: 20px; 
            background: linear-gradient(45deg, #f0f0f0 25%, transparent 25%), 
                        linear-gradient(-45deg, #f0f0f0 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #f0f0f0 75%), 
                        linear-gradient(-45deg, transparent 75%, #f0f0f0 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        .test-container {
            background: white;
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .icon-test {
            text-align: center;
        }
        .icon-bg {
            padding: 10px;
            margin: 5px auto;
            border-radius: 8px;
            display: inline-block;
            border: 1px solid #ddd;
        }
        .bg-white { background: white; }
        .bg-black { background: #333; }
        .bg-red { background: #dc3545; }
        .bg-blue { background: #007bff; }
        .bg-transparent { 
            background: repeating-linear-gradient(
                45deg,
                #ccc 0px,
                #ccc 5px,
                transparent 5px,
                transparent 10px
            );
        }
        .icon { border: none; }
        h3 { color: #333; margin-top: 30px; }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
    </style>
</head>
<body>
    <div class="test-container">
        <h1>🎙️ Voice to Text Processor - Icon Transparency Test</h1>
        <p><strong>Test Results:</strong> If icons are properly transparent, they should blend seamlessly with colored backgrounds.</p>
        
        <h3>🔍 Favicon Test (32px)</h3>
        <div class="icon-grid">
            <div class="icon-test">
                <div class="icon-bg bg-white">
                    <img src="favicon-32x32.png" class="icon" width="32" height="32" alt="White">
                </div>
                <small>White</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-black">
                    <img src="favicon-32x32.png" class="icon" width="32" height="32" alt="Black">
                </div>
                <small>Black</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-red">
                    <img src="favicon-32x32.png" class="icon" width="32" height="32" alt="Red">
                </div>
                <small>Red</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-blue">
                    <img src="favicon-32x32.png" class="icon" width="32" height="32" alt="Blue">
                </div>
                <small>Blue</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-transparent">
                    <img src="favicon-32x32.png" class="icon" width="32" height="32" alt="Transparent">
                </div>
                <small>Checkerboard</small>
            </div>
        </div>
        
        <h3>🍎 Apple Touch Icon Test (64px)</h3>
        <div class="icon-grid">
            <div class="icon-test">
                <div class="icon-bg bg-white">
                    <img src="apple-touch-icon.png" class="icon" width="64" height="64" alt="Apple White">
                </div>
                <small>White</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-black">
                    <img src="apple-touch-icon.png" class="icon" width="64" height="64" alt="Apple Black">
                </div>
                <small>Black</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-red">
                    <img src="apple-touch-icon.png" class="icon" width="64" height="64" alt="Apple Red">
                </div>
                <small>Red</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-blue">
                    <img src="apple-touch-icon.png" class="icon" width="64" height="64" alt="Apple Blue">
                </div>
                <small>Blue</small>
            </div>
            <div class="icon-test">
                <div class="icon-bg bg-transparent">
                    <img src="apple-touch-icon.png" class="icon" width="64" height="64" alt="Apple Transparent">
                </div>
                <small>Checkerboard</small>
            </div>
        </div>
        
        <h3>📋 Generated Files</h3>
        <ul>
            <li><strong>Favicons:</strong> favicon-16x16.png, favicon-32x32.png, favicon.ico</li>
            <li><strong>Apple:</strong> apple-touch-icon.png (180x180)</li>
            <li><strong>Android/PWA:</strong> android-chrome-[size].png (72px to 512px)</li>
        </ul>
        
        <h3>✅ Quality Checklist</h3>
        <p class="success">✅ All icons should be perfectly square</p>
        <p class="success">✅ Green microphone should be clearly visible</p>
        <p class="success">✅ No white background or border around icons</p>
        <p class="success">✅ Icons blend with all background colors</p>
        
        <h3>📝 HTML Integration</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; border-left: 4px solid #28a745;">
&lt;!-- Favicon links for HTML &lt;head&gt; --&gt;
&lt;link rel="icon" type="image/png" sizes="32x32" href="assets/favicon-32x32.png"&gt;
&lt;link rel="icon" type="image/png" sizes="16x16" href="assets/favicon-16x16.png"&gt;
&lt;link rel="apple-touch-icon" sizes="180x180" href="assets/apple-touch-icon.png"&gt;
&lt;link rel="shortcut icon" href="assets/favicon.ico"&gt;</pre>
    </div>
</body>
</html>
EOF

echo ""
echo "🎉 Icon generation complete!"
echo ""
echo "📊 Summary:"
echo "  📁 Output directory: $ASSETS_DIR/"
echo "  🎨 Source template: $TEMPLATE_SVG"
echo "  🟢 Icon color: $GREEN_COLOR"
echo ""
echo "📋 Generated Files:"
find "$ASSETS_DIR" -name "*.png" -o -name "*.ico" 2>/dev/null | sort | while read file; do
    if [ -f "$file" ]; then
        size_info=$(file "$file" 2>/dev/null | grep -o '[0-9]* x [0-9]*' | head -1)
        filename=$(basename "$file")
        echo "  ✅ $filename ($size_info)"
    fi
done
echo ""
echo "🔍 Test transparency: Open $ASSETS_DIR/preview-icon.html in browser"
echo "📝 Next: Update your HTML <head> to use assets/ paths"
