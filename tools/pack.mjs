import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { parse, serialize } from 'parse5'

async function main() {
    const projectDirectory = resolve('.');
    const distDirectory = join(projectDirectory, 'dist');
    const outputDirectory = join(projectDirectory, 'packed');

    const inputHtmlPath = join(distDirectory, 'index.html');
    const outputHtmlPath = join(outputDirectory, 'app.html');

    let html = await readFile(inputHtmlPath, 'utf-8');

    const document = parse(html);

    await inlineModuleScripts(document, distDirectory);

    const packedHtml = serialize(document);

    await mkdir(outputDirectory, { recursive: true });
    await writeFile(outputHtmlPath, packedHtml, 'utf-8');

    console.log(`Packed: ${outputHtmlPath}`);
}

main();

function getNodes(document) {
    const nodes = [];

    function getNodesRecursive(node) {
        nodes.push(node);

        if (!node.childNodes) {
            return;
        }

        for (const child of node.childNodes) {
            getNodesRecursive(child);
        }
    }

    getNodesRecursive(document);

    return nodes;
}

function getAttribute(node, name) {
    return node.attrs?.find(attribute => attribute.name == name)?.value;
}

function removeAttribute(node, name) {
    if (!node.attrs) {
        return;
    }

    node.attrs = node.attrs.filter(attribute => attribute.name !== name);
}

async function inlineModuleScripts(document, rootDirectory) {
    const nodes = getNodes(document);

    const scriptNodes = [];
    for (const node of nodes) {
        if (node.tagName !== 'script') {
            continue;
        }

        if (getAttribute(node, 'type') === 'module' && getAttribute(node, 'src') !== undefined) {
            scriptNodes.push(node);
        }
    }

    if (scriptNodes.length == 0) {
        throw new Error('No external module script nodes found.');
    }

    for (const scriptNode of scriptNodes) {
        const source = getAttribute(scriptNode, 'src');
        const relativeSource = source.replace(/^\/+/, '');
        const scriptPath = join(rootDirectory, relativeSource);
        const scriptContent = await readFile(scriptPath, 'utf-8');

        removeAttribute(scriptNode, 'src');
        removeAttribute(scriptNode, 'crossorigin');

        scriptNode.childNodes = [{ nodeName: '#text', value: scriptContent, parentNode: scriptNode }];
    }
}