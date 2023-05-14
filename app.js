import express from "express";
import userRouter from "./routers/user-router.js";
import {getCustomers, getSingleCustomer, getDeletedCustomers, updateCustomer, deleteCustomer, createCustomer} from "./routers/user-router.js";
import accountRouter from "./routers/account-router.js";
import transactionRouter from "./routers/transaction-router.js";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
import amqp from 'amqplib';
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// Routes
app.use(userRouter);
app.use(accountRouter);
app.use(transactionRouter);

// The function calls for the routes
//console.log("hello",await getCustomers());
//console.log("hello single:",await getSingleCustomer({id: 1}));
//console.log("hello deleted:",await getDeletedCustomers());
//console.log("hello update:",await updateCustomer({id: 1, firstname: "test", lastname:"lastname", age:80, email:"email@mail.dk", password:"HelloAdgangskode"}));
//console.log("hello delete:",await deleteCustomer({id: 1}));
//console.log("hello create:",await createCustomer({firstname: "NyCus", lastname:"nyCustomerLast", age:80, email:"email@mail", password:"HelloAdgangskode"}));

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
async function connectRabbit() {
    try {
    let connection = await amqp.connect(process.env.CLOUDAMQP_URL + "?heartbeat=60");
    let channel = await connection.createChannel();
    const queue = 'customer_control_message';

    channel.assertQueue(queue, {durable: false});
    channel.prefetch(1);
    console.log(' [x] Awaiting RPC requests');
    channel.consume(queue, function reply(msg) {
        console.log(" [x] Received 1/2 %s", msg.content.toString());

        // DO DB STUFF
        if(msg.content.toString() === "read-all") {
            console.log("Entered read-all")
            getCustomers().then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            });

        }else if(msg.content.toString() === "read-single") {
            console.log("Entered read-single")
            getSingleCustomer({id: 1}).then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            }
            );
        }else if(msg.content.toString() === "read-deleted") {
            console.log("Entered read-deleted")
            getDeletedCustomers().then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            });
        }else if(msg.content.toString() === "update") {
            console.log("Entered update");
            updateCustomer({id: 1, firstname: "test", lastname:"lastname", age:80, email:"@mail.dk", password:"HelloAdgangskode"}).then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            });
        }else if(msg.content.toString() === "delete") {
            console.log("Entered delete");
            deleteCustomer({id: 1}).then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            });
        }else if(msg.content.toString() === "create") {
            console.log("Entered create");
            createCustomer({firstname: "NyCus", lastname:"nyCustomerLast", age:80, email:"email@mail", password:"HelloAdgangskode"}).then((result) => {
                channel.sendToQueue(msg.properties.replyTo,Buffer.from(result.toString()), {
                    correlationId: msg.properties.correlationId
                });
                console.log(" [x] Received 2/2 %s", msg.content.toString());
                channel.ack(msg);
            });
        }
    });
    } catch (error) {
        console.log(error);
    }
};
connectRabbit();

// --- START SERVER ---
const PORT = process.env.PORT ||  5050;
app.listen(PORT, () => console.log("Server running on:", PORT));