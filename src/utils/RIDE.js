import BwipJs from "bwip-js"
import PDFDocument from 'pdfkit-table'
import { KEY_INFO_DOC, COD_IMPUESTOS, COD_RETENCIONES, COD_FORMAS_PAGO } from './consts.js'
import { XmlToJson } from "./xmlParser.js"

const TEXT_GAP = 0.5
const MARGIN = 5
const FNORM = 'Times-Roman'
const FBOLD = 'Times-Bold'
const FSIZE = 9
const BORDER_RADIUS = 2
const WIDTH_INFO_COMPROBANTE = 350
const WIDTH_INFO_ADCIONAL = 320

const CONF_DOC = {
  bufferPages: true,
  margins: {
    left: 62,
    top: 40,
    right: 30,
    bottom: 30
  }
}

const HEADER_COLOR = '#A9ABAE'

const CONF_VERTICAL_TABLE = {
  renderer: null,
  columnColor: HEADER_COLOR,
  columnOpacity: 0.5
}

const CONF_HEADER_TABLE = {
  renderer: null,
  headerColor: HEADER_COLOR,
  headerOpacity: 0.5
}

const infoRIDE = {
  claveAcceso: '',
  tipoComprobante: '',
  nroComprobante: '',
  nombreComercialEmpresa: '',
  razonSocialCliente: '',
  pdfBuffer: ''
}

let PAGE_SIZE = { width: 0 }
let OPTS_INFO_COMPROBANTE_LEFT
let OPTS_INFO_COMPROBANTE_RIGHT
let DOC
let keysComp
let comprobante

function attributeToArray(attribute) {
  return Array.isArray(attribute) ? attribute : [attribute]
}

function drawInfoComprobanteBox(initY) {
  DOC.roundedRect(
    DOC.x - MARGIN,
    initY - MARGIN,
    PAGE_SIZE.width,
    DOC.y - initY + MARGIN,
    BORDER_RADIUS,
  ).stroke();
  DOC.font(FNORM).text('', DOC.x - MARGIN, DOC.y + (MARGIN * 2))
}

function drawSeparator() {
  DOC.moveTo(DOC.x, DOC.y - MARGIN)
    .lineTo(DOC.page.width - DOC.page.margins.right, DOC.y - MARGIN)
    .stroke()
}

function addTableTemplate(cabecera, datos, vertical) {
  const documentosTable = {
    headers: cabecera,
    datas: datos,
  }

  DOC.table(documentosTable, {
    hideHeader: vertical,
    divider: {
      horizontal: { disabled: vertical }
    },
    prepareHeader: () => DOC.font(FBOLD).fontSize(FSIZE),
    prepareRow: (row, indexColumn) => {
      DOC.font(FNORM).fontSize(FSIZE)
      indexColumn === 0 && vertical && DOC.font(FBOLD).fontSize(FSIZE)
    },
  });
}

