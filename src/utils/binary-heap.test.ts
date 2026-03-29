import { describe, it, expect } from 'vitest';
import { BinaryHeap } from './binary-heap';

const numCompare = (a: number, b: number) => a - b;

describe('BinaryHeap', () => {
  it('starts empty', () => {
    const heap = new BinaryHeap<number>(numCompare);
    expect(heap.size).toBe(0);
    expect(heap.isEmpty).toBe(true);
  });

  it('extractMin returns null when empty', () => {
    const heap = new BinaryHeap<number>(numCompare);
    expect(heap.extractMin()).toBeNull();
  });

  it('inserts and extracts a single element', () => {
    const heap = new BinaryHeap<number>(numCompare);
    heap.insert(42);
    expect(heap.size).toBe(1);
    expect(heap.isEmpty).toBe(false);
    expect(heap.extractMin()).toBe(42);
    expect(heap.isEmpty).toBe(true);
  });

  it('extracts elements in sorted order', () => {
    const heap = new BinaryHeap<number>(numCompare);
    const values = [5, 3, 8, 1, 9, 2, 7, 4, 6];
    for (const v of values) heap.insert(v);

    const result: number[] = [];
    while (!heap.isEmpty) {
      result.push(heap.extractMin()!);
    }
    expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('handles duplicate values', () => {
    const heap = new BinaryHeap<number>(numCompare);
    heap.insert(3);
    heap.insert(1);
    heap.insert(3);
    heap.insert(1);
    expect(heap.extractMin()).toBe(1);
    expect(heap.extractMin()).toBe(1);
    expect(heap.extractMin()).toBe(3);
    expect(heap.extractMin()).toBe(3);
  });

  it('works with custom comparator', () => {
    interface Item {
      priority: number;
      name: string;
    }
    const heap = new BinaryHeap<Item>((a, b) => a.priority - b.priority);
    heap.insert({ priority: 3, name: 'c' });
    heap.insert({ priority: 1, name: 'a' });
    heap.insert({ priority: 2, name: 'b' });

    expect(heap.extractMin()!.name).toBe('a');
    expect(heap.extractMin()!.name).toBe('b');
    expect(heap.extractMin()!.name).toBe('c');
  });
});
