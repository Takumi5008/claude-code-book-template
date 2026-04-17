import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import shiftsRouter from './routes/shifts.js';
import deadlinesRouter from './routes/deadlines.js';
import pushRouter from './routes/push.js';
import { startScheduler } from './push/scheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'shift-app-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));

app.use('/api/auth', authRouter);
app.use('/api/shifts', shiftsRouter);
app.use('/api/deadlines', deadlinesRouter);
app.use('/api/push', pushRouter);

// フロントエンドの静的ファイルを配信
const distPath = join(__dirname, '../client/dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startScheduler();
});
