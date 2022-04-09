import * as fs from 'fs'
import * as log4js from 'log4js';
import PDFParser from "pdf2json";
import { TableParser } from './table-parser';
import { PdfData, Text } from './interfaces/pdf-data';

const runner = async () => {
  const srcPath = `C:/Users/Dell/source/repos/pdf2table/`;
  const samples = ['Bank_Of_India_Sample_1', 'Axis_Bank_Sample_1']
  const pdfFilePath = `${srcPath}/samples/${samples[0]}.pdf`;
  const jsonFilePath = `${srcPath}/output/${samples[0]}.json`;
  const imageFilePath = `${srcPath}/output/${samples[0]}.png`;

  log4js.configure({
    appenders: { console: { type: 'console' } },
    categories: { default: { appenders: [ 'console' ], level: 'info' } }
  });

  const parser = new TableParser(new PDFParser(), log4js.getLogger());
  await parser.loadPdf(pdfFilePath);
  await parser.saveJson(jsonFilePath);
  await parser.saveImage(0, imageFilePath);
}


runner()
  .then(()=>console.log("END"))
  .catch((err)=> console.log(err))

