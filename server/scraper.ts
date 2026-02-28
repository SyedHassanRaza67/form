import axios from "axios";
import * as cheerio from "cheerio";
import type { FormField } from "@shared/schema";

interface ScrapeResult {
  fields: FormField[];
  formSelector: string | null;
  submitSelector: string | null;
}

export async function scrapeFormFields(url: string): Promise<ScrapeResult> {
  const response = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    timeout: 15000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(response.data);
  const fields: FormField[] = [];
  let order = 1;

  const form = $("form").first();
  const formSelector = form.length ? getSelector($, form) : null;

  const submitBtn = form.length
    ? form.find('button[type="submit"], input[type="submit"], button:not([type])').first()
    : $('button[type="submit"], input[type="submit"]').first();
  const submitSelector = submitBtn.length ? getSelector($, submitBtn) : null;

  const scope = form.length ? form : $("body");

  scope.find("input, select, textarea").each((_i, el) => {
    const $el = $(el);
    const type = ($el.attr("type") || $el.prop("tagName")?.toLowerCase() || "text").toLowerCase();

    if (["hidden", "submit", "button", "reset", "image", "file"].includes(type)) return;

    const name = $el.attr("name") || $el.attr("id") || "";
    if (!name) return;

    const label = getLabel($, $el) || name;
    const selector = getSelector($, $el);
    const required = $el.attr("required") !== undefined || $el.attr("aria-required") === "true";

    const options: string[] = [];
    if ($el.prop("tagName")?.toLowerCase() === "select") {
      $el.find("option").each((_j, opt) => {
        const val = $(opt).attr("value");
        if (val && val !== "") {
          options.push(val);
        }
      });
    }

    fields.push({
      label,
      name,
      type: $el.prop("tagName")?.toLowerCase() === "select" ? "select" :
            $el.prop("tagName")?.toLowerCase() === "textarea" ? "textarea" : type,
      selector,
      options: options.length > 0 ? options : undefined,
      required,
      order: order++,
    });
  });

  return { fields, formSelector, submitSelector };
}

function getLabel($: cheerio.CheerioAPI, $el: cheerio.Cheerio<cheerio.Element>): string {
  const id = $el.attr("id");
  if (id) {
    const label = $(`label[for="${id}"]`).first().text().trim();
    if (label) return label;
  }

  const parentLabel = $el.closest("label").text().trim();
  if (parentLabel) {
    const inputText = $el.val()?.toString() || "";
    return parentLabel.replace(inputText, "").trim() || parentLabel;
  }

  const placeholder = $el.attr("placeholder");
  if (placeholder) return placeholder;

  const ariaLabel = $el.attr("aria-label");
  if (ariaLabel) return ariaLabel;

  return "";
}

function getSelector($: cheerio.CheerioAPI, $el: cheerio.Cheerio<cheerio.Element>): string {
  const id = $el.attr("id");
  if (id) return `#${id}`;

  const name = $el.attr("name");
  const tag = $el.prop("tagName")?.toLowerCase() || "input";
  if (name) return `${tag}[name="${name}"]`;

  const classes = $el.attr("class");
  if (classes) {
    const classList = classes.split(/\s+/).filter(c => c.length > 0).slice(0, 2).join(".");
    return `${tag}.${classList}`;
  }

  return tag;
}
