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

  const form = findMainForm($);
  const formSelector = form.length ? getSelector($, form) : null;

  const submitBtn = form.length
    ? form.find('button[type="submit"], input[type="submit"], button:not([type])').first()
    : $('button[type="submit"], input[type="submit"]').first();
  const submitSelector = submitBtn.length ? getSelector($, submitBtn) : null;

  const scope = form.length ? form : $("body");
  const fields = extractFields($, scope);

  return { fields, formSelector, submitSelector };
}

function findMainForm($: cheerio.CheerioAPI): cheerio.Cheerio<cheerio.Element> {
  const forms = $("form");
  if (forms.length === 0) return $() as any;
  if (forms.length === 1) return forms.first();

  let bestForm = forms.first();
  let bestCount = 0;

  forms.each((_i, formEl) => {
    const $f = $(formEl);
    const inputCount = $f.find("input:not([type='hidden']):not([type='submit']):not([type='button']):not([type='reset']):not([type='image']):not([type='file']), select, textarea").length;
    if (inputCount > bestCount) {
      bestCount = inputCount;
      bestForm = $f;
    }
  });

  return bestForm;
}

function extractFields($: cheerio.CheerioAPI, scope: cheerio.Cheerio<cheerio.Element>): FormField[] {
  const fields: FormField[] = [];
  let order = 1;
  const seenNames = new Map<string, number>();

  scope.find("input, select, textarea").each((_i, el) => {
    const $el = $(el);
    const tag = ($el.prop("tagName")?.toLowerCase() || "input");
    const rawType = ($el.attr("type") || tag).toLowerCase();

    if (["hidden", "submit", "button", "reset", "image", "file"].includes(rawType)) return;

    const rawName = $el.attr("name") || $el.attr("id") || "";
    if (!rawName) return;

    if (rawType === "radio") return;

    if (rawType === "checkbox") {
      const value = $el.attr("value") || "on";
      const label = getLabel($, $el) || value || rawName;
      let fieldName = rawName;

      if (rawName.endsWith("[]") || seenNames.has(rawName)) {
        const suffix = value
          ? value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")
          : String(seenNames.get(rawName) || 0);
        fieldName = `${rawName.replace("[]", "")}_${suffix}`;
      }

      const count = (seenNames.get(rawName) || 0) + 1;
      seenNames.set(rawName, count);

      const selector = getUniqueSelector($, $el, _i);

      fields.push({
        label,
        name: fieldName,
        type: "checkbox",
        selector,
        options: value ? [value] : undefined,
        required: $el.attr("required") !== undefined,
        order: order++,
      });
      return;
    }

    if (seenNames.has(rawName)) {
      const count = (seenNames.get(rawName) || 0) + 1;
      seenNames.set(rawName, count);
      return;
    }
    seenNames.set(rawName, 1);

    const label = getLabel($, $el) || rawName;
    const selector = getSelector($, $el);
    const required = $el.attr("required") !== undefined || $el.attr("aria-required") === "true";

    const options: string[] = [];
    if (tag === "select") {
      $el.find("option").each((_j, opt) => {
        const val = $(opt).attr("value");
        if (val && val !== "") {
          options.push(val);
        }
      });
    }

    const fieldType = tag === "select" ? "select" : tag === "textarea" ? "textarea" : rawType;

    fields.push({
      label,
      name: rawName,
      type: fieldType,
      selector,
      options: options.length > 0 ? options : undefined,
      required,
      order: order++,
    });
  });

  const radioGroups = new Map<string, { options: string[]; labels: string[]; selector: string; required: boolean }>();

  let radioIndex = 0;
  scope.find('input[type="radio"]').each((_i, el) => {
    const $el = $(el);
    const name = $el.attr("name") || "";
    if (!name) return;

    const value = $el.attr("value") || $el.attr("id") || `option_${radioIndex++}`;
    const label = getLabel($, $el) || value;

    if (!radioGroups.has(name)) {
      radioGroups.set(name, {
        options: [],
        labels: [],
        selector: `input[name="${name}"]`,
        required: $el.attr("required") !== undefined,
      });
    }

    const group = radioGroups.get(name)!;
    if (!group.options.includes(value)) {
      group.options.push(value);
      group.labels.push(label);
    }
  });

  for (const [name, group] of radioGroups) {
    const groupLabel = group.labels[0] || name;
    fields.push({
      label: groupLabel,
      name,
      type: "radio",
      selector: group.selector,
      options: group.options.length > 0 ? group.options : undefined,
      required: group.required,
      order: order++,
    });
  }

  return fields;
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
    const cleaned = parentLabel.replace(inputText, "").trim();
    if (cleaned && cleaned.length < 100) return cleaned;
  }

  const placeholder = $el.attr("placeholder");
  if (placeholder) return placeholder;

  const ariaLabel = $el.attr("aria-label");
  if (ariaLabel) return ariaLabel;

  const title = $el.attr("title");
  if (title) return title;

  const prev = $el.prev("label, span, p");
  if (prev.length) {
    const prevText = prev.text().trim();
    if (prevText && prevText.length < 80) return prevText;
  }

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

function getUniqueSelector($: cheerio.CheerioAPI, $el: cheerio.Cheerio<cheerio.Element>, index: number): string {
  const id = $el.attr("id");
  if (id) return `#${id}`;

  const name = $el.attr("name");
  const value = $el.attr("value");
  const tag = $el.prop("tagName")?.toLowerCase() || "input";

  if (name && value) {
    return `${tag}[name="${name}"][value="${value}"]`;
  }

  if (name) {
    const sameNameEls = $(`${tag}[name="${name}"]`);
    if (sameNameEls.length <= 1) return `${tag}[name="${name}"]`;

    let elIndex = 0;
    sameNameEls.each((j, el) => {
      if (el === $el.get(0)) elIndex = j;
    });
    return `${tag}[name="${name}"]:nth-of-type(${elIndex + 1})`;
  }

  return `${tag}:nth-child(${index + 1})`;
}
