/**
 * Type definitions for vcf (vCard parser)
 * vcf is a JavaScript library without TypeScript definitions
 */

declare module 'vcf' {
  export default class VCard {
    constructor(vcfString?: string);

    get(propertyName: string): any;
    set(propertyName: string, value: any): void;
    toString(): string;

    version: string;
    fn?: string;
    n?: {
      given?: string;
      family?: string;
      middle?: string;
      prefix?: string;
      suffix?: string;
    };
    email?: Array<{ value: string; type?: string }> | { value: string; type?: string };
    tel?: Array<{ value: string; type?: string }> | { value: string; type?: string };
    org?: string;
    title?: string;
    url?: string;
    note?: string;
    bday?: string;
    photo?: { value: string; mediatype?: string };
    adr?: Array<{
      street?: string;
      city?: string;
      region?: string;
      code?: string;
      country?: string;
      type?: string;
    }>;
  }
}
