import express from "express";
import conn from "./startConnection.js";

const router = express.Router();
router.use(express.json());

// GET ALL TRANSACTIONS FOR A SPECIFIC ACCOUNT

// CREATE A NEW TRANSACTION TODO: SØRG FOR AT ERRORS INDE I transaction bliver exit hvis fejl
router.post("/transaction", async (req, res) => {
    try{
        const result = await createTransaction(req.body);
        console.log("the result recieved from createTransaction function", result);
        res.status(200).send(result);
    }catch(err){
        console.log(err);
        res.status(500).send("Internal server error when creating transaction");
    }
});

async function createTransaction(values){
    const connection = await conn.getConnection();
    try{
        await connection.beginTransaction();
        console.log("entered transaction");
        const create_sender = 'INSERT INTO transactions_data (transaction_id, sender_account_id, reciever_account_id,amount) VALUES (?,?,?,?)';
        const create_reciever = 'INSERT INTO transactions_data (transaction_id, sender_account_id, reciever_account_id,amount) VALUES (?,?,?,?)';
        // ----- Create transaction for sender -----
        const sender = await connection.query('INSERT INTO transactions () VALUES ()');
        const senderData = await connection.query(create_sender, [sender[0].insertId, values.sender_account_id, values.reciever_account_id, values.amount]);
        console.log(senderData)
        // ----- Create transaction for reciever -----
        const reciever = await connection.query('INSERT INTO transactions () VALUES ()');
        const recieverData = await connection.query(create_reciever, [reciever[0].insertId, values.reciever_account_id, values.sender_account_id, -(values.amount)]);
        console.log(recieverData)
        // ----- Commit changes -----
        await connection.commit();
        return "Transaction created";
    }catch(err){
        console.log("rolling back transactions")
        await connection.rollback();
        throw err;
    }finally{
        connection.release();
    }
}


router.get("/transaction/:account_id", async (req, res) => {
    try{
        // to work with swagger use req.params.account_id instead of req.body.accountId
        const result = await getTransactionsById(req.body.accountId);
        console.log("the result recieved from getTransactions function", result);
        res.status(200).send(result);
    }catch(err){
        console.log(err);
        res.status(500).send("Internal server error when getting transactions");
    }
});

async function getTransactionsById(id){
    const connection = await conn.getConnection();
    console.log(id)
    try{
        const [rows] = await connection.query(`SELECT * FROM transactions t JOIN transactions_data td ON t.id = td.transaction_id WHERE td.sender_account_id = ?;`, [id]);
        console.log('Selected ' + rows.length + ' row(s).');
        connection.release();
        return rows;
    }catch(err){
        connection.release();
        throw err;
    }
}

/**
 * Når man laver en transaction for en customer, bør følgende ske:
 * 1. 2 transactions laves, en for customer_sender og en for customer_reciever
 *  1.1. Dette skal gøres med transaction eller andet således at hvis den ene fejler, fejler den anden også
 * 2. Hvis customer_sender ikke har nok penge på sin konto, skal transactionen ikke gennemføres, dette bør tjekkes før ovenstående bliver igangsat.
 *  2.1. Her skal der tænkes over hvorvidt vi faktisk skal tilføje balance til account objekter eller hvordan vi vil gøre dette 
*/

// GET ALL TRANSACTIONS
router.get("/transactions", async (req, res) => {
    try{
        const result = await getTransactions();
        console.log("the result recieved from getTransactions function", result);
        res.status(200).send(result);
    }catch(err){
        console.log(err);
        res.status(500).send("Internal server error when getting transactions");
    }
});

async function getTransactions(){
    const connection = await conn.getConnection();
    try{
        const [rows] = await connection.query(`SELECT * FROM transactions t JOIN transactions_data td ON t.id = td.transaction_id`);
        console.log('Selected ' + rows.length + ' row(s).');
        connection.release();
        return rows;
    }catch(err){
        connection.release();
        throw err;
    }
}


export default router;