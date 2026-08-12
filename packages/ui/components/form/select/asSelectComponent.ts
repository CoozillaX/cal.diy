import type { ComponentType } from "react";

// react-select's `components.*` (Option, Control, Input, SingleValue, ValueContainer, ...) are
// generic functions returning `JSX.Element`. Under React 19's stricter JSX element-type check,
// TS rejects rendering them directly as a tag even though the same reference works fine when
// passed around as a plain value - and rejects it just as hard if this helper's parameter is
// typed as a matching function signature, since passing a generic function as an argument to a
// concretely-typed parameter hits the same check. Taking `unknown` sidesteps that: the return
// type stays the exact, correct `ComponentType<P>` for every caller, only the input isn't checked.
export function asSelectComponent<P extends object>(Component: unknown): ComponentType<P> {
  return Component as ComponentType<P>;
}
