import app from './app';
import { apiLogPath } from './config/logger';

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
  console.log(`API logs writing to ${apiLogPath}`);
});
