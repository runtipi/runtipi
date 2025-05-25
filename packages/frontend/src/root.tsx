import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse, redirect } from 'react-router';
import type { Route } from './+types/root';
import { userContext } from './api-client';
import { client } from './api-client/client.gen';
import stylesheet from './app.css?url';
import { Providers } from './components/providers/providers';
import { TranslatableError } from './types/error.types';

client.interceptors.response.use(async (res) => {
  if (res.status >= 400) {
    const data = await res.json();
    const error = new TranslatableError(data.message);
    error.intlParams = data.intlParams ?? {};

    throw error;
  }

  return res;
});

client.setConfig({
  credentials: 'include',
});

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'apple-touch-icon', sizes: '180x180', href: '/icons/apple-touch-icon.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/icons/favicon-96x96.png' },
  { rel: 'icon', type: 'image/svg+xml', href: '/icons/favicon.svg' },
  { rel: 'shortcut icon', href: '/icons/favicon.ico' },
  { rel: 'manifest', href: '/icons/site.webmanifest' },
];

export async function clientLoader({ request }: Route.ActionArgs) {
  const user = await userContext();

  const url = new URL(request.url);
  if (url.pathname !== '/') {
    return user;
  }

  if (!user.data) {
    return redirect('/register');
  }

  if (user.data?.isLoggedIn) {
    return redirect('/dashboard');
  }

  return redirect('/login');
}

export function Layout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    window.addEventListener('vite:preloadError', () => {
      window.location.reload();
    });

    return () => {
      window.removeEventListener('vite:preloadError', () => {
        window.location.reload();
      });
    };
  });

  return (
    <html lang="en">
      <head>
        <title>Runtipi</title>
        <meta charSet="UTF-8" />
        <script src="/js/tabler.min.js" async />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Meta />
        <Links />
      </head>
      <body>
        <main id="root">
          {children}
          <ScrollRestoration />
          <Scripts />
        </main>
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <Providers>
      <Outlet />
      <Toaster />
    </Providers>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!';
  let details = 'An unexpected error occurred.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error';
    details = error.status === 404 ? 'The requested page could not be found.' : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
