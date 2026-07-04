import 'dotenv/config';
import { env } from './env.js';
import { createApp } from './app.js';
const app = createApp();
app.listen(env.PORT, () => {
    console.log(`InvoiceFlow API running on :${env.PORT}`);
});