function addTableDocsRetencion(version, infoRetencion, documentos, totalRetencion) {
  const cabeceraDocs = [
    { ...CONF_HEADER_TABLE, label: 'Comprobante', property: 'comprobante', width: 75 },
    { ...CONF_HEADER_TABLE, label: 'Número', property: 'numero', align: 'right', width: 80 },
    { ...CONF_HEADER_TABLE, label: 'Fecha Emisión', property: 'emision', align: 'right', width: 50 },
    { ...CONF_HEADER_TABLE, label: 'Ejercicio Fiscal', property: 'ejercicio', align: 'right', width: 45 },
    { ...CONF_HEADER_TABLE, label: 'Base Imponible', property: 'base', align: 'right', width: 50 },
    { ...CONF_HEADER_TABLE, label: 'Código Retencion', property: 'codigoRetencion', align: 'right', width: 45 },
    { ...CONF_HEADER_TABLE, label: 'Impuesto', property: 'impuesto', align: 'right', width: 45 },
    { ...CONF_HEADER_TABLE, label: 'Porcentaje Retención', property: 'porcentaje', align: 'right', width: 50 },
    { ...CONF_HEADER_TABLE, label: 'Valor Retenido', property: 'valor', align: 'right', width: 80 }
  ]

  const documentosValues = []

  if (version === '1.0.0') {
    documentos = attributeToArray(documentos.impuesto)
    documentos.forEach(documento => {
      totalRetencion.value += parseFloat(documento.valorRetenido)
      documentosValues.push({
        comprobante: KEY_INFO_DOC[documento.codDocSustento].typeDoc,
        numero: documento.numDocSustento,
        emision: documento.fechaEmisionDocSustento,
        ejercicio: infoRetencion.periodoFiscal,
        base: documento.baseImponible,
        codigoRetencion: documento.codigoRetencion,
        impuesto: COD_RETENCIONES[documento.codigo].impuesto,
        porcentaje: documento.porcentajeRetener,
        valor: documento.valorRetenido
      })
    })
  } else if (version === '2.0.0') {
    documentos = attributeToArray(documentos.docSustento)
    documentos.forEach(documento => {
      documento.retenciones.retencion = attributeToArray(documento.retenciones.retencion)
      documento.retenciones.retencion.forEach(retencion => {
        totalRetencion.value += parseFloat(retencion.valorRetenido)
        documentosValues.push({
          comprobante: KEY_INFO_DOC[documento.codDocSustento].typeDoc,
          numero: documento.numDocSustento,
          emision: documento.fechaEmisionDocSustento,
          ejercicio: infoRetencion.periodoFiscal,
          base: retencion.baseImponible,
          codigoRetencion: documento.codigoRetencion,
          impuesto: COD_RETENCIONES[retencion.codigo].impuesto,
          porcentaje: retencion.porcentajeRetener,
          valor: retencion.valorRetenido
        })
      })
    })
  }
  addTableTemplate(cabeceraDocs, documentosValues)
}

function addTableDetalles(detalles) {
  const cabeceraDetalles = [
    { ...CONF_HEADER_TABLE, label: 'Código', property: 'codigoPrincipal', width: 60 },
    { ...CONF_HEADER_TABLE, label: 'Descripción', property: 'descripcion', width: 195 },
    { ...CONF_HEADER_TABLE, label: 'IVA', property: 'valImpuesto', align: 'right', width: 25 },
    { ...CONF_HEADER_TABLE, label: 'Cant.', property: 'cantidad', align: 'right', width: 50 },
    { ...CONF_HEADER_TABLE, label: 'P. Uni.', property: 'precioUnitario', align: 'right', width: 60 },
    { ...CONF_HEADER_TABLE, label: 'Desc.', property: 'descuento', align: 'right', width: 60 },
    { ...CONF_HEADER_TABLE, label: 'Total', property: 'precioTotalSinImpuesto', align: 'right', width: 70 }
  ]

  detalles = attributeToArray(detalles)
  detalles.forEach(detalle => {
    detalle.codigoPrincipal = detalle.codigoPrincipal || detalle.codigoInterno
    detalle.impuestos.impuesto = attributeToArray(detalle.impuestos.impuesto)
    detalle.impuestos.impuesto.forEach(impuesto => {
      detalle.valImpuesto = impuesto.tarifa ? impuesto.tarifa : ' '
      return
    })
  })

  addTableTemplate(cabeceraDetalles, detalles)
}

function addTableDetallesGuiaRemision(detalles) {
  const cabeceraDetalles = [
    { ...CONF_HEADER_TABLE, label: 'Código', property: 'codigoInterno', width: 120 },
    { ...CONF_HEADER_TABLE, label: 'Descripción', property: 'descripcion', width: 300 },
    { ...CONF_HEADER_TABLE, label: 'Cant.', property: 'cantidad', align: 'right', width: 100 },
  ]

  detalles = attributeToArray(detalles)

  addTableTemplate(cabeceraDetalles, detalles)
}

function addTableMotivosNotaDebito(motivos) {
  const cabeceraMotivos = [
    { ...CONF_HEADER_TABLE, label: 'Razón de la modificación', property: 'razon', width: 400 },
    { ...CONF_HEADER_TABLE, label: 'Valor de la modificación', property: 'valor', width: 120, align: 'right' },
  ]

  motivos = attributeToArray(motivos)

  addTableTemplate(cabeceraMotivos, motivos)
}

