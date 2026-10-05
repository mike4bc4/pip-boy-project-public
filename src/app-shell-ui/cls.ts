export function cls(name: string) {
    return {
        name: name,
        selector: `.${name}`,
    };
}
