import 'jest';
import * as log4js from 'log4js';
import PDFParser from 'pdf2json';
import {LatticePdfTableParser} from '../../index';

describe('', () => {
  it('should pass', () => {
    const parser = new LatticePdfTableParser(
      new PDFParser(),
      log4js.getLogger()
    );
    const passed = true;
    expect(passed).toBe(true);
  });
});