function addTotalRetencion(totalRetencion) {
  const initX = DOC.page.margins.left + (MARGIN * 2) + WIDTH_INFO_ADCIONAL + 60
  DOC.font(FNORM).text('', initX, DOC.y)

  const cabeceraTotal = [
    { ...CONF_VERTICAL_TABLE, label: 'titulo', property: 'titulo', width: 50 },
    { label: 'valor', property: 'valor', width: 80, align: 'right' },
  ]

  const datosTotal = [
    { titulo: 'Valor total:', valor: totalRetencion.toFixed(2) }
  ]

  addTableTemplate(cabeceraTotal, datosTotal, true)
}

function addTotales(infoComprobante) {
  const initX = DOC.page.margins.left + WIDTH_INFO_ADCIONAL + MARGIN * 4
  DOC.font(FNORM).text('', initX, DOC.y)

  const cabeceraTotales = [
    { ...CONF_VERTICAL_TABLE, label: 'titulo', property: 'titulo', width: 110 },
    { label: 'valor', property: 'valor', width: 70, align: 'right' },
  ]
  const datosTotales = []

  //Subtotales impuestos
  infoComprobante.totalConImpuestos.totalImpuesto.forEach(impuesto => {
    datosTotales.push(
      {
        titulo: `Subtotal ${COD_IMPUESTOS[impuesto.codigo][impuesto.codigoPorcentaje] || COD_IMPUESTOS[impuesto.codigo].impuesto}`,
        valor: impuesto.baseImponible
      })
  })

  datosTotales.push({ titulo: 'Subtotal sin impuestos', valor: infoComprobante.totalSinImpuestos })

  if (infoComprobante.totalDescuento) {
    datosTotales.push({ titulo: 'Total descuento', valor: infoComprobante.totalDescuento })
  }

  //Valores impuestos
  infoComprobante.totalConImpuestos.totalImpuesto.forEach(impuesto => {
    if (impuesto.codigo === '2') {
      if (impuesto.codigoPorcentaje !== '0') {
        datosTotales.push({
          titulo: `IVA ${COD_IMPUESTOS[impuesto.codigo][impuesto.codigoPorcentaje]}`,
          valor: impuesto.valor
        })
      }
    } else {
      datosTotales.push({
        titulo: `${COD_IMPUESTOS[impuesto.codigo].impuesto}`,
        valor: impuesto.valor
      })
    }
  })

  if (infoComprobante.propina) {
    datosTotales.push({ titulo: 'Propina', valor: infoComprobante.propina || '0.00' })
  }

  datosTotales.push({
    titulo: 'Valor total',
    valor: infoComprobante.importeTotal || infoComprobante.valorModificacion || infoComprobante.valorTotal
  })

  addTableTemplate(cabeceraTotales, datosTotales, true)
}

function addInfoAdicional() {
  DOC.font(FBOLD).text('INFORMACIÓN ADICIONAL')
  const tituloWidth = 85

  const cabeceraInfo = [
    { ...CONF_VERTICAL_TABLE, label: 'titulo', property: 'titulo', width: tituloWidth },
    { label: 'valor', property: 'valor', width: WIDTH_INFO_ADCIONAL - tituloWidth - MARGIN },
  ]
  const datosInfo = []

  comprobante.infoAdicional.campoAdicional.forEach(infoAdicional => {
    datosInfo.push({ titulo: `${infoAdicional['$'].nombre}:`, valor: ` ${infoAdicional._}` })
  })

  addTableTemplate(cabeceraInfo, datosInfo, true)
}

function addFormasPago(pagos) {
  pagos = attributeToArray(pagos)
  const cellSize = DOC.heightOfString('text') + 6.5
  const freeSpace = DOC.page.height - DOC.y - DOC.page.margins.bottom
  const pagosSize = (pagos.length + 2) * cellSize
  let plazoFlag = false

  if (freeSpace < pagosSize) DOC.addPage()

  pagos.forEach(pago => {
    pago.formaPago = COD_FORMAS_PAGO[pago.formaPago].descripcion
    pago.plazo = pago.plazo ? `${pago.plazo} ${pago.unidadTiempo || ''}` : '-'
    if (pago.plazo !== '-') plazoFlag = true
  });

  const cabeceraPagos = [
    { ...CONF_HEADER_TABLE, label: 'Forma de Pago', property: 'formaPago', width: 240 },
    { ...CONF_HEADER_TABLE, label: 'Valor', property: 'total', align: 'right', width: 45 }
  ]

  if (plazoFlag) {
    cabeceraPagos.push({
      ...CONF_HEADER_TABLE, label: 'Plazo', property: 'plazo', align: 'right', width: 45
    })
  }

  addTableTemplate(cabeceraPagos, pagos)
}

