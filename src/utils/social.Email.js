import { SMTP_HOST } from './consts.js'
import nodemailer from 'nodemailer'
import 'dotenv/config'

export async function sendMail(usuario, clave, destinos, asunto, mensaje, docs) {
    const domain = usuario.match(/@([^.]+)\./)[1];
    const smtp = SMTP_HOST[domain]
    if (!smtp) throw new Error('Host de email no registrado en sistema')

    const destinosArray = Array.isArray(destinos) ?
        destinos :
        destinos.replace(/\s/g, '').replace(/[:;]/g, ',').split(',')

    const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: {
            user: usuario,
            pass: clave
        }
    })

    const mailOptions = {
        from: usuario,
        to: destinosArray,
        subject: asunto,
        text: mensaje,
        attachments: docs
    }
    
    await transporter.sendMail(mailOptions)
}