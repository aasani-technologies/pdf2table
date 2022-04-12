import * as fs from 'fs'
import PDFParser from "pdf2json";
import { Logger } from "log4js";
import { promisify } from 'util';
import { createCanvas, CanvasRenderingContext2D, Canvas } from 'canvas';
import { PdfData, Text, Vline, Page, Hline } from './interfaces/pdf-data';
import { Box, Point } from './interfaces/shape';
import converter from 'json-2-csv';
const json2csvPromise = promisify(converter.json2csv);
const wrtieFilePromise = promisify(fs.writeFile);

export interface PageLayout {
    width:number;
    height:number;
    resolution:number;
}

export class TableParser {

    pdfData: PdfData;
    pageLayout: PageLayout = {
        width: 8,
        height: 12,
        resolution: 96
    }

    constructor(private pdfParser: PDFParser, private logger: Logger) {
        this.pdfData = {} as PdfData;
    }

    transform(data:{x:number, y:number}, page:Page) {
        return({
            x: data.x * ((this.pageLayout.width * this.pageLayout.resolution) / page.Width),
            y: data.y * ((this.pageLayout.height * this.pageLayout.resolution) / page.Height)
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

    async saveJson(pageIndex:number, filePath: string): Promise<void> {

        try {
            const page = this.pdfData.Pages[pageIndex];            
            await wrtieFilePromise(filePath, JSON.stringify(this.detectTable(page)));
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }
    }

    async saveCsv(pageIndex:number, filePath: string): Promise<void> {

        try {
            const page = this.pdfData.Pages[pageIndex];     
            const data = this.detectTable(page).map(row=>row.map(col=>col.textContent));      
            const headers = data[0];
            data.shift();
            const rows:any[] = []; 
            for(let row of data) {
                let index=0;
                let rowData = {} as any;
                for(let col of row) {
                    rowData[headers[index]] = col;
                    index++;
                }
                rows.push(rowData);
            }
            const csv = await (json2csvPromise(rows) as Promise<string>);
            await wrtieFilePromise(filePath, csv);
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }
    }

    async saveCsvAllPages(filePath: string): Promise<void> {

        const getHeaders = ()=> {
            const page = this.pdfData.Pages[0];
            const data = this.detectTable(page).map(row => row.map(col => col.textContent));
            return data[0];
        };

        const getRows = (pageIndex:number, headers:string[]) =>{
            
            const page = this.pdfData.Pages[pageIndex];
            const data = this.detectTable(page).map(row => row.map(col => col.textContent));
            if(pageIndex == 0) data.shift();
            const rows: any[] = [];
            for (let row of data) {
                let index = 0;
                let rowData = {} as any;
                for (let col of row) {
                    rowData[headers[index]] = col;
                    index++;
                }
                rows.push(rowData);
            }
            return rows;
        }

        try {
            const headers = getHeaders();
            let rows: any[] = [];
            for(let i=0; i<this.pdfData.Pages.length; i++) {
                rows = rows.concat(getRows(i, headers));
            }
            
            const csv = await (json2csvPromise(rows) as Promise<string>);
            await wrtieFilePromise(filePath, csv);
            return this.logger.info(`${filePath} saved!`);
        } catch (err) {
            return this.logger.error(err);
        }

        
    }

    getPageCanvas() {        
        const width = this.pageLayout.width * this.pageLayout.resolution;
        const height = this.pageLayout.height  * this.pageLayout.resolution;
        const canvas = createCanvas(width, height);
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height);
        return canvas;
    }

    drawText(canvas: Canvas, page:Page, text: Text, color?:string) {
        const context = canvas.getContext('2d');
        const r = text.R[0];
        const fontSize = r.TS[1];
        const fontFaceId = r.TS[0];
        const textAlign = text.A as CanvasTextAlign;
        const font = `${(fontSize)}px ${PDFParser.fontFaceDict[fontFaceId]}`;
        const rawText = decodeURIComponent(r.T);
        const point = this.transform({x:text.x, y:text.y}, page);
        const wsw = this.transform({x:text.w, y:text.sw}, page); 
        const measureText = context.measureText(rawText);      
        const x = point.x;
        const y = point.y + measureText.actualBoundingBoxAscent + measureText.actualBoundingBoxDescent;
        const maxWidth = wsw.x;
        context.fillStyle = color?color:'#000000';
        context.font = font;       
        context.textAlign = textAlign;        
        context.textBaseline = 'middle';
        context.fillText(rawText, x, y, maxWidth);
    }

    drawVLine(canvas: Canvas, page:Page, line: Vline, style?:string) {
        const context = canvas.getContext('2d');
        context.strokeStyle = style?style:'rgba(0,0,0,0.5)';
        context.beginPath();
        const { point, wl } = this.getLineInfo(line, page);
        context.lineTo(point.x, point.y);
        context.lineTo(point.x, point.y + wl.y);
        context.stroke();
    }

    drawHLine(canvas: Canvas, page:Page, line: Hline, style?:string) {
        const context = canvas.getContext('2d');
        context.strokeStyle = style?style:'rgba(0,0,0,0.5)';
        context.beginPath();
        const { point, wl } = this.getLineInfo(line, page);
        context.lineTo(point.x, point.y);
        context.lineTo(point.x + wl.y, point.y);
        context.stroke();
    }

    getLineInfo(line:Hline, page:Page) {
        const point = this.transform({x:line.x - (line.w /2), y:line.y - (line.w /2)}, page);
        const wl = this.transform({x:line.w, y:line.l}, page);
        return{
            point,
            wl
        };
    }

    getLength (lines:Hline[], page:Page) {
        if(lines.length == 0) return 0;
        const linesCopy = [...lines];
        linesCopy.sort((x,y)=>x.x - y.x);
        const line1 = linesCopy[0];
        const line2 = linesCopy[linesCopy.length-1];
        const info1 = this.getLineInfo(line1, page);
        const info2 = this.getLineInfo(line2, page);
        return (info2.point.x + info2.wl.y) - info1.point.x;
    }

    getHeight (lines:Vline[], page:Page) {
        if(lines.length == 0) return 0;
        const linesCopy = [...lines];
        linesCopy.sort((x,y)=>x.y - y.y);
        const line1 = linesCopy[0];
        const line2 = linesCopy[linesCopy.length-1];
        const info1 = this.getLineInfo(line1, page);
        const info2 = this.getLineInfo(line2, page);
        return (info2.point.y + info2.wl.y) - info1.point.y;
    }

    detectTopHLines(page:Page): Hline[] {
        if(!page.HLines || page.HLines.length == 0) return [];

        const groupByY = page.HLines.reduce((prev,curr)=>{
            if(!prev[curr.y.toString()]) {
                prev[curr.y.toString()] = [];
            }
            prev[curr.y.toString()].push(curr);
            return prev;
        },{} as any);
        const yList = Object.keys(groupByY).map((value)=>({key:parseFloat(value), value:groupByY[value]}));        
        yList.sort((x,y)=>{
            const xLength = this.getLength(x.value as Hline[], page);
            const yLength = this.getLength(y.value as Hline[], page);
            return xLength - yLength;
        });
        const averageLine = yList[Math.floor(yList.length/2)];
        const averageLineLength = this.getLength(averageLine.value as Hline[], page);
        yList.sort((x,y)=>x.key - y.key);
        const result = yList.find(v=>this.getLength(v.value as Hline[],page) == averageLineLength)?.value;
        return result;
    }

    detectLeftVLines(page:Page): Vline[] {
        if(!page.VLines || page.VLines.length == 0) return [];

        const groupByX = page.VLines.reduce((prev,curr)=>{
            if(!prev[curr.x.toString()]) {
                prev[curr.x.toString()] = [];
            }
            const lines:Vline[] = prev[curr.x.toString()];
            lines.push(curr);
            if(lines.length > 2) {
                const firstLine = lines[0];
                const secLine = lines[1];
                const firstLineEnd = firstLine.y + firstLine.l;
                if(firstLineEnd < secLine.y) lines.shift();
            }
            return prev;
        },{} as any);
        const xList = Object.keys(groupByX).map((value)=>({key:parseFloat(value), value:groupByX[value]}));        
        xList.sort((x,y)=>{
            const xLength = this.getHeight(x.value as Vline[], page);
            const yLength = this.getHeight(y.value as Vline[], page);
            return xLength - yLength;
        });
        const averageLine = xList[Math.floor(xList.length/2)];
        const averageLineHeight = this.getHeight(averageLine.value as Vline[], page);
        xList.sort((x,y)=>x.key - y.key);
        const result = xList.find(v=>this.getHeight(v.value as Vline[],page) == averageLineHeight)?.value;
        return result;
    }

    detectBoxes(page:Page) {
        var hlines = this.detectTopHLines(page);
        var vlines = this.detectLeftVLines(page);
        const boxes:Box[][] = [];
        for(let vline of vlines) {
            const row:Box[] = [];
            for(let hline of hlines) {                
                row.push({ x: hline.x - (hline.w/2), y:vline.y - (hline.w/2), w: hline.l, h: vline.l})
            }    
            row.sort((x,y)=>x.x - y.x);
            boxes.push(row)
        }
        boxes.sort((x,y)=> x[0].y - y[0].y);
        return boxes;
    }

    detectBoxesTransformed(page:Page):Box[][] {
        var boxesArr = this.detectBoxes(page);
        return boxesArr.map(boxes=>boxes.map(box=>{
            return this.transformBox(box, page);
        }));
    }

    private transformBox(box: Box, page: Page) {
        const xy = this.transform({ x: box.x, y: box.y }, page);
        const wh = this.transform({ x: box.w, y: box.h }, page);
        return { x: xy.x, y: xy.y, w: wh.x, h: wh.y };
    }


    detectTable(page:Page) {
        const boxesArr = this.detectBoxes(page);
        const texts = page.Texts;
        const table:{box:Box, texts:Text[], textContent:string}[][] = []
        for(let boxes of boxesArr){
            const row:{box:Box, texts:Text[], textContent:string}[]=[];
            for(let box of boxes) {
               
               
                const topLeft:Point = { x: box.x , y: box.y };
                const topRight:Point = { x: box.x + box.w, y: box.y };
                const bottomLeft:Point = { x: box.x, y: box.y + box.h };
                const bottomRight:Point = { x: box.x + box.w, y: box.y + box.h };
               
                const textArr = texts.filter(text=>{
                    
                    const result = topLeft.x <= text.x && text.x < topRight.x && topLeft.y <= text.y && text.y < bottomLeft.y;
                    return result;
                });
                textArr.sort((x,y)=>x.x - y.x);
                textArr.sort((x,y)=>x.y - y.y);
                const textContent = textArr.map(text=> decodeURIComponent(text.R[0].T).trim()).join(' ');
                row.push({box, texts:textArr, textContent});
            }
            table.push(row)
        }
        return table;
    }

    drawBox(canvas:Canvas, box:Box, style?:string) {        
        const context = canvas.getContext('2d');
        context.strokeStyle = style? style : '#000000'
        context.strokeRect(box.x, box.y, box.w, box.h);
    }

    drawPage(pageIndex: number) {
        const canvas = this.getPageCanvas();
        const page = this.pdfData.Pages[pageIndex];
        // page.Texts.forEach(text => this.drawText(canvas, page, text))
        // page.VLines.forEach(line=>this.drawVLine(canvas, page, line));
        // page.HLines.forEach(line=>this.drawHLine(canvas, page, line));
        // this.detectTopHLines(page).forEach(line=>this.drawHLine(canvas, page, line, 'rgba(255,0,0,1)'));
        // this.detectLeftVLines(page).forEach(line=>this.drawVLine(canvas, page, line, 'rgba(0,255,0,1)'));
        // this.detectBoxesTransformed(page).forEach(boxArr=>boxArr.forEach(box=> this.drawBox(canvas, box, 'rgba(0,0,255,1)')))
        const table = this.detectTable(page);
        table.forEach(row=>row.forEach(col=>{
            const transformedBox = this.transformBox(col.box, page);
            this.drawBox(canvas, transformedBox,'rgba(0,0,255,1)');
            col.texts.forEach(text=>this.drawText(canvas, page, text,'rgba(0,0,255,1)'));
        }))
        
        return canvas;
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