function addFooterRIDE(infoComprobante, totalRetencion) {
  const textSize = DOC.heightOfString('text')
  const cellSize = textSize + 6.5
  const freeSpace = DOC.page.height - DOC.y - DOC.page.margins.bottom
  let totalRetencionSize = 0
  let totalImpuestosSize = 0
  let infoAdicionalSize = 0

  //Calcula el tamaño y si es necesario salta la página
  if (totalRetencion != null) totalRetencionSize = cellSize

  if (infoComprobante.totalConImpuestos) {
    infoComprobante.totalConImpuestos.totalImpuesto = attributeToArray(infoComprobante.totalConImpuestos.totalImpuesto)
    totalImpuestosSize = (infoComprobante.totalConImpuestos.totalImpuesto.length + 4) * cellSize
  }

  if (comprobante.infoAdicional) {
    comprobante.infoAdicional.campoAdicional = attributeToArray(comprobante.infoAdicional.campoAdicional)
    infoAdicionalSize = (comprobante.infoAdicional.campoAdicional.length) * cellSize + textSize
  }

  if (freeSpace < totalRetencionSize || freeSpace < totalImpuestosSize || freeSpace < infoAdicionalSize) {
    DOC.addPage()
  }

  //Agrega campos si existen
  const initY = DOC.y
  if (totalRetencion != null) addTotalRetencion(totalRetencion)
  if (infoComprobante.totalConImpuestos) addTotales(infoComprobante)

  DOC.font(FNORM).text('', DOC.page.margins.left, initY)
  if (comprobante.infoAdicional) addInfoAdicional()
  if (infoComprobante.pagos) addFormasPago(infoComprobante.pagos.pago)
}

function addPageNumbers() {
  const range = DOC.bufferedPageRange();
  const x = DOC.page.margins.left
  const y = DOC.page.margins.top - 15
  DOC.fontSize(8)
  for (let i = range.start; i < range.count; i++) {
    DOC.switchToPage(i);
    DOC.text(`Pág. ${i + 1} / ${range.count}`, x, y);
  }
}

