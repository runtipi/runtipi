/**
 * This file is the entry point for the mock service worker.
 */
async function initMocks() {
  if (typeof window === 'undefined') {
    const { server } = await import('./server');
    server.listen();
  } else {
    const { worker } = await import('./browser');
    await worker.start();
  }
}

void initMocks();

export { initMocks };
