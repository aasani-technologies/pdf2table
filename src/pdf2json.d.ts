declare module 'pdf2json' {
    export = class PDFParser {
        on(eventName: string | symbol, listener: (...args: any[]) => void): this;
        loadPDF(pdfFilePath: any, verbosity?: any): Promise<void>
    }
};