-- For all apps that have a domain or exposed field set merge those values into the config jsonb
UPDATE
    app
SET
    config = jsonb_set(config, '{domain}', to_jsonb (DOMAIN))
WHERE
    DOMAIN IS NOT NULL;

UPDATE
    app
SET
    config = jsonb_set(config, '{exposed}', to_jsonb (exposed))
WHERE
    exposed IS NOT NULL;
