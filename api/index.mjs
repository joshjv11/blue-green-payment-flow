import { createApp } from '../services/api/dist/app.js';

export const config = {
  maxDuration: 60,
};

let app;

export default function handler(req, res) {
  if (!app) app = createApp();
  return app(req, res);
}
