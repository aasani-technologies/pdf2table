export interface PdfData {
  Transcoder: string
  Meta: Meta
  Pages: Page[]
}

export interface Meta {
  PDFFormatVersion: string
  IsAcroFormPresent: boolean
  IsXFAPresent: boolean
  Producer: string
  CreationDate: string
  ModDate: string
  Metadata: Metadata
}

export interface Metadata {
  "xmp:createdate": string
  "xmp:metadatadate": string
  "xmp:modifydate": string
  "xmpmm:documentid": string
  "xmpmm:instanceid": string
  "dc:format": string
  "pdf:producer": string
  "pdf:pdfversion": string
}

export interface Page {
  Width: number
  Height: number
  HLines: Hline[]
  VLines: Vline[]
  Fills: Fill[]
  Texts: Text[]
  Fields: any[]
  Boxsets: any[]
}

export interface Hline {
  x: number
  y: number
  w: number
  l: number
  oc: string
}

export interface Vline {
  x: number
  y: number
  w: number
  l: number
  oc: string
}

export interface Fill {
  x: number
  y: number
  w: number
  h: number
  clr: number
}

export interface Text {
  x: number
  y: number
  w: number
  sw: number
  A: string
  R: R[]
}

export interface R {
  T: string
  S: number
  TS: number[]
}
