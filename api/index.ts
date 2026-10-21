import { apiApp } from '../src/server/api.ts';

export default function handler(req: any, res: any) {
  return apiApp(req, res);
}
