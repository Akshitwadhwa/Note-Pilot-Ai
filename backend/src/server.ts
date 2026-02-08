import app from "./app";
import { env } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

app.use(errorMiddleware);

app.listen(env.port, () => {
  logger.info(`Server running on http://localhost:${env.port}`);
});
