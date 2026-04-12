// src/declarations.d.ts (or at project root)

declare module 'react-dom/client' {
    import * as React from 'react';

    export interface Root {
        render(children: React.ReactNode): void;
        unmount(): void;
    }

    export function createRoot(container: Element | DocumentFragment): Root;
    export function hydrateRoot(container: Element | DocumentFragment, children: React.ReactNode): Root;
}

declare module "*.png" {
    const value: string;
    export default value;
}

declare module "*.jpg" {
    const value: string;
    export default value;
}

declare module "*.svg" {
    const value: string;
    export default value;
}