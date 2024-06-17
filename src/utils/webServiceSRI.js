import fetch, { Headers } from 'node-fetch'
import { SRI_WEBSERVICE_URLS } from "./consts.js";
import { XmlToJson } from "./xmlParser.js";
import { toBase64 } from './parsers.js';

export async function validarComprobante(xmlSigned) {
    
    const myHeaders = new Headers();

    myHeaders.append("Content-Type", "application/xml; charset=utf-8")

    const raw = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
        '<soapenv:Header/>' +
        '<soapenv:Body>' +
        '<ec:validarComprobante>' +
        '<!--Optional:-->' +
        '<xml>' + toBase64(xmlSigned) + '</xml>' +
        '</ec:validarComprobante>' +
        '</soapenv:Body>' +
        '</soapenv:Envelope>'

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    }

    const claveAcceso = Object.values(await XmlToJson(xmlSigned))[0].infoTributaria.claveAcceso
    const ambiente = claveAcceso.slice(23, 24)
    const url = SRI_WEBSERVICE_URLS[ambiente].recepcion

    const response = await fetch(url, requestOptions)
    const responseStr = await response.text()
    const jsonContent = await XmlToJson(responseStr)
    const validacionJSON = await jsonContent['soap:Envelope']['soap:Body']['ns2:validarComprobanteResponse']
        .RespuestaRecepcionComprobante

    return validacionJSON
}

export async function autorizarComprobante(claveAcceso) {
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/xml; charset=utf-8");

    const raw = '<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
        '<soapenv:Header/>' +
        '<soapenv:Body>' +
        '<ec:autorizacionComprobante>' +
        '<!--Optional:-->' +
        '<claveAccesoComprobante>' + claveAcceso + '</claveAccesoComprobante>' +
        '</ec:autorizacionComprobante>' +
        '</soapenv:Body>' +
        '</soapenv:Envelope>';

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    const ambiente = claveAcceso.slice(23, 24)
    const url = SRI_WEBSERVICE_URLS[ambiente].autorizacion

    const response = await fetch(url, requestOptions)
    const responseStr = await response.text()
    const jsonContent = await XmlToJson(responseStr)
    const autorizacion = await jsonContent['soap:Envelope']['soap:Body']['ns2:autorizacionComprobanteResponse']
        .RespuestaAutorizacionComprobante

    if (autorizacion.numeroComprobantes === '1') {
        return autorizacion.autorizaciones.autorizacion
    } else {
        return undefined
    }
}