import * as fs from 'fs'
import PDFParser from "pdf2json";
import { Logger } from "log4js";
import { promisify } from 'util';
import { createCanvas, CanvasRenderingContext2D, Canvas } from 'canvas';
import { PdfData, Text, Vline, Page, Hline } from './interfaces/pdf-data';

const wrtieFilePromise = promisify(fs.writeFile);

export interface PageLayout {
    width:number;
    height:number;
    resolution:number;
}

export class TableParser {

    pdfData: PdfData;
    pageLayout: PageLayout = {
        width: 2480,
        height: 3508,
        resolution: 72
    }

    constructor(private pdfParser: PDFParser, private logger: Logger) {
        this.pdfData = {} as PdfData;
    }

    transform(data:{x:number, y:number}, page:Page) {
        return({
            x: data.x * ((this.pageLayout.width) / page.Width),
            y: data.y * ((this.pageLayout.height) / page.Height)
        });
    }

    loadPdf(filePath: string): Promise<void> {
        const result = new Promise<void>((resolve, reject) => {
            this.pdfParser.on("pdfParser_dataError", errData => reject(errData));
            this.pdfParser.on("pdfParser_dataReady", pdfData => {
                this.pdfData = pdfData;
                this.logger.info(`${filePath} loaded!`);
                resolve();
            });

            this.pdfParser.loadPDF(filePath)
                .then(() => this.logger.info(`${filePath} loadPdf completed!`))
                .catch(err => {
                    this.logger.error(err);
                    reject(err);
                });
        })

        return result;
    }

    async saveJson(filePath: string): Promise<void> {

        try {
            await wrtieFilePromise(filePath, JSON.stringify(this.pdfData));
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }
    }

    getPageCanvas() {        
        const canvas = createCanvas(this.pageLayout.width, this.pageLayout.height);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, this.pageLayout.width, this.pageLayout.height);
        return canvas;
    }

    drawText(canvas: Canvas, page:Page, text: Text) {
        const context = canvas.getContext('2d');
        const r = text.R[0];
        const fontSize = r.TS[1];
        context.fillStyle = '#000000';
        context.font = `${fontSize * 2}pt sans-serif`;
        context.textAlign = text.A as CanvasTextAlign;
        const rawText = r.T.replace(/%20/g, '').trim();
        const point = this.transform({x: text.x, y:text.y}, page);
        const depth = this.transform({x:text.w, y:text.sw}, page);
        const offsetY = (this.pageLayout.width/this.pageLayout.height) * 50;
        const offsetX = (this.pageLayout.width/this.pageLayout.height) * 20;
        context.fillText(rawText, point.x + offsetX, point.y + offsetY, depth.x);
    }

    drawPage(pageIndex: number) {
        const canvas = this.getPageCanvas();
        const page = this.pdfData.Pages[pageIndex];
        page.Texts.forEach(text => this.drawText(canvas, page, text))
        page.VLines.forEach(line=>this.drawVLine(canvas, page, line));
        page.HLines.forEach(line=>this.drawHLine(canvas, page, line));
        return canvas;
    }

    drawVLine(canvas: Canvas, page:Page, line: Vline) {
        const context = canvas.getContext('2d');
        context.strokeStyle = 'rgba(0,0,0,0.5)';
        context.beginPath();
        const point = this.transform({x:line.x, y:line.y}, page);
        const depth = this.transform({x:line.w, y:line.l}, page);
        context.lineTo(point.x, point.y);
        context.lineTo(point.x, point.y + depth.y);
        context.stroke();
    }

    drawHLine(canvas: Canvas, page:Page, line: Hline) {
        const context = canvas.getContext('2d');
        context.strokeStyle = 'rgba(0,0,0,0.5)';
        context.beginPath();
        const point = this.transform({x:line.x, y:line.y}, page);
        const depth = this.transform({x:line.w, y:line.l}, page);
        context.lineTo(point.x, point.y);
        context.lineTo(point.x + depth.y, point.y);
        context.stroke();
    }


    async saveImage(pageIndex: number, filePath: string): Promise<void> {
        const canvas = this.drawPage(pageIndex);
        const buffer = canvas.toBuffer('image/png');
        try {
            await wrtieFilePromise(filePath, buffer);
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }
    }
}