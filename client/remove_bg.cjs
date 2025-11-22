const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');

const directory = 'public/cities';

fs.readdir(directory, (err, files) => {
    if (err) {
        console.error('Could not list the directory.', err);
        process.exit(1);
    }

    files.forEach((file, index) => {
        if (path.extname(file) === '.png') {
            const filePath = path.join(directory, file);
            Jimp.read(filePath)
                .then(image => {
                    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
                        const r = this.bitmap.data[idx + 0];
                        const g = this.bitmap.data[idx + 1];
                        const b = this.bitmap.data[idx + 2];

                        // If white (or close to white)
                        if (r > 240 && g > 240 && b > 240) {
                            this.bitmap.data[idx + 3] = 0; // Set alpha to 0
                        }
                    });
                    return image.writeAsync(filePath);
                })
                .then(() => {
                    console.log(`Processed ${file}`);
                })
                .catch(err => {
                    console.error(`Error processing ${file}:`, err);
                });
        }
    });
});
