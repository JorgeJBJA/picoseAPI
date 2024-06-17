export const SRI_WEBSERVICE_URLS = {
    //pruebas
    '1': {
        recepcion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
        autorizacion: "https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
    },
    //produccion
    '2': {
        recepcion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl",
        autorizacion: "https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl"
    }
}

export const KEY_INFO_DOC = {
    '99': { nro: '99', typeDoc: 'PROFORMA', keyDoc: 'infoFactura', cliente: 'razonSocialComprador' },
    '01': { nro: '01', typeDoc: 'FACTURA', keyDoc: 'infoFactura', cliente: 'razonSocialComprador' },
    '02': { nro: '02', typeDoc: 'NOTA DE VENTA', keyDoc: '', cliente: '' },
    '03': { nro: '03', typeDoc: 'LIQUIDACIÓN DE COMPRA DE BIENES Y PRESTACIÓN DE SERVICIOS', keyDoc: 'infoLiquidacionCompra', cliente: 'razonSocialProveedor' },
    '04': { nro: '04', typeDoc: 'NOTA DE CRÉDITO', keyDoc: 'infoNotaCredito', cliente: 'razonSocialComprador' },
    '05': { nro: '05', typeDoc: 'NOTA DE DÉBITO', keyDoc: 'infoNotaDebito', cliente: 'razonSocialComprador' },
    '06': { nro: '06', typeDoc: 'GUIA DE REMISIÓN', keyDoc: 'infoGuiaRemision', cliente: 'razonSocialDestinatario' },
    '07': { nro: '07', typeDoc: 'COMPROBANTE DE RETENCIÓN', keyDoc: 'infoCompRetencion', cliente: 'razonSocialSujetoRetenido' },
}

export const COD_IMPUESTOS = {
    '2': {
        impuesto: 'IVA',
        '0': '0%',
        '2': '12%',
        '3': '14%',
        '4': '15%',
        '5': '5%',
        '6': 'No objeto de IVA',
        '7': 'Exento de IVA',
        '8': 'Tarifa especial',
        '10': '13%'
    },
    '3': {
        impuesto: 'ICE'
    },
    '5': {
        impuesto: 'IRBPNR'
    },
}

export const COD_RETENCIONES = {
    '1': {
        impuesto: 'RENTA'
    },
    '2': {
        impuesto: 'IVA'
    },
    '6': {
        impuesto: 'ISD'
    },
}

export const COD_FORMAS_PAGO = {
    '01': { descripcion: 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO' },
    '15': { descripcion: 'COMPENSACIÓN DE DEUDAS' },
    '16': { descripcion: 'TARJETA DE DÉBITO' },
    '17': { descripcion: 'DINERO ELECTRÓNICO' },
    '18': { descripcion: 'TARJETA PREPAGO' },
    '19': { descripcion: 'TARJETA DE CRÉDITO' },
    '20': { descripcion: 'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO' },
    '21': { descripcion: 'ENDOSO DE TÍTULOS' }
}

export const SMTP_HOST = {
    'gmail': { host: 'smtp.gmail.com', port: 587, secure: false },
    'yahoo': { host: 'smtp.mail.yahoo.com', port: 587, secure: false },
    'outlook': { host: 'smtp.office365.com', port: 587, secure: false },
    'hotmail': { host: 'smtp.office365.com', port: 587, secure: false },
}

export const DATE_FORMAT = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
}
