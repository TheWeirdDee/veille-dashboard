import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => config,
  // lib/backtest.ts reads data/backtest/*.json with fs at runtime; make sure
  // the files are traced into the serverless bundle on Vercel.
  outputFileTracingIncludes: {
    "/replay": ["data/backtest/**/*"],
    "/verify": ["data/backtest/**/*"],
  },
};

export default nextConfig;
