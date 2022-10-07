export default function getEnv(_: any, res: any) {
  const { INTERNAL_IP } = process.env;
  const { NGINX_PORT } = process.env;
  const { DOMAIN } = process.env;

  console.log('getenv.tsx: ', INTERNAL_IP, NGINX_PORT, DOMAIN);

  res.status(200).json({ ip: INTERNAL_IP, domain: DOMAIN, port: NGINX_PORT });
}
