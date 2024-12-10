interface Target {
  addEventListener?: Handler;
  removeEventListener?: Handler;
  on?: Handler;
  off?: Handler;
}

type AddCallback<T extends Target> = T extends { addEventListener: Handler }
  ? T["addEventListener"]
  : T extends { on: Handler }
    ? T["on"]
    : Handler;

type RemoveCallback<T extends Target> = T extends {
  removeEventListener: Handler;
}
  ? T["removeEventListener"]
  : T extends { off: Handler }
    ? T["off"]
    : Handler;

export class EventManager {
  private bindings_ = new Set<Binding>();

  listen = <T extends Target>(target: T) =>
    ((type, listener, context) => {
      const binding = createBinding(target, type, listener, context);
      this.bindings_.add(binding);
    }) as AddCallback<T>;

  listenOnce = <T extends Target>(target: T) =>
    ((type, listener, context) => {
      const binding = createBinding(target, type, listener, context, true);
      this.bindings_.add(binding);
    }) as AddCallback<T>;

  unlisten = <T extends Target>(target: T) =>
    ((type, listener) => {
      const binding = Array.from(this.bindings_).find(
        (binding) =>
          binding.target === target &&
          binding.type === type &&
          binding.listener === listener,
      );
      if (binding) {
        binding.remove();
        this.bindings_.delete(binding);
      }
    }) as RemoveCallback<T>;

  removeAll() {
    this.bindings_.forEach((binding) => {
      binding.remove();
    });
    this.bindings_.clear();
  }
}

/**
 * Create a binding for a specific target.
 * @param target
 * @param type
 * @param listener
 * @param context
 * @param once
 * @returns
 */
function createBinding(
  target: Target,
  type: string,
  listener: Handler,
  context?: unknown,
  once?: boolean,
) {
  const methodMap = {
    add: target.addEventListener?.bind(target) ?? target.on?.bind(target),
    remove:
      target.removeEventListener?.bind(target) ?? target.off?.bind(target),
  };

  const remove = () => {
    methodMap.remove?.(type, callback);
  };

  const callback = async (...args: unknown[]) => {
    try {
      await listener.apply(context, args);
      if (once) {
        remove();
      }
    } catch (error) {
      console.error(error);
    }
  };

  methodMap.add?.(type, callback);

  return {
    target,
    type,
    listener,
    context,
    once,
    remove,
  };
}

type Binding = ReturnType<typeof createBinding>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (...args: any) => any;
