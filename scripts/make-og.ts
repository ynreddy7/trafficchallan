import sharp from 'sharp';

/**
 * OG card in the highway-signage identity: blue guide-sign board with the
 * Sign-Slip mark (guide-sign board whose bottom edge tears into a receipt
 * zigzag), the TrafficChallan.com wordmark (".com" at 70% white), tagline,
 * and an explicit "independent guide" line (anti-impersonation).
 *
 * The mark's geometry is the 32×32 favicon master (public/favicon.svg),
 * scaled up. The card ground is the same board blue as the mark, so the mark
 * carries a soft white outer keyline — the same treatment the in-page header
 * mark gets via CSS.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0A3D7C"/>
  <rect x="34" y="34" width="1132" height="562" rx="18" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-opacity="0.9"/>
  <g transform="translate(528 84) scale(4.5)">
    <path d="M6 0h20q6 0 6 6v22l-4 3-4-3-4 3-4-3-4 3-4-3-4 3-4-3V6q0-6 6-6Z" fill="#0A3D7C" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="0.75"/>
    <path d="M6.5 3h19Q29 3 29 6.5v20.75l-1 .75-4-3-4 3-4-3-4 3-4-3-4 3-1-.75V6.5Q3 3 6.5 3Z" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.9"/>
    <text x="16" y="19" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="16" font-weight="700" fill="#FFFFFF" text-anchor="middle">₹</text>
  </g>
  <g font-family="Segoe UI, Roboto, Arial, sans-serif" text-anchor="middle">
    <text x="600" y="336" font-size="96" font-weight="700" letter-spacing="-1" fill="#FFFFFF">TrafficChallan<tspan font-weight="400" fill-opacity="0.7">.com</tspan></text>
    <rect x="440" y="364" width="320" height="10" fill="#F2A900"/>
    <text x="600" y="436" font-size="36" font-weight="400" fill="#D4E1F4">Check, pay and dispute Indian traffic e-challans</text>
    <text x="600" y="486" font-size="36" font-weight="400" fill="#D4E1F4">— sourced, dated, state by state</text>
    <text x="600" y="560" font-size="26" font-weight="600" letter-spacing="1.6" fill="#A9C4E8">Independent guide · not a government site</text>
  </g>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/og-default.png');
console.log('og-default.png written');
