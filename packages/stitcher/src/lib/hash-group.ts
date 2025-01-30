export class HashGroup<K, T> {
  private map_ = new Map<K, T>();

  constructor(
    private params_: {
      getDefaultValue: () => T;
    },
  ) {}

  get(key: K) {
    let value = this.map_.get(key);
    if (!value) {
      value = this.params_.getDefaultValue();
      this.map_.set(key, value);
    }
    return value;
  }

  toEntries() {
    return [...this.map_.entries()];
  }
}
