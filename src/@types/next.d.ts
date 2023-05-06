/* eslint-disable @typescript-eslint/no-explicit-any */
import { IncomingMessage } from 'http';
import { Session } from 'express-session';
import { GetServerSidePropsContext, GetServerSidePropsResult, PreviewData } from 'next';
import { ParsedUrlQuery } from 'querystring';
import { Locale } from '@/shared/internationalization/locales';

type SessionContent = {
  userId?: number;
  locale?: Locale;
};

declare module 'express-session' {
  export type SessionData = SessionContent;
}

interface ExtendedGetServerSidePropsContext<Params, Preview> extends GetServerSidePropsContext<Params, Preview> {
  req: IncomingMessage & { session: Session & SessionContent };
}

declare module 'next' {
  export interface NextApiRequest extends IncomingMessage {
    session: Session & SessionContent;
  }

  export type GetServerSideProps<Props extends { [key: string]: any } = { [key: string]: any }, Params extends ParsedUrlQuery = ParsedUrlQuery, Preview extends PreviewData = PreviewData> = (
    ctx: ExtendedGetServerSidePropsContext<Params, Preview>,
  ) => Promise<GetServerSidePropsResult<Props>>;
}
