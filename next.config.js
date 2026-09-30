const isDev = process.env.NODE_ENV !== 'production';

// tesseract.js（浏览器端 OCR）默认从 jsdelivr 加载 worker / wasm，语言包来自 projectnaptha；
// KaTeX 样式与字体来自 jsdelivr。若改为自托管，可去掉对应域名。
const CDN = 'https://cdn.jsdelivr.net';
const TESSDATA = 'https://tessdata.projectnaptha.com';

const csp = [
  "default-src 'self'",
  // Next.js 需要内联脚本做 hydration；wasm-unsafe-eval 供 tesseract wasm，dev 模式额外需要 eval
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' ${CDN}${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src 'self' 'unsafe-inline' ${CDN}`,
  "img-src 'self' data: blob:",
  `font-src 'self' data: ${CDN}`,
  `connect-src 'self' ${CDN} ${TESSDATA} https://*.projectnaptha.com${isDev ? ' ws: wss:' : ''}`,
  `worker-src 'self' blob: ${CDN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  serverExternalPackages: ['better-sqlite3'],
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: csp },
      // 拍照上传需要摄像头；其余敏感能力一律关闭
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
    ];
    if (!isDev) {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }
    return [{ source: '/(.*)', headers }];
  },
};
module.exports = nextConfig;
