import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './src/app.js';

export const config = {
  maxDuration: 60,
};

let app: ReturnType<typeof createApp> | undefined;

export default function handler(req: IncomingMessage, res: ServerResponse) {
  if (!app) app = createApp();
  return app(req, res);
}
