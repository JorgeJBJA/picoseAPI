import { createRIDE } from "../../utils/RIDE.js"
import SRISigner from "../../utils/SRISigner.js"
import { sendMail } from "../../utils/social.Email.js"
import { XmlToJson } from "../../utils/xmlParser.js"
import { autorizarComprobante, validarComprobante } from "../../utils/webServiceSRI.js"
import { sleep } from "../../utils/timer.js"
import { DATE_FORMAT } from "../../utils/consts.js"

function formatXMLToSend(autorizacionJSON) {
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
        '<autorizacion>\n' +
        '<estado>' + autorizacionJSON.estado + '</estado>\n' +
        '<numeroAutorizacion>' + autorizacionJSON.numeroAutorizacion + '</numeroAutorizacion>\n' +
        '<fechaAutorizacion>' + autorizacionJSON.fechaAutorizacion + '</fechaAutorizacion>\n' +
        '<ambiente>' + autorizacionJSON.ambiente + '</ambiente>\n' +
        '<comprobante><![CDATA[' + autorizacionJSON.comprobante + ']]></comprobante>\n' +
        '<mensajes />\n' +
        '</autorizacion>'
}

export async function getInfoTributaria(comprobanteXML) {
    return Object.values(await XmlToJson(comprobanteXML))[0].infoTributaria
}

export async function sendComprobante(empresa, autorizacion, establecimiento, destinosEmail) {
    const RIDE = await createRIDE(autorizacion, establecimiento.logotipo || empresa.logotipo)

    const docs = [
        {
            filename: RIDE.claveAcceso + '.pdf',
            content: RIDE.pdfBuffer
        },
        {
            filename: RIDE.claveAcceso + '.xml',
            content: formatXMLToSend(autorizacion),
            contentType: 'text/plain'
        }
    ]

    if (RIDE.tipoComprobante === 'PROFORMA') {
        const sriSigner = new SRISigner(empresa.firma, empresa.clave_firma)
        docs[0].content = await sriSigner.signPDF(docs[0].content)
        docs.pop()
    }

    const asunto = 'Comprobantes electrónicos ' + RIDE.nombreComercialEmpresa
    const mensaje = 'Estimad@ ' + RIDE.razonSocialCliente +
        ' su ' + RIDE.tipoComprobante + ' Nro: ' + RIDE.nroComprobante +
        ' ha sido procesada correctamente.' +
        ' En este momento se encuentra disponible para su visualización y descarga.';

    await sendMail(empresa.email, empresa.clave_email, destinosEmail, asunto, mensaje, docs)
}

export function createAutorizacion(clave, numeroAutorizacion, fecha_aut, ambiente, comprobanteXMLSigned) {
    return {
        autorizacion: numeroAutorizacion || clave,
        estado: 'AUTORIZADO',
        numeroAutorizacion: numeroAutorizacion || clave,
        fechaAutorizacion: fecha_aut ? fecha_aut.toLocaleString('no-nb', DATE_FORMAT).replace(' ', 'T') + '-5:00' : fecha_aut,
        ambiente: ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS',
        comprobante: comprobanteXMLSigned
    }
}

export async function getAutorizacion(empresa, comprobante) {
    const signer = new SRISigner(empresa.firma, empresa.clave_firma)
    const xmlSigned = signer.signXML(comprobante)
    let resSRI
    let mensajeSRI

    resSRI = await validarComprobante(xmlSigned)
    mensajeSRI = resSRI.comprobantes.comprobante.mensajes

    mensajeSRI = mensajeSRI ? mensajeSRI.mensaje : { mensaje: null }
    resSRI.estado = mensajeSRI.mensaje === 'CLAVE ACCESO REGISTRADA' ? 'RECIBIDA' : resSRI.estado

    if (resSRI.estado !== 'RECIBIDA') {
        return {
            autorizacion: mensajeSRI.informacionAdicional || mensajeSRI.mensaje
        }
    }

    await sleep(3000)
    resSRI = await autorizarComprobante(resSRI.comprobantes.comprobante.claveAcceso)

    if (!resSRI) {
        return {
            autorizacion: 'Sin respuesta de SRI',
            ...resSRI
        }
    }

    if (resSRI.estado !== 'AUTORIZADO') {
        mensajeSRI = resSRI.mensajes.mensaje
        return {
            autorizacion: mensajeSRI.informacionAdicional || mensajeSRI.mensaje,
            ...resSRI
        }
    }

    return {
        autorizacion: resSRI.numeroAutorizacion,
        ...resSRI
    }
}