import { describe, it, expect } from "vitest";
import { selogerParser } from "../../src/parsers/seloger.js";

describe("selogerParser", () => {
  it("should match seloger sender patterns", () => {
    expect(selogerParser.senderPatterns).toContain("@alertes.seloger.com");
  });

  it("should return empty array for html without listings", () => {
    const result = selogerParser.parse("<html><body>No listings</body></html>");
    expect(result).toEqual([]);
  });

  it("should extract listing from real SeLoger email structure", () => {
    const html = `
      <table>
        <tr><td>
          <table><tr><td>
            <table>
              <tr><td style="background-image: url('https://mms.seloger.com/photo.jpg'); background-repeat: no-repeat;"><img width="270" height="200" src="https://image.by.seloger.com/overlay.png"></td></tr>
              <tr><td><span><strong>124 057 €</strong></span></td></tr>
              <tr><td><a href="https://click.by.seloger.com/?qs=abc123">2 pièces · 29 m²</a></td></tr>
              <tr><td><a href="https://click.by.seloger.com/?qs=def456">Grézieu-la-Varenne (69290)</a></td></tr>
              <tr><td><a href="https://click.by.seloger.com/?qs=ghi789">Voir l'annonce</a></td></tr>
            </table>
          </td></tr></table>
        </td></tr>
      </table>
    `;
    const results = selogerParser.parse(html);
    expect(results.length).toBe(1);
    expect(results[0]?.platform).toBe("seloger");
    expect(results[0]?.url).toBe("https://click.by.seloger.com/?qs=ghi789");
    expect(results[0]?.price).toBe(124057);
    expect(results[0]?.surface).toBe(29);
    expect(results[0]?.rooms).toBe(2);
    expect(results[0]?.city).toBe("Grézieu-la-Varenne");
    expect(results[0]?.imageUrl).toBe("https://mms.seloger.com/photo.jpg");
  });
});
