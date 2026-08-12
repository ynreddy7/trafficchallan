import sharp from 'sharp';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0b57d0"/>
  <text x="600" y="290" font-family="Segoe UI, sans-serif" font-size="88" font-weight="700" fill="#fff" text-anchor="middle">TrafficChallan</text>
  <text x="600" y="380" font-family="Segoe UI, sans-serif" font-size="36" fill="#cfe0ff" text-anchor="middle">Check &amp; pay Indian traffic e-challans — verified, sourced, current</text>
</svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('og-default.png written');