async function headerRIDE(numeroAutorizacion, fechaAutorizacion, logo) {

  const infoTributaria = comprobante.infoTributaria
  keysComp = KEY_INFO_DOC[infoTributaria.codDoc]

  const infoComprobante = comprobante[keysComp.keyDoc]
  const tipoComprobante = keysComp.typeDoc
  const nroComprobante = `${infoTributaria.estab}-${infoTributaria.ptoEmi}-${infoTributaria.secuencial}`

  infoRIDE.claveAcceso = infoTributaria.claveAcceso
  infoRIDE.tipoComprobante = tipoComprobante
  infoRIDE.nroComprobante = nroComprobante
  infoRIDE.nombreComercialEmpresa = infoTributaria.nombreComercial

  //Informacion celda izquierda
  const widthInfoEmpresa = 255
  const optionsInfoEmpresa = { width: widthInfoEmpresa - (MARGIN * 2) }
  const infoEmpresa_X = DOC.page.margins.left + MARGIN
  const infoEmpresa_Y = 120 + MARGIN

  if (logo && logo.length != 0) {
    DOC.image(`data:image/png;base64,${logo.toString('base64')}`, DOC.x, DOC.y, { fit: [optionsInfoEmpresa.width + (MARGIN * 2), 80], align: 'center' });
  } else {
    DOC.font(FBOLD).text(infoTributaria.nombreComercial, { width: optionsInfoEmpresa.width + MARGIN })
  }

  DOC.font(FNORM).text('', infoEmpresa_X, infoEmpresa_Y)
  DOC.font(FBOLD).text(infoTributaria.razonSocial, optionsInfoEmpresa)
  DOC.font(FBOLD).text(infoTributaria.nombreComercial, optionsInfoEmpresa).moveDown(TEXT_GAP)

  DOC.font(FBOLD).text('Dir. Matriz: ', { ...optionsInfoEmpresa, continued: true })
  DOC.font(FNORM).text(infoTributaria.dirMatriz)

  if (infoComprobante.dirEstablecimiento) {
    DOC.font(FBOLD).text('Dir. Sucursal: ', { ...optionsInfoEmpresa, continued: true })
    DOC.font(FNORM).text(infoComprobante.dirEstablecimiento).moveDown(TEXT_GAP)
  } else {
    DOC.moveDown(TEXT_GAP)
  }

  if (infoComprobante.contribuyenteEspecial) {
    DOC.font(FBOLD).text('Contribuyente especial Nro.: ', { ...optionsInfoEmpresa, continued: true })
    DOC.font(FNORM).text(infoComprobante.contribuyenteEspecial).moveDown(TEXT_GAP)
  }

  DOC.font(FBOLD).text('OBLIGADO A LLEVAR CONTABILIDAD: ', { ...optionsInfoEmpresa, continued: true })
  DOC.font(FNORM).text(infoComprobante.obligadoContabilidad).moveDown(TEXT_GAP)

  if (infoTributaria.agenteRetencion) {
    DOC.font(FBOLD).text('Agente de Retención Resolución Nro.: ', { ...optionsInfoEmpresa, continued: true })
    DOC.font(FNORM).text(infoTributaria.agenteRetencion)
  }

  if (infoTributaria.contribuyenteRimpe) {
    if (infoTributaria.contribuyenteRimpe.includes('POPULAR')) {
      DOC.font(FNORM).text('CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE', optionsInfoEmpresa)
    } else {
      DOC.font(FNORM).text('CONTRIBUYENTE RÉGIMEN RIMPE EMPRENDEDOR', optionsInfoEmpresa)
    }
  } else {
    DOC.font(FNORM).text('CONTRIBUYENTE RÉGIMEN GENERAL', optionsInfoEmpresa)
  }

  const heightInfoEmpresa = DOC.y

  //Informacion celda derecha
  const widthInfoComprobante = PAGE_SIZE.width - widthInfoEmpresa - MARGIN
  const infoComprobante_X = DOC.page.margins.left + optionsInfoEmpresa.width + (MARGIN * 4)
  const infoComprobante_Y = DOC.page.margins.top + MARGIN
  const optionsInfoComprobante = { width: widthInfoComprobante - (MARGIN * 2) }

  const ambiente = infoTributaria.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'
  const emision = infoTributaria.tipoEmision === '1' ? 'NORMAL' : 'LOTE'

  DOC.font(FNORM).text('', infoComprobante_X, infoComprobante_Y)
  DOC.font(FBOLD).text('R.U.C.: ', { ...optionsInfoComprobante, continued: true })
  DOC.font(FNORM).text(infoTributaria.ruc).moveDown(TEXT_GAP)

  DOC.font(FBOLD).text(tipoComprobante)
  DOC.font(FBOLD).text('Nro: ', { ...optionsInfoComprobante, continued: true })
  DOC.font(FNORM).text(nroComprobante).moveDown(TEXT_GAP)

  //Si es proforma omite estos campos
  if (tipoComprobante !== 'PROFORMA') {
    DOC.font(FBOLD).text('NÚMERO DE AUTORIZACIÓN')
    DOC.font(FNORM).text(numeroAutorizacion, optionsInfoComprobante).moveDown(TEXT_GAP)

    DOC.font(FBOLD).text('Fecha y Hora de Autorización: ', { ...optionsInfoComprobante, continued: true })

    fechaAutorizacion ?
      DOC.font(FNORM).text(fechaAutorizacion.slice(0, 19)) :
      DOC.font(FNORM).text(' ')

    DOC.font(FBOLD).text('AMBIENTE: ', { ...optionsInfoComprobante, continued: true })
    DOC.font(FNORM).text(ambiente, { ...optionsInfoComprobante, continued: true })
    DOC.font(FBOLD).text('       EMISIÓN: ', { ...optionsInfoComprobante, continued: true })
    DOC.font(FNORM).text(emision).moveDown(TEXT_GAP)

    DOC.font(FBOLD).text('CLAVE ACCESO')

    const barcode = await BwipJs.toBuffer({
      bcid: 'code128',
      text: numeroAutorizacion,
      scale: 3,
      height: 15,
      includetext: true,
      textxalign: 'center'
    })

    DOC.image(`data:image/png;base64,${barcode.toString('base64')}`, {
      fit: [optionsInfoComprobante.width, 40],
    });
  }

  const heightInfoComprobante = DOC.y + MARGIN

  const maxHeight = Math.max(heightInfoEmpresa, heightInfoComprobante)

  DOC.roundedRect(
    infoEmpresa_X - MARGIN,
    infoEmpresa_Y - MARGIN,
    widthInfoEmpresa,
    maxHeight - infoEmpresa_Y + MARGIN,
    BORDER_RADIUS
  ).stroke();

  DOC.roundedRect(
    infoComprobante_X - MARGIN,
    infoComprobante_Y - MARGIN,
    widthInfoComprobante,
    maxHeight - infoComprobante_Y + MARGIN,
    BORDER_RADIUS
  ).stroke();

  DOC.font(FNORM).text('', DOC.page.margins.left, maxHeight + (MARGIN * 2))
}

