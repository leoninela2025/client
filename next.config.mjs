/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "encrypted-tbn0.gstatic.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "encrypted-tbn1.gstatic.com",
                pathname: "/**",
            },
        ],
    }
};

export default nextConfig;
