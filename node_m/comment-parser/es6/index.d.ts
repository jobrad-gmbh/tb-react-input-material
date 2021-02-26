import { Options as ParserOptions } from './parser/index';
import descriptionTokenizer from './parser/tokenizers/description';
import nameTokenizer from './parser/tokenizers/name';
import tagTokenizer from './parser/tokenizers/tag';
import typeTokenizer from './parser/tokenizers/type';
import alignTransform from './transforms/align';
import indentTransform from './transforms/indent';
import { flow as flowTransform } from './transforms/index';
export declare function parse(source: string, options?: Partial<ParserOptions>): import("./primitives").Block[];
export declare const stringify: import("./stringifier").Stringifier;
export { default as inspect } from './stringifier/inspect';
export declare const transforms: {
    flow: typeof flowTransform;
    align: typeof alignTransform;
    indent: typeof indentTransform;
};
export declare const tokenizers: {
    tag: typeof tagTokenizer;
    type: typeof typeTokenizer;
    name: typeof nameTokenizer;
    description: typeof descriptionTokenizer;
};
