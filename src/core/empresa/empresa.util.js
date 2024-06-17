import { sendMail } from "../../utils/social.Email.js"

export async function testEmail(email, clave_email) {
    const asunto = 'Prueba sistema'
    const mensaje = 'Este es un mensaje de prueba para verificar ' +
        'el acceso correcto del sistema de facturación al correo electrónico'
    await sendMail(email, clave_email, email, asunto, mensaje)
}