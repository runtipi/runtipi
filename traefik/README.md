mkcert -install

mkcert -cert-file ./local-cert.pem -key-file ./local-key.pem "docker.localhost" "*.docker.localhost" "tipi.local" "*.tipi.local"