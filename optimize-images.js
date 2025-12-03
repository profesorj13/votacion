const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'public', 'images');
const outputDir = path.join(__dirname, 'public', 'images', 'optimized');

// Crear carpeta de salida si no existe
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const imagesToOptimize = ['beatobraseada.png', 'pizzachurri.png'];

async function optimizeImage(filename) {
    const inputPath = path.join(imagesDir, filename);
    const outputPath = path.join(outputDir, filename.replace('.png', '.webp'));
    const outputPathPng = path.join(outputDir, filename);
    
    const originalStats = fs.statSync(inputPath);
    const originalSize = (originalStats.size / 1024 / 1024).toFixed(2);
    
    console.log(`\n🍕 Procesando: ${filename}`);
    console.log(`   Tamaño original: ${originalSize} MB`);
    
    // Obtener metadata de la imagen
    const metadata = await sharp(inputPath).metadata();
    console.log(`   Dimensiones originales: ${metadata.width}x${metadata.height}`);
    
    // Calcular nuevo tamaño (max 1200px de ancho, manteniendo aspect ratio)
    const maxWidth = 1200;
    const newWidth = Math.min(metadata.width, maxWidth);
    
    // Versión WebP (mejor compresión, soporte moderno)
    await sharp(inputPath)
        .resize(newWidth)
        .webp({ quality: 85 })
        .toFile(outputPath);
    
    const webpStats = fs.statSync(outputPath);
    const webpSize = (webpStats.size / 1024).toFixed(0);
    console.log(`   ✅ WebP: ${webpSize} KB`);
    
    // Versión PNG optimizada (fallback para navegadores viejos)
    await sharp(inputPath)
        .resize(newWidth)
        .png({ quality: 85, compressionLevel: 9 })
        .toFile(outputPathPng);
    
    const pngStats = fs.statSync(outputPathPng);
    const pngSize = (pngStats.size / 1024).toFixed(0);
    console.log(`   ✅ PNG optimizado: ${pngSize} KB`);
    
    const reduction = ((1 - (webpStats.size / originalStats.size)) * 100).toFixed(1);
    console.log(`   📉 Reducción (WebP): ${reduction}%`);
}

async function main() {
    console.log('🚀 Iniciando optimización de imágenes...\n');
    console.log('=' .repeat(50));
    
    for (const filename of imagesToOptimize) {
        try {
            await optimizeImage(filename);
        } catch (error) {
            console.error(`❌ Error procesando ${filename}:`, error.message);
        }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('\n✨ ¡Listo! Las imágenes optimizadas están en:');
    console.log(`   ${outputDir}`);
    console.log('\n💡 Tip: Usá las versiones .webp para mejor rendimiento');
}

main();

