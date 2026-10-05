import { AppError } from "./app-error.js";
import { App } from "./App.js";

import { cvHtml, cvStyle, cvScript } from "./secretRegistry.js";

const hiddenClassName = "hidden";
const appContainerClassName = "app-container";
const errorContainerClassName = "error-container";
const cvDocumentButtonClassName = "cv-document-button";

const appContainer = document.querySelector(`.${appContainerClassName}`) as HTMLDivElement;
const errorContainer = document.querySelector(`.${errorContainerClassName}`) as HTMLDivElement;
const cvDocumentButton = document.querySelector(`.${cvDocumentButtonClassName}`) as HTMLButtonElement;

let app: App | null = new App();

const handleError = (event: ErrorEvent) => {
    if (event.error instanceof AppError) {
        handleAppError(event.error);
        event.preventDefault();
    }
};

const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (event.reason instanceof AppError) {
        handleAppError(event.reason);
        event.preventDefault();
    }
};

function handleAppError(error: AppError) {
    console.error("Captured app error!", error);
    app?.dispose();
    app = null;

    window.removeEventListener("error", handleError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);

    appContainer.classList.add(hiddenClassName);
    errorContainer.classList.remove(hiddenClassName);
}

window.addEventListener("error", handleError);
window.addEventListener("unhandledrejection", handleUnhandledRejection);

const openCvDocument = () => {
    const newDocument = new DOMParser().parseFromString(cvHtml, "text/html");

    const oldLinkElement = newDocument.querySelector("link");
    oldLinkElement?.remove();

    const oldScriptElement = newDocument.querySelector("script");
    oldScriptElement?.remove();

    const styleElement = newDocument.createElement("style");
    styleElement.textContent = cvStyle;
    newDocument.head.appendChild(styleElement);

    const win = window.open("", "_blank");

    if (!win) {
        console.error("Unable to open blank window.");
        return;
    }

    win.document.documentElement.replaceWith(win.document.importNode(newDocument.documentElement, true));

    // Script element is injected after the document has been created,
    // otherwise it will not be executed.
    const scriptElement = newDocument.createElement("script");
    scriptElement.textContent = cvScript;
    win.document.body.appendChild(scriptElement);
};

cvDocumentButton.addEventListener("click", openCvDocument);

// Running app init at the very end to ensure that fallback is ready.
await app.init();
