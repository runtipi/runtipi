import { oidc } from '@/lib/oidc/provider';
import { getUserFromCookie } from '@/server/common/session.helpers';

export async function GET(req: Request, res: Response) {
  const user = await getUserFromCookie();

  const res = await oidc.interactionResult(req, res, {
    login: { account: user?.id },
  });

  console.log(res);

  return new Response('OK', { status: 200 });
}
