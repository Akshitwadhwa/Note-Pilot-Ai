import cors from "cors";
import express from "express";

import { notFoundMiddleware } from "./middleware/error.middleware";
import routes from "./routes";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", routes);
app.use(notFoundMiddleware);

export default app;