//FORMATO DE DOCUMENTOS ELECTRONICOS
function factura_proforma() {
  const infoFactura = comprobante.infoFactura

  infoRIDE.razonSocialCliente = infoFactura.razonSocialComprador

  const initY = DOC.y

  //Agrupacion derecha
  DOC.font(FNORM).text('', DOC.page.margins.left + OPTS_INFO_COMPROBANTE_LEFT.width + (MARGIN * 3), initY)
  DOC.font(FBOLD).text('Identificación: ', OPTS_INFO_COMPROBANTE_RIGHT)
  DOC.font(FNORM).text(infoFactura.identificacionComprador)

  if (infoFactura.guiaRemision) {
    DOC.font(FBOLD).text('Guía Remisión: ', OPTS_INFO_COMPROBANTE_RIGHT)
    DOC.font(FNORM).text(infoFactura.guiaRemision)
  }

  //Agrupacion izquierda
  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Razon Social / Nombres y Apellidos: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoFactura.razonSocialComprador)
  DOC.font(FBOLD).text('Fecha Emisión: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoFactura.fechaEmision)

  if (infoFactura.direccionComprador) {
    DOC.font(FBOLD).text('Dirección: ', OPTS_INFO_COMPROBANTE_LEFT)
    DOC.font(FNORM).text(infoFactura.direccionComprador)
  }
  drawInfoComprobanteBox(initY)

  addTableDetalles(comprobante.detalles.detalle)

  addFooterRIDE(infoFactura)
}

function liquidacion() {
  const infoLiquidacion = comprobante.infoLiquidacionCompra

  infoRIDE.razonSocialCliente = infoLiquidacion.razonSocialProveedor

  const initY = DOC.y

  //Agrupación derecha
  DOC.font(FNORM).text('', DOC.page.margins.left + OPTS_INFO_COMPROBANTE_LEFT.width + (MARGIN * 3), initY)
  DOC.font(FBOLD).text('Identificación: ', OPTS_INFO_COMPROBANTE_RIGHT)
  DOC.font(FNORM).text(infoLiquidacion.identificacionProveedor)

  //Agrupación izquierda
  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Nombres y Apellidos: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoLiquidacion.razonSocialProveedor)
  DOC.font(FBOLD).text('Fecha emisión: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoLiquidacion.fechaEmision)

  if (infoLiquidacion.direccionProveedor) {
    DOC.font(FBOLD).text('Dirección: ', OPTS_INFO_COMPROBANTE_LEFT)
    DOC.font(FNORM).text(infoLiquidacion.direccionProveedor)
  }

  drawInfoComprobanteBox(initY)

  addTableDetalles(comprobante.detalles.detalle)

  addFooterRIDE(infoLiquidacion)
}

