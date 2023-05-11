import mysql from 'mysql2';
import * as dotenv from 'dotenv';
dotenv.config();

// Create connection to mysql database and import where its needed

let pool = mysql.createPool(process.env.CONNECTION_STRING);

pool.getConnection((err,connection)=> {
    if(err)
    throw err;
    console.log('Database connected successfully');
    connection.release();
});



export default pool;