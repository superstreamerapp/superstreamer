export class Group<K = unknown, V = unknown> {
  constructor(public map = new Map<K, Set<V>>()) {}

  add(key: K, value?: V) {
    let set = this.map.get(key);
    if (!set) {
      set = new Set();
      this.map.set(key, set);
    }
    if (value !== undefined) {
      set.add(value);
    }
  }

  forEach(callback: (value: K, items: V[]) => void) {
    Array.from(this.map.entries()).forEach(([key, set]) => {
      const items = Array.from(set.values());
      callback(key, items);
    });
  }

  get(key: K) {
    const set = this.map.get(key);
    return set ? Array.from(set.values()) : [];
  }
}
