declare module 'next/server' {
  export interface NextRequest {
    headers: {
      get(name: string): string | null;
    };
    nextUrl: {
      pathname: string;
      searchParams: {
        entries(): IterableIterator<[string, string]>;
        get(name: string): string | null;
      };
    };
    url: string;
  }

  export class NextResponse {
    constructor(body?: BodyInit | null, init?: ResponseInit);
    static next(): NextResponse;
    static json(body: any, init?: ResponseInit): NextResponse;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse;
    static rewrite(destination: string | URL): NextResponse;
  }
}
