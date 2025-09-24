import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // ワークスペースルートの誤認識を防ぐ
    outputFileTracingRoot: path.join(process.cwd()),
  },
};

export default nextConfig;
