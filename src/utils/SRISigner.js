import forge from 'node-forge'
import BwipJs from "bwip-js"
import { SignPdf } from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { toBase64 } from './parsers.js'
import { DATE_FORMAT } from './consts.js'

export default class SRISigner {
    constructor(p12Buffer, p12Password) {
        this.p12Buffer = p12Buffer
        this.p12Password = p12Password

        const arraybuffer = bufferToArrayP12(this.p12Buffer)
        const der1 = forge.util.decode64(forge.util.binary.base64.encode(new Uint8Array(arraybuffer)))
        const p12asn1 = forge.asn1.fromDer(der1)
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12asn1, this.p12Password)
        const certbags = p12.getBags({ bagType: forge.pki.oids.certBag, })

        const pkcs8bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
        const pkcs8 = pkcs8bags[forge.oids.pkcs8ShroudedKeyBag][0]

        this.cert = certbags[forge.oids.certBag][0].cert
        this.aliasSigner = pkcs8.attributes.friendlyName[0]
        this.key = pkcs8.key ? pkcs8.key : pkcs8.asn1

        this.notBefore = this.cert.validity["notBefore"]
        this.notAfter = this.cert.validity["notAfter"]
    }

    signXML(xmlContent) {

        const issuerAttrs = this.cert.issuer.attributes
        const issuerName = issuerAttrs
            .reverse()
            .map(attr => {
                return attr.shortName ?
                    `${attr.shortName}=${attr.value}` :
                    `${attr.type}=${'#0c0f'}${Buffer.from(attr.value, 'utf-8').toString('hex')}`
            })
            .join(',')

        const certificateX509_pem = forge.pki.certificateToPem(this.cert)
        let certificateX509 = certificateX509_pem.substring(
            certificateX509_pem.indexOf("\n") + 1,
            certificateX509_pem.indexOf("\n-----END CERTIFICATE-----")
        )

        certificateX509 = certificateX509
            .replace(/\r?\n|\r/g, "")
            .replace(/([^\0]{76})/g, '$1\n')

        const certificateX509_asn1 = forge.pki.certificateToAsn1(this.cert)
        const certificateX509_der = forge.asn1.toDer(certificateX509_asn1).getBytes()
        const hash_certificateX509_der = sha1_base64(certificateX509_der)
        const certificateX509_serialNumber = BigInt('0x' + this.cert.serialNumber).toString()

        const exponent = hexToBase64(this.key.e.data[0].toString(16))
        const modulus = bigintToBase64(this.key.n)
        const namespaces = 'xmlns:ds="http://www.w3.org/2000/09/xmldsig#" xmlns:etsi="http://uri.etsi.org/01903/v1.3.2#"'

        const currentDate = new Date()
        if (currentDate < this.notBefore || currentDate > this.notAfter) {
            throw new Error("Certificado inválido, certificado ha expirado")
        }

        let xml = xmlContent
            .replace(/\s+/g, " ").trim()
            .replace(/(?<=\>)(\r?\n)|(\r?\n)(?=\<\/)/g, "").trim()
            .replace(/(?<=\>)(\s*)/g, "").trim()
            .replace(/\t|\r/g, "")

        const sha1_xml = sha1_base64(
            xml.replace('<?xml version="1.0" encoding="UTF-8"?>', ''),
            "utf8"
        )

        const Certificate_number = getRandomNumber()
        const Signature_number = getRandomNumber()
        const SignedProperties_number = getRandomNumber()
        const SignedInfo_number = getRandomNumber()
        const SignedPropertiesID_number = getRandomNumber()
        const Reference_ID_number = getRandomNumber()
        const SignatureValue_number = getRandomNumber()
        const Object_number = getRandomNumber()
        const isoDateTime = currentDate.toLocaleString('no-nb', DATE_FORMAT).replace(' ', 'T') + '-05:00'

        let SignedProperties = ""
        SignedProperties += '<etsi:SignedProperties Id="Signature' + Signature_number + '-SignedProperties' + SignedProperties_number + '">'
        SignedProperties += '<etsi:SignedSignatureProperties>'
        SignedProperties += '<etsi:SigningTime>'
        SignedProperties += isoDateTime
        SignedProperties += '</etsi:SigningTime>'
        SignedProperties += '<etsi:SigningCertificate>'
        SignedProperties += '<etsi:Cert>'
        SignedProperties += '<etsi:CertDigest>'
        SignedProperties += '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1">'
        SignedProperties += '</ds:DigestMethod>'
        SignedProperties += '<ds:DigestValue>'
        SignedProperties += hash_certificateX509_der
        SignedProperties += '</ds:DigestValue>'
        SignedProperties += '</etsi:CertDigest>'
        SignedProperties += '<etsi:IssuerSerial>'
        SignedProperties += '<ds:X509IssuerName>'
        SignedProperties += issuerName
        SignedProperties += '</ds:X509IssuerName>'
        SignedProperties += '<ds:X509SerialNumber>'
        SignedProperties += certificateX509_serialNumber
        SignedProperties += '</ds:X509SerialNumber>'
        SignedProperties += '</etsi:IssuerSerial>'
        SignedProperties += '</etsi:Cert>'
        SignedProperties += '</etsi:SigningCertificate>'
        SignedProperties += '</etsi:SignedSignatureProperties>'
        SignedProperties += '<etsi:SignedDataObjectProperties>'
        SignedProperties += '<etsi:DataObjectFormat ObjectReference="#Reference-ID-' + Reference_ID_number + '">'
        SignedProperties += '<etsi:Description>'
        SignedProperties += 'contenido comprobante'
        SignedProperties += '</etsi:Description>'
        SignedProperties += '<etsi:MimeType>'
        SignedProperties += 'text/xml'
        SignedProperties += '</etsi:MimeType>'
        SignedProperties += '</etsi:DataObjectFormat>'
        SignedProperties += '</etsi:SignedDataObjectProperties>'
        SignedProperties += '</etsi:SignedProperties>'

        const sha1_SignedProperties = sha1_base64(SignedProperties.replace(
            "<etsi:SignedProperties",
            "<etsi:SignedProperties " + namespaces
        ))

        let KeyInfo = ""
        KeyInfo += '<ds:KeyInfo Id="Certificate' + Certificate_number + '">'
        KeyInfo += '\n<ds:X509Data>'
        KeyInfo += '\n<ds:X509Certificate>\n'
        KeyInfo += certificateX509
        KeyInfo += '\n</ds:X509Certificate>'
        KeyInfo += '\n</ds:X509Data>'
        KeyInfo += '\n<ds:KeyValue>'
        KeyInfo += '\n<ds:RSAKeyValue>'
        KeyInfo += '\n<ds:Modulus>\n'
        KeyInfo += modulus
        KeyInfo += '\n</ds:Modulus>'
        KeyInfo += '\n<ds:Exponent>' + exponent + '</ds:Exponent>'
        KeyInfo += '\n</ds:RSAKeyValue>'
        KeyInfo += '\n</ds:KeyValue>'
        KeyInfo += '\n</ds:KeyInfo>'

        const sha1_KeyInfo = sha1_base64(
            KeyInfo.replace("<ds:KeyInfo", "<ds:KeyInfo " + namespaces)
        )

        let SignedInfo = ""
        SignedInfo += '<ds:SignedInfo Id="Signature-SignedInfo' + SignedInfo_number + '">'
        SignedInfo += '\n<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315">'
        SignedInfo += '</ds:CanonicalizationMethod>'
        SignedInfo += '\n<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1">'
        SignedInfo += '</ds:SignatureMethod>'
        SignedInfo += '\n<ds:Reference Id="SignedPropertiesID' + SignedPropertiesID_number + '" Type="http://uri.etsi.org/01903#SignedProperties" URI="#Signature' + Signature_number + '-SignedProperties' + SignedProperties_number + '">'
        SignedInfo += '\n<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1">'
        SignedInfo += '</ds:DigestMethod>'
        SignedInfo += '\n<ds:DigestValue>'
        SignedInfo += sha1_SignedProperties //HASH O DIGEST DEL ELEMENTO <etsi:SignedProperties>'
        SignedInfo += '</ds:DigestValue>'
        SignedInfo += '\n</ds:Reference>'
        SignedInfo += '\n<ds:Reference URI="#Certificate' + Certificate_number + '">'
        SignedInfo += '\n<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1">'
        SignedInfo += '</ds:DigestMethod>'
        SignedInfo += '\n<ds:DigestValue>'
        SignedInfo += sha1_KeyInfo //HASH O DIGEST DEL CERTIFICADO X509
        SignedInfo += '</ds:DigestValue>'
        SignedInfo += '\n</ds:Reference>'
        SignedInfo += '\n<ds:Reference Id="Reference-ID-' + Reference_ID_number + '" URI="#comprobante">'
        SignedInfo += '\n<ds:Transforms>'
        SignedInfo += '\n<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature">'
        SignedInfo += '</ds:Transform>'
        SignedInfo += '\n</ds:Transforms>'
        SignedInfo += '\n<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1">'
        SignedInfo += '</ds:DigestMethod>'
        SignedInfo += '\n<ds:DigestValue>'
        SignedInfo += sha1_xml //HASH O DIGEST DE TODO EL ARCHIVO XML IDENTIFICADO POR EL id="comprobante" 
        SignedInfo += '</ds:DigestValue>'
        SignedInfo += '\n</ds:Reference>'
        SignedInfo += '\n</ds:SignedInfo>'

        const canonicalized_SignedInfo = SignedInfo.replace(
            "<ds:SignedInfo", "<ds:SignedInfo " + namespaces
        )

        const md = forge.md.sha1.create()
        md.update(canonicalized_SignedInfo, 'utf8')

        const signature = toBase64(this.key.sign(md)).match(/.{1,76}/g).join('\n')

        let XAdES_BES = ""

        //INICIO DE LA FIRMA DIGITAL 
        XAdES_BES += '<ds:Signature ' + namespaces + ' Id="Signature' + Signature_number + '">'
        XAdES_BES += '\n' + SignedInfo
        XAdES_BES += '\n<ds:SignatureValue Id="SignatureValue' + SignatureValue_number + '">\n'
        XAdES_BES += signature; //VALOR DE LA FIRMA (ENCRIPTADO CON LA LLAVE PRIVADA DEL CERTIFICADO DIGITAL) 
        XAdES_BES += '\n</ds:SignatureValue>'
        XAdES_BES += '\n' + KeyInfo
        XAdES_BES += '\n<ds:Object Id="Signature' + Signature_number + '-Object' + Object_number + '">'
        XAdES_BES += '<etsi:QualifyingProperties Target="#Signature' + Signature_number + '">'
        XAdES_BES += SignedProperties
        XAdES_BES += '</etsi:QualifyingProperties>'
        XAdES_BES += '</ds:Object>'
        XAdES_BES += '</ds:Signature>'

        return xml.replace(/(<[^<]+)$/, XAdES_BES + '$1');
    }

    async signPDF(pdfBuffer, posPage, posX, posY) {
        const currentDate = new Date()
        let signer = new P12Signer(this.p12Buffer, { passphrase: this.p12Password })
        const signatureLength = (await (signer.sign(pdfBuffer, currentDate))).length * 2
        const isoDateTime = currentDate.toLocaleString('no-nb', DATE_FORMAT).replace(' ', 'T') + '-05:00'
        const qrInfo =
            'FIRMADO POR: ' + this.aliasSigner +
            '\nRAZON:' +
            '\nLOCALIZACION:' +
            '\nFECHA: ' + isoDateTime

        const qrcode = await BwipJs.toBuffer({
            bcid: 'qrcode',
            text: qrInfo,
            scale: 1
        })

        const maxWidth = 125
        const lineHeight = 10
        const fontSize = 10
        const x = posX ? posX : 355
        const y = posY ? posY : 615
        const pageNum = posPage ? posPage : 1

        const pdfDoc = await PDFDocument.load(pdfBuffer)
        const FNORM = await pdfDoc.embedFont(StandardFonts.TimesRoman)
        const FBOLD = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
        const qrImage = await pdfDoc.embedPng(qrcode)
        const pages = pdfDoc.getPages()
        const page = pages[pageNum - 1]

        page.drawImage(qrImage, { x, y })
        page.drawText('Firmado electrónicamente por:', {
            x: x + qrImage.width + 5,
            y: y + 45,
            size: fontSize,
            font: FNORM,
            maxWidth
        })
        page.drawText(this.aliasSigner, {
            x: x + qrImage.width + 5,
            y: y + 30,
            size: fontSize,
            font: FBOLD,
            maxWidth,
            lineHeight
        })

        pdflibAddPlaceholder({
            pdfDoc,
            reason: '',
            contactInfo: '',
            name: '',
            location: '',
            widgetRect: [
                x,
                y,
                x + qrImage.width + maxWidth + 5,
                y + qrImage.height
            ],
            signatureLength
        })

        const docBuffer = Buffer.from(await pdfDoc.save())
        signer = new P12Signer(this.p12Buffer, { passphrase: this.p12Password })
        const sign = new SignPdf()
        const pdfSignedBuffer = await sign.sign(docBuffer, signer, currentDate)
        return pdfSignedBuffer
    }
}

