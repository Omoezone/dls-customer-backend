import express from "express";
import conn from "./startConnection.js";

const router = express.Router();
router.use(express.json());

// GET ALL ACCOUNTS
router.get("/accounts", async (req, res) => {
    try{
        const result = await getAccounts();
        console.log("the result recieved from getAccounts function", result);
        res.status(200).json(result);
    }catch(err){    
        console.log(err);
        res.status(500).json("Internal server error, or no accounts found");
    }
});

async function getAccounts() {
    try{
    const connection = await conn.getConnection();
    let [rows] = await connection.query('SELECT * FROM accounts a JOIN accounts_data ad ON a.id = ad.account_id;')
    connection.release();
    return rows;
    }
    catch(err){
        connection.release();
        throw err;
    }
}
// GET ALL ACCOUNTS FOR A CUSTOMER
router.get("/accounts/:customer_id", async (req, res) => { 
    try{
        const result = await getAccountsForCustomer(req.params.customer_id || req.body.customer_id);
        console.log("the result recieved from getAccountsForCustomer function", result);
        res.status(200).json(result);
    }catch(err){
        console.log(err);
        res.status(500).json("Internal server error, or non existing user");
    }
});

async function getAccountsForCustomer(id) {
    if (typeof id === "object") {
        id = id.id;
    }
    const connection = await conn.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM accounts a JOIN accounts_data ad ON a.id = ad.account_id WHERE a.deleted=false AND a.id=?;', [id]);
        console.log('Account with id: ' + id + ' selected!\n ', rows)
        connection.release();
        return rows;
    } catch (err) {
        connection.release();
        throw err;
    }
}

//GET A SPECIFIK ACCOUNT FOR A CUSTOMER BY ACCOUNT ID
// REQUIRED = account_id, customer_id
router.post("/account_id", async (req, res) => {
    try{
        const result = await getSingleAccount(req.body);
        console.log("the result recieved from getSingleAccount function", result);
        res.status(200).json(result);
    }catch(err){
        console.log(err);
        res.status(500).json("Internal server error, or non existing user");
    }
});

async function getSingleAccount(values) {
    const connection = await conn.getConnection();
    try {
        const [rows] = await connection.query('SELECT * FROM accounts a JOIN accounts_data ad on a.id = ad.account_id AND a.deleted=false AND a.id=? AND ad.customer_id=?;', [values.account_id, values.customer_id]);
        console.log('Account with id: ' + values.account_id + ' for customer with id: ', values.customer_id, 'selected!\n ', rows)
        connection.release();
        return rows;
    }
    catch (err) {
        connection.release();
        throw err;
    }
}

// CREATE A NEW ACCOUNT FOR A CUSTOMER
router.post("/account", async (req, res) => {
    try{
        const result = await createAccount(req.body.customer_id);
        console.log("the result recieved from createAccount function", result);
        res.status(200).json("-- Account has been created --");
    }catch(err){
        console.log(err);
        res.status(500).json("Internal server error, or non existing user");
    }
});

async function createAccount(id) {
    if (typeof id === "object") {
        id = id.id;
    }
    const connection = await conn.getConnection();
    try {
        const [rows] = await connection.query('INSERT INTO accounts () VALUES ();');
        let [rowsA] = await connection.query('SELECT LAST_INSERT_ID();');
        let lastInsertedId = rowsA[0]['LAST_INSERT_ID()'];

        await connection.query('INSERT INTO accounts_data (account_id, customer_id) VALUES (?,?);', [lastInsertedId, id]);
        connection.release();
        return rows;
    } catch (err) {
        connection.release();
        throw err;
    }
}
// UPDATE AN ACCOUNT FOR A CUSTOMER
// not sure if this should even be allowed to be changed/updated
router.post("/update_account", async (req, res) => {
    try{
        const result = await updateAccount(req.body);
        console.log("the result recieved from updateAccount function", result);
        res.status(200).json("-- Account has been updated --");
    }catch(err){
        console.log(err);
        res.status(500).json("Internal server error, or non existing user");
    }
});

async function updateAccount(values) {
    const connection = await conn.getConnection();
    try {
        const [rows] = await connection.query('INSERT INTO accounts_data (account_id, customer_id) VALUES (?,?);', [values.id, values.customer_id]);
        console.log('Account with id: ' + values.id + ' for customer with id: ', values.customer_id, 'selected!\n ', rows)
        connection.release();
        return rows;
    }
    catch (err) {
        connection.release();
        throw err;
    }
}

// DELETE AN ACCOUNT FOR A CUSTOMER
// again not sure if an account should be allowed to be deleted
router.post("/delete_account", async (req, res) => {
    conn.getConnection(function (err, connection) {
        if (err) {connection.release();throw err}
        const delete_account = 'UPDATE accounts SET deleted=true, deleted_at=current_timestamp() WHERE id=?;';
        connection.query(delete_account, [req.body.id], function (err, results, fields) {
            if (err) {connection.release();throw err}
            console.log('--- Account has been deleted! ---')
            });
        res.status(200).send("Account deleted")
        connection.release();
    });
});

async function deleteAccount(id) {
    if (typeof id === "object") {
        id = id.id;
    }
    const connection = await conn.getConnection();
    try {
        const [rows] = await connection.query('UPDATE accounts SET deleted=true, deleted_at=current_timestamp() WHERE id=?;', [id]);
        console.log('Account with id: ' + id + ' deleted!\n ', rows)
        connection.release();
        return rows;
    }
    catch (err) {
        connection.release();
        throw err;
    }
}

// SHOW BALANCE FOR AN ACCOUNT
router.get("/balance/:account_id", async (req, res) => {
    conn.getConnection(function (err, connection) {
        if (err) {connection.release();throw err}
        const select_balance = 'SELECT SUM(amount) AS balance FROM transactions_data WHERE sender_account_id=? or reciever_account_id=?;';
        connection.query(select_balance, [req.params.account_id, req.params.account_id], function (err, result) {
            if (err) {connection.release();throw err}
            if(result.length === 0) {
                res.status(404).send('account not found or it/they might be deleted');
                connection.release();
            }else{
                console.log('balance for account_id: ' + req.params.account_id + ': ', result);
                res.status(200).send(result);
                connection.release();
            }
        });
    });
});


export default router;