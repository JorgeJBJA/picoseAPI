import { getFechaAutComprobante, updateAutorizacion } from "../core/autorizacion/autorizacion.model.js"
import { getEmpresaByRuc, getEstablecimientoByNro } from "../core/empresa/empresa.model.js"
import { createAutorizacion, getAutorizacion, getInfoTributaria, sendComprobante } from "../core/autorizacion/autorizacion.util.js"
import { createRIDE } from "../utils/RIDE.js"
import { sleepUntilComprobanteDate } from "../utils/timer.js"
import { saveLog } from "../utils/saveLog.js"
import SRISigner from "../utils/SRISigner.js"
import { autorizarComprobante } from "../utils/webServiceSRI.js"
import { KEY_INFO_DOC } from "../utils/consts.js"

export async function autorizar(req, res) {
    try {
        res.json({ mensaje: 'recibido' })

        const { database, clave, comprobante, email } = req.body
        
        let empresa = await getEmpresaByRuc(database, clave.slice(10, 23))
        const infoTributaria = await getInfoTributaria(comprobante).catch(async err => {
            //Guarda el error si el xml esta mal formado y la excepcion salta
            //en sleepUntilComprobanteDate porque infoTributaria es undefined
            await updateAutorizacion(database, empresa.nregistro, clave, err.message, comprobante)
        })

        await sleepUntilComprobanteDate(infoTributaria.claveAcceso, 30)

        empresa = await getEmpresaByRuc(database, infoTributaria.ruc)
        const resAut = await getAutorizacion(empresa, comprobante)

        await updateAutorizacion(
            database,
            empresa.nregistro,
            infoTributaria.claveAcceso,
            resAut.autorizacion,
            comprobante,
            resAut.fechaAutorizacion
        )

        if (email && resAut.estado === 'AUTORIZADO') {
            const establecimiento = await getEstablecimientoByNro(database, empresa.nregistro, infoTributaria.estab)
            await sendComprobante(empresa, resAut, establecimiento, email)
        }
    } catch (error) {
        saveLog('error', 'autorizar', error)
    }
}

export async function reenvioEmail(req, res) {
    try {
        const { database, autorizacion, comprobante, email } = req.body
        const infoTributaria = await getInfoTributaria(comprobante)
        const empresa = await getEmpresaByRuc(database, infoTributaria.ruc)
        const establecimiento = await getEstablecimientoByNro(database, empresa.nregistro, infoTributaria.estab)
        const fecha_aut = await getFechaAutComprobante(database, empresa.nregistro, infoTributaria.claveAcceso)
        const signer = new SRISigner(empresa.firma, empresa.clave_firma)

        const resAut = createAutorizacion(
            infoTributaria.claveAcceso,
            autorizacion,
            fecha_aut,
            infoTributaria.ambiente,
            signer.signXML(comprobante)
        )

        await sendComprobante(empresa, resAut, establecimiento, email)
        res.json({mensaje: 'Correo enviado'})
    } catch (error) {
        saveLog('error', 'reenvioEmail', error)
        res.status(400).json({ error: error.message })
    }
}

export async function descargarAutorizacion(req, res) {
    try {
        const { clave } = req.body
        const resSRI = await autorizarComprobante(clave)

        if (!resSRI) {
            res.status(400).json({ mensaje: `No se encuentra el comprobante ${clave}` })
            return
        }

        if (resSRI.estado !== 'AUTORIZADO') {
            const mensajeSRI = resSRI.mensajes.mensaje
            res.status(400).json({ mensaje: `Comprobante ${clave} ${resSRI.estado} ${mensajeSRI.informacionAdicional || mensajeSRI.mensaje}` })
            return
        }

        res.json({
            clave,
            xml: resSRI.comprobante
        })
    } catch (error) {
        saveLog('error', 'descargarAutorizacion', error)
        res.status(400).json({ error: error.message })
    }
}

export async function getRIDE(req, res) {
    try {
        const { database, autorizacion, comprobante } = req.body
        const infoTributaria = await getInfoTributaria(comprobante)
        const tipoComprobante = KEY_INFO_DOC[infoTributaria.codDoc].typeDoc
        const empresa = await getEmpresaByRuc(database, infoTributaria.ruc)
        const establecimiento = await getEstablecimientoByNro(database, empresa.nregistro, infoTributaria.estab)
        const fecha_aut = await getFechaAutComprobante(database, empresa.nregistro, infoTributaria.claveAcceso)

        const resAut = createAutorizacion(
            infoTributaria.claveAcceso,
            autorizacion,
            fecha_aut,
            infoTributaria.ambiente,
            comprobante
        )

        const RIDE = await createRIDE(resAut, establecimiento.logotipo || empresa.logotipo)

        if (tipoComprobante === 'PROFORMA') {
            const signer = new SRISigner(empresa.firma, empresa.clave_firma)
            RIDE.pdfBuffer = await signer.signPDF(RIDE.pdfBuffer)
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${RIDE.claveAcceso}.pdf"`);
        res.send(RIDE.pdfBuffer)
    } catch (error) {
        saveLog('error', 'getRIDE', error)
        res.status(400).json({ error: error.message })
    }
}

export async function getFirmaXML(req, res) {
    try {
        const { database, comprobante } = req.body
        const infoTributaria = await getInfoTributaria(comprobante)
        const empresa = await getEmpresaByRuc(database, infoTributaria.ruc)
        const signer = new SRISigner(empresa.firma, empresa.clave_firma)
        const xmlSigned = signer.signXML(comprobante)

        res.setHeader('Content-Type', 'text/xml');
        res.send(xmlSigned)
    } catch (error) {
        saveLog('error', 'getFirmaXML', error)
        res.status(400).json({ error: error.message })
    }
}
