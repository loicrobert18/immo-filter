import type { BaseParser } from "./base.js";
import { selogerParser } from "./seloger.js";
import { leboncoinParser } from "./leboncoin.js";
import { bieniciParser } from "./bienici.js";
import { papParser } from "./pap.js";

const parsers: BaseParser[] = [
  selogerParser,
  leboncoinParser,
  bieniciParser,
  papParser,
];

export function findParser(fromHeader: string): BaseParser | undefined {
  const from = fromHeader.toLowerCase();
  return parsers.find((parser) =>
    parser.senderPatterns.some((pattern) => {
      const domain = pattern.startsWith("@") ? pattern.slice(1) : pattern;
      return from.includes(domain);
    })
  );
}
