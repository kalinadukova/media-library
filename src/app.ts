import morgan from "morgan";
import express from "express";
import userRouter from "./routes/userRoutes";
import assetRouter from "./routes/assetRoutes";

import {errorMiddleware} from "./middleware/error";

const app = express();

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/v1/users", userRouter);
app.use("/api/v1/assets", assetRouter);

app.use(errorMiddleware);

app.listen(8080, () => {
    console.log(`Server running on http://localhost:8080`);
});