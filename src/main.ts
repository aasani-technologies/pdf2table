import * as fs from 'fs';
import * as log4js from 'log4js';
import PDFParser from 'pdf2json';
import {LatticePdfTableParser} from '.';

const runner = async () => {
  //configure logger
  log4js.configure({
    appenders: {console: {type: 'console'}},
    categories: {default: {appenders: ['console'], level: 'info'}},
  });

  //src folder
  const srcPath = 'C:/Users/Dell/source/repos/bank-statements';

  const subFolders = fs.readdirSync(`${srcPath}/samples/`);

  for (const subFolder of subFolders) {
    //file list
    const filenames = fs
      .readdirSync(`${srcPath}/samples/${subFolder}/`)
      .map(filename => filename.split('.')[0]);

    //parse files
    for (const filename of filenames) {
      if (!fs.existsSync(`${srcPath}/output/${subFolder}/`))
        fs.mkdirSync(`${srcPath}/output/${subFolder}/`);

      const pdfFilePath = `${srcPath}/samples/${subFolder}/${filename}.pdf`;
      const jsonFilePath = `${srcPath}/output/${subFolder}/${filename}.json`;
      const csvFilePath = `${srcPath}/output/${subFolder}/${filename}.csv`;
      const csvAllFilePath = `${srcPath}/output/${subFolder}/${filename}_all.csv`;
      const imageFilePath = `${srcPath}/output/${subFolder}/${filename}.png`;
      const parser = new LatticePdfTableParser(
        new PDFParser(),
        log4js.getLogger()
      );
      await parser.loadPdf(pdfFilePath);
      await parser.saveJsonPage(0, jsonFilePath);
      await parser.saveCsvPage(0, csvFilePath);
      await parser.saveCsv(csvAllFilePath);
      await parser.saveImagePage(0, imageFilePath);
    }
  }
};

runner()
  .then(() => console.log('END'))
  .catch(err => console.log(err));
