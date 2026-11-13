import { apiApp } from '../src/server/api.ts';
import { defconAntiDdosMiddleware } from '../src/server/defcon/guard.ts';

export default function handler(req: any, res: any) {
  return defconAntiDdosMiddleware(req, res, () => apiApp(req, res));
}
