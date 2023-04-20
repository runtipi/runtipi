import webpush from 'web-push';

/**
 * Generate VAPID keys
 */
export const generateVapidKeys = () => {
  const vapidKeys = webpush.generateVAPIDKeys();
  return {
    publicKey: vapidKeys.publicKey,
    privateKey: vapidKeys.privateKey,
  };
};
