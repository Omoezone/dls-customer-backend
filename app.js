import express from "express";
import userRouter from "./routers/user-router.js";
import accountRouter from "./routers/account-router.js";
import transactionRouter from "./routers/transaction-router.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

const app = express();
app.use(express.json());

// Routes
app.use(userRouter);
app.use(accountRouter);
app.use(transactionRouter);

// Swagger Options, used for documentation and UI
const options = {
    definition: {
        openapi: "3.0.0",
        info: {	
            title: "Customer API",
            version: "1.0.0",
            description: "A simple Express Library API for customers",
        },
        servers: [
            {
                url: "SWAGGER_URL",
            },
        ],
    },
    apis: ["./routers/*.js"],
};

const specs = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

const PORT = process.env.PORT ||  5050;
app.listen(PORT, () => console.log("Server running on:", PORT));