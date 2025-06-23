---
title: User Config Editor
---

# User Config Editor

The User Config Editor is a feature introduced in Runtipi 4.0.0 that provides a graphical interface for managing app-specific Docker Compose overrides and environment variables. It offers a user-friendly way to utilize the powerful [User Config Override System](user-config-override-system.md) without requiring direct access to the server's file system.

## Overview

The User Config Editor allows you to:

1. Enable or disable custom configurations for each app independently
2. Edit the `docker-compose.yml` file for an app to modify its services, networks, and volumes
3. Edit the `app.env` file to customize environment variables

## Accessing the Editor

To access the User Config Editor:

1. Navigate to "My Apps" in the main menu
2. Click on an app to open its detail page
3. Select the "User Config" tab

## Using the Editor

### Enable/Disable User Configuration

Each app has a toggle switch to enable or disable its user configuration:

- When **enabled**, your custom configuration will be applied when the app starts
- When **disabled**, the app will use only its default configuration, ignoring any custom files

This toggle makes it easy to test whether an app issue is related to your custom configuration without having to delete your configuration files.

### Editing Docker Compose Overrides

The "docker-compose.yml" tab allows you to create or modify Docker Compose overrides for the app:

```yaml
services:
  app-name:
    volumes:
      - /path/to/custom/data:/app/data
    environment:
      - CUSTOM_VARIABLE=custom_value
```

### Editing Environment Variables

The "app.env" tab allows you to define custom environment variables for the app:

```
CUSTOM_VARIABLE=custom_value
ANOTHER_VARIABLE=another_value
```

### Saving Changes

After making your changes, click the "Save" button to persist them. Note that you may need to restart the app for the changes to take effect.

## Understanding Docker Compose Overrides

When you create a Docker Compose override, it doesn't replace the app's original configuration but rather extends or modifies it. The system merges your configuration with the app's base configuration, with your settings taking precedence when there are conflicts.

For example, if the original app configuration has:

```yaml
services:
  myapp:
    image: example/myapp:latest
    volumes:
      - app_data:/data
```

And you add an override with:

```yaml
services:
  myapp:
    volumes:
      - /home/user/mydata:/data
```

The resulting configuration will use the same image but with your custom volume mount instead of the default one.

## Best Practices

1. **Make incremental changes**: Start with small modifications and test them before making more complex changes
2. **Back up your app data**: Always back up your app data before making significant configuration changes
3. **Check app documentation**: Some apps may have specific requirements or recommendations for customization
4. **Valid YAML syntax**: Ensure your Docker Compose file follows valid YAML syntax
5. **Disable when troubleshooting**: If an app stops working after customization, try disabling the user configuration to isolate the issue

## Advanced Use Cases

### Adding Custom Networks

```yaml
services:
  app-name:
    networks:
      - my-custom-network

networks:
  my-custom-network:
    external: true
```

### Exposing Additional Ports

```yaml
services:
  app-name:
    ports:
      - 8080:8080
```

### Setting Resource Limits

```yaml
services:
  app-name:
    deploy:
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
```

## Troubleshooting

If an app fails to start after editing its configuration:

1. Check the app logs for error messages
2. Verify that your YAML syntax is correct
3. Try disabling the user configuration to see if the app starts with its default configuration
4. Look for common issues like invalid volume paths or port conflicts

Remember that the User Config Editor is an advanced feature intended for users who are comfortable with Docker Compose and environment variables. Incorrect configurations can cause apps to fail or behave unexpectedly.
