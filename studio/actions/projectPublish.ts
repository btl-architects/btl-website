import {useEffect, useState} from 'react';
import {useDocumentOperation, type DocumentActionComponent} from 'sanity';

/** Keep the built-in publish validation and revision handling. Wait for Sanity
 * to acknowledge the alias patch before invoking the original publish action. */
export function preserveProjectAddress(original: DocumentActionComponent): DocumentActionComponent {
  const Wrapped: DocumentActionComponent = (props) => {
    const action = original(props);
    const {patch} = useDocumentOperation(props.id, props.type);
    const [pending, setPending] = useState<string | null>(null);
    const oldSlug = (props.published?.slug as {current?: string} | undefined)?.current;
    const newSlug = (props.draft?.slug as {current?: string} | undefined)?.current;
    const aliases = (props.draft?.previousSlugs ?? props.published?.previousSlugs ?? []) as string[];
    useEffect(() => {
      if (pending && aliases.includes(pending)) {
        setPending(null);
        action?.onHandle?.();
      }
    }, [pending, aliases, action]);
    useEffect(() => {
      if (!pending) return;
      const timer = setTimeout(() => setPending(null), 10000);
      return () => clearTimeout(timer);
    }, [pending]);
    if (!action) return null;
    return {...action, disabled: Boolean(action.disabled || pending), label: pending ? 'Preserving previous address…' : action.label,
      onHandle: () => {
        if (oldSlug && newSlug && oldSlug !== newSlug && !aliases.includes(oldSlug)) {
          setPending(oldSlug);
          patch.execute([{set: {previousSlugs: [...new Set([...aliases, oldSlug])]}}]);
        } else action.onHandle?.();
      },
    };
  };
  Wrapped.action = original.action;
  return Wrapped;
}

export function protectPublishedProject(original: DocumentActionComponent): DocumentActionComponent {
  const Wrapped: DocumentActionComponent = (props) => {
    const action = original(props);
    return props.published ? null : action;
  };
  Wrapped.action = original.action;
  return Wrapped;
}
