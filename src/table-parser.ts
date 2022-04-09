import * as fs from 'fs'
import PDFParser from "pdf2json";
import { Logger } from "log4js";
import { promisify } from 'util';
import { createCanvas, CanvasRenderingContext2D, Canvas } from 'canvas';
import { PdfData, Text } from './interfaces/pdf-data';

const wrtieFilePromise = promisify(fs.writeFile);

export class TableParser {

    pdfData:PdfData;
    scale = 100;

    constructor(private pdfParser:PDFParser, private logger:Logger) {
        this.pdfData = {} as PdfData;
    }

    loadPdf(filePath:string): Promise<void> {
        const result = new Promise<void>((resolve,reject)=>{
            this.pdfParser.on("pdfParser_dataError", errData => reject(errData));
            this.pdfParser.on("pdfParser_dataReady", pdfData => {  
                this.pdfData = pdfData;
                this.logger.info(`${filePath} loaded!`);
                resolve();
            });

            this.pdfParser.loadPDF(filePath)
            .then(()=> this.logger.info(`${filePath} loadPdf completed!`))
            .catch(err=> {
                this.logger.error(err);
                reject(err);
            });
        })       
        
        return result;
    }

    async saveJson(filePath:string): Promise<void> {
      
        try {
            await wrtieFilePromise(filePath, JSON.stringify(this.pdfData));
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }
    }

    getPageCanvas() {
        const page = this.pdfData.Pages[0];
        const width = this.scale * page.Width;
        const height = this.scale * page.Height;
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height);
        return canvas;
    } 

    drawText(canvas:Canvas, text:Text) {
        const context = canvas.getContext('2d');
        const r = text.R[0];
        const fontSize = r.TS[1];
        context.fillStyle = '#000000';
        context.font = `${fontSize}pt Arial`;
        context.textAlign = text.A as CanvasTextAlign;
        const rawText = r.T.replace(/%20/g, '').trim();
        context.fillText(rawText, text.x * this.scale, text.y * this.scale);
    }

    drawPage(pageIndex:number){      
        const canvas = this.getPageCanvas(); 
        const page = this.pdfData.Pages[pageIndex];
        page.Texts.forEach(text => this.drawText(canvas, text))
        return canvas;    
    }


    async saveImage(pageIndex:number, filePath:string): Promise<void> {
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