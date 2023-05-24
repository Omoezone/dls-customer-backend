import express from "express";
import bcrypt from "bcrypt";
import conn from "./startConnection.js";
import jwt from "jsonwebtoken";
import logger from '../utils/logger.js';

const router = express.Router();
router.use(express.json());

// Login router
router.post("/auth/login", async (req, res) => {
    logger.info("Login request received");
    logger.verbose(req.body);
    conn.getConnection(function (err, connection) {
        if (err) {
            logger.error("Error connecting to the database: ", err);
            throw err;
        }
        const select_customer = 'SELECT * FROM customers c JOIN customers_data cd ON c.id = cd.customer_id WHERE (cd.customer_id, cd.snap_timestamp) IN (SELECT admin_id, MAX(snap_timestamp) FROM customers_data GROUP BY customer_id) AND c.deleted=false AND cd.email=?;';
        connection.query(select_customer, [req.body.email], function (err, result) {
            if (err) {
                logger.error("Error executing the query: ", err);
                connection.release();
                throw err;
            }
            if (result.length === 0) {
                res.status(404).send("customer not found");
                connection.release();
            } else {
                logger.verbose('customer with name: ' + req.body.first_name + ' selected!\n ', result)
                bcrypt.compare(req.body.password, result[0].pass, function (err, result1) {
                    if (err) {
                        logger.error(err);
                        connection.release();
                        throw err;
                    }
                    if (result1 === true) {
                        const token = generateAccessToken(result[0].first_name);
                        res.status(200).send(
                            {
                                "customer_id": result[0].customer_id,
                                "first_name": result[0].first_name,
                                "last_name": result[0].last_name,
                                "age": result[0].age,
                                "email": result[0].email,
                                "jwttoken": token
                            });
                        connection.release();
                    } else {
                        res.status(401).send("Wrong credentials");
                        connection.release();
                    }
                });
            }
        });
    });
});

// Authentication router

export async function generateAccessToken(user) {
    return jwt.sign(user, process.env.JWT_TOKEN, { expiresIn: '1h' });
}

export async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_TOKEN, (err, user) => {
        if (err) return res.sendStatus(403);

        req.user = user;
        next();
    });
}

export default router;