import express from "express";
import userRouter from "./routers/user-router.js";
import accountRouter from "./routers/account-router.js";
import transactionRouter from "./routers/transaction-router.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import amqp from 'amqplib/callback_api.js';
import dotenv from "dotenv";

dotenv.config();

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
            description: "A simple Express Library API for customers, accounts and transactions.",
        },
        servers: [
            {
                url: process.env.SWAGGER_URL || "http://localhost:5050",
            },
        ],
    },
    apis: ["./routers/*.js"],
};

const specs = swaggerJsdoc(options);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

// RABBITMQ
amqp.connect(process.env.CLOUDAMQP_URL + "?heartbeat=60", (err, connection) => {
    let r = 0;
    if (err) {
        throw err;
    }
    connection.createChannel(function(error, channel) {
    if (error) {
        throw error;
    }
    let queue = 'customer_control_message';

    channel.assertQueue(queue, {
        durable: false
    });
    channel.prefetch(1);
    console.log(' [x] Awaiting RPC requests');
    channel.consume(queue, function reply(msg) {
        console.log(" [x] Received 1/2 %s", msg.content.toString());
        // DO DB STUFF
        if(msg.content.toString() === "read-all") {
            r = 10;
        }else{
            r = 11;
        }
        channel.sendToQueue(msg.properties.replyTo,Buffer.from(r.toString()), {
            correlationId: msg.properties.correlationId
        });
        console.log(" [x] Received 2/2 %s", msg.content.toString());
        channel.ack(msg);
    });
    });
});

const PORT = process.env.PORT ||  5050;
app.listen(PORT, () => console.log("Server running on:", PORT));