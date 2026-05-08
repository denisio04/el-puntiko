import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

const createFavicon = async () => {
  // Minimal 16x16 ICO file with a simple "T" letter representation
  const icoHeader = Buffer.from([
    0, 0,          // Reserved
    1, 0,          // Type (1 = ICO)
    1, 0,          // Number of images
  ]);

  const iconDirEntry = Buffer.from([
    16,            // Width
    16,            // Height
    0,              // Color palette
    0,              // Reserved
    1, 0,          // Color planes
    32, 0,          // Bits per pixel
    0x68, 0x04, 0, 0,  // Image size (1128 bytes)
    0x16, 0, 0, 0,    // Offset to image data (22)
  ]);

  // Create a simple 16x16 black square with "T" pattern
  const bmpHeader = Buffer.from([
    40, 0, 0, 0,    // Header size
    16, 0, 0, 0,    // Width
    32, 0, 0, 0,    // Height (doubled for XOR+AND masks)
    1, 0,           // Planes
    32, 0,          // Bits per pixel
    0, 0, 0, 0,   // Compression
    0, 0, 0, 0,   // Image size
    0, 0, 0, 0,    // X pixels per meter
    0, 0, 0, 0,    // Y pixels per meter
    0, 0, 0, 0,    // Colors used
    0, 0, 0, 0,    // Important colors
  ]);

  // Create 16x16 pixel data (BGRA format) - black square with "T" in white
  const pixels = Buffer.alloc(16 * 16 * 4);
  
  // Draw a simple "T" shape in white on black
  const tShape = [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ];

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const offset = (y * 16 + x) * 4;
      const isWhite = tShape[15 - y][x] === 0;
      pixels[offset] = isWhite ? 255 : 0;      // B
      pixels[offset + 1] = isWhite ? 255 : 0; // G
      pixels[offset + 2] = isWhite ? 255 : 0; // R
      pixels[offset + 3] = 255;               // A
    }
  }

  // AND mask (16x16 bits = 32 bytes per row, 16 rows = 64 bytes total)
  const andMask = Buffer.alloc(16 * 4, 0);

  const ico = Buffer.concat([icoHeader, iconDirEntry, bmpHeader, pixels, andMask]);

  await writeFile(join(process.cwd(), 'public/favicon.ico'), ico);
  console.log('Favicon created successfully');
};

createFavicon().catch(console.error);