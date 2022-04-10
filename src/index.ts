import * as fs from 'fs'
import * as log4js from 'log4js';
import PDFParser from "pdf2json";
import { TableParser } from './table-parser';
import { PdfData, Text } from './interfaces/pdf-data';

const runner = async () => {
  //configure logger
  log4js.configure({
    appenders: { console: { type: 'console' } },
    categories: { default: { appenders: ['console'], level: 'info' } }
  });

 

  //src folder
  const srcPath = `C:/Users/Dell/source/repos/pdf2table/`;

  //file list
  const filenames = fs.readdirSync(`${srcPath}/samples/`).map(filename=>filename.split('.')[0]);

  //parse files
  for (let filename of filenames) {
     //init parser
    const parser = new TableParser(new PDFParser(), log4js.getLogger());
    const pdfFilePath = `${srcPath}/samples/${filename}.pdf`;
    const jsonFilePath = `${srcPath}/output/${filename}.json`;
    const imageFilePath = `${srcPath}/output/${filename}.png`;
    await parser.loadPdf(pdfFilePath);
    await parser.saveJson(jsonFilePath);
    await parser.saveImage(0, imageFilePath);
  }

}


runner()
  .then(() => console.log("END"))
  .catch((err) => console.log(err))

