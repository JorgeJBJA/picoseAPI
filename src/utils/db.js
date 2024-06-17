import mysql from "mysql2"
import "dotenv/config"

export function generarDBName(database, nregistro) {
    const serial = '000' + nregistro
    return database + serial.slice(serial.length - 3, serial.length)
}

export function conn(database) {
    return mysql.createConnection({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        password: process.env.DB_PASSWORD,
        database: database || process.env.DB_DATABASE
    }).promise()
}
