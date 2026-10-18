/**
 * Fixed size buffer keeping the most recent `capacity` items.
 */
export class RingBuffer<T> {
  private items: T[] = [];

  constructor(private readonly capacity: number) {}

  push(item: T) {
    this.items.push(item);
    if (this.items.length > this.capacity) {
      this.items.splice(0, this.items.length - this.capacity);
    }
  }

  toArray(): T[] {
    return [...this.items];
  }

  last(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size() {
    return this.items.length;
  }
}
