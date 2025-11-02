/**
 * @cartae/parsers - Transform Plugin
 *
 * Exports:
 * - AttachmentParserService (orchestrateur principal)
 * - ParserFactory (factory pour parsers)
 * - Types (ParsedAttachment, ParseOptions, IAttachmentParser)
 * - 17 Parsers individuels (si besoin import direct)
 */

// Service principal
export { AttachmentParserService, attachmentParserService } from './AttachmentParserService';

// Factory
export { ParserFactory } from './ParserFactory';

// Base types & interfaces
export * from './base/IAttachmentParser';
export * from './base/ParsedAttachment';

// Parsers individuels (exports nommés)
export { DocxParser } from './parsers/office/DocxParser';
export { XlsxParser } from './parsers/office/XlsxParser';
export { PptxParser } from './parsers/office/PptxParser';
export { PdfParser } from './parsers/pdf/PdfParser';
export { TxtParser } from './parsers/text/TxtParser';
export { CsvParser } from './parsers/text/CsvParser';
export { RtfParser } from './parsers/text/RtfParser';
export { ImageParser } from './parsers/image/ImageParser';
export { OdtParser } from './parsers/openoffice/OdtParser';
export { OdsParser } from './parsers/openoffice/OdsParser';
export { OdpParser } from './parsers/openoffice/OdpParser';
export { MsgParser } from './parsers/email/MsgParser';
export { EmlParser } from './parsers/email/EmlParser';
export { IcsParser } from './parsers/calendar/IcsParser';
export { VcfParser } from './parsers/calendar/VcfParser';
export { ZipParser } from './parsers/archive/ZipParser';
export { JsonParser } from './parsers/data/JsonParser';
