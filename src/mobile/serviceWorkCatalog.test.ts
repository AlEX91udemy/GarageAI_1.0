import { describe, expect, it } from "vitest";
import { searchServiceWorks, SERVICE_WORK_CATALOG } from "./serviceWorkCatalog";

describe("service work autocomplete catalog", () => {
  it("includes common maintenance, repair, and consumable operations", () => {
    expect(SERVICE_WORK_CATALOG.length).toBeGreaterThanOrEqual(30);
    expect(searchServiceWorks("масло")[0]).toMatchObject({
      title: "Замена моторного масла и масляного фильтра",
      category: "ТО и замена жидкостей",
    });
    expect(searchServiceWorks("колодки")[0]).toMatchObject({
      title: "Замена тормозных колодок",
      category: "Тормозная система",
    });
    expect(searchServiceWorks("переобувка")[0].category).toBe("Шины и диски");
  });

  it("ranks exact and prefix matches before substring matches and enforces the result limit", () => {
    const results = searchServiceWorks("ремонт", 3);
    expect(results).toHaveLength(3);
    expect(searchServiceWorks("неизвестная операция")).toEqual([]);
  });
});
