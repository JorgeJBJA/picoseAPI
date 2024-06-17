import { getEmpresaByRuc, updateClaveFirma, updateEmail } from "../core/empresa/empresa.model.js"
import { testEmail } from "../core/empresa/empresa.util.js"
import SRISigner from "../utils/SRISigner.js"

export async function validarClaveFirma(req, res) {
    try {
        const { database, ruc, clave_firma } = req.body
        const empresa = await getEmpresaByRuc(database, ruc)
        const signer = new SRISigner(empresa.firma, clave_firma)

        await updateClaveFirma(
            database,
            empresa.ruc,
            clave_firma,
            signer.notBefore,
            signer.notAfter
        )

        res.json({ mensaje: 'Clave correcta' })
    } catch (error) {
        saveLog('error', 'validarClaveFirma', error)
        res.status(400).json({ mensaje: error.message })
    }
}

export async function validarClaveEmail(req, res) {
    try {
        const { database, ruc, email, clave_email } = req.body
        await testEmail(email, clave_email)
        await updateEmail(database, ruc, email, clave_email)
        res.json({ mensaje: 'Credenciales correctas' })
    } catch (error) {
        if (error.message.includes('Username and Password not accepted')) {
            res.status(400).json({ mensaje: 'Usuario o clave incorrectos' })
        } else {
            saveLog('error', 'validarClaveEmail', error)
            res.status(400).json({ mensaje: error.message })
        }
    }
}