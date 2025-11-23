import { Jimp } from 'jimp';
import path from 'path';

const outputPath = 'client/public/terrain/RiverEdge.png';

async function generatePlaceholder() {
    try {
        // Create a 90x30 image with transparent background
        const image = new Jimp({ width: 90, height: 30, color: 0x00000000 });

        // Fill with blue color, leaving a small transparent margin if desired, 
        // or just fill the whole thing. Let's fill the central part to simulate a river.
        // River color: #2563eb (approx R:37, G:99, B:235)
        const riverColor = 0x2563ebff;

        // Draw a rounded rectangle-ish shape manually or just a rect for now.
        // Let's just do a filled rectangle for the placeholder.
        // x: 0, y: 5, w: 90, h: 20 (leaving 5px padding on top/bottom for "banks" if needed later)

        image.scan(0, 5, 90, 20, function (x, y, idx) {
            this.bitmap.data[idx + 0] = 37;  // R
            this.bitmap.data[idx + 1] = 99;  // G
            this.bitmap.data[idx + 2] = 235; // B
            this.bitmap.data[idx + 3] = 255; // Alpha
        });

        await image.write(outputPath);
        console.log(`Generated placeholder river asset at ${outputPath}`);
    } catch (err) {
        console.error('Error generating placeholder:', err);
    }
}

generatePlaceholder();
