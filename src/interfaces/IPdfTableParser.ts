
export interface IPdfTableParser {
    loadPdf(filePath: string): Promise<void>;
    fetchRows(): any[];
    saveCsv(filePath: string): Promise<void>;
}