function notaCredito() {
  const infoNotaCredito = comprobante.infoNotaCredito

  infoRIDE.razonSocialCliente = infoNotaCredito.razonSocialComprador

  const initY = DOC.y

  //Agrupacion derecha
  DOC.font(FNORM).text('', DOC.page.margins.left + OPTS_INFO_COMPROBANTE_LEFT.width + (MARGIN * 3), initY)
  DOC.font(FBOLD).text('Identificación: ', OPTS_INFO_COMPROBANTE_RIGHT)
  DOC.font(FNORM).text(infoNotaCredito.identificacionComprador)

  //Agrupacion izquierda
  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Razon Social / Nombres y Apellidos: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaCredito.razonSocialComprador)
  DOC.font(FBOLD).text('Fecha Emisión: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaCredito.fechaEmision)

  DOC.moveDown(TEXT_GAP)

  DOC.font(FBOLD).text('Comprobante que se modifica: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(`${KEY_INFO_DOC[infoNotaCredito.codDocModificado].typeDoc} ${infoNotaCredito.numDocModificado}`)
  DOC.font(FBOLD).text('Fecha emisión (Comprobante a modificar): ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaCredito.fechaEmisionDocSustento)
  DOC.font(FBOLD).text('Razón de Modificación: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaCredito.motivo)
  drawInfoComprobanteBox(initY)

  addTableDetalles(comprobante.detalles.detalle)

  addFooterRIDE(infoNotaCredito)
}

function notaDebito() {
  const infoNotaDebito = comprobante.infoNotaDebito

  infoRIDE.razonSocialCliente = infoNotaDebito.razonSocialComprador

  const initY = DOC.y

  //Agrupacion derecha
  DOC.font(FNORM).text('', DOC.page.margins.left + OPTS_INFO_COMPROBANTE_LEFT.width + (MARGIN * 3), initY)
  DOC.font(FBOLD).text('Identificación: ', OPTS_INFO_COMPROBANTE_RIGHT)
  DOC.font(FNORM).text(infoNotaDebito.identificacionComprador)

  //Agrupacion izquierda
  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Razon Social / Nombres y Apellidos: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaDebito.razonSocialComprador)
  DOC.font(FBOLD).text('Fecha Emisión: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaDebito.fechaEmision)

  DOC.moveDown(TEXT_GAP)

  DOC.font(FBOLD).text('Comprobante que se modifica: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(`${KEY_INFO_DOC[infoNotaDebito.codDocModificado].typeDoc} ${infoNotaDebito.numDocModificado}`)
  DOC.font(FBOLD).text('Fecha emisión (Comprobante a modificar): ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoNotaDebito.fechaEmisionDocSustento)
  drawInfoComprobanteBox(initY)

  addTableMotivosNotaDebito(comprobante.motivos.motivo)

  if (!infoNotaDebito.totalConImpuestos) {
    infoNotaDebito.totalConImpuestos = {}
    infoNotaDebito.totalConImpuestos.totalImpuesto = infoNotaDebito.impuestos.impuesto
  }

  addFooterRIDE(infoNotaDebito)
}

function guiaRemision() {
  const infoGuiaRemision = comprobante.infoGuiaRemision

  const initY = DOC.y

  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Identificación (Transportista): ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.rucTransportista)
  DOC.font(FBOLD).text('Razon Social / Nombres y Apellidos: ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.razonSocialTransportista)
  DOC.font(FBOLD).text('Placa: ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.placa)
  DOC.font(FBOLD).text('Punto de partida: ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.dirPartida)
  DOC.font(FBOLD).text('Fecha inicio Transporte: ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.fechaIniTransporte)
  DOC.font(FBOLD).text('Fecha fin Transporte: ', { continued: true })
  DOC.font(FNORM).text(infoGuiaRemision.fechaFinTransporte)
  drawInfoComprobanteBox(initY)

  comprobante.destinatarios.destinatario = attributeToArray(comprobante.destinatarios.destinatario)

  comprobante.destinatarios.destinatario.map(destinatario => {
    drawSeparator()
    DOC.font(FBOLD).text('Comprobante de venta: ', { continued: true })
    DOC.font(FNORM).text(`${KEY_INFO_DOC[destinatario.codDocSustento].typeDoc} ${destinatario.numDocSustento}`)
    DOC.font(FBOLD).text('Fecha emisión: ', { continued: true })
    DOC.font(FNORM).text(destinatario.fechaEmisionDocSustento)
    DOC.font(FBOLD).text('Número de Autorización: ', { continued: true })
    DOC.font(FNORM).text(destinatario.numAutDocSustento)
    DOC.moveDown(TEXT_GAP)

    DOC.font(FBOLD).text('Motivo Traslado: ', { continued: true })
    DOC.font(FNORM).text(destinatario.motivoTraslado)
    DOC.font(FBOLD).text('Destino (Punto de llegada): ', { continued: true })
    DOC.font(FNORM).text(destinatario.dirDestinatario)
    DOC.font(FBOLD).text('Identificación (Destinatario): ', { continued: true })
    DOC.font(FNORM).text(destinatario.identificacionDestinatario)
    DOC.font(FBOLD).text('Razón Social / Nombres y Apellidos: ', { continued: true })
    DOC.font(FNORM).text(destinatario.razonSocialDestinatario)

    if (destinatario.docAduaneroUnico) {
      DOC.font(FBOLD).text('Documento Aduanero: ', { continued: true })
      DOC.font(FNORM).text(destinatario.docAduaneroUnico)
    }

    if (destinatario.codEstabDestino) {
      DOC.font(FBOLD).text('Código Establecimiento Destino: ', { continued: true })
      DOC.font(FNORM).text(destinatario.codEstabDestino)
    }

    if (destinatario.ruta) {
      DOC.font(FBOLD).text('Ruta: ', { continued: true })
      DOC.font(FNORM).text(destinatario.ruta)
    }

    DOC.moveDown(TEXT_GAP)
    addTableDetallesGuiaRemision(destinatario.detalles.detalle)
  })

  addFooterRIDE(infoGuiaRemision)
}

function retencion() {
  const infoRetencion = comprobante.infoCompRetencion

  infoRIDE.razonSocialCliente = infoRetencion.razonSocialSujetoRetenido

  const initY = DOC.y

  //Agrupacion derecha
  DOC.font(FNORM).text('', DOC.page.margins.left + OPTS_INFO_COMPROBANTE_LEFT.width + (MARGIN * 3), initY)
  DOC.font(FBOLD).text('Identificación: ', OPTS_INFO_COMPROBANTE_RIGHT)
  DOC.font(FNORM).text(infoRetencion.identificacionSujetoRetenido)

  //Agrupacion izquierda
  DOC.font(FNORM).text('', DOC.page.margins.left + MARGIN, initY)
  DOC.font(FBOLD).text('Razon Social / Nombres y Apellidos: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoRetencion.razonSocialSujetoRetenido)
  DOC.font(FBOLD).text('Fecha Emisión: ', OPTS_INFO_COMPROBANTE_LEFT)
  DOC.font(FNORM).text(infoRetencion.fechaEmision)
  drawInfoComprobanteBox(initY)

  const totalRetencion = { value: 0 }

  addTableDocsRetencion(
    comprobante['$'].version,
    infoRetencion,
    comprobante.docsSustento || comprobante.impuestos,
    totalRetencion
  )

  addFooterRIDE(infoRetencion, totalRetencion.value)
}

export async function createRIDE(autorizacion, logo) {
  comprobante = await XmlToJson(autorizacion.comprobante)
  comprobante = Object.values(comprobante)[0]

  DOC = new PDFDocument(CONF_DOC);
  DOC.fontSize(FSIZE)
  DOC.lineWidth(0.5)

  PAGE_SIZE = { width: DOC.page.width - DOC.page.margins.right - DOC.page.margins.left }
  OPTS_INFO_COMPROBANTE_LEFT = { width: WIDTH_INFO_COMPROBANTE, continued: true }
  OPTS_INFO_COMPROBANTE_RIGHT = { width: PAGE_SIZE.width - OPTS_INFO_COMPROBANTE_LEFT.width - (MARGIN * 3), continued: true }

  let pdfChunks = []
  let pdfBuffer = new Promise(resolve => {
    DOC.on('data', pdfChunks.push.bind(pdfChunks))
    DOC.on('end', () => {
      resolve(Buffer.concat(pdfChunks))
    })
  })

  await headerRIDE(autorizacion.numeroAutorizacion, autorizacion.fechaAutorizacion, logo)

  switch (keysComp.nro) {
    case '01':
      factura_proforma()
      break;

    case '99':
      factura_proforma()
      break;

    case '03':
      liquidacion()
      break;

    case '04':
      notaCredito()
      break;

    case '05':
      notaDebito()
      break;

    case '06':
      guiaRemision()
      break;

    case '07':
      retencion()
      break;

    default:
      break;
  }
  addPageNumbers()
  DOC.end()
  infoRIDE.pdfBuffer = await pdfBuffer

  return infoRIDE
}