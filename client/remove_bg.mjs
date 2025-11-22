import { Jimp } from 'jimp';
import fs from 'fs';
import path from 'path';

const directory = 'public/cities';

// If named import fails, try default
// import Jimp from 'jimp'; 

async function processImages() {
    try {
        const files = fs.readdirSync(directory);
        for (const file of files) {
            if (path.extname(file) === '.png') {
                const filePath = path.join(directory, file);
                console.log(`Processing ${file}...`);

                try {
                    const image = await Jimp.read(filePath);

                    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                        const r = this.bitmap.data[idx + 0];
                        const g = this.bitmap.data[idx + 1];
                        const b = this.bitmap.data[idx + 2];

                        // If white (or close to white)
                        if (r > 240 && g > 240 && b > 240) {
                            this.bitmap.data[idx + 3] = 0; // Set alpha to 0
                        }
                    });

                    await image.write(filePath);
                    console.log(`Processed ${file}`);
                } catch (err) {
                    console.error(`Error processing ${file}:`, err);
                }
            }
        }
    } catch (err) {
        console.error('Error reading directory:', err);
    }
}

processImages();
