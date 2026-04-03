import 'dotenv/config';
import { buildServer } from './server.js';
async function start() {
    const app = await buildServer();
    const port = Number(process.env.PORT ?? 3001);
    await app.listen({ port, host: '0.0.0.0' });
}
start().catch((err) => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map