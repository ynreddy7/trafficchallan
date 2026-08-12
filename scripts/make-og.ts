import sharp from 'sharp';

/**
 * OG card in the highway-signage identity: blue guide-sign board, inset white
 * keyline, wordmark with an amber underline accent, tagline, and an explicit
 * "independent guide" line (anti-impersonation).
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0A3D7C"/>
  <rect x="34" y="34" width="1132" height="562" rx="18" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-opacity="0.9"/>
  <g font-family="Segoe UI, Roboto, Arial, sans-serif" text-anchor="middle">
    <text x="600" y="300" font-size="102" font-weight="700" letter-spacing="-1" fill="#FFFFFF">TrafficChallan</text>
    <rect x="452" y="332" width="296" height="10" fill="#F2A900"/>
    <text x="600" y="410" font-size="36" font-weight="400" fill="#D4E1F4">Check, pay and dispute Indian traffic e-challans</text>
    <text x="600" y="462" font-size="36" font-weight="400" fill="#D4E1F4">— sourced, dated, state by state</text>
    <text x="600" y="540" font-size="26" font-weight="600" letter-spacing="1.6" fill="#A9C4E8">Independent guide · not a government site</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('og-default.png written');