function bufferToArrayP12(p12Buffer) {
    const arraybuffer = p12Buffer.buffer.slice(
        p12Buffer.byteOffset,
        p12Buffer.byteOffset + p12Buffer.byteLength
    );
    return arraybuffer
}

function sha1_base64(txt, encoding) {
    let md = forge.md.sha1.create()
    md.update(txt, encoding)
    const hash = md.digest().toHex()
    const buffer = Buffer.from(hash, "hex")
    const base64 = buffer.toString("base64")
    return base64
}

function hexToBase64(hexStr) {
    hexStr = hexStr.padStart(hexStr.length + (hexStr.length % 2), "0")
    const bytes = hexStr.match(/.{2}/g).map((byte) => parseInt(byte, 16))
    return toBase64(String.fromCharCode(...bytes))
}

function bigintToBase64(bigint) {
    const hexstring = bigint.toString(16)
    const hexpairs = hexstring.match(/\w{2}/g)
    const bytes = hexpairs.map((pair) => parseInt(pair, 16))
    const bytestring = String.fromCharCode(...bytes)
    const base64 = toBase64(bytestring)
    const formatedbase64 = base64.match(/.{1,76}/g).join('\n')
    return formatedbase64
}

function getRandomNumber(min = 990, max = 999000) {
    return Math.floor(Math.random() * max) + min
}
