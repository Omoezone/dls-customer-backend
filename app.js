import express from "express";
import userRouter from "./routers/user-router.js";
import {getCustomers, getSingleCustomer, getDeletedCustomers, updateCustomer, deleteCustomer, createCustomer} from "./routers/user-router.js";
import accountRouter from "./routers/account-router.js";
import transactionRouter from "./routers/transaction-router.js";
import { ServiceBusClient } from "@azure/service-bus";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";
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

async function recieveFromQueue() {
    const connectionString = process.env.AZURE_SERVICE_BUS;
    const requestQueueName = 'customercm';
    const responseQueueName = 'responsecm';

    const serviceBusClient = new ServiceBusClient(connectionString);
    const requestReceiver = serviceBusClient.createReceiver(requestQueueName);

    while (true) {
        const messages = await requestReceiver.receiveMessages(1);
        let responseMessageBody = "Hello World";
        if (messages.length > 0) {
            const requestMessage = messages[0];
            if(requestMessage.applicationProperties.bodyType === "readAll") {
                console.log("TYPEOF : read-all")
                responseMessageBody = await getCustomers() || "Error with request for customers";
            }else if(requestMessage.applicationProperties.bodyType === "readSingle") {
                console.log("TYPEOF : read-single")
                responseMessageBody = await getSingleCustomer(requestMessage.body.id) || "Error with request for single customer";
            }else if(requestMessage.applicationProperties.bodyType === "readDeleted") {
                console.log("TYPEOF : read-deleted")
                responseMessageBody = await getDeletedCustomers() || "Error with request for deleted customers";
            }else if(requestMessage.applicationProperties.bodyType === "update") {
                console.log("TYPEOF : update")
                responseMessageBody = await updateCustomer(requestMessage.body) || "Error with request for updating customer";
            }else if(requestMessage.applicationProperties.bodyType === "delete") {
                console.log("TYPEOF : delete")
                responseMessageBody = await deleteCustomer(requestMessage.body.id) || "Error with request for deleting customer";
            }else if(requestMessage.applicationProperties.bodyType === "create") {
                console.log("TYPEOF : create")
                responseMessageBody = await createCustomer(requestMessage.body) || "Error with request for creating customer";
            }
            
            console.log("Received ", requestMessage.applicationProperties.bodyType," request: ", requestMessage.body);

            // Process the request and prepare the response
            const responseMessage = {
                body: responseMessageBody,
                correlationId: requestMessage.correlationId,
            };

            // Send the response message to the replyTo address
            const responseSender = serviceBusClient.createSender(requestMessage.replyTo);
            await responseSender.sendMessages(responseMessage);

            // Complete the request message
            await requestReceiver.completeMessage(requestMessage);
        }
    }
}

recieveFromQueue();

// --- START SERVER ---
const PORT = process.env.PORT ||  5050;
app.listen(PORT, () => console.log("Server running on:", PORT));