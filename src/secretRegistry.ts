const secretModules = import.meta.glob<string>("./secret/*", {
    query: "?raw",
    import: "default",
    eager: true,
});

export const cvHtml: string = secretModules["./secret/cv.html"] ?? secretModules["./secret/cv-public.html"];
export const cvStyle: string = secretModules["./secret/cv-style.css"] ?? "";
export const cvScript: string = secretModules["./secret/cv-main.js"] ?? "";
export const localizationTable: string =
    secretModules["./secret/localization-table.json"] ?? secretModules["./secret/localization-table-public.json"];

const linkTableRaw: string =
    secretModules["./secret/link-table.json"] ?? secretModules["./secret/link-table-public.json"];

const linkTableParsed = JSON.parse(linkTableRaw);

export const linkTable = {
    gitHub: linkTableParsed["gitHub"] as string,
    artStation: linkTableParsed["artStation"] as string,
};
