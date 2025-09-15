import dotenv from 'dotenv';
import { createApp } from './server';

dotenv.config();

const PORT = process.env.PORT || 3002;

const app = createApp();

app.listen(PORT, () => {
  console.log(`API server running on port ${PORT}`);
});