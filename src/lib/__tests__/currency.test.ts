import { convertPrice, formatConvertedPrice } from "../currency";

describe("convertPrice", () => {
  const rates = { usdToCup: 325, zelleToCup: 325 };

  test("USD to USD returns same value", () => {
    expect(convertPrice(10, "USD", rates)).toBe(10);
  });

  test("USD to CUP multiplies correctly", () => {
    expect(convertPrice(10, "CUP", rates)).toBe(3250);
  });

  test("USD to ZELLE when rates equal returns same", () => {
    expect(convertPrice(10, "ZELLE", rates)).toBe(10);
  });

  test("USD to ZELLE when rates differ calculates correctly", () => {
    const diffRates = { usdToCup: 330, zelleToCup: 325 };
    const result = convertPrice(10, "ZELLE", diffRates);
    expect(result).toBeCloseTo(10.1538, 2);
  });

  test("Zero price returns zero", () => {
    expect(convertPrice(0, "CUP", rates)).toBe(0);
  });

  test("Throws on zero usdToCup rate", () => {
    expect(() =>
      convertPrice(10, "CUP", { usdToCup: 0, zelleToCup: 325 })
    ).toThrow();
  });

  test("Throws on zero zelleToCup rate", () => {
    expect(() =>
      convertPrice(10, "ZELLE", { usdToCup: 325, zelleToCup: 0 })
    ).toThrow();
  });

  test("Throws on negative rate", () => {
    expect(() =>
      convertPrice(10, "CUP", { usdToCup: -5, zelleToCup: 325 })
    ).toThrow();
  });

  test("Large price conversion", () => {
    expect(convertPrice(100000, "CUP", rates)).toBe(32500000);
  });

  test("Fractional USD converts correctly", () => {
    expect(convertPrice(0.5, "CUP", rates)).toBe(162.5);
  });
});

describe("formatConvertedPrice", () => {
  test("USD format starts with $", () => {
    const result = formatConvertedPrice(10, "USD");
    expect(result).toMatch(/^\$/);
  });

  test("CUP format includes CUP prefix", () => {
    const result = formatConvertedPrice(3250, "CUP");
    expect(result).toContain("CUP");
  });

  test("ZELLE format includes ZLLE suffix", () => {
    const result = formatConvertedPrice(10.15, "ZELLE");
    expect(result).toContain("ZLLE");
  });

  test("Large number in CUP formats with thousands separator", () => {
    const result = formatConvertedPrice(1000000, "CUP");
    expect(result).toContain("CUP");
    expect(result).toContain(",");
  });
});
