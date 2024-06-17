import { Parser, Builder } from "xml2js";

const parser = new Parser({ explicitArray: false })
const builder = new Builder({ renderOpts: { pretty: false } });

export async function XmlToJson(xmlContent) {
    try {
        return await parser.parseStringPromise(xmlContent)
    } catch (error) {
        throw new Error(`Error xml: ${error.message}`)
    }
}

export function JsonToXml(jsonContent) {
    return builder.buildObject(jsonContent)
